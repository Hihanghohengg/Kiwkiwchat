# Laporan Hasil Pengujian Dinamis Minimum Backend API & WebSocket Signaling — Kiw Kiw Chat

Dokumen ini menyajikan hasil empiris pengujian keamanan dinamis minimum terhadap endpoint REST API dan protokol WebSocket Signaling pada **Kiw Kiw Chat** (Prototipe Riset) di lingkungan uji lokal (*Local Test Environment*).

---

## 1. Metadata Lingkungan Pengujian

- **Target Sistem**: REST API (`POST /rooms`) & WebSocket Signaling (`/rooms/{room_id}/ws`)
- **Lingkungan Uji**: http://127.0.0.1:8000 (Local Test Harness)
- **Sistem Operasi**: Windows 10 (10.0.26200) (AMD64)
- **Python Runtime**: Python 3.11.9 (CPython)
- **Git Commit**: `a60bf9fabbf691d3fabb425b42ec0405219dfa8d` (Dirty: `True`)
- **Waktu Eksekusi**: 2026-08-03T03:41:28.347927+00:00
- **Injected Idle Timeout**: 3s (via test environment variable WS_IDLE_TIMEOUT=3)
- **Status Evaluasi Keseluruhan**: **6/6 PASS (100%)**

---

## 2. Ringkasan Hasil Pengujian Minimum (BT-01 s/d BT-06)

| Test ID | Nama Kasus Uji | Target Endpoint | Ancaman Trike | Status | Waktu |
|:---:|---|---|---|:---:|:---:|
| **BT-01** | Third Peer Rejection (Strict 2-peer capacity enforcement) | `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}` | T-04 (Penyusupan Pihak Ketiga ke Dalam Room / 3rd Peer Join) | **PASS** | 2026-08-03T03:41:23.252763+00:00 |
| **BT-02** | API Rate Limiting on POST /rooms (HTTP 429 enforcement) | `POST http://127.0.0.1:8000/rooms` | T-13 (DoS Flooding Pembuatan Room / Resource Exhaustion) | **PASS** | 2026-08-03T03:41:20.831648+00:00 |
| **BT-03** | Oversized WebSocket Payload Rejection (MAX_MSG_BYTES 64 KB guard) | `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}` | T-14 (Exhaustion Memori Melalui Frame WebSocket Raksasa) | **PASS** | 2026-08-03T03:41:23.634333+00:00 |
| **BT-04** | Malformed WebSocket Message Handling (Crash Resilience & Input Sanitization) | `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}` | T-14 (Exhaustion Memori / Server Crash via Malformed Input) | **PASS** | 2026-08-03T03:41:24.222794+00:00 |
| **BT-05** | Explicit Room Destruction & Post-Destruction Reconnection Rejection | `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}` | T-09 (Pengambilalihan Sesi Setelah Salah Satu Peer Keluar) | **PASS** | 2026-08-03T03:41:24.680745+00:00 |
| **BT-06** | WebSocket Idle Timeout Disconnection (WS_IDLE_TIMEOUT Inactivity Guard) | `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}` | T-14 (Exhaustion Memori Melalui Koneksi Idle / Zombie Sockets) | **PASS** | 2026-08-03T03:41:28.142812+00:00 |

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
- **Raw Evidence**: `room_id=e78c70e5-dd3a-40b7-9429-ced39bfc4bb4, peer1_connected=True, peer2_connected=True, peer3_response_frame={'type': 'room_full', 'reason': 'This room already has 2 participants.'}, ws_close_code=1008`
- **Batasan & Scope Limit**: Evaluated on signaling relay level in local test environment; does not evaluate browser endpoint compromise.

```json
{
  "room_id": "e78c70e5-dd3a-40b7-9429-ced39bfc4bb4",
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
- **Kerangka Kerja**: Microsoft SDL & Trike Threat Modeling (T-14 (Exhaustion Memori Melalui Frame WebSocket Raksasa))
- **Security Requirement**: SR-16 (MAX_MSG_BYTES 64 KB Payload Guard & Socket Close 1009)
- **Command / Execution Method**: `python tests/security/test_backend_websocket_security.py --test BT-03`
- **Expected Result**: Sending a message payload exceeding MAX_MSG_BYTES (65,536 bytes) causes connection termination with WebSocket close code 1009.
- **Actual Result**: Oversized frame (65694 B) rejected with error frame: {'type': 'error', 'reason': 'Message exceeds 65536 byte limit.'}, close code: 1009
- **Status Verifikasi**: **PASS**
- **Raw Evidence**: `room_id=9c56fdf2-d94d-40c0-9a59-5e57827d538a, payload_size_bytes=65694, max_limit=65536, error_frame={'type': 'error', 'reason': 'Message exceeds 65536 byte limit.'}, close_code=1009`
- **Batasan & Scope Limit**: Evaluated at single-frame size limit; does not evaluate continuous streaming fragmentation memory attacks.

```json
{
  "room_id": "9c56fdf2-d94d-40c0-9a59-5e57827d538a",
  "payload_size_bytes": 65694,
  "error_frame": {
    "type": "error",
    "reason": "Message exceeds 65536 byte limit."
  },
  "close_code": 1009
}
```

---

### BT-04 — Malformed WebSocket Message Handling (Crash Resilience & Input Sanitization)

- **Target**: `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}`
- **Kerangka Kerja**: Microsoft SDL & Trike Threat Modeling (T-14 (Exhaustion Memori / Server Crash via Malformed Input))
- **Security Requirement**: SR-16 (Robust JSON Parsing & Graceful Error Handling)
- **Command / Execution Method**: `python tests/security/test_backend_websocket_security.py --test BT-04`
- **Expected Result**: Malformed frames (invalid JSON, empty object, missing type, invalid field types) are handled gracefully without server exception or crash; subsequent valid frames succeed.
- **Actual Result**: Server handled 4 malformed cases gracefully without crash and responded to ping with pong.
- **Status Verifikasi**: **PASS**
- **Raw Evidence**: `room_id=e5edf1f1-c889-42f9-8b85-21a68bfcf7c4, tested_malformed_cases=4, cases=['invalid_json', 'empty_object', 'missing_type', 'invalid_field_type'], server_ping_response={'type': 'pong'}`
- **Batasan & Scope Limit**: Evaluates structural payload resilience; does not substitute full RFC 6455 protocol-level fuzzing.

```json
{
  "room_id": "e5edf1f1-c889-42f9-8b85-21a68bfcf7c4",
  "malformed_cases": [
    {
      "label": "invalid_json",
      "payload": "NOT_JSON_DATA_<<<>>>@@@",
      "sent": true
    },
    {
      "label": "empty_object",
      "payload": "{}",
      "sent": true
    },
    {
      "label": "missing_type",
      "payload": "{\"payload\": \"untyped_data\", \"value\": 42}",
      "sent": true
    },
    {
      "label": "invalid_field_type",
      "payload": "{\"type\": 12345, \"data\": [\"invalid_type_array\"]}",
      "sent": true
    }
  ],
  "ping_pong_verified": true
}
```

---

### BT-05 — Explicit Room Destruction & Post-Destruction Reconnection Rejection

- **Target**: `ws://127.0.0.1:8000/rooms/{room_id}/ws?token={token}`
- **Kerangka Kerja**: Microsoft SDL & Trike Threat Modeling (T-09 (Pengambilalihan Sesi Setelah Salah Satu Peer Keluar))
- **Security Requirement**: SR-11 (Instant Room Destruction & Memory Table Purging)
- **Command / Execution Method**: `python tests/security/test_backend_websocket_security.py --test BT-05`
- **Expected Result**: Destroying room terminates all peer connections and rejects subsequent reconnection attempts with 'Room not found' (close code 1008).
- **Actual Result**: Room destroyed: Peer 2 received 'room_ended' frame (code: 1008); reconnect rejected with {'type': 'error', 'reason': 'Room not found or expired.'} (code: 1008).
- **Status Verifikasi**: **PASS**
- **Raw Evidence**: `room_id=934ade68-b9b3-4eb7-8c4b-c9601973021c, peer2_room_ended=True, peer2_close_code=1008, reconnect_rejected=True, reconnect_frame={'type': 'error', 'reason': 'Room not found or expired.'}, reconnect_close_code=1008`
- **Batasan & Scope Limit**: Evaluates in-memory session cleanup; does not evaluate distributed memory cache synchronization across multiple nodes.

```json
{
  "room_id": "934ade68-b9b3-4eb7-8c4b-c9601973021c",
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
- **Raw Evidence**: `room_id=56850f19-c012-4b3c-bfde-5420a49cdf8a, injected_timeout_threshold=3.0s, measured_elapsed=3.00s, timeout_frame={'type': 'error', 'reason': 'Connection closed due to inactivity.'}, close_code=1001`
- **Batasan & Scope Limit**: Injected 3.0s timeout in test harness; production environment uses 60.0s default timeout.

```json
{
  "room_id": "56850f19-c012-4b3c-bfde-5420a49cdf8a",
  "injected_timeout_threshold_seconds": 3.0,
  "measured_elapsed_seconds": 3.004,
  "timeout_frame": {
    "type": "error",
    "reason": "Connection closed due to inactivity."
  },
  "close_code": 1001
}
```

---

## 4. Keterbatasan Pengujian Empiris & Integritas Ilmiah (Honesty & Limitations)

Pengujian dinamis ini merupakan evaluasi keamanan minimum terfokus pada test harness lokal. Sesuai prinsip integritas ilmiah SSDLC:

1. **Bukan Full Active Penetration Testing**: Rangkaian uji BT-01 s/d BT-06 mengevaluasi kontrol logika spesifik dan tidak menggantikan *full active penetration testing* profesional terhadap seluruh arsitektur infrastruktur cloud.
2. **Bukan WebSocket Protocol Fuzzing**: Pengujian BT-04 memvalidasi ketahanan terhadap variasi format payload JSON struktural, namun bukan merupakan *protocol-level mutation fuzzing* RFC 6455 komprehensif.
3. **Bukan Uji DDoS Produksi**: Pengujian rate limiting BT-02 membuktikan penegakan ambang batas SlowAPI per-IP pada beban sekuensial cepat pada single instance, bukan simulasi serangan *Distributed Denial of Service* (DDoS) multi-IP terdistribusi berskala besar.
4. **Pembersihan Memori Fisik (T-06)**: Batasan runtime JavaScript (V8 Engine) tetap berlaku; dereferensi variabel tidak menjamin *deterministic physical RAM zeroization*.
5. **Replay Protection (RP-01 / T-08)**: Status pengujian `RP-01` tetap **PARTIAL** karena sequence counter dievaluasi pada layer *application envelope*; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual.
