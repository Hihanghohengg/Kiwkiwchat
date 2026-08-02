# Repository Inventory — Kiw Kiw Chat (SSDLC Evidence)

Dokumen ini memuat inventaris lengkap komponen perangkat lunak, dependensi, kontrol keamanan, dan asumsi kepercayaan (*trust assumptions*) pada repositori **Kiw Kiw Chat** (Prototipe Riset) berdasarkan audit aktual terhadap struktur repositori.

---

## 1. Metadata Repositori & Lingkungan

- **Nama Repositori**: `Hihanghohengg/Kiwkiwchat` (Local Path: `d:\Obed\kiwkiw`)
- **Tujuan Sistem**: Aplikasi obrolan dua-peer (*two-peer ephemeral chat*) browser-native dengan PSK-assisted ML-KEM session-key establishment dan AES-GCM application-layer encryption menggunakan WebRTC DataChannel serta FastAPI signaling relay in-memory yang tidak menerima material kunci aplikasi dalam alur normal.
- **Framework SSDLC**: Microsoft Security Development Lifecycle (SDL) & Trike Threat Modeling.

---

## 2. Inventaris Komponen Kode Sumber

### A. Backend Signaling & Manajemen Room (Python / FastAPI)

| Komponen | File Sumber Aktual | Teknologi | Fungsi Utama | Data yang Diproses | Trust Assumption | Kontrol Keamanan Terdeteksi |
|---|---|---|---|---|---|---|
| **Signaling Server & App Entrypoint** | [backend/main.py](file:///d:/Obed/kiwkiw/backend/main.py) | Python 3.11, FastAPI 0.110.0, Uvicorn 0.28.0, WebSockets 12.0 | Mengelola siklus hidup room in-memory, relay paket SDP/ICE WebRTC, dan penegakan batas 2 peer. | UUID Room ID, Single-use WS Tokens, Client IP Address, Relay SDP/ICE payload | Server diperlakukan sebagai **Signaling Relay**; tidak menerima plaintext atau cryptographic key material dalam alur normal. | - Rate limiting (SlowAPI 10 req/IP/min pada `POST /rooms`)<br>- Strict 2-Peer limit (`room_full` rejection & Close 1008)<br>- WebSocket token authentication (`token` query param)<br>- WS message size limit (`MAX_MSG_BYTES` = 64 KB, Close 1009)<br>- Idle timeout disconnect (60 s, Close 1001)<br>- Room TTL auto-destruction (15 min / 900 s)<br>- Security headers middleware (HSTS, nosniff, DENY, no-referrer)<br>- CORS whitelist via `ALLOWED_ORIGINS` |
| **Backend Dependencies** | [backend/requirements.txt](file:///d:/Obed/kiwkiw/backend/requirements.txt) | Pip / PyPI | Spesifikasi versi library backend | Metadata versi package | Pihak ketiga terdaftar pada PyPI | Versi dependency terkunci secara eksplisit; `python-multipart` direkomendasikan dihapus jika tidak digunakan |
| **SAST Configuration** | [backend/.bandit](file:///d:/Obed/kiwkiw/backend/.bandit) | Bandit configuration | Konfigurasi pengecualian direktori scan statis | Konfigurasi scan | Tooling internal | Pengecualian folder test/venv agar scan terisolasi ke kode aplikasi |

---

### B. Frontend Kriptografi & Komunikasi P2P (React / Vite)

| Komponen | File Sumber Aktual | Teknologi | Fungsi Utama | Data yang Diproses | Trust Assumption | Kontrol Keamanan Terdeteksi |
|---|---|---|---|---|---|---|
| **Symmetric & Key Derivation Module** | [frontend/src/crypto/encryption.js](file:///d:/Obed/kiwkiw/frontend/src/crypto/encryption.js) | Web Crypto API (SubtleCrypto) | Pembangkitan kunci AES 256-bit, enkripsi/dekripsi AES-GCM-256 dengan AAD, derivasi kunci sesi HKDF-SHA-256 (`K_enc` & `K_conf`). | Plaintext chat, IV (12-byte), Ciphertext, AAD (`version\|roomId\|direction\|sequence`), Pre-shared room secret, ML-KEM shared secret | Browser Web Crypto API berjalan pada runtime aman pengguna (in-scope). | - Fresh random 12-byte IV per enkripsi (`crypto.getRandomValues`)<br>- AAD binding (version, roomId, direction, sequence)<br>- Domain separation strings pada HKDF (`kiwkiw/session/encryption/v2` vs `kiwkiw/session/confirmation/v2`)<br>- Ekspor kunci dibatasi |
| **Post-Quantum KEM Module** | [frontend/src/crypto/mlkem.js](file:///d:/Obed/kiwkiw/frontend/src/crypto/mlkem.js) | `mlkem` (^2.7.0) / Parameter NIST FIPS 203 | Pembangkitan pasangan kunci ML-KEM-768 (1184-byte PK, 2400-byte SK), enkapsulasi ciphertext (1088-byte CT), dan dekapsulasi shared secret (32-byte). | Ephemeral Public Key, Ephemeral Secret Key, Ciphertext, Shared Secret | Implementasi library JS matematis ML-KEM mengikuti parameter FIPS 203 (tanpa sertifikasi CMVP). | - Kunci privat bersifat ephemeral<br>- Nilai shared secret didereferensikan setelah derivasi |
| **Post-Quantum Handshake Protocol** | [frontend/src/crypto/pq_upgrade.js](file:///d:/Obed/kiwkiw/frontend/src/crypto/pq_upgrade.js) | ES6 Module, Web Crypto API | Orkestrator protokol `pq-pubkey`, `pq-encap`, `pq-confirm` via WebRTC DataChannel, transcript hashing, dan verifikasi HMAC mutual key confirmation. | Nonce (16-byte base64), Transcript Hash SHA-256, HMAC signature tags, ML-KEM payloads | Peer terhubung langsung via WebRTC DataChannel terenkripsi DTLS. | - State machine validasi versi protokol (v2)<br>- Two-way random nonce binding<br>- Length-prefixed SHA-256 transcript hash<br>- Mutual HMAC key confirmation sebelum status secure aktif<br>- Penghapusan referensi `delete peer._pqSecretKey` dari memori objek peer<br>- Timeout handshake 10 detik |
| **Main UI & State Coordinator** | [frontend/src/App.jsx](file:///d:/Obed/kiwkiw/frontend/src/App.jsx) | React 18, React Hooks | Koordinasi state room, koneksi WebSocket signaling, inisialisasi RTCPeerConnection, manajemen DataChannel, dan render UI utama. | Room ID, Pre-shared room secret (URL fragment), pesan terenkripsi, status koneksi | URL fragment (`#`) tidak dikirimkan ke server HTTP menurut RFC 3986. | - Pre-shared room secret diekstrak dari URL hash `#` out-of-band<br>- Pencegahan kebocoran secret ke server log/network headers<br>- Penanganan event `room_full`, `room_ended`, `peer_disconnected`<br>- Sequence counter tracking (`sendCounter`, `receiveCounter`) |
| **Countdown Hook** | [frontend/src/hooks/useCountdown.js](file:///d:/Obed/kiwkiw/frontend/src/hooks/useCountdown.js) | React Custom Hook | Menghitung sisa masa hidup room (TTL 15 menit) dan memicu pemusnahan lokal saat waktu habis. | Timestamp pembuatan room, status inRoom | Jam sistem klien sinkron dalam toleransi wajar. | Pembersihan otomatis state room saat TTL habis |
| **Ephemeral Storage Helper** | [frontend/src/utils/storage.js](file:///d:/Obed/kiwkiw/frontend/src/utils/storage.js) | Web Storage API (`sessionStorage`) | Penyimpanan sementara riwayat percakapan untuk mendukung refresh tab tanpa persistensi disk permanen. | Pesan terenkripsi/terdekripsi lokal, start timestamp, token room | `sessionStorage` terisolasi per-tab dan dihapus saat tab ditutup atau room dimusnahkan. | Fungsi eksplisit `clearRoomStorage(roomId)` untuk menghapus seluruh jejak memori lokal |
| **Secure Logger** | [frontend/src/utils/logger.js](file:///d:/Obed/kiwkiw/frontend/src/utils/logger.js) | ES Module | Pengalihan log konsol yang aman tanpa membocorkan kunci atau plaintext di mode produksi. | Pesan status, pesan error | Konsol browser lokal | Penghilangan log sensitif di lingkungan non-dev |
| **Komponen Tampilan (Views & Modals)** | [frontend/src/components/](file:///d:/Obed/kiwkiw/frontend/src/components/) | React JSX Components | Komponen visual: `LandingPage.jsx`, `ChatRoom.jsx`, `RoomEnded.jsx`, `RoomFull.jsx`, `DestroyModal.jsx`, `QRModal.jsx`, `TerminalLog.jsx`, `Toast.jsx`. | State tampilan, form input chat, QR Code data | DOM rendering lokal | Sanitasi input teks React (pencegahan XSS otomatis melalui JSX rendering) |

---

### C. Konfigurasi Deployment & Keamanan Web

| File / Komponen | Path Aktual | Deskripsi | Kontrol Keamanan |
|---|---|---|---|
| **Vercel Deployment Config** | [vercel.json](file:///d:/Obed/kiwkiw/vercel.json) | Konfigurasi routing reverse proxy frontend Vercel | HTTP Security Headers lengkap (HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy no-referrer) |
| **HTML Shell & CSP Meta** | [frontend/index.html](file:///d:/Obed/kiwkiw/frontend/index.html) | Entry point HTML aplikasi | CSP meta tag dengan whitelist `connect-src` ke WebSockets dan STUN servers terpercaya; Subresource Integrity pada Google Fonts (residual risk: `style-src` memuat `'unsafe-inline'`) |
| **Vite Config** | [frontend/vite.config.js](file:///d:/Obed/kiwkiw/frontend/vite.config.js) | Bundler build configuration | Build minification, tree-shaking, dan eliminasi source map publik di mode produksi |
| **Oxlint Config** | [frontend/.oxlintrc.json](file:///d:/Obed/kiwkiw/frontend/.oxlintrc.json) | Konfigurasi linter statis frontend JS/JSX | Pengecekan sanitasi kode dan deteksi *bad coding practices* |

---

### D. Test Suite & Pengujian Keamanan Aktual

| Test Suite / Script | Path Aktual | Jenis Pengujian | Cakupan |
|---|---|---|---|
| **Test IMPKRIP & Security E2E** | [test_impkrip_final.py](file:///d:/Obed/kiwkiw/test_impkrip_final.py) | Playwright Python Test Harness | 19 kasus uji: Unit test kriptografi (PQ-01..04, KD-01..04, KC-01..02, AE-01..04), Mitigasi Replay (RP-01), E2E multi-run (E2E-01..04). |
| **Browser Unit Runner** | [tests/browser/impkrip_unit.js](file:///d:/Obed/kiwkiw/tests/browser/impkrip_unit.js) | In-browser Test Suite | Eksekusi langsung fungsi WebCrypto dan ML-KEM di dalam browser context. |
| **Memory Profiling Script** | [test_crypto_memory_final.py](file:///d:/Obed/kiwkiw/test_crypto_memory_final.py) | Playwright CDP Memory Profiler | Pengukuran V8 JavaScript Heap (`Runtime.getHeapUsage`) lintas 5 run independen. |
| **Performance Benchmark Script** | [test_crypto_performance_final.py](file:///d:/Obed/kiwkiw/test_crypto_performance_final.py) | Playwright Timing Harness | Pengukuran latency dan throughput 1.000 sampel. |
