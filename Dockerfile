# syntax=docker/dockerfile:1
# Kiw Kiw Chat — Production Dockerfile
# Multi-stage: Stage 1 builds the Vite frontend, Stage 2 runs the FastAPI backend.
#
# Build:
#   docker build \
#     --build-arg VITE_API_URL=https://kiwkiw.chat \
#     --build-arg VITE_WS_URL=wss://kiwkiw.chat \
#     -t kiwkiw:latest .
#
# Run:
#   docker run -d \
#     -p 8000:8000 \
#     -e ALLOWED_ORIGINS=https://kiwkiw.chat,https://www.kiwkiw.chat \
#     -e TURN_URL=turn:turn.kiwkiw.chat:3478 \
#     -e TURN_USERNAME=kiwkiw \
#     -e TURN_CREDENTIAL=your_turn_secret \
#     --name kiwkiw kiwkiw:latest

# ══════════════════════════════════════════════════════════════════════════════
# Stage 1 — Build Vite/React frontend
# ══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS frontend-build

WORKDIR /build/frontend

# Install dependencies first (layer cache — only re-runs on package.json change)
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./

# These must be provided at docker build time (they get baked into the JS bundle)
ARG VITE_API_URL=https://kiwkiw.chat
ARG VITE_WS_URL=wss://kiwkiw.chat
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build
# Output: /build/frontend/dist/


# ══════════════════════════════════════════════════════════════════════════════
# Stage 2 — Python/FastAPI production image
# ══════════════════════════════════════════════════════════════════════════════
FROM python:3.12-slim AS production

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Copy FastAPI backend
COPY backend/ ./

# Copy compiled frontend from Stage 1 into ./static/
# FastAPI will serve this as a SPA fallback
COPY --from=frontend-build /build/frontend/dist ./static

# ── Security: run as non-root user ────────────────────────────────────────────
RUN groupadd --system --gid 1001 kiwkiw \
 && useradd  --system --uid 1001 --gid 1001 --no-create-home kiwkiw \
 && chown -R kiwkiw:kiwkiw /app
USER 1001:1001

# ── Runtime config (override via -e flags or docker-compose env_file) ─────────
# ALLOWED_ORIGINS  — comma-separated list of allowed CORS origins
# TURN_URL         — optional: turn:your.turn.server:3478
# TURN_USERNAME    — optional TURN credential username
# TURN_CREDENTIAL  — optional TURN credential secret
# MAX_MSG_BYTES    — default 65536 (64 KB)
# WS_IDLE_TIMEOUT  — default 300 (5 min)
# ROOM_TTL_SECONDS — default 900 (15 min)

EXPOSE 8000

# Use 1 worker (in-memory rooms dict is not shared across processes)
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*", \
     "--no-access-log"]
