# Inventaris Pengujian Keamanan (Security Test Inventory) — Kiw Kiw Chat

Dokumen ini menyajikan inventaris lengkap dari seluruh kasus uji keamanan pada **Kiw Kiw Chat**, mencakup 19 kasus uji kriptografi & E2E (`test_impkrip_final.py`), 8 kasus uji dinamis backend, CORS & WebSocket (`test_backend_websocket_security.py`), audit statis SAST (Bandit), audit dependensi SCA (npm audit & pip-audit), dan pemindaian pasif DAST (OWASP ZAP).

---

## 1. Inventaris 19 Kasus Uji Otomatis Kriptografi & E2E

Sumber data mentah: [`artifacts/impkrip_final/impkrip_test_report.json`](../impkrip_final/impkrip_test_report.json) (`test_impkrip_final.py --runs 3`):

| Test ID | Kategori Pengujian | Deskripsi Prosedur Pengujian | Security Requirement | Trike Threat Terkait | Status Aktual | Catatan Verifikasi & Limitasi |
|---|---|---|---|---|:---:|---|
| **PQ-01** | Post-Quantum KEM | Validasi panjang kunci publik (1184 bytes) dan private key (2400 bytes) ML-KEM-768. | SR-03 | T-02 | **PASS** | Memenuhi spesifikasi parameter NIST FIPS 203. |
| **PQ-02** | Post-Quantum KEM | Validasi determinisme enkapsulasi dan dekapsulasi shared secret (32 bytes). | SR-03 | T-02 | **PASS** | Shared secret identik pada kedua sisi peer. |
| **PQ-03** | Post-Quantum KEM | Validasi panjang ciphertext enkapsulasi ML-KEM-768 (1088 bytes). | SR-03 | T-02 | **PASS** | Panjang ciphertext sesuai standar. |
| **PQ-04** | Post-Quantum Negative | Validasi kegagalan dekapsulasi ketika ciphertext dimodifikasi (*bit-flipping*). | SR-03 | T-02, T-05 | **PASS** | Dekapsulasi menghasilkan secret berbeda (implicit rejection). |
| **KD-01** | Key Derivation | Validasi fusi pre-shared secret dan PQC shared secret via HKDF-SHA-256 (RFC 5869). | SR-04 | T-02 | **PASS** | Menghasilkan kunci sesi 32-byte unik. |
| **KD-02** | Key Derivation | Validasi pembangkitan kunci konfirmasi HMAC (`K_conf`) terpisah dari kunci enkripsi (`K_enc`). | SR-04, SR-08 | T-02, T-05 | **PASS** | *Key separation* domain terjaga. |
| **KD-03** | Key Derivation Negative | Validasi bahwa perbedaan 1-bit pada PSK menghasilkan kunci sesi yang sama sekali berbeda. | SR-04 | T-02 | **PASS** | Efek avalans HKDF terverifikasi. |
| **KD-04** | Key Derivation Negative | Validasi bahwa perbedaan 1-bit pada PQC secret menghasilkan kunci sesi berbeda. | SR-04 | T-02 | **PASS** | Efek avalans HKDF terverifikasi. |
| **KC-01** | Key Confirmation | Validasi keberhasilan verifikasi mutual HMAC-SHA-256 atas transcript handshake valid. | SR-08 | T-05 | **PASS** | Mutual key confirmation berhasil 100%. |
| **KC-02** | Key Confirmation Negative | Validasi penolakan handshake jika transcript atau HMAC tag dimanipulasi oleh penyerang. | SR-08 | T-05 | **PASS** | Tag tidak cocok memicu kegagalan handshake seketika. |
| **AE-01** | Authenticated Encryption | Validasi siklus enkripsi dan dekripsi AES-GCM-256 pada payload pesan normal. | SR-01 | T-01 | **PASS** | Pesan terdekripsi sempurna menjadi plaintext asli. |
| **AE-02** | Auth Enc Negative | Validasi penolakan dekripsi AES-GCM ketika ciphertext dimanipulasi (*tampered ciphertext*). | SR-01 | T-01 | **PASS** | GCM authentication tag error, payload ditolak. |
| **AE-03** | Auth Enc Negative | Validasi penolakan dekripsi jika IV atau key yang digunakan salah. | SR-01 | T-01 | **PASS** | Dekripsi gagal dengan `OperationError`. |
| **AE-04** | Auth Enc AAD Binding | Validasi penolakan dekripsi jika Additional Authenticated Data (AAD) dimanipulasi. | SR-07 | T-08 | **PASS** | Perubahan sequence/direction pada AAD membatalkan dekripsi. |
| **RP-01** | Replay Protection | Validasi penolakan sequence counter duplikat pada layer *application envelope*. | SR-07 | T-08 | **PARTIAL** | **PARTIAL**: Terverifikasi pada level application envelope; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual. |
| **E2E-01** | End-to-End Flow | Simulasi obrolan P2P 2-arah lengkap: Room creation $\to$ Signaling $\to$ PQ Upgrade $\to$ Chat. | SR-01..08 | T-01, T-02, T-03 | **PASS** | Lolos 3/3 putaran independen. |
| **E2E-02** | End-to-End Stress | Pengiriman bertubi-tubi 10 pesan berurutan antar browser tanpa packet loss. | SR-01, SR-07 | T-01, T-08 | **PASS** | Lolos 3/3 putaran independen. |
| **E2E-03** | End-to-End Capacity | Penolakan koneksi browser ketiga ke dalam room yang sedang aktif (*3rd Peer Rejection*). | SR-09 | T-04 | **PASS** | Peer 3 menerima `room_full` dan koneksi ditutup (3/3 runs). |
| **E2E-04** | End-to-End Teardown | Pemusnahan room dan pembersihan `sessionStorage` saat salah satu peer keluar / menekan Hapus Room. | SR-10, SR-11, SR-12 | T-07, T-09, T-10 | **PASS** | Event `room_ended` diterima dan storage terhapus bersih (3/3 runs). |

---

## 2. Inventaris 8 Kasus Uji Dinamis Minimum Backend API & WebSocket Signaling (BT-01 s/d BT-08)

Sumber data mentah: [`artifacts/ssdlc_final/backend_websocket_test_results.json`](./backend_websocket_test_results.json) (`tests/security/test_backend_websocket_security.py`):

| Test ID | Kategori Pengujian | Deskripsi Prosedur Pengujian | Security Requirement | Trike Threat Terkait | Status Aktual | Catatan Verifikasi & Limitasi |
|---|---|---|---|---|:---:|---|
| **BT-01** | WS Capacity | Validasi penolakan koneksi peer ketiga ke room aktif dengan 2 peserta. | SR-09 | T-04, T-12 | **PASS** | Peer ke-3 menerima frame `room_full` dan soket ditutup kode 1008. |
| **BT-02** | API Rate Limiting | Pengujian flooding pembuatan room (`POST /rooms`) pada fresh window (10 req/IP/min). | SR-15 | T-13 | **PASS** | Tepat 10 request pertama diterima (HTTP 200), 6 request berikutnya ditolak dengan HTTP 429. |
| **BT-03** | WS Frame Guard | Pengiriman frame WebSocket berukuran raksasa (> 64 KB limit). | SR-16 | T-14 | **PASS** | Server mengirim error frame dan menutup soket dengan close code 1009. |
| **BT-04** | WS Resiliency | Pengiriman frame malformed / JSON rusak ke soket signaling aktif. | SR-16 | T-14 | **PASS** | Frame diabaikan tanpa crash, soket tetap hidup dan merespon ping normal. |
| **BT-05** | Room Teardown | Pengiriman sinyal `destroy_room` dan verifikasi penolakan koneksi baru berikutnya. | SR-11 | T-09, T-12 | **PASS** | Room dihapus seketika dari memori server; rekoneksi ditolak dengan 'Room not found' (kode 1008). |
| **BT-06** | WS Idle Timeout | Pemeriksaan timeout inaktivitas soket signaling WebSocket (`WS_IDLE_TIMEOUT=3s` di test env). | SR-16 | T-14 | **PASS** | Koneksi idle terputus tepat setelah timeout dengan error inactivity dan close code 1001. |
| **BT-07** | CORS Whitelist | Validasi preflight OPTIONS dengan trusted origin (`https://kiwkiwchat.vercel.app`). | SR-13 | T-11 | **PASS** | Status 200, `Access-Control-Allow-Origin` sesuai trusted origin, method `POST` diizinkan. |
| **BT-08** | CORS Restriction | Validasi preflight OPTIONS dengan untrusted origin (`https://untrusted.example`). | SR-13 | T-11 | **PASS** | Status 400 'Disallowed CORS origin', `Access-Control-Allow-Origin` tidak diberikan ke untrusted domain. |

---

## 3. Inventaris Audit Statis, Tinjauan Kode & Pemindaian DAST

| Kontrol / Alat | Deskripsi Prosedur Evaluasi | Security Requirement | Trike Threat Terkait | Status Evaluasi | Catatan Bukti |
|---|---|---|---|:---:|---|
| **CORS Dynamic & Code Audit** | Validasi preflight OPTIONS (BT-07 & BT-08) dan inspeksi deklarasi whitelist pada `backend/main.py:114-119`. | SR-13 | T-11 | **PASS** | Dynamic tests BT-07 & BT-08 lolos 100%; whitelist `ALLOWED_ORIGINS` terdefinisi dan ditegakkan secara presisi. |
| **Bandit v1.9.4 (SAST)** | Pemindaian keamanan statis kode Python backend (`backend/`, 269 LOC). | SR-17 | T-15 | **PASS (0 High)** | 0 High, 1 Med (B104 binding), 3 Low (B110 pass). Raw: [`bandit_report.json`](./bandit_report.json). |
| **NPM Audit (SCA)** | Pemindaian kerentanan dependensi frontend (113 paket dipindai). | SR-17 | T-15 | **PASS (0 Vulns)** | 0 kerentanan terdeteksi. Raw: [`npm_audit_report.json`](./npm_audit_report.json). |
| **Pip-audit (SCA)** | Pemindaian dependensi backend Python. | SR-17 | T-15 | **OPEN / PARTIAL** | Ditemukan 17 advisory PyPI terbuka (FastAPI/Starlette/multipart). Raw: [`pip_audit_report.json`](./pip_audit_report.json). |
| **OWASP ZAP 2.17.0 (DAST)** | Pemindaian pasif dinamis pada frontend produksi Vercel. | SR-18 | T-16 | **EXECUTED WITH OPEN FINDINGS** | 0 High, 1 Med (`style-src 'unsafe-inline'`), 1 Low (`CSP: Notices`), 3 Info. Raw: [`zap_report_2026-08-02.html`](./zap_report_2026-08-02.html). |
| **Security Headers** | Verifikasi header HTTP produksi (HSTS, XFO, XCTO, Referrer-Policy). | SR-18 | T-16 | **PASS (WITH CAVEAT)** | Header aktif di edge produksi; CSP memiliki open medium finding pada style-src. |
