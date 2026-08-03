# Laporan Hasil Pengujian Dinamis Minimum Backend API & WebSocket Signaling — Kiw Kiw Chat

Dokumen ini menyajikan hasil empiris pengujian keamanan dinamis minimum terhadap endpoint REST API, kebijakan CORS, dan protokol WebSocket Signaling pada **Kiw Kiw Chat** (Prototipe Riset) di lingkungan uji lokal (*Local Test Environment*).

---

## 1. Metadata Lingkungan Pengujian

- **Target Sistem**: REST API (`POST /rooms`), CORS Preflight (`OPTIONS /rooms`) & WebSocket Signaling (`/rooms/{room_id}/ws`)
- **Lingkungan Uji**: http://127.0.0.1:8000 (Local Test Harness)
- **Sistem Operasi**: Windows 10 (10.0.26200) (AMD64)
- **Python Runtime**: Python 3.11.9 (CPython)
- **Git Commit**: `5ba96e22895f8bd4df67b0d004a9ff2c02722f12` (Dirty: `True`)
- **Waktu Eksekusi**: 2026-08-03T04:20:15.605084+00:00
- **Injected Idle Timeout**: 3s (via test environment variable WS_IDLE_TIMEOUT=3)
- **Status Evaluasi Keseluruhan**: **8/8 PASS (100.0%)**

---

## 2. Ringkasan Hasil Pengujian Minimum (BT-01 s/d BT-08)

| Test ID | Nama Kasus Uji | Target Endpoint | Ancaman Trike | Status | Waktu |
|:---:|---|---|---|:---:|:---:|
| **BT-01** | Third Peer Rejection (Strict 2-peer capacity enforcement) | `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}` | T-04 (Penyusupan Pihak Ketiga ke Dalam Room / 3rd Peer Join) | **PASS** | 2026-08-03T04:20:10.111523+00:00 |
| **BT-02** | API Rate Limiting on POST /rooms (HTTP 429 enforcement) | `POST http://127.0.0.1:8000/rooms` | T-13 (DoS Flooding Pembuatan Room / Resource Exhaustion) | **PASS** | 2026-08-03T04:20:06.805541+00:00 |
| **BT-03** | Oversized WebSocket Payload Rejection (MAX_MSG_BYTES 64 KB guard) | `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}` | T-14 (Memory Exhaustion / WebSocket Payload Flooding) | **PASS** | 2026-08-03T04:20:10.530443+00:00 |
| **BT-04** | Malformed WebSocket Message Handling (Parser resilience) | `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}` | T-14 (Server Crash / Unhandled Exception via Malformed JSON) | **PASS** | 2026-08-03T04:20:11.664535+00:00 |
| **BT-05** | Destroy Room and Reconnection (Room lifecycle teardown & reject on reconnect) | `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}` | T-09 (Pengambilalihan Sesi Ephemeral Pasca Teardown) | **PASS** | 2026-08-03T04:20:12.023547+00:00 |
| **BT-06** | WebSocket Idle Timeout Disconnection (WS_IDLE_TIMEOUT Inactivity Guard) | `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}` | T-14 (Exhaustion Memori Melalui Koneksi Idle / Zombie Sockets) | **PASS** | 2026-08-03T04:20:15.373778+00:00 |
| **BT-07** | Trusted Origin CORS Preflight (CORS Whitelist Verification) | `OPTIONS http://127.0.0.1:8000/rooms` | T-11 (Akses API Lintas Domain Tanpa Izin / CORS Bypass) | **PASS** | 2026-08-03T04:20:07.179722+00:00 |
| **BT-08** | Untrusted Origin CORS Preflight (CORS Origin Restriction Verification) | `OPTIONS http://127.0.0.1:8000/rooms` | T-11 (Akses API Lintas Domain Tanpa Izin / CORS Bypass) | **PASS** | 2026-08-03T04:20:07.557737+00:00 |

---

## 3. Rincian Kasus Uji, Perintah, Bukti Mentah & Batasan

### BT-01 — Third Peer Rejection (Strict 2-peer capacity enforcement)

- **Target**: `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}`
- **Kerangka Kerja**: Microsoft SDL & Trike Threat Modeling (T-04 (Penyusupan Pihak Ketiga ke Dalam Room / 3rd Peer Join))
- **Security Requirement**: SR-09 (Strict 2-Peer Max Capacity & Socket Close 1008)
- **Command / Execution Method**: `python tests/security/test_backend_websocket_security.py --test BT-01`
- **Expected Result**: Peer 3 is rejected with a 'room_full' frame and WebSocket close code 1008 when attempting to join a room with 2 active peers.
- **Actual Result**: Peer 3 rejected with frame: {'type': 'room_full', 'reason': 'This room already has 2 participants.'}, close code: 1008
- **Status Verifikasi**: **PASS**
- **Raw Evidence**: `room_id=346239af-2df4-4dd7-a4e0-6d2dc7e91451, peer1_connected=True, peer2_connected=True, peer3_response_frame={'type': 'room_full', 'reason': 'This room already has 2 participants.'}, ws_close_code=1008`
- **Batasan & Scope Limit**: Evaluated on signaling relay level in local test environment; does not evaluate browser endpoint compromise.

```json
{
  "room_id": "346239af-2df4-4dd7-a4e0-6d2dc7e91451",
  "peer3_frame": {
    "type": "room_full",
    "reason": "This room already has 2 participants."
  },
  "close_code": 1008
}
```

---

### BT-02 — API Rate Limiting on POST /rooms (HTTP 429 enforcement)

- **Target**: `POST http://127.0.0.1:8000/rooms`
- **Kerangka Kerja**: Microsoft SDL & Trike Threat Modeling (T-13 (DoS Flooding Pembuatan Room / Resource Exhaustion))
- **Security Requirement**: SR-15 (SlowAPI Rate Limiting 10 req/IP/min)
- **Command / Execution Method**: `python tests/security/test_backend_websocket_security.py --test BT-02`
- **Expected Result**: Sequential requests within a 1-minute window: requests 1-10 are accepted (HTTP 200), request 11 onwards returns HTTP 429 Too Many Requests.
- **Actual Result**: Rate limit threshold strictly verified: exactly 10 requests accepted (HTTP 200), subsequent 6 requests returned HTTP 429 (total requests: 16).
- **Status Verifikasi**: **PASS**
- **Raw Evidence**: `sequential_requests_count=16, accepted_200=10, rejected_429=6, status_code_stream=[200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 429, 429, 429, 429, 429, 429]`
- **Batasan & Scope Limit**: Evaluated on single IP sequential bursts in local test harness; does not simulate distributed cloud botnets.

```json
{
  "total_requests": 16,
  "requests_before_limit": 10,
  "count_200": 10,
  "count_429": 6,
  "status_codes": [
    200,
    200,
    200,
    200,
    200,
    200,
    200,
    200,
    200,
    200,
    429,
    429,
    429,
    429,
    429,
    429
  ]
}
```

---

### BT-03 — Oversized WebSocket Payload Rejection (MAX_MSG_BYTES 64 KB guard)

- **Target**: `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}`
- **Kerangka Kerja**: Microsoft SDL & Trike Threat Modeling (T-14 (Memory Exhaustion / WebSocket Payload Flooding))
- **Security Requirement**: SR-16 (MAX_MSG_BYTES 64 KB Payload Limit & Close Code 1009)
- **Command / Execution Method**: `python tests/security/test_backend_websocket_security.py --test BT-03`
- **Expected Result**: WebSocket frames exceeding MAX_MSG_BYTES (65,536 bytes) are rejected and connection is terminated with close code 1009 or explicit rejection frame.
- **Actual Result**: Oversized frame (66,560 bytes) rejected: close code 1009, response frame: {'type': 'error', 'reason': 'Message exceeds 65536 byte limit.'}
- **Status Verifikasi**: **PASS**
- **Raw Evidence**: `room_id=3fd28180-da02-4094-b4f3-5515d0bbc140, payload_bytes=66588, max_limit=65536, ws_close_code=1009, error_frame={'type': 'error', 'reason': 'Message exceeds 65536 byte limit.'}`
- **Batasan & Scope Limit**: Evaluated on single frame exceeding 64 KB; does not simulate streaming multi-gigabyte TCP stream fragmentation.

```json
{
  "room_id": "3fd28180-da02-4094-b4f3-5515d0bbc140",
  "payload_size_bytes": 66588,
  "close_code": 1009,
  "error_frame": {
    "type": "error",
    "reason": "Message exceeds 65536 byte limit."
  }
}
```

---

### BT-04 — Malformed WebSocket Message Handling (Parser resilience)

- **Target**: `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}`
- **Kerangka Kerja**: Microsoft SDL & Trike Threat Modeling (T-14 (Server Crash / Unhandled Exception via Malformed JSON))
- **Security Requirement**: SR-16 (WebSocket Message Schema Validation & Error Resilience)
- **Command / Execution Method**: `python tests/security/test_backend_websocket_security.py --test BT-04`
- **Expected Result**: Malformed messages (non-JSON, empty object, missing type, invalid data types) are safely ignored or rejected without causing backend server crash.
- **Actual Result**: Processed 6 malformed payloads without unhandled exceptions; server health verified post-test.
- **Status Verifikasi**: **PASS**
- **Raw Evidence**: `room_id=aae754a6-d9fa-4d3b-8f6a-bd4ef7088e80, cases_tested=6, cases_list=['invalid_json', 'empty_object', 'missing_type', 'invalid_type_field', 'null_type', 'unsupported_type'], server_responsive=True`
- **Batasan & Scope Limit**: Structural mutation fuzzing of JSON payload; not a full RFC 6455 transport-layer frame mutation fuzzer.

```json
{
  "tested_cases": [
    {
      "case": "invalid_json",
      "payload_sent": "{not_valid_json: 1234,"
    },
    {
      "case": "empty_object",
      "payload_sent": "{}"
    },
    {
      "case": "missing_type",
      "payload_sent": "{\"payload\": \"no_type_field\"}"
    },
    {
      "case": "invalid_type_field",
      "payload_sent": "{\"type\": 12345}"
    },
    {
      "case": "null_type",
      "payload_sent": "{\"type\": null}"
    },
    {
      "case": "unsupported_type",
      "payload_sent": "{\"type\": \"UNSUPPORTED_MALICIOUS_TYPE\"}"
    }
  ],
  "server_survived": true
}
```

---

### BT-05 — Destroy Room and Reconnection (Room lifecycle teardown & reject on reconnect)

- **Target**: `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}`
- **Kerangka Kerja**: Microsoft SDL & Trike Threat Modeling (T-09 (Pengambilalihan Sesi Ephemeral Pasca Teardown))
- **Security Requirement**: SR-10 (Explicit Room Destruction & Post-Session Reconnection Invalidation)
- **Command / Execution Method**: `python tests/security/test_backend_websocket_security.py --test BT-05`
- **Expected Result**: When a peer initiates destroy_room, peer 2 receives 'room_ended' frame and socket is closed; subsequent reconnection attempts to the destroyed room are rejected ('Room not found').
- **Actual Result**: Room destroyed: Peer 2 received 'room_ended' frame (code: 1008); reconnect rejected with {'type': 'error', 'reason': 'Room not found or expired.'} (code: 1008).
- **Status Verifikasi**: **PASS**
- **Raw Evidence**: `room_id=4675a157-f4da-48ac-9249-6ee4b10fefd8, peer2_room_ended=True, peer2_close_code=1008, reconnect_rejected=True, reconnect_frame={'type': 'error', 'reason': 'Room not found or expired.'}, reconnect_close_code=1008`
- **Batasan & Scope Limit**: Evaluated on server-side in-memory room store eviction; browser-side tab cleanup evaluated in Playwright E2E-04.

```json
{
  "room_id": "4675a157-f4da-48ac-9249-6ee4b10fefd8",
  "peer2_room_ended": true,
  "reconnect_error_frame": {
    "type": "error",
    "reason": "Room not found or expired."
  },
  "reconnect_close_code": 1008
}
```

---

### BT-06 — WebSocket Idle Timeout Disconnection (WS_IDLE_TIMEOUT Inactivity Guard)

- **Target**: `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}`
- **Kerangka Kerja**: Microsoft SDL & Trike Threat Modeling (T-14 (Exhaustion Memori Melalui Koneksi Idle / Zombie Sockets))
- **Security Requirement**: SR-16 (WebSocket Idle Timeout Disconnection & Socket Close 1001)
- **Command / Execution Method**: `python tests/security/test_backend_websocket_security.py --test BT-06 (WS_IDLE_TIMEOUT=3)`
- **Expected Result**: An idle connection exceeding WS_IDLE_TIMEOUT (3.0s in test env) is terminated with close code 1001 and an inactivity timeout error frame.
- **Actual Result**: Idle connection closed after 3.00s with frame: {'type': 'error', 'reason': 'Connection closed due to inactivity.'}, close code: 1001
- **Status Verifikasi**: **PASS**
- **Raw Evidence**: `room_id=dd5986e1-b8ea-4e05-b1f4-bf7aedc82ff1, injected_timeout_threshold=3.0s, measured_elapsed=3.00s, timeout_frame={'type': 'error', 'reason': 'Connection closed due to inactivity.'}, close_code=1001`
- **Batasan & Scope Limit**: Injected 3.0s timeout in test harness; production environment uses 60.0s default timeout.

```json
{
  "room_id": "dd5986e1-b8ea-4e05-b1f4-bf7aedc82ff1",
  "injected_timeout_threshold_seconds": 3.0,
  "measured_elapsed_seconds": 2.997,
  "timeout_frame": {
    "type": "error",
    "reason": "Connection closed due to inactivity."
  },
  "close_code": 1001
}
```

---

### BT-07 — Trusted Origin CORS Preflight (CORS Whitelist Verification)

- **Target**: `OPTIONS http://127.0.0.1:8000/rooms`
- **Kerangka Kerja**: Microsoft SDL & Trike Threat Modeling (T-11 (Akses API Lintas Domain Tanpa Izin / CORS Bypass))
- **Security Requirement**: SR-13 (CORS Origin Whitelisting pada API Endpoint)
- **Command / Execution Method**: `python tests/security/test_backend_websocket_security.py --test BT-07`
- **Expected Result**: OPTIONS preflight with trusted Origin (https://kiwkiwchat.vercel.app) returns Access-Control-Allow-Origin matching the trusted origin, allows method POST, and does not use conflicting wildcard configurations.
- **Actual Result**: Status: 200; Access-Control-Allow-Origin: 'https://kiwkiwchat.vercel.app' (matched: True); Access-Control-Allow-Methods: 'POST, OPTIONS' (POST allowed: True); Access-Control-Allow-Headers: 'Accept, Accept-Language, Content-Language, Content-Type'.
- **Status Verifikasi**: **PASS**
- **Raw Evidence**: `req_origin=https://kiwkiwchat.vercel.app, resp_status=200, resp_allow_origin=https://kiwkiwchat.vercel.app, resp_allow_methods=POST, OPTIONS, resp_allow_headers=Accept, Accept-Language, Content-Language, Content-Type, all_headers={'date': 'Mon, 03 Aug 2026 04:20:06 GMT', 'server': 'uvicorn', 'vary': 'Origin', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-max-age': '600', 'access-control-allow-headers': 'Accept, Accept-Language, Content-Language, Content-Type', 'access-control-allow-origin': 'https://kiwkiwchat.vercel.app', 'content-length': '2', 'content-type': 'text/plain; charset=utf-8'}`
- **Batasan & Scope Limit**: Evaluated on local test harness against configured ALLOWED_ORIGINS; production edge headers managed via reverse proxy / cloud deployment.

```json
{
  "request_origin": "https://kiwkiwchat.vercel.app",
  "response_status": 200,
  "allow_origin_header": "https://kiwkiwchat.vercel.app",
  "allow_methods_header": "POST, OPTIONS",
  "allow_headers_header": "Accept, Accept-Language, Content-Language, Content-Type",
  "response_headers": {
    "date": "Mon, 03 Aug 2026 04:20:06 GMT",
    "server": "uvicorn",
    "vary": "Origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "600",
    "access-control-allow-headers": "Accept, Accept-Language, Content-Language, Content-Type",
    "access-control-allow-origin": "https://kiwkiwchat.vercel.app",
    "content-length": "2",
    "content-type": "text/plain; charset=utf-8"
  },
  "origin_matched": true,
  "post_allowed": true,
  "not_wildcard_conflict": true
}
```

---

### BT-08 — Untrusted Origin CORS Preflight (CORS Origin Restriction Verification)

- **Target**: `OPTIONS http://127.0.0.1:8000/rooms`
- **Kerangka Kerja**: Microsoft SDL & Trike Threat Modeling (T-11 (Akses API Lintas Domain Tanpa Izin / CORS Bypass))
- **Security Requirement**: SR-13 (CORS Origin Whitelisting pada API Endpoint)
- **Command / Execution Method**: `python tests/security/test_backend_websocket_security.py --test BT-08`
- **Expected Result**: OPTIONS preflight with untrusted Origin (https://untrusted.example) does not return Access-Control-Allow-Origin matching the untrusted origin (or rejects/omits header), preventing cross-origin data access by unauthorized domains while server stays operational.
- **Actual Result**: Status: 400; Access-Control-Allow-Origin: None (untrusted origin rejected: True); Response body: 'Disallowed CORS origin'.
- **Status Verifikasi**: **PASS**
- **Raw Evidence**: `req_origin=https://untrusted.example, resp_status=400, resp_allow_origin=None, resp_body=Disallowed CORS origin, all_headers={'date': 'Mon, 03 Aug 2026 04:20:06 GMT', 'server': 'uvicorn', 'vary': 'Origin', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-max-age': '600', 'access-control-allow-headers': 'Accept, Accept-Language, Content-Language, Content-Type', 'content-length': '22', 'content-type': 'text/plain; charset=utf-8'}`
- **Batasan & Scope Limit**: Evaluated on local test harness against configured ALLOWED_ORIGINS; production edge headers managed via reverse proxy / cloud deployment.

```json
{
  "request_origin": "https://untrusted.example",
  "response_status": 400,
  "allow_origin_header": null,
  "response_body": "Disallowed CORS origin",
  "response_headers": {
    "date": "Mon, 03 Aug 2026 04:20:06 GMT",
    "server": "uvicorn",
    "vary": "Origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "600",
    "access-control-allow-headers": "Accept, Accept-Language, Content-Language, Content-Type",
    "content-length": "22",
    "content-type": "text/plain; charset=utf-8"
  },
  "untrusted_rejected": true
}
```

---

## 4. Keterbatasan Pengujian Empiris & Integritas Ilmiah (Honesty & Limitations)

Pengujian dinamis ini merupakan evaluasi keamanan minimum terfokus pada test harness lokal. Sesuai prinsip integritas ilmiah SSDLC:

1. **Bukan Full Active Penetration Testing**: Rangkaian uji BT-01 s/d BT-08 mengevaluasi kontrol logika spesifik (kapasitas peer, rate limiting, payload guard, parser resilience, lifecycle teardown, idle timeout, dan CORS preflight whitelisting) dan tidak menggantikan *full active penetration testing* profesional terhadap seluruh arsitektur infrastruktur cloud.
2. **Bukan WebSocket Protocol Fuzzing**: Pengujian BT-04 memvalidasi ketahanan terhadap variasi format payload JSON struktural, namun bukan merupakan *protocol-level mutation fuzzing* RFC 6455 komprehensif.
3. **Bukan Uji DDoS Produksi**: Pengujian rate limiting BT-02 membuktikan penegakan ambang batas SlowAPI per-IP pada beban sekuensial cepat pada single instance, bukan simulasi serangan *Distributed Denial of Service* (DDoS) multi-IP terdistribusi berskala besar.
4. **Pembersihan Memori Fisik (T-06)**: Batasan runtime JavaScript (V8 Engine) tetap berlaku; dereferensi variabel tidak menjamin *deterministic physical RAM zeroization*.
5. **Replay Protection (RP-01 / T-08)**: Status pengujian `RP-01` tetap **PARTIAL** karena sequence counter dievaluasi pada layer *application envelope*; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual.
