# SSDLC & Trike Traceability Matrix — Kiw Kiw Chat

Matriks keterlacakan menyeluruh menghubungkan seluruh elemen keamanan dari identifikasi ancaman hingga bukti pengujian aktual:

$$\text{Threat} \longrightarrow \text{Security Requirement} \longrightarrow \text{Design Control} \longrightarrow \text{Source Code} \longrightarrow \text{Test Case} \longrightarrow \text{Evidence} \longrightarrow \text{Residual Risk}$$

---

## Tabel Matriks Keterlacakan

| Threat ID | Security Requirement | Design Control | Implementasi Source Code | Test Case ID | Bukti Pengujian (Evidence) | Residual Risk |
|---|---|---|---|---|---|---|
| **T-01** (Eavesdropping) | **SR-01**, **SR-07** | Authenticated Encryption AES-GCM-256 pada WebRTC DataChannel | `frontend/src/crypto/encryption.js:40-63` | `AE-01`, `E2E-01`, `E2E-02` | `impkrip_test_report.json` (PASS) | Low |
| **T-02** (Quantum Threat) | **SR-03**, **SR-04** | PSK-assisted ML-KEM Key Encapsulation (ML-KEM-768 + HKDF) | `frontend/src/crypto/mlkem.js`, `pq_upgrade.js` | `PQ-01`, `PQ-02`, `KD-01` | `impkrip_test_report.json` (PASS) | Low |
| **T-03** (Server Leak) | **SR-02**, **SR-06** | In-Memory Signaling & RFC 3986 URL Fragment Key | `frontend/src/App.jsx:generateRoomKey`, `backend/main.py` | `E2E-01` | DevTools Network Inspector (Zero Key on Wire) | Low |
| **T-04** (3rd Peer Flooding) | **SR-09** | Strict 2-Peer Enforcement di WebSocket Server | `backend/main.py:websocket_endpoint` | `E2E-03` | `impkrip_test_report.json` (PASS) | Low |
| **T-05** (MitM Key Exchange) | **SR-08** | Mutual Key Confirmation via HMAC-SHA-256 dengan Nonces | `frontend/src/crypto/pq_upgrade.js:verifyConfirmHmac` | `KC-01`, `KC-02` | `impkrip_test_report.json` (PASS) | Low |
| **T-06** (Memory Extraction) | **SR-05** | Penghapusan variabel kunci privat segera setelah operasi | `frontend/src/crypto/pq_upgrade.js:delete peer._pqSecretKey` | `PQ-02` | Audit Static Analysis & Playwright Heap Inspector | Low |
| **T-07** (URL History Leak) | **SR-02**, **SR-10** | URL Fragment Key + Room Expiration Timer (TTL 15 Menit) | `frontend/src/hooks/useCountdown.js`, `backend/main.py` | `E2E-04` | TTL Server Task Verification | Low |
| **T-08** (Replay Attack) | **SR-01** | IV Fresh 12-byte per pesan + Sequence Counter pada AAD | `frontend/src/crypto/encryption.js:encrypt` | `AE-04`, `RP-01` | `impkrip_test_report.json` (AE-04 PASS, RP-01 PARTIAL) | Low |
| **T-09** (Room Takeover) | **SR-11** | Room Deletion & `room_ended` event saat peer disconnect | `backend/main.py:websocket_endpoint` | `E2E-04` | `impkrip_test_report.json` (PASS) | Low |
| **T-10** (Cache History Leak) | **SR-05**, **SR-12** | Pembersihan `sessionStorage` saat room dimusnahkan | `frontend/src/utils/storage.js:clearRoomStorage` | `E2E-04` | `impkrip_test_report.json` (PASS) | Low |
| **T-11** (CORS Bypass) | **SR-13** | Strict CORS Whitelist (`ALLOWED_ORIGINS`) | `backend/main.py:CORSMiddleware` | Header Check | Browser Preflight Audit & CORS test | Low |
| **T-12** (Direct WS Bypass) | **SR-14** | Validasi keberadaan room ID sebelum menerima koneksi WS | `backend/main.py:websocket_endpoint` | Negative Test | Backend Negative Test (Close 1008) | Low |
| **T-13** (DoS via Flooding) | **SR-15** | Rate Limiting 10 req/IP/menit via SlowAPI | `backend/main.py:limiter` | Rate Test | HTTP 429 Too Many Requests Verification | Low |
| **T-14** (Memory DoS Payload)| **SR-16** | Pembatasan ukuran pesan WebSocket maksimal 64 KB | `backend/main.py:websocket_endpoint` | Payload Test | WS Close Code 1009 Verification | Low |
| **T-15** (SAST Vulnerability)| **SR-17** | Pemindaian statis backend Python menggunakan Bandit | `backend/.bandit` | `Bandit Scan` | `artifacts/ssdlc_final/bandit_report.json` (0 High, 1 Med B104, 3 Low B110) | Low |
| **T-16** (DAST / Web Risks)  | **SR-18** | Evaluasi keamanan dinamis, CSP ketat, dan SRI hashes | `frontend/index.html`, `vercel.json` | Config Audit | `artifacts/ssdlc_final/zap_dast_verification.md` | Low |
