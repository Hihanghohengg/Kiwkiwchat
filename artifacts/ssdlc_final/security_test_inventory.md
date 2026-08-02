# Inventaris Pengujian Keamanan (Security Test Inventory) — Kiw Kiw Chat

Dokumen ini menyajikan inventaris lengkap dari seluruh 19 kasus uji otomatis pada test suite `test_impkrip_final.py` beserta pemetaannya terhadap *Security Requirements* (SR) dan *Trike Threats* (T-01 s/d T-16).

---

## 1. Inventaris 19 Kasus Uji Otomatis Kriptografi & E2E

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
| **RP-01** | Replay Protection | Validasi penolakan sequence counter duplikat pada layer *application envelope*. | SR-07 | T-08 | **PARTIAL** | **PARTIAL**: Terverifikasi pada level envelope data; reinjeksi raw packet WebRTC DataChannel belum diotomasi. |
| **E2E-01** | End-to-End Flow | Simulasi obrolan P2P 2-arah lengkap: Room creation $\to$ Signaling $\to$ PQ Upgrade $\to$ Chat. | SR-01..08 | T-01, T-02, T-03 | **PASS** | Lolos 3/3 putaran independen. |
| **E2E-02** | End-to-End Stress | Pengiriman bertubi-tubi 10 pesan berurutan antar browser tanpa packet loss. | SR-01, SR-07 | T-01, T-08 | **PASS** | Lolos 3/3 putaran independen. |
| **E2E-03** | End-to-End Capacity | Penolakan koneksi browser ketiga ke dalam room yang sedang aktif (*3rd Peer Rejection*). | SR-09 | T-04 | **PASS** | Peer 3 menerima `room_full` dan koneksi ditutup (3/3 runs). |
| **E2E-04** | End-to-End Teardown | Pemusnahan room dan pembersihan `sessionStorage` saat salah satu peer keluar / menekan Hapus Room. | SR-10, SR-11, SR-12 | T-07, T-09, T-10 | **PASS** | Event `room_ended` diterima dan storage terhapus bersih (3/3 runs). |

---

## 2. Inventaris Kontrol Tambahan (Non-Automated / Code Review)

| Kontrol Keamanan | Deskripsi Prosedur Evaluasi | Security Requirement | Trike Threat Terkait | Status Evaluasi | Catatan Bukti |
|---|---|---|---|:---:|---|
| **Rate Limiter API** | Pemeriksaan konfigurasi middleware SlowAPI pada `POST /rooms`. | SR-15 | T-13 | **CODE REVIEW ONLY** | Terkonfigurasi 10 req/IP/min pada `backend/main.py`. |
| **WebSocket Guard** | Pemeriksaan limit frame 64 KB dan idle timeout 60s. | SR-16 | T-14 | **CODE REVIEW ONLY** | Terkonfigurasi `MAX_MSG_BYTES` & `WS_IDLE_TIMEOUT`. |
| **CORS Whitelist** | Pemeriksaan daftar origin pada `ALLOWED_ORIGINS`. | SR-13 | T-11 | **CODE REVIEW ONLY** | Terkonfigurasi pada CORS middleware FastAPI. |
| **Direct WS Guard** | Pemeriksaan validasi keberadaan room dan parameter token. | SR-14 | T-12 | **CODE REVIEW ONLY** | Terkonfigurasi pada `websocket_endpoint`. |
| **Static Code SAST** | Pemindaian statis backend Python via Bandit v1.9.4. | SR-17 | T-15 | **PASS (0 High)** | Output raw pada `bandit_report.json`. |
| **Security Headers** | Pemeriksaan konfigurasi headers dan CSP meta tag. | SR-18 | T-16 | **CONFIGURED (WITH CAVEAT)** | `style-src` memuat `'unsafe-inline'`. DAST automated scan: BLOCKED. |
