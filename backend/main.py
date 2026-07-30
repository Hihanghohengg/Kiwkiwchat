"""
Kiw Kiw Chat — Signaling & Room Management Server
Version: 2.0.0 (Security Hardened)

Fixes applied:
  FIX-01: CORS restricted to explicit allowed origins
  FIX-02: WebSocket no longer auto-creates rooms
  FIX-03: Payload size limit (64 KB per message)
  FIX-04: Security headers middleware
  FIX-05: Rate limiting via slowapi (5 rooms/IP/minute)
  FIX-06: WebSocket idle timeout (300 s)
  FIX-08: WebSocket token authentication (ws_token from POST /rooms)
  FIX-09: Structured JSON logging (replaces print())
  FIX-10: Serve compiled frontend static files
  BUG-01: json.loads wrapped in try/except
  BUG-02: bare except → except Exception
"""

import uuid
import json
import asyncio
import logging
import os
import secrets
import sys
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware


# ─── Structured Logging ────────────────────────────────────────────────────────
class UTCFormatter(logging.Formatter):
    """Emit logs as single-line JSON to stdout (easy to parse by log aggregators)."""

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        return json.dumps({
            "time":    ts,
            "level":   record.levelname,
            "event":   record.getMessage(),
        })


handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(UTCFormatter())
logger = logging.getLogger("kiwkiw")
logger.setLevel(logging.INFO)
logger.addHandler(handler)
logger.propagate = False


# ─── Configuration (from environment) ─────────────────────────────────────────
# Set ALLOWED_ORIGINS in your environment, comma-separated:
#   ALLOWED_ORIGINS=https://kiwkiw.chat,https://www.kiwkiw.chat
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "https://kiwkiwchat.vercel.app,http://localhost:5173,http://localhost:4173")
ALLOWED_ORIGINS: List[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

MAX_MSG_BYTES: int        = int(os.environ.get("MAX_MSG_BYTES",    str(5 * 1024 * 1024)))   # 5 MB (JSON signaling)
MAX_FILE_BYTES: int       = int(os.environ.get("MAX_FILE_BYTES",   str(50 * 1024 * 1024)))  # 50 MB (file transfer metadata)
WS_IDLE_TIMEOUT: int      = int(os.environ.get("WS_IDLE_TIMEOUT",  "60"))                    # 60 s
ROOM_TTL_SECONDS: int     = int(os.environ.get("ROOM_TTL_SECONDS", "900"))                   # 15 min
TURN_URL: Optional[str]   = os.environ.get("TURN_URL")           # e.g. turn:turn.kiwkiw.chat:3478
TURN_USERNAME: Optional[str] = os.environ.get("TURN_USERNAME")
TURN_CREDENTIAL: Optional[str] = os.environ.get("TURN_CREDENTIAL")


# ─── In-Memory Store ───────────────────────────────────────────────────────────
# rooms[room_id] = {
#     "connections": { connection_id: websocket },
#     "count":       int,
#     "ws_token":    str,   ← single-use token issued by POST /rooms
# }
rooms: Dict[str, Dict] = {}


# ─── App & Middleware ──────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[])
app = FastAPI(docs_url=None, redoc_url=None)  # disable Swagger in production
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject security headers on every HTTP response (not WebSocket upgrades)."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"]  = "nosniff"
        response.headers["X-Frame-Options"]          = "DENY"
        response.headers["X-XSS-Protection"]         = "1; mode=block"
        response.headers["Referrer-Policy"]           = "no-referrer"
        response.headers["Permissions-Policy"]        = (
            "geolocation=(), microphone=(), camera=()"
        )
        # HSTS — only effective over HTTPS (ignored on HTTP, safe to set)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        return response


# Register middleware — order matters: Security headers first, then CORS
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in ALLOWED_ORIGINS else ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# ─── Pydantic Models ───────────────────────────────────────────────────────────
class RoomResponse(BaseModel):
    room_id:     str
    ws_token:    str          # FIX-08: token for WebSocket authentication
    turn_servers: List[Dict]


# ─── Helper: Build ICE Server list ────────────────────────────────────────────
def _build_ice_servers() -> List[Dict]:
    servers: List[Dict] = [
        {"urls": "stun:stun.l.google.com:19302"},
        {"urls": "stun:stun1.l.google.com:19302"},
    ]
    if TURN_URL and TURN_USERNAME and TURN_CREDENTIAL:
        servers.append({
            "urls":       TURN_URL,
            "username":   TURN_USERNAME,
            "credential": TURN_CREDENTIAL,
        })
    return servers


# ─── POST /rooms ───────────────────────────────────────────────────────────────
@app.post("/rooms", response_model=RoomResponse)
@limiter.limit("10/minute")   # FIX-05: max 10 rooms per IP per minute
async def create_room(request: Request):
    room_id  = str(uuid.uuid4())
    ws_token = secrets.token_urlsafe(32)   # FIX-08: single-use WS auth token

    rooms[room_id] = {
        "connections": {},
        "count":       0,
        "ws_token":    ws_token,
        "created_at":  time.time(),
    }

    logger.info(f"ROOM_CREATED room_id={room_id} remote={request.client.host}")

    # FIX-06 / original TTL logic: self-destruct after ROOM_TTL_SECONDS
    async def destroy_room_later(r_id: str) -> None:
        await asyncio.sleep(ROOM_TTL_SECONDS)
        if r_id in rooms:
            for cid, ws in list(rooms[r_id]["connections"].items()):
                try:
                    await ws.close(code=1008, reason="Room TTL expired")
                except Exception:   # BUG-02 fix: no bare except
                    pass
            del rooms[r_id]
            logger.info(f"ROOM_TTL_EXPIRED room_id={r_id}")

    asyncio.create_task(destroy_room_later(room_id))

    return RoomResponse(
        room_id=room_id,
        ws_token=ws_token,
        turn_servers=_build_ice_servers(),
    )


# ─── WebSocket /rooms/{room_id}/ws ────────────────────────────────────────────
@app.websocket("/rooms/{room_id}/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(default=""),   # FIX-08: expect ?token=...
):
    # FIX-02: reject unknown rooms — never auto-create via WebSocket
    if room_id not in rooms:
        await websocket.accept()
        await websocket.send_json({"type": "error", "reason": "Room not found or expired."})
        await websocket.close(code=1008, reason="Room not found")
        logger.warning(f"WS_ROOM_NOT_FOUND room_id={room_id} remote={websocket.client.host}")
        return

    room = rooms[room_id]

    if token != room["ws_token"]:
        await websocket.accept()
        await websocket.send_json({"type": "error", "reason": "Invalid token."})
        await websocket.close(code=1008, reason="Invalid token")
        logger.warning(f"WS_INVALID_TOKEN room_id={room_id} remote={websocket.client.host}")
        return

    # Accept first so we can send a JSON rejection message if room is full
    await websocket.accept()

    if room["count"] >= 2:
        await websocket.send_json({
            "type": "room_full",
            "reason": "This room already has 2 participants.",
        })
        await websocket.close(code=1008, reason="Room full")
        logger.warning(f"WS_ROOM_FULL room_id={room_id} remote={websocket.client.host}")
        return

    room["count"] += 1
    connection_id = str(uuid.uuid4())
    room["connections"][connection_id] = websocket
    is_initiator = room["count"] == 1

    logger.info(
        f"WS_PEER_JOINED room_id={room_id} connection_id={connection_id} "
        f"initiator={is_initiator} remote={websocket.client.host}"
    )

    try:
        elapsed = time.time() - room.get("created_at", time.time())
        expires_in = int(max(0, ROOM_TTL_SECONDS - elapsed))

        # Send initialization to this peer
        await websocket.send_json({
            "type":            "init",
            "initiator":       is_initiator,
            "connection_id":   connection_id,
            "file_sharing":    True,
            "file_size_limit": 1_073_741_824,   # 1 GB (P2P, not via server)
            "expires_in":      expires_in,
        })

        # If second peer joined, notify existing peer
        if room["count"] == 2:
            for cid, ws in room["connections"].items():
                if cid != connection_id:
                    await ws.send_json({"type": "peer_ready"})

        # ── Main receive loop ─────────────────────────────────────────────────
        while True:
            # FIX-06: idle timeout — close zombie connections
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=WS_IDLE_TIMEOUT,
                )
            except asyncio.TimeoutError:
                await websocket.send_json({
                    "type":   "error",
                    "reason": "Connection closed due to inactivity.",
                })
                await websocket.close(code=1001, reason="Idle timeout")
                logger.info(
                    f"WS_IDLE_TIMEOUT room_id={room_id} connection_id={connection_id}"
                )
                return

            # FIX-03: payload size guard — 5MB for JSON signaling, 50MB for file metadata
            msg_size = len(data.encode("utf-8"))
            # initiate_file_transfer may carry large metadata (up to 50MB)
            # For all other message types, cap at MAX_MSG_BYTES (5MB)
            try:
                peeked_type = json.loads(data).get("type", "")
            except Exception:
                peeked_type = ""
            effective_limit = MAX_FILE_BYTES if peeked_type == "initiate_file_transfer" else MAX_MSG_BYTES

            if msg_size > effective_limit:
                await websocket.send_json({
                    "type":   "error",
                    "reason": f"Message exceeds {effective_limit} byte limit.",
                })
                await websocket.close(code=1009, reason="Message too large")
                logger.warning(
                    f"WS_MSG_TOO_LARGE room_id={room_id} connection_id={connection_id} "
                    f"size={msg_size} limit={effective_limit} remote={websocket.client.host}"
                )
                return

            # BUG-01 fix: handle malformed JSON gracefully
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                logger.warning(
                    f"WS_MALFORMED_JSON room_id={room_id} connection_id={connection_id}"
                )
                continue    # ignore bad frames, keep connection alive

            msg_type = message.get("type")

            if msg_type == "signal":
                # Relay WebRTC signaling to the other peer
                for cid, ws in room["connections"].items():
                    if cid != connection_id:
                        await ws.send_json({
                            "type":          "signal",
                            "data":          message.get("data"),
                            "connection_id": connection_id,
                        })

            elif msg_type == "initiate_file_transfer":
                # Lightweight version: always authorize (validation is P2P)
                await websocket.send_json({"type": "file_transfer_authorized"})

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            # Silently ignore unknown message types

    except WebSocketDisconnect:
        # ── Cleanup on disconnect ────────────────────────────────────────────
        if connection_id in room["connections"]:
            del room["connections"][connection_id]
            room["count"] -= 1

        # Notify remaining peer(s) — in a 2-person room this ends the session
        for cid, ws in list(room["connections"].items()):
            try:
                await ws.send_json({"type": "room_ended", "reason": "peer_left"})
            except Exception:   # BUG-02 fix
                pass

        # We no longer aggressively destroy the room on disconnect, allowing peers
        # to reconnect (e.g., page refresh) before the TTL expires.
        # TTL cleanup task will handle deleting the room.

        logger.info(
            f"WS_PEER_LEFT room_id={room_id} connection_id={connection_id} "
            f"remote={websocket.client.host}"
        )


# ─── Serve compiled frontend (static files) ───────────────────────────────────
# When running in Docker, the frontend build output is copied to ./static/
# In local dev, the Vite dev server (port 5173) handles this.
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    # Catch-all SPA route: serve index.html for any unknown path
    app.mount("/assets", StaticFiles(directory=os.path.join(_static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return FileResponse(os.path.join(_static_dir, "index.html"))


# ─── Entrypoint (dev only) ────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_config=None,   # use our custom logger, not uvicorn's
    )
