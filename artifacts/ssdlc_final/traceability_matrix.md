# Matriks Keterlacakan Keamanan End-to-End (Security Traceability Matrix) — Kiw Kiw Chat

Dokumen ini menyajikan matriks keterlacakan (*Traceability Matrix*) komprehensif yang menghubungkan seluruh elemen keamanan perangkat lunak dari hulu ke hilir:
$$\text{Use Case} \longrightarrow \text{Abuse Case} \longrightarrow \text{Security Requirement} \longrightarrow \text{Trike Threat (T-01..16)} \longrightarrow \text{Implementation Control} \longrightarrow \text{Test Case ID} \longrightarrow \text{Status}$$

---

## 1. Tabel Keterlacakan Lengkap (End-to-End Traceability)

| Use Case | Abuse Case | Security Req. | Trike Threat | Kontrol Implementasi Sumber | Test Case ID / Method | Raw Evidence Ref | Status Verifikasi |
|---|---|---|---|---|---|---|:---:|
| **UC-01** (Room Init) | **AC-06** (Room Flooding) | **SR-15** (Rate Limiting) | **T-13** (DoS Flooding) | `backend/main.py:create_room` | `BT-02` (Local Dynamic API Rate Limit Test) | `backend_websocket_test_results.json` | **PASS** |
| **UC-02** (Link Share) | **AC-01** (Signaling Sniff) | **SR-02** (Key in Fragment) | **T-03, T-07** (Relay Sniff / URL Leak) | `frontend/src/App.jsx:generateRoomKey` | `E2E-01`, `E2E-04` | `impkrip_test_report.json` | **PASS** |
| **UC-03** (Peer B Join) | **AC-02** (Unauthorized Entry) | **SR-08, SR-14** (Token Auth) | **T-04, T-12** (3rd Peer / Rogue WS) | `backend/main.py:websocket_endpoint` | `E2E-03`, `BT-01`, `BT-05` | `impkrip_test_report.json`, `backend_websocket_test_results.json` | **PASS** |
| **UC-04** (Signaling) | **AC-07** (WS Frame Bomb) | **SR-16** (Frame & Idle Guard) | **T-14** (Memory Exhaustion) | `backend/main.py:MAX_MSG_BYTES, WS_IDLE_TIMEOUT` | `BT-03`, `BT-04`, `BT-06` | `backend_websocket_test_results.json` | **PASS** |
| **UC-04** (Signaling) | **AC-08** (CORS Spoofing) | **SR-13** (CORS Whitelist) | **T-11** (CORS Bypass) | `backend/main.py:ALLOWED_ORIGINS` | Static Code Review | `backend/main.py:114-119` | **CODE_REVIEW_ONLY** |
| **UC-05** (PQ Upgrade) | **AC-03** (Quantum Sniffing) | **SR-03** (ML-KEM-768) | **T-02** (Quantum Cryptanalysis) | `frontend/src/crypto/mlkem.js` | `PQ-01`, `PQ-02`, `PQ-03`, `PQ-04` | `impkrip_test_report.json` | **PASS** |
| **UC-05** (PQ Upgrade) | **AC-03** (Key Derivation) | **SR-04** (HKDF Fusion) | **T-02** (Quantum Cryptanalysis) | `frontend/src/crypto/encryption.js` | `KD-01`, `KD-02`, `KD-03`, `KD-04` | `impkrip_test_report.json` | **PASS** |
| **UC-05** (PQ Upgrade) | **AC-03** (Handshake Tamper) | **SR-08** (HMAC Transcript) | **T-05** (MitM Handshake) | `frontend/src/crypto/pq_upgrade.js` | `KC-01`, `KC-02` | `impkrip_test_report.json` | **PASS** |
| **UC-05** (PQ Upgrade) | **AC-03** (RAM Key Theft) | **SR-06** (Memory Dereference) | **T-06** (RAM Key Extraction) | `frontend/src/crypto/pq_upgrade.js` | Code Review & Heap Benchmark Checkpoint | `impkrip_memory_benchmark.json` | **PARTIAL** |
| **UC-06** (E2EE Chat) | **AC-04** (DataChannel Sniff) | **SR-01, SR-07** (AES-GCM) | **T-01** (DataChannel Sniffing) | `frontend/src/crypto/encryption.js` | `AE-01`, `AE-02`, `AE-03`, `E2E-01` | `impkrip_test_report.json` | **PASS** |
| **UC-06** (E2EE Chat) | **AC-04** (Envelope Replay) | **SR-07** (AAD Sequence Binding) | **T-08** (Envelope Replay) | `frontend/src/crypto/encryption.js` | `AE-04`, `RP-01` | `impkrip_test_report.json` | **PARTIAL** |
| **UC-07** (Room Timer) | **AC-10** (Zombie Room) | **SR-10** (15-Min Room TTL) | **T-07, T-09** (Session Hijacking) | `backend/main.py:destroy_room_later` | `E2E-04` | `impkrip_test_report.json` | **PASS** |
| **UC-08** (Tab Refresh) | **AC-09** (Storage Forensics) | **SR-05, SR-12** (Ephemeral) | **T-10** (Cache Extraction) | `frontend/src/utils/storage.js` | `E2E-04` | `impkrip_test_report.json` | **PASS** |
| **UC-09** (Room Teardown) | **AC-02** (Post-Exit Hijack) | **SR-11** (Instant Teardown) | **T-09** (Session Hijacking) | `backend/main.py:websocket_endpoint` | `E2E-04`, `BT-05` | `impkrip_test_report.json`, `backend_websocket_test_results.json` | **PASS** |
| **UC-10** (3rd Peer Reject)| **AC-02** (3rd Peer Join) | **SR-09** (Strict Capacity 2) | **T-04** (3rd Peer Join) | `backend/main.py:count >= 2` | `E2E-03`, `BT-01` | `impkrip_test_report.json`, `backend_websocket_test_results.json` | **PASS** |
| **N/A** (Code Quality) | **AC-06** (Code Flaws) | **SR-17** (SAST Cleanliness) | **T-15** (Static Code Flaws) | `backend/.bandit` | Bandit SAST Scan v1.9.4 | `bandit_report.json` | **PASS (0 High)** |
| **N/A** (Web Security) | **AC-08** (Clickjacking/XSS) | **SR-18** (CSP & Headers) | **T-16** (UI Script Injection) | `frontend/index.html`, `backend/main.py`, `vercel.json` | OWASP ZAP 2.17.0 Passive Scan | `zap_report_2026-08-02.html` | **PARTIAL / OPEN_MEDIUM** |

---

## 2. Ringkasan Status 16 Ancaman Trike (T-01 s/d T-16)

- **Total Ancaman**: 16 (100% terpetakan ke kebutuhan dan kontrol).
- **PASS / PASS_WITH_FINDINGS**: 12 Ancaman (`T-01`, `T-02`, `T-03`, `T-04`, `T-05`, `T-07`, `T-09`, `T-10`, `T-12`, `T-13`, `T-14`, `T-15`)
- **CODE_REVIEW_ONLY**: 1 Ancaman (`T-11` — CORS Whitelist pada `backend/main.py:ALLOWED_ORIGINS`; pengujian dinamis lintas origin dengan raw evidence belum diotomasi di test harness).
- **PARTIAL / OPEN_MEDIUM**: 3 Ancaman:
  - `T-06`: Batasan runtime JavaScript V8 Engine (tidak menjamin deterministic physical RAM zeroization).
  - `T-08`: Status `RP-01` PARTIAL (validasi sequence counter di application envelope; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual).
  - `T-16`: Status ZAP DAST EXECUTED WITH OPEN FINDINGS (1 Medium open: `CSP: style-src unsafe-inline`, 1 Low: `CSP: Notices`, 3 Informational).
