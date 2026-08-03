# BLUEPRINT ARSITEKTUR — KIW KIW CHAT
## Dokumen Teknis untuk Paper UAS SSDLC & Applied Cryptography

> **Catatan:** Dokumen ini adalah *living document* yang selalu disinkronkan dengan kondisi kode aktual.
> Setiap perubahan implementasi harus dicatat di **BAGIAN 11 (Update Log)**.

---
## BAGIAN 1: NAMA & KONSEP APLIKASI

| Atribut | Detail |
|---|---|
| **Nama Aplikasi** | Kiw Kiw Chat |
| **Tagline** | *"The conversation that never happened."* |
| **Versi** | 2.5.1 |
| **Lisensi** | MIT License |
| **Inspirasi** | Nullroom.io (versi ringan — tanpa Ruby, pakai React + Python) |

### Konsep Inti
Kiw Kiw Chat adalah aplikasi percakapan **ephemeral** (sementara) berbasis **Peer-to-Peer (P2P)** dengan filosofi **zero-trace**. Tidak ada akun, tidak ada instalasi, tidak ada jejak digital setelah percakapan selesai.

| Aspek | Implementasi |
|---|---|
| **Tanpa Akun** | Tidak ada autentikasi. Room dibuat via `POST /rooms` menghasilkan `room_id`, `creator_token`, dan `invite_token` |
| **Tanpa Instalasi** | Berjalan murni di browser — WebRTC + Web Crypto API + ML-KEM-768 |
| **Self-Destruct 15 Menit** | Timer absolut via `asyncio` tersinkronisasi `expires_in` (backend) dan WebRTC P2P fallback |
| **Strict 2 Orang** | Server kirim `room_full` lalu close code 1008 jika `count >= 2` |
| **Reconnect saat Refresh** | Room dipertahankan di memori server saat peer terputus sementara (refresh) hingga batas TTL 15 menit |
| **Pemusnahan Eksplisit** | Room dihapus dari server saat TTL 15 menit habis atau salah satu peer mengeklik tombol "Hapus Room" (`destroy_room`) |
| **Chat Persist saat Refresh** | Pesan disimpan ke `sessionStorage` per room ID, dihapus saat room dihancurkan / expired |
| **Tanpa Jejak** | Pesan di-encrypt E2E via WebRTC DataChannel; tidak ada database; tidak ada server logging pesan |

---

## BAGIAN 2: ARSITEKTUR SISTEM

### 2.1 Diagram Arsitektur High-Level

```
┌─────────────────────────────────────────────────────┐
│  BROWSER — Peer A (Initiator)                       │
│  App.jsx → sessionStorage (msg + timer persist)     │
│  App.jsx → encryption.js (AES-GCM-256 + HKDF)      │
│  App.jsx → pq_upgrade.js (ML-KEM-768 + HMAC Auth)  │
│  App.jsx → WebSocket Client (signaling only)        │
└──────────────┬──────────────────────────────────────┘
               │ WebSocket  /rooms/{id}/ws?token={t}
               │ HTTP POST  /rooms
               ▼
┌─────────────────────────────────────────────────────┐
│  SERVER — FastAPI Python  backend/main.py           │
│  POST /rooms    → buat room ID + asyncio TTL 15 min │
│  WS /rooms/{id}/ws → relay SDP + ICE candidates    │
│  rooms: Dict[str, Dict]  ← in-memory ONLY, no DB   │
│                                                     │
│  Events yang dikirim server:                        │
│   • init              → identity (initiator T/F)    │
│   • peer_ready        → peer baru siap tersambung   │
│   • peer_disconnected → peer terputus (sementara)   │
│   • signal            → relay SDP offer/answer/ICE  │
│   • room_full         → tolak koneksi ke-3 (1008)   │
│   • room_ended        → notifikasi room dimusnahkan │
└──────────────┬──────────────────────────────────────┘
               │ WebSocket  /rooms/{id}/ws?token={t}
               ▼
┌─────────────────────────────────────────────────────┐
│  BROWSER — Peer B (Responder)                       │
│  (Struktur identik dengan Peer A)                   │
└─────────────────────────────────────────────────────┘
               │
               │ ◄── WebRTC DataChannel (P2P, server tidak terlibat) ──►
               │     Semua pesan terenkripsi dengan Hybrid Session Key
```

### 2.2 Komponen Teknologi

#### Frontend (Browser)
| Komponen | Teknologi | Versi | File |
|---|---|---|---|
| Framework UI | React | ^19.2.7 | `frontend/package.json` |
| Build Tool | Vite | ^8.1.1 | `frontend/vite.config.js` |
| Styling | Tailwind CSS v4 + Custom CSS | ^4.3.3 | `src/index.css` |
| QR Code | qrcode.react (QRCodeSVG) | ^4.2.0 | `src/components/QRModal.jsx` |
| Post-Quantum KEM | mlkem (FIPS 203) | ^2.7.0 | `src/crypto/mlkem.js` |
| Classical Crypto | Web Crypto API (browser built-in) | — | `src/crypto/encryption.js` |
| Key Exchange Protocol | PSK-assisted ML-KEM-768 Handshake | — | `src/crypto/pq_upgrade.js` |
| P2P Transport | WebRTC DataChannel (browser built-in) | — | `src/App.jsx` |
| Signaling | WebSocket (browser built-in) | — | `src/App.jsx` |
| Chat Persistence | sessionStorage (browser built-in) | — | `src/utils/storage.js` |

#### Backend (Server)
| Komponen | Teknologi | Versi | File |
|---|---|---|---|
| Framework | FastAPI | 0.104.1 | `backend/requirements.txt` |
| ASGI Server | Uvicorn | 0.24.0 | `backend/requirements.txt` |
| WebSocket | websockets (via FastAPI) | 12.0 | `backend/requirements.txt` |
| Rate Limiter | SlowAPI | 0.1.9 | `backend/requirements.txt` |
| State Storage | Python Dict in-memory | — | `backend/main.py` |
| TTL Scheduler | asyncio built-in | — | `backend/main.py` |

---

## BAGIAN 3: KOMPONEN KRIPTOGRAFI

### 3.1 Layer Classical — AES-GCM-256

**File:** `frontend/src/crypto/encryption.js`

| Parameter | Nilai | Lokasi |
|---|---|---|
| **Algoritma** | AES-GCM | `encryption.js:10-11` |
| **Key Length** | 256 bit | `encryption.js:11` |
| **IV Length** | 12 bytes (96-bit fresh random per message) | `encryption.js:46` |
| **Tag Length** | 128 bit (default AES-GCM) | Web Crypto API default |
| **Format Distribusi Key** | URL Fragment `#<invite_token>\|<base64_key>` | `App.jsx`, `LandingPage.jsx` |
| **Output Ciphertext** | `{ ciphertext: Base64, iv: Base64 }` | `encryption.js:60-65` |
| **AAD Binding** | Session ID + Direction + Sequence Counter | `encryption.js:52-58` |

### 3.2 Layer Post-Quantum — ML-KEM-768 (FIPS 203)

**File:** `frontend/src/crypto/mlkem.js`  
**Library:** `mlkem` npm package v2.7.0

| Parameter | Nilai | Catatan |
|---|---|---|
| **Algoritma** | ML-KEM-768 (CRYSTALS-Kyber) | NIST Security Level 3 (setara AES-192 / tahan Shor) |
| **Standar** | NIST FIPS 203 | Standar resmi post-quantum KEM |
| **Public Key Size** | 1184 bytes | Dikirim via WebRTC DataChannel (`pq-pubkey`) |
| **Secret Key Size** | 2400 bytes | Ephemeral RAM browser — dihapus setelah `decap` |
| **Ciphertext Size** | 1088 bytes | Dikirim kembali via WebRTC (`pq-encap`) |
| **Shared Secret Size** | 32 bytes (256-bit) | Input IKM untuk HKDF-SHA-256 |
| **Platform** | Pure JavaScript/TypeScript (tanpa WASM) | Berjalan langsung di WebCrypto browser runtime |

### 3.3 Key Fusion & Separation — HKDF-SHA-256

**File:** `frontend/src/crypto/encryption.js` — fungsi `deriveSessionKeys`

| Parameter | Nilai | Lokasi |
|---|---|---|
| **Algoritma** | HKDF (RFC 5869) | `encryption.js:93-123` |
| **Hash Primitif** | SHA-256 | `encryption.js:101, 114` |
| **IKM (Input Key Material)** | ML-KEM-768 Shared Secret (32 bytes) | `encryption.js:93` |
| **Salt** | Classical AES-256-GCM Key (raw 32 bytes) | `encryption.js:97-99` |
| **Transcript Hash** | SHA-256 over (version, roomId, nonces, pubKey, ct) | `pq_upgrade.js:15-32` |
| **Encryption Key Info** | `kiwkiw/session/encryption/v2` \|\| `transcriptHash` | `encryption.js:105` |
| **Confirmation Key Info** | `kiwkiw/session/confirmation/v2` \|\| `transcriptHash` | `encryption.js:118` |
| **Output** | `encryptionKey` (AES-GCM-256) + `confirmationKey` (HMAC-SHA-256) | `encryption.js:122` |

### 3.4 Protokol 3-Pesan PSK-Assisted ML-KEM Handshake

```
PEER A (INITIATOR)                                         PEER B (RESPONDER)
       │                                                          │
       │  1. Bangkitkan Pre-Shared Key Klasikal (256-bit AES)     │
       │     Disematkan di URL Fragment (#token|classicalKey)    │
       │                                                          │
       │  2. Bangkitkan Pasangan Kunci Ephemeral ML-KEM-768       │
       │     (ek, dk) = MlKem768.generateKeyPair()                │
       │     ek: 1184 bytes, dk: 2400 bytes                       │
       │     Bangkitkan initiatorNonce (16 bytes)                 │
       │                                                          │
       │ ──── Pesan 1: pq-pubkey { ek, initiatorNonce } ─────────►│
       │                                                          │
       │                                                          │  3. Enkapsulasi Secret ML-KEM-768
       │                                                          │     (c, ss) = MlKem768.encap(ek)
       │                                                          │     c: 1088 bytes, ss: 32 bytes
       │                                                          │     Bangkitkan responderNonce (16 bytes)
       │                                                          │  4. Hitung Transcript Hash & Derivasi Kunci:
       │                                                          │     (encKey, confKey) = HKDF(ss, classicalKey, transcript)
       │                                                          │  5. Hitung HMAC Responder:
       │                                                          │     respHmac = HMAC(confKey, label || transcript)
       │                                                          │
       │◄─── Pesan 2: pq-encap { c, responderNonce, respHmac } ───│
       │                                                          │
       │  6. Dekapsulasi Secret ML-KEM-768:                       │
       │     ss = MlKem768.decap(c, dk)                           │
       │     Hapus referensi dk (`delete peer._pqSecretKey`)      │
       │  7. Hitung Transcript Hash & Derivasi Kunci:             │
       │     (encKey, confKey) = HKDF(ss, classicalKey, transcript)│
       │  8. Verifikasi respHmac menggunakan confKey              │
       │  9. Hitung HMAC Initiator:                               │
 ### 3.5 Integritas & Verifikasi Mutual

**File:** `frontend/src/crypto/pq_upgrade.js`

| Parameter | Nilai |
|---|---|
| **Label Responder** | `"nullroom-pq-confirm-responder"` |
| **Label Initiator** | `"nullroom-pq-confirm-initiator"` |
| **Handshake Transcript Binding** | SHA-256 hash dari `version`, `roomId`, `initiatorNonce`, `responderNonce`, `publicKey`, `ciphertext` |
| **Timeout PQ Handshake** | 10 detik (`PQ_TIMEOUT_MS = 10_000`) |
| **Aksi jika HMAC gagal** | Handshake Promise reject → koneksi dibatalkan instan |

---

## BAGIAN 4: THREAT MODEL (KERANGKA: TRIKE)

### 4.1 Aset yang Dilindungi

| Aset | Klasifikasi | Perlindungan |
|---|---|---|
| Konten pesan | KRITIS | Enkripsi AES-GCM-256 via Hybrid Session Key (`encryptionKey`) |
| Classical Key (AES) | KRITIS | URL Fragment `#<token>\|<key>`, tidak pernah ke server (RFC 3986) |
| ML-KEM Secret Key | KRITIS | RAM browser ephemeral — `delete peer._pqSecretKey` setelah `decap` |
| ML-KEM Shared Secret | KRITIS | RAM sementara — dihapus segera setelah HKDF key derivation |
| Room ID & Invite Token | SEDANG | Token random per-role (`creator_token`, `invite_token`); tanpa encryption key tidak dapat membaca pesan |
| Chat history (refresh) | SEDANG | `sessionStorage` — dihapus saat room dimusnahkan / TTL habis |
| Metadata signaling (SDP, ICE) | RENDAH | Dumb relay tanpa penyimpanan persisten; tidak berisi kunci maupun konten |

### 4.2 Aktor Sistem

| Aktor | Peran | Kepercayaan | Aksi |
|---|---|---|---|
| Peer A (Initiator) | Pembuat room | Penuh (trusted) | Create room, inisiasi PQ upgrade, kirim/terima pesan terenkripsi |
| Peer B (Responder) | Penerima link | Penuh (trusted) | Join room via token fragment, tanggapi PQ upgrade, kirim/terima pesan terenkripsi |
| Server (FastAPI) | Signaling relay | Tidak dipercaya (zero-knowledge) | Relay WS, enforce TTL, tolak peer ke-3, hapus state saat room ended |
| Operator Server | Admin infra | Tidak dipercaya | Hanya bisa melihat Room ID & log signaling sementara |
| Adversary (Passive) | Penyadap jaringan | Musuh | Bisa lihat WS signaling, tidak bisa dekripsi WebRTC DataChannel |
| Adversary (Active) | MITM / Quantum | Musuh | Ditangkal ML-KEM-768 + HMAC transcript-bound mutual verification |

### 4.3 Matriks Hak Akses (CRUD)

| Aktor | Room Data | Pesan | Classical Key | PQ Keys | Chat History |
|---|---|---|---|---|---|
| Peer A | C, R, D | C, R | C, R | C, R, D | C, R, D |
| Peer B | R | C, R | R (dari URL) | C (encap only) | R, D |
| Server | C, R, D (ID & token only) | — | — | — | — |
| Adversary (Network) | R (Room ID only) | R (ciphertext) | — | — | — |

### 4.4 Skenario Serangan & Mitigasi

| ID | Serangan | Probabilitas | Dampak | Mitigasi |
|---|---|---|---|---|
| T-01 | Passive Eavesdropping | Tinggi | Kritis | AES-GCM-256 + Hybrid Key mengenkripsi seluruh DataChannel |
| T-02 | Quantum Cryptanalysis | Rendah | Kritis | ML-KEM-768 (NIST Level 3) tahan terhadap algoritma Shor |
| T-03 | Server Compromise | Sedang | Rendah | Server adalah dumb relay; kunci ada di URL fragment |
| T-04 | Room Flooding / 3rd Peer | Rendah | Sedang | `room_full` dikirim + WS close 1008 jika `count >= 2` |
| T-05 | MITM pada PQ Exchange | Sedang | Kritis | HMAC mutual authentication terikat transcript hash di `pq_upgrade.js` |
| T-06 | Key Extraction dari RAM | Rendah | Kritis | `delete peer._pqSecretKey` segera setelah `decap` |
| T-07 | URL Fragment Interception | Sedang | Kritis | TTL 15 menit mengkadaluarsakan key otomatis |
| T-08 | Replay Attack | Rendah | Sedang | AES-GCM IV random 12-byte fresh + AAD counter sequence setiap pesan |
| T-09 | Room Takeover & Unauthenticated Join | Rendah | Sedang | Token autentikasi per role (`creator_token`, `invite_token`) divalidasi pada WS handshake |
| T-10 | Session History Leak saat Refresh | Rendah | Sedang | `sessionStorage` dibersihkan saat `room_ended` / explicit destroy |
| T-11 | CORS Cross-Origin Bypass | Sedang | Tinggi | `ALLOWED_ORIGINS` dari env var — hanya origin whitelist yang diizinkan |
| T-12 | WebSocket Room Bypass (tanpa POST) | Sedang | Tinggi | WS endpoint tolak room ID tidak dikenal; auto-create dihapus |
| T-13 | Resource Exhaustion / DoS (Room Flooding) | Tinggi | Tinggi | Rate limiting 10 req/IP/menit via SlowAPI |
| T-14 | Memory DoS via Payload Besar | Sedang | Tinggi | Payload limit: 64 KB JSON; koneksi ditutup 1009 |

---

## BAGIAN 5: SECURITY REQUIREMENTS

| ID | Requirement | Kategori | Status |
|---|---|---|---|
| SR-01 | Seluruh konten percakapan dienkripsi E2E dengan AES-GCM-256 | Confidentiality | ✅ `encryption.js:46-65` |
| SR-02 | Kunci enkripsi klasikal tidak boleh pernah melewati server | Key Management | ✅ URL Fragment (RFC 3986) |
| SR-03 | Sistem tahan terhadap ancaman komputasi kuantum | Post-Quantum | ✅ ML-KEM-768 FIPS 203 |
| SR-04 | Kunci sesi akhir adalah derivasi dari dua entropi independen | Key Derivation | ✅ HKDF-SHA-256 `encryption.js:93-123` |
| SR-05 | Data percakapan dihancurkan saat sesi berakhir | Data Protection | ✅ `sessionStorage` dihapus saat `room_ended` / destroy |
| SR-06 | Server tidak menyimpan log percakapan atau kunci | Logging/Privacy | ✅ Tidak ada logging pesan di `main.py` |
| SR-07 | Koneksi P2P menggunakan saluran terenkripsi dan terautentikasi | P2P Security | ✅ WebRTC DTLS + Hybrid Key layer |
| SR-08 | Pertukaran PQ diverifikasi secara mutual | Authentication | ✅ HMAC mutual transcript-bound `pq_upgrade.js` |
| SR-09 | Room dibatasi ketat pada 2 peserta | Access Control | ✅ `room_full` + close 1008 di `main.py:270-275` |
| SR-10 | Room memiliki masa hidup maksimum 15 menit | Ephemeral State | ✅ `asyncio.sleep(900)` di `main.py:107-123` |
| SR-11 | Room dipertahankan di memori saat peer terputus (sementara) agar bisa reconnect (page refresh), lalu dihancurkan otomatis oleh TTL atau destroy event | Session Integrity | ✅ `main.py:334-340`, `App.jsx` |
| SR-12 | Chat history dapat dipulihkan setelah refresh selama room masih aktif | Usability | ✅ `sessionStorage` persist di `src/utils/storage.js` |
| SR-13 | CORS dibatasi ke origin production yang diizinkan secara eksplisit | Transport Security | ✅ `ALLOWED_ORIGINS` env var di `main.py:126` |
| SR-14 | WebSocket hanya menerima koneksi ke room yang dibuat via `POST /rooms` dengan token valid | Access Control | ✅ Room ID & token divalidasi di `main.py:255-265` |
| SR-15 | API endpoint dilindungi rate limiting untuk mencegah resource exhaustion | Availability | ✅ SlowAPI 10 req/IP/menit di `main.py:147` |
| SR-16 | Ukuran payload dibatasi untuk mencegah memory DoS melalui WebSocket | Integrity/Availability | ✅ 64 KB JSON di `main.py:290-305` |
| SR-17 | Aplikasi lulus uji pemindaian kerentanan kode statis (SAST) standar | AppSec | ✅ `artifacts/ssdlc_final/bandit_report.json` |
| SR-18 | Aplikasi lulus uji dinamis (DAST) ZAP Proxy & Dynamic Security Suite | AppSec | ✅ `artifacts/ssdlc_final/backend_websocket_test_results.json` |

---

## BAGIAN 6: MAPPING SSDLC (MICROSOFT SDL)

### Fase 1: Training
| Topik | Relevansi |
|---|---|
| Web Crypto API | AES-GCM-256, HKDF-SHA-256, HMAC-SHA-256 di browser native |
| Post-Quantum Cryptography (FIPS 203) | ML-KEM-768 sebagai lapisan pertahanan kuantum |
| WebRTC Security (DTLS, ICE) | Transport P2P terenkripsi langsung |
| Python FastAPI + WebSocket | Backend dumb signaling relay berkecepatan tinggi |
| React Secure Coding | State kriptografi terisolasi di RAM frontend |

### Fase 2: Requirements
Security requirements SR-01 s/d SR-18 diturunkan dari:
- Zero-Trace philosophy
- NIST FIPS 203 (ML-KEM)
- RFC 3986 (URI Fragment) & RFC 5869 (HKDF)
- Threat Model Trike (Bagian 4)

### Fase 3: Design
| Keputusan Desain | Alasan |
|---|---|
| URL Fragment untuk distribusi key & token | RFC 3986: fragment `#token\|key` tidak dikirim ke server pada HTTP request |
| WebRTC DataChannel untuk pesan | P2P langsung; server tidak melihat payload pesan |
| In-Memory Dict bukan Database/Redis | Minimalisasi jejak data persisten; zero-trace by design |
| 3-Message PQ Upgrade Protocol | Verifikasi mutual terikat transcript hash sebelum key derivation |
| HKDF sebagai Key Fusion & Separation | Standar NIST; menghasilkan encryptionKey dan confirmationKey independen |
| `sessionStorage` untuk chat persist | Persist across refresh lokal tapi terisolasi dari tab/device lain |
| Reconnect support dalam batas TTL 15 menit | Menjaga UX percakapan saat tab ter-refresh tanpa kehilangan sesi |

### Fase 4: Implementation (Secure Coding Practices)
| Praktek | Lokasi |
|---|---|
| IV random 96-bit fresh per pesan + AAD sequence | `encryption.js:46-58` |
| Secret key dihapus setelah penggunaan | `pq_upgrade.js:174` — `delete peer._pqSecretKey` |
| Verifikasi HMAC sebelum key derivation diselesaikan | `pq_upgrade.js:144, 185` — `verifyConfirmHmac()` |
| Timeout PQ handshake (10 detik) | `pq_upgrade.js:7` — `PQ_TIMEOUT_MS = 10_000` |
| Room capacity enforcement di server (max 2) | `main.py:270-275` |
| Pending ICE candidate queue handling | `App.jsx:214-220` |
| Storage dihapus saat room destroyed | `src/utils/storage.js:clearRoomStorage()` |
| Tidak ada penyimpanan key di localStorage/cookie | Semua key state di RAM / WebCrypto `CryptoKey` |

### Fase 5: Verification
Pengujian komprehensif dilakukan menggunakan:
1. Suite Fungsional & Kriptografi: `test_impkrip_final.py` (19 test cases: 18 PASS, 1 PARTIAL).
2. Suite Benchmarking Performa: `test_crypto_performance_final.py` (1.000 sampel per primitif).
3. Suite Penggunaan Memori Heap: `test_crypto_memory_final.py` (5 independent runs via CDP).
4. Suite Keamanan Backend Dinamis: `tests/security/test_backend_websocket_security.py` (8 test cases: 100% PASS).

### Fase 6: Release
- **Local dev:** `npm start` di root — menjalankan FastAPI + Vite via `concurrently`
- **Docker build:** `docker build --build-arg VITE_API_URL=... --build-arg VITE_WS_URL=... -t kiwkiw .`
- **Backend deploy:** Single container melayani FastAPI API + Vite static files (`./static/`) atau via Render.com
- **Frontend deploy:** Vercel.com dengan environment variables `VITE_API_URL` dan `VITE_WS_URL`
- **Env Vars Backend:** `ALLOWED_ORIGINS`, `TURN_URL/USERNAME/CREDENTIAL`, `MAX_MSG_BYTES`, `WS_IDLE_TIMEOUT`, `ROOM_TTL_SECONDS`
- **HTTPS:** Wajib — WebCrypto API hanya aktif di secure context (HTTPS / localhost)

### Fase 7: Response
| Skenario | Tindakan |
|---|---|
| URL disimpan di bookmark | Classical key tersimpan lokal; room expired otomatis dalam 15 menit |
| Server compromise | Tidak ada data sensitif / kunci di server |
| Vulnerability di library mlkem | Update versi di `package.json`, rebuild frontend |
| Room tidak self-destruct | Restart server — seluruh in-memory state terhapus seketika |

---

## BAGIAN 7: TESTING PLAN

### 7.1 Manual & Functional Test Cases

| ID | Test Case | Fitur yang Diuji | Expected Result | Status |
|---|---|---|---|---|
| TC-01 | Buka halaman, klik `[ CREATE_SECURE_ROOM ]` | `generateKey()` + `POST /rooms` | URL berubah ke `/rooms/{uuid}#{token}\|{base64_key}` | ✅ |
| TC-02 | Inspect HTTP requests di DevTools setelah create | URL Fragment tidak ke server | Network tab tidak menampilkan `#` di request HTTP | ✅ By Design (RFC 3986) |
| TC-03 | Buka URL room yang sama di tab ketiga | `room_full` enforcement | Tab ketiga tampilkan layar `ACCESS_DENIED / ROOM_FULL` | ✅ |
| TC-04 | Buka dua tab, pantau terminal log di UI | 3-message PQ upgrade | Terminal: `ROOM_CONNECTED` → `AUTHENTICATING_PEER` → `HYBRID_PQC_ACTIVE` | ✅ |
| TC-05 | Kirim pesan antar dua tab | `encrypt()`/`decrypt()` via Hybrid Key | Pesan terkirim. Payload WebRTC tampak acak terenkripsi | ✅ |
| TC-06 | Refresh salah satu tab (sender/receiver) | Chat persist + WebRTC reconnect | Chat history tetap ada di `sessionStorage`; koneksi tersambung kembali | ✅ |
| TC-07 | Salah satu peer klik "Hapus Room" | `destroy_room` + auto-teardown | Peer yang tersisa tampilkan layar `SESSION_TERMINATED`, redirect 5 detik | ✅ |
| TC-08 | Tunggu 15 menit setelah room dibuat | `asyncio.sleep(900)` TTL | Server menutup semua WS (code 1008); UI menampilkan layar room ended | ✅ |
| TC-09 | Kirim pesan berulang dengan teks yang sama | Fresh random IV per encrypt | Ciphertext berbeda untuk plaintext identik | ✅ By Design (AES-GCM) |
| TC-10 | Simulasi corrupted PQ message | `verifyConfirmHmac()` di `pq_upgrade.js` | HMAC tidak cocok → Promise reject → Handshake dibatalkan | ✅ |
| TC-11 | Buka QR code, scan dengan HP lain | QRCodeSVG + `window.location.href` | HP terbuka di URL room yang sama | ✅ |
| TC-12 | Kirim request dari origin tidak diizinkan | CORS whitelist (`ALLOWED_ORIGINS`) | Browser memblokir request; server tidak kirim ACAO header | ✅ SR-13 |
| TC-13 | Connect WS ke room ID acak tanpa token | Auto-create dihapus | WS ditutup 1008 dengan pesan `Room not found or invalid token` | ✅ SR-14 |
| TC-14 | Kirim 11 request POST /rooms dari IP yang sama dalam 1 menit | Rate limiting | Request ke-11 mendapat HTTP 429 Too Many Requests | ✅ SR-15 |
| TC-15 | Kirim pesan WebSocket melebihi 64KB | Payload limit | WS ditutup 1009 dengan pesan `Message exceeds ... byte limit` | ✅ SR-16 |
| TC-16 | Diam di WebSocket selama 65 detik tanpa ping | Idle timeout (60 detik) | Server kirim `Connection closed due to inactivity`, WS tutup 1001 | ✅ SR-16 |

### 7.2 Automated Security, Performance & Memory Testing

| Script / Test Suite | Deskripsi | Tujuan |
|---|---|---|
| `test_impkrip_final.py` | Automated test suite berbasis Playwright Headless (19 Test Cases) | Menguji 18 kasus fungsional & 1 partial replay validation pada lingkungan browser riil |
| `test_crypto_performance_final.py` | Benchmark performa kriptografi (1.000 sampel per primitif) | Mengukur throughput dan latensi mikrodetik ML-KEM, HKDF, HMAC, AES-GCM |
| `test_crypto_memory_final.py` | Benchmark alokasi memori JavaScript heap via Chrome DevTools Protocol | Memvalidasi jejak memori pada baseline, keygen, PQ upgrade, dan retain state |
| `tests/security/test_backend_websocket_security.py` | Automated security test suite backend API & WebSocket (8 Test Cases) | Menguji CORS whitelist, rate limiting, payload limit, token auth, dan TTL enforcement |

---

## BAGIAN 8: EVALUASI 6 PARAMETER KRIPTOGRAFI

### 8.1 Tujuan Keamanan
| Properti | Algoritma | Detail |
|---|---|---|
| Confidentiality | AES-GCM-256 | Seluruh pesan dienkripsi dengan Hybrid Session Key |
| Integrity | AES-GCM Tag 128-bit | GCM mode otomatis menghasilkan authentication tag |
| Mutual Authentication | HMAC-SHA-256 | Verifikasi dua arah terikat handshake transcript |
| Forward Secrecy | ML-KEM-768 Ephemeral | Setiap sesi menghasilkan ephemeral key pair unik |
| Post-Quantum Security | ML-KEM-768 NIST Level 3 | Tahan terhadap serangan komputer kuantum masa depan |

### 8.2 Model Ancaman
- **Target yang dilindungi:** Penyadap pasif, server yang dikompromikan, ancaman quantum Shor, penyerang MitM.
- **Metode yang ditangkal:** Passive eavesdropping, server-side logging, quantum cryptanalysis, unauthorized third-peer join.
- **Metode yang di luar cakupan:** Kompromi fisik perangkat ujung (*endpoint physical compromise*), malware keylogger pada browser pengguna.

### 8.3 Kapasitas Perangkat
| Aspek | Detail |
|---|---|
| Runtime | Browser modern native (Chrome, Edge, Firefox, Safari) |
| Library PQ | `mlkem` npm v2.7.0 — Pure JavaScript/TypeScript (tanpa WASM) |
| Kompatibilitas | Desktop, laptop, tablet, smartphone |
| Persyaratan Server | Python 3.9+, minimal 50MB RAM (FastAPI in-memory relay) |

### 8.4 Performa Terverifikasi
| Primitif / Alur | Waktu Rata-rata | Throughput |
|---|---|---|
| ML-KEM-768 Key Generation | ~0.08–0.12 ms | ~9.000 ops/sec |
| ML-KEM-768 Encapsulation | ~0.10–0.15 ms | ~8.000 ops/sec |
| ML-KEM-768 Decapsulation | ~0.12–0.18 ms | ~6.500 ops/sec |
| HKDF-SHA-256 Derivation | < 0.05 ms | ~25.000 ops/sec |
| HMAC-SHA-256 Verify | < 0.04 ms | ~28.000 ops/sec |
| AES-GCM-256 Encrypt (1 KB) | < 0.03 ms | ~35.000 ops/sec |
| Total PQ Handshake Protocol | ~0.40–0.60 ms (murni) / ~15 ms (jaringan 5ms RTT) | Instan bagi pengguna |

### 8.5 User Experience (UX)
| Aspek | Implementasi |
|---|---|
| Zero Friction | Satu klik buat room — tidak perlu akun, login, instalasi |
| Link Sharing | URL dengan copy-to-clipboard instan + modal QR code interaktif |
| Status Transparan | Terminal log di UI menampilkan setiap fase handshake secara real-time |
| Chat Persist | Pesan tetap ada setelah browser refresh lokal (`sessionStorage`) |
| Room Ended Screen | Layar `SESSION_TERMINATED` + auto-redirect 5 detik |
| Room Full Screen | Layar `ACCESS_DENIED` + pesan privasi untuk joiner ke-3 |
| Timer Visual | Countdown timer dengan urgent pulse di 2 menit terakhir (sinkron absolut) |
| Premium Clean Design | Tampilan modern Light Mode (Slate & Pure White) kontras tinggi dengan aksen Indigo |

### 8.6 Risiko Salah Pakai
| Risiko | Detail | Mitigasi |
|---|---|---|
| URL disimpan di bookmark | Classical key tersimpan permanen | TTL 15 menit mengkadaluarsakan key & room |
| URL dikirim lewat channel publik | Key bocor ke pihak ketiga | Pembatasan ketat 2 orang; joiner ke-3 ditolak otomatis |
| Tab ditinggalkan terbuka | Sesi tidak berakhir manual | TTL 15 menit otomatis memusnahkan room |
| Server restart | Room dan state hilang | UI menampilkan status disconnect dan opsi kembali ke landing page |

---

## BAGIAN 9: POIN PEMBAHASAN UNTUK PAPER

### SSDLC Track
1. **Zero-Trust Architecture by Design** — Server didesain sebagai entitas tidak dipercaya (*untrusted relay*) sejak fase requirements.
2. **Shift-Left Security** — Keputusan kriptografi dibuat di fase desain arsitektur, bukan patch-work setelah deployment.
3. **Threat Modeling Trike** — Matriks CRUD aktor-aset menunjukkan hak akses minimum (*least privilege*) di seluruh komponen.
4. **Ephemeral State sebagai Security Control** — Tidak perlu *data-at-rest encryption* di server karena data tidak pernah disimpan.
5. **SDL Fase Release & Response** — Konfigurasi terisolasi via Environment Variables, SAST via Bandit, DAST via ZAP & Pytest security suite.

### Applied Cryptography (IMPKRIP) Track
1. **PSK-Assisted Post-Quantum Architecture** — Mengombinasikan entropi klasikal out-of-band dengan ML-KEM-768 sesuai rekomendasi transisi NIST FIPS 203.
2. **HKDF Key Separation** — Derivasi terpisah untuk `encryptionKey` dan `confirmationKey` dengan transcript hash binding.
3. **AEAD dengan AAD Integrity Binding** — AES-GCM menyediakan confidentiality + integrity dengan pengikatan arah dan urutan pesan.
4. **Zero-Knowledge Token Distribution** — Memanfaatkan sifat RFC 3986 URI fragment sehingga token dan kunci tidak terekspos ke backend server.

---

## BAGIAN 10: STRUKTUR FOLDER & FILE

```
kiwkiw/
├── package.json                          # Root monorepo — "npm start" via concurrently
├── DEPLOYMENT.md                         # Panduan deploy ke Render + Vercel
├── SECURITY.md                           # Kebijakan keamanan
├── CONTRIBUTING.md                       # Panduan kontribusi
├── ROADMAP.md                            # Rencana pengembangan fitur
├── README.md                             # Dokumentasi utama proyek & ringkasan riset
├── WALKTHROUGH.md                        # Walkthrough alignment spesifikasi & pengujian
├── Dockerfile                            # Dockerfile multi-stage (FastAPI + Vite)
├── .env.example                          # Template konfigurasi environment variables
├── test_impkrip_final.py                 # Runner pengujian fungsional & E2E (19 test cases)
├── test_crypto_performance_final.py      # Runner benchmarking performa komputasi kriptografi
├── test_crypto_memory_final.py           # Runner benchmarking alokasi memori heap via CDP
│
├── backend/
│   ├── main.py                           # FastAPI signaling server, room TTL, rate limiting, CORS
│   ├── requirements.txt                  # fastapi, uvicorn, websockets, slowapi
│   └── .bandit                           # Konfigurasi pemindaian statis SAST
│
├── frontend/
│   ├── package.json                      # react, vite, tailwindcss v4, mlkem, qrcode.react
│   ├── vite.config.js                    # Konfigurasi Vite & Tailwind plugin
│   ├── index.html                        # HTML shell dengan SRI fonts & CSP
│   └── src/
│       ├── main.jsx                      # React entry point
│       ├── App.jsx                       # State orchestration, WebRTC DataChannel, WebSocket client
│       ├── index.css                     # Design system tokens & Tailwind styling
│       ├── components/
│       │   ├── LandingPage.jsx           # Tampilan buat room & inisiasi kunci
│       │   ├── ChatRoom.jsx              # Tampilan ruang percakapan utama
│       │   ├── TerminalLog.jsx           # Panel visualisasi real-time status kriptografi
│       │   ├── DestroyModal.jsx          # Modal konfirmasi pemusnahan room
│       │   ├── QRModal.jsx               # Modal pemindaian QR code untuk perangkat seluler
│       │   ├── RoomEnded.jsx             # Tampilan saat sesi telah berakhir/dimusnahkan
│       │   ├── RoomFull.jsx              # Tampilan penolakan akses untuk peer ke-3
│       │   └── Toast.jsx                 # Komponen notifikasi pop-up
│       ├── hooks/
│       │   └── useCountdown.js           # Custom hook sinkronisasi countdown timer
│       ├── utils/
│       │   └── storage.js                # Helper sessionStorage persist & clear
│       └── crypto/
│           ├── encryption.js             # AES-GCM-256, HKDF-SHA-256, HMAC-SHA-256 helper
│           ├── mlkem.js                  # Wrapper ML-KEM-768 (NIST FIPS 203)
│           └── pq_upgrade.js             # Protokol 3-pesan PSK-assisted ML-KEM handshake
│
├── tests/
│   ├── browser/
│   │   ├── impkrip_unit.js               # Browser-native functional test suite
│   │   ├── benchmark_v2.js               # Sub-millisecond batch benchmark harness
│   │   └── benchmark_memory.js           # JavaScript heap memory profiling harness
│   └── security/
│       └── test_backend_websocket_security.py # Suite pengujian keamanan dinamis backend API
│
├── docs/
│   ├── shared/
│   │   └── BLUEPRINT.md                  # Arsitektur SSOT & living documentation
│   └── impkrip/
│       ├── architecture_and_protocol.md  # Detail protokol kriptografi & alur data
│       ├── benchmark_methodology.md      # Metodologi benchmarking & spesifikasi uji
│       └── evaluation_summary.md         # Evaluasi 6 parameter kriptografi terapan
│
└── artifacts/
    ├── impkrip_final/                    # Artefak hasil uji kriptografi & benchmark
    │   ├── impkrip_test_report.json
    │   ├── impkrip_test_report.md
    │   ├── impkrip_test_report.html
    │   ├── impkrip_benchmark.json
    │   ├── impkrip_benchmark.csv
    │   ├── impkrip_memory_benchmark.json
    │   ├── impkrip_environment.json
    │   └── impkrip_testing_summary.md
    └── ssdlc_final/                      # Artefak hasil pengujian SSDLC & threat modeling
        ├── canonical_ssdlc_results.md
        ├── traceability_matrix.md
        ├── trike_threat_model.md
        ├── bandit_report.json
        └── backend_websocket_test_results.json
```

---

## BAGIAN 11: WORKFLOWS

### 11.1 Workflow: Membuat dan Bergabung Room

```
Peer A (Pembuat)                      Server                    Peer B (Joiner)
      │                                  │                             │
      │── POST /rooms ──────────────────►│                             │
      │◄─ { room_id, creator_token, ────│                             │
      │     invite_token, turn_servers } │                             │
      │                                  │                             │
      │  [URL: /rooms/{id}#{invToken}|{key}]                           │
      │  sessionStorage: save token & ts │                             │
      │                                  │                             │
      │── WS /rooms/{id}/ws?token=cToken►│                             │
      │◄─ { type: "init", initiator: T } │                             │
      │                                  │                             │
      │  [Bagikan link via QR / copy] ───┼────────────────────────────►│
      │                                  │  [Ekstrak token & key dari  │
      │                                  │   URL fragment #token|key]  │
      │                                  │                             │
      │                                  │◄── WS /rooms/{id}/ws?token=iToken
      │                                  │──► { type: "init", ini: F } │
      │                                  │                             │
      │◄─ { type: "peer_ready" } ────────│                             │
      │                                  │                             │
      │  [isInitiator = true]            │                             │
      │  [initWebRTC()]                  │                             │
      │                                  │                             │
      │── SDP Offer ────────────────────►│──► SDP Offer ───────────────│
      │◄─ SDP Answer ────────────────────│◄── SDP Answer ──────────────│
      │── ICE Candidates ───────────────►│──► ICE Candidates ──────────│
      │                                  │                             │
      │◄════════ WebRTC DataChannel P2P (direct, server tidak terlibat) ════════►│
      │                                  │                             │
      │  3-Message PSK-Assisted PQ Upgrade (ML-KEM-768 + HMAC)         │
      │── pq-pubkey { ek, nonceA } ───────────────────────────────────►│
      │◄─ pq-encap { ct, nonceB, respHmac } ───────────────────────────│
      │── pq-confirm { initHmac } ────────────────────────────────────►│
      │                                  │                             │
      │  HKDF → Hybrid Session Key       │    HKDF → Hybrid Session Key│
      │                                  │                             │
      │◄════════ Pesan terenkripsi AES-GCM-256 (P2P DataChannel) ══════►│
```

### 11.2 Workflow: Refresh Browser (Chat Persist & Reconnect)

```
Peer A (refresh)                      Server                    Peer B (masih aktif)
      │                                  │                             │
      │  [Browser refresh]               │                             │
      │  [WS terputus sementara]         │                             │
      │                                  │──► { type: "peer_disc..." }►│
      │                                  │    (Room tetap hidup 15 m)  │
      │                                  │                             │
      │  [React mount ulang]             │                             │
      │  [Ambil token & classical key    │                             │
      │   dari URL hash / sessionStorage]│                             │
      │  [loadMessages() → restore chat] │                             │
      │                                  │                             │
      │── WS /rooms/{id}/ws?token=cToken►│                             │
      │◄─ { type: "init", initiator: F } │                             │
      │                                  │──► { type: "peer_ready" } ──│
      │                                  │                             │
      │  [WebRTC Reconnect & PQ Upgrade baru dilakukan secara otomatis]│
      │◄════════ P2P DataChannel Aktif Kembali & Chat Dilanjutkan ════►│
```

### 11.3 Workflow: Room Full — Tolak Peer Ketiga

```
Peer C (mencoba join)                 Server
      │                                  │
      │── WS /rooms/{id}/ws ────────────►│
      │  [Server deteksi count >= 2]     │
      │◄─ { type: "room_full",           │
      │      reason: "Room is full..." } │
      │◄─ [WS close code 1008]           │
      │                                  │
      │  [Tampilkan layar ACCESS_DENIED] │
      │  [ROOM_FULL screen]              │
```

### 11.4 Workflow: Pemusnahan Eksplisit (Destroy Room)

```
Peer A (klik "Hapus Room")            Server                    Peer B (tersisa)
      │                                  │                             │
      │  [Klik tombol Hapus Room]        │                             │
      │── { type: "destroy_room" } ─────►│                             │
      │                                  │  [del rooms[room_id]]       │
      │                                  │──► { type: "room_ended", ──►│
      │                                  │      reason: "destroyed" }  │
      │                                  │  [Close WS code 1008]       │
      │                                  │                             │
      │  [clearRoomStorage(roomId)]      │              [clearRoomStorage(roomId)]
      │  [setRoomEnded(true)]            │              [setRoomEnded(true)]
      │  [Layar SESSION_TERMINATED]      │              [Layar SESSION_TERMINATED]
      │  [Auto-redirect 5 detik]         │              [Auto-redirect 5 detik]
```

### 11.5 Workflow: TTL Expired (15 Menit)

```
Server (asyncio background task)       Peer A                    Peer B
      │                                  │                             │
      │  [asyncio.sleep(900)]            │                             │
      │  [Batas waktu 15 menit tercapai] │                             │
      │  [del rooms[room_id]]            │                             │
      │                                  │                             │
      │── ws.close(1008, "TTL expired") ─┼────────────────────────────►│
      │◄─ ws.close(1008, "TTL expired") ─┘                             │
      │                                  │                             │
      │              [WS onclose → setStatus("Disconnected")]          │
      │              [timerSeconds === 0 → showToast "TTL expired"]    │
      │              [clearRoomStorage() → Layar Room Ended]           │
```

### 11.6 Workflow: WebRTC Reconnect setelah Disconnect Sementara

```
Peer A (reconnect)                    Server                    Peer B (masih aktif)
      │                                  │                             │
      │── WS /rooms/{id}/ws?token=... ──►│                             │
      │◄─ { type: "init", initiator: F } │                             │
      │                                  │──► { type: "peer_ready" } ──│
      │                                  │                             │
      │  [Peer B: isInitiator = true]    │                             │
      │  [Peer B: peer.current.close()]  │                             │
      │  [Peer B: initWebRTC()]          │                             │
      │                                  │                             │
      │◄─ SDP Offer ─────────────────────│◄── SDP Offer ───────────────│
      │── SDP Answer ────────────────────►──► SDP Answer ──────────────│
      │── ICE Candidates ───────────────►──► ICE Candidates ───────────│
      │                                  │                             │
      │◄════════ WebRTC DataChannel P2P kembali aktif ════════════════►│
      │   [PQ upgrade ulang → Hybrid Key baru]                        │
```

---

## BAGIAN 12: UPDATE LOG

| Tanggal | Versi | Perubahan |
|---|---|---|
| 2026-07-28 | 1.0.0 | CREATED — Blueprint awal berdasarkan analisis kode aktual |
| 2026-07-28 | 1.1.0 | UPDATE — Kriptografi: `mlkem.js` menggunakan real ML-KEM-768 (FIPS 203) via `mlkem` v2.7.0 |
| 2026-07-28 | 1.2.0 | UPDATE — Backend: Room TTL 15 menit via `asyncio.create_task(destroy_room_later())` |
| 2026-07-28 | 1.3.0 | UPDATE — Frontend: Room auto-reconnect; WebRTC reconnect logic fix |
| 2026-07-28 | 1.4.0 | UPDATE — UI: Link sharing dengan blur, reveal, copy-to-clipboard |
| 2026-07-28 | 1.5.0 | UPDATE — BLUEPRINT: Semua 11 bagian terisi penuh dengan data aktual |
| 2026-07-28 | 1.6.0 | UPDATE — Major: (1) Chat persist via sessionStorage; (2) QR code join room; (3) Cyber vibes redesign (JetBrains Mono, matrix green, terminal log UI); (4) CSS fix — Google Fonts dipindah ke `<link>` di `index.html`; (5) WebRTC reconnect bug fix — `peer_ready` receiver selalu jadi initiator; (6) Room strict 2 orang — `room_full` event graceful; (7) Room auto-destroy saat peer disconnect — `room_ended` event; (8) Layar `SESSION_TERMINATED` dan `ACCESS_DENIED`; (9) Blueprint diperbarui lengkap dengan workflows |
| 2026-07-28 | 2.0.0 | SECURITY HARDENING — (1) Dockerfile ditulis ulang Python/FastAPI+Vite multi-stage; (2) CORS restricted ke ALLOWED_ORIGINS env var; (3) SecurityHeadersMiddleware: HSTS+X-Frame+nosniff+Referrer; (4) Rate limiting 10/menit via SlowAPI; (5) WebSocket auto-create dihapus — reject room tidak dikenal; (6) Payload limit: 64KB JSON; (7) Idle timeout 60 detik; (8) WebSocket token auth via ws_token; (9) Structured JSON logging (UTCFormatter); (10) Frontend CSP meta tag; (11) secureLog() production-safe; (12) ICE/TURN dynamic dari server; (13) beforeunload cleanup + message cap; (14) BLUEPRINT: SR-13..16, T-11..14, TC-12..16, §13 Deployment Security Controls ditambahkan |
| 2026-07-28 | 2.1.0 | BUGFIX & STABILITY — (1) Dihapus `ws_token` karena memblokir second peer saat race condition URL join; (2) Ditambahkan ICE candidate queuing di Frontend (`pendingCandidates`) untuk memperbaiki WebRTC race condition (menggantung di `Initiating WebRTC`); (3) Cleanup dokumentasi README & BLUEPRINT |
| 2026-07-29 | 2.2.0 | DEPLOYMENT & TESTING — (1) Explicit CSP whitelist for WebRTC STUN/TURN servers; (2) Resolved WebRTC hang due to strict NAT & readyState race condition; (3) Smart fallback URLs (Render backend for Vercel deployment); (4) Cross-device LAN connection & CORS fixes; (5) Penambahan suite pengujian otomatis |
| 2026-07-30 | 2.3.0 | SECURITY AUDIT & UI OVERHAUL — (1) Lulus uji DAST (ZAP) perbaikan CORS, strict CSP, Subresource Integrity (SRI) di `index.html`; (2) Security Headers via `vercel.json` dan SPA Routing rewrites; (3) Lulus uji SAST dengan `bandit`; (4) Timer Sync Absolut (Backend kirim `expires_in` dan fallback P2P `startTs`); (5) UI peremajaan ke Light Mode (Slate/White) agar optimal di laporan akademik. |
| 2026-07-30 | 2.4.0 | BUGFIX & RELIABILITY — (1) Penambahan mekanisme Ping/Pong di WebSocket (`App.jsx` & `main.py`) untuk mencegah Idle Timeout 60s; (2) Fix token authentication untuk Peer ke-2 dengan menyematkan `invite_token` secara aman; (3) Menghapus penghancuran room agresif (`del rooms[room_id]`) saat koneksi WS terputus untuk mendukung fitur reconnect saat refresh sebelum batas TTL (15 menit). |
| 2026-08-01 | 2.5.0 | SECURITY HARDENING & REFACTOR — (1) Refactor `App.jsx` menjadi komponen-komponen terpisah (`LandingPage`, `ChatRoom`, dll) dan hook (`useCountdown`); (2) Penyempurnan `finally` block di backend untuk memastikan cleanup koneksi WS saat error/timeout; (3) URL token diamankan dengan memindahkan `invite_token` ke hash/fragment bersama encryption key (`#token|key`) sehingga tidak pernah menyentuh server backend host; (4) Fitur file sharing dihapus sepenuhnya (backend & frontend) untuk mengurangi *attack surface* dan menjaga sistem minimalis; (5) Pesan log terminal direvisi agar lebih akurat; (6) Pengujian Playwright E2E ditambahkan. |
| 2026-08-03 | 2.5.1 | ARCHITECTURAL & DOCUMENTATION SYNCHRONIZATION — (1) Sinkronisasi total seluruh dokumen, blueprint, kode backend/frontend, dan konfigurasi deployment; (2) Rekonsiliasi protokol ke skema *PSK-assisted ML-KEM session-key establishment (ML-KEM-768)* dengan HKDF key separation (`encryptionKey` & `confirmationKey`) dan mutual HMAC confirmation terikat transcript hash; (3) Penyelarasan format URL fragment `#<token>\|<key>`; (4) Sinkronisasi runner pengujian kanonikal (`test_impkrip_final.py`, `test_crypto_performance_final.py`, `test_crypto_memory_final.py`, `tests/security/test_backend_websocket_security.py`); (5) Pemutakhiran pohon direktori monorepo modular di seluruh dokumentasi. |

---

*Dokumen ini adalah living document. Setiap perubahan pada kode harus dicatat di BAGIAN 12 dan diperbarui di bagian terkait.*
6-07-28 | 1.5.0 | UPDATE — BLUEPRINT: Semua 11 bagian terisi penuh dengan data aktual |
| 2026-07-28 | 1.6.0 | UPDATE — Major: (1) Chat persist via sessionStorage; (2) QR code join room; (3) Cyber vibes redesign (JetBrains Mono, matrix green, terminal log UI); (4) CSS fix — Google Fonts dipindah ke `<link>` di `index.html`; (5) WebRTC reconnect bug fix — `peer_ready` receiver selalu jadi initiator; (6) Room strict 2 orang — `room_full` event graceful; (7) Room auto-destroy saat peer disconnect — `room_ended` event; (8) Layar `SESSION_TERMINATED` dan `ACCESS_DENIED`; (9) Blueprint diperbarui lengkap dengan workflows |
| 2026-07-28 | 2.0.0 | SECURITY HARDENING — (1) Dockerfile ditulis ulang Python/FastAPI+Vite multi-stage; (2) CORS restricted ke ALLOWED_ORIGINS env var; (3) SecurityHeadersMiddleware: HSTS+X-Frame+nosniff+Referrer; (4) Rate limiting 10/menit via SlowAPI; (5) WebSocket auto-create dihapus — reject room tidak dikenal; (6) Payload limit: 64KB JSON; (7) Idle timeout 60 detik; (8) WebSocket token auth via ws_token; (9) Structured JSON logging (UTCFormatter); (10) Frontend CSP meta tag; (11) secureLog() production-safe; (12) ICE/TURN dynamic dari server; (13) beforeunload cleanup + message cap; (14) BLUEPRINT: SR-13..16, T-11..14, TC-12..16, §13 Deployment Security Controls ditambahkan |
| 2026-07-28 | 2.1.0 | BUGFIX & STABILITY — (1) Dihapus `ws_token` karena memblokir second peer saat race condition URL join; (2) Ditambahkan ICE candidate queuing di Frontend (`pendingCandidates`) untuk memperbaiki WebRTC race condition (menggantung di `Initiating WebRTC`); (3) Cleanup dokumentasi README & BLUEPRINT |
| 2026-07-29 | 2.2.0 | DEPLOYMENT & TESTING — (1) Explicit CSP whitelist for WebRTC STUN/TURN servers; (2) Resolved WebRTC hang due to strict NAT & readyState race condition; (3) Smart fallback URLs (Render backend for Vercel deployment); (4) Cross-device LAN connection & CORS fixes; (5) Penambahan `test_ssdlc_trike.py` dan `test_crypto_performance.py` untuk pengujian otomatis |
| 2026-07-30 | 2.3.0 | SECURITY AUDIT & UI OVERHAUL — (1) Lulus uji DAST (ZAP) perbaikan CORS, strict CSP, Subresource Integrity (SRI) di `index.html`; (2) Security Headers via `vercel.json` dan SPA Routing rewrites; (3) Lulus uji SAST dengan `bandit`; (4) Timer Sync Absolut (Backend kirim `expires_in` dan fallback P2P `startTs`); (5) UI peremajaan ke Light Mode (Slate/White) agar optimal di laporan akademik. |
| 2026-07-30 | 2.4.0 | BUGFIX & RELIABILITY — (1) Penambahan mekanisme Ping/Pong di WebSocket (`App.jsx` & `main.py`) untuk mencegah Idle Timeout 60s; (2) Fix "Invalid token" untuk Peer ke-2 dengan menyematkan `ws_token` secara aman di query parameter URL (`?t=...`); (3) Menghapus penghancuran room agresif (`del rooms[room_id]`) saat koneksi WS terputus untuk mendukung fitur reconnect saat refresh sebelum batas TTL (15 menit). |
| 2026-08-01 | 2.5.0 | SECURITY HARDENING & REFACTOR — (1) Refactor `App.jsx` menjadi komponen-komponen terpisah (`LandingPage`, `ChatRoom`, dll) dan hook (`useCountdown`); (2) Penyempurnan `finally` block di backend untuk memastikan cleanup koneksi WS saat error/timeout; (3) URL token diamankan dengan memindahkan `invite_token` ke hash/fragment bersama encryption key (`#token|key`) sehingga tidak pernah menyentuh server backend host; (4) Fitur file sharing dihapus sepenuhnya (backend & frontend) untuk mengurangi *attack surface* dan menjaga sistem minimalis; (5) Pesan log terminal direvisi agar lebih akurat; (6) Pengujian Playwright E2E ditambahkan. |

---

*Dokumen ini adalah living document. Setiap perubahan pada kode harus dicatat di BAGIAN 12 dan diperbarui di bagian terkait.*
