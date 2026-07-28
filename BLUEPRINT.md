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
| **Versi** | 2.0.0 |
| **Lisensi** | MIT License |
| **Inspirasi** | Nullroom.io (versi ringan — tanpa Ruby, pakai React + Python) |

### Konsep Inti
Kiw Kiw Chat adalah aplikasi percakapan **ephemeral** (sementara) berbasis **Peer-to-Peer (P2P)** dengan filosofi **zero-trace**. Tidak ada akun, tidak ada instalasi, tidak ada jejak digital setelah percakapan selesai.

| Aspek | Implementasi |
|---|---|
| **Tanpa Akun** | Tidak ada autentikasi. Room dibuat via `POST /rooms` |
| **Tanpa Instalasi** | Berjalan murni di browser — WebRTC + Web Crypto API |
| **Self-Destruct 15 Menit** | `asyncio.create_task(destroy_room_later())` di `main.py:46-58` |
| **Strict 2 Orang** | Server kirim `room_full` lalu close code 1008 jika `count >= 2` |
| **Room Berakhir Otomatis** | Saat satu peer disconnect → server kirim `room_ended` ke yang tersisa → room dihapus |
| **Chat Persist saat Refresh** | Pesan disimpan ke `sessionStorage` per room ID, dihapus saat room dihancurkan |
| **Tanpa Jejak** | Pesan di-encrypt E2E via WebRTC DataChannel; tidak ada DB; tidak ada log |

---

## BAGIAN 2: ARSITEKTUR SISTEM

### 2.1 Diagram Arsitektur High-Level

```
┌─────────────────────────────────────────────────────┐
│  BROWSER — Peer A (Initiator)                       │
│  App.jsx → sessionStorage (msg + timer persist)     │
│  App.jsx → encryption.js (AES-GCM-256)             │
│  App.jsx → pq_upgrade.js (ML-KEM-768 + HKDF)       │
│  App.jsx → WebSocket Client (signaling only)        │
└──────────────┬──────────────────────────────────────┘
               │ WebSocket  /rooms/{id}/ws
               │ HTTP POST  /rooms
               ▼
┌─────────────────────────────────────────────────────┐
│  SERVER — FastAPI Python  backend/main.py           │
│  POST /rooms    → buat room ID + asyncio TTL timer  │
│  WS /rooms/{id}/ws → relay SDP + ICE candidates    │
│  rooms: Dict[str, Dict]  ← in-memory ONLY, no DB   │
│                                                     │
│  Events yang dikirim server:                        │
│   • init        → identity (initiator true/false)   │
│   • peer_ready  → beri tahu peer lama ada peer baru │
│   • signal      → relay SDP offer/answer + ICE      │
│   • room_full   → tolak koneksi ke-3 secara graceful│
│   • room_ended  → beri tahu peer tersisa utk keluar │
└──────────────┬──────────────────────────────────────┘
               │ WebSocket  /rooms/{id}/ws
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
| QR Code | qrcode.react (QRCodeSVG) | ^4.x | `src/App.jsx` |
| Post-Quantum KEM | mlkem (FIPS 203) | ^2.7.0 | `src/crypto/mlkem.js` |
| Classical Crypto | Web Crypto API (browser built-in) | — | `src/crypto/encryption.js` |
| P2P Transport | WebRTC DataChannel (browser built-in) | — | `src/App.jsx` |
| Signaling | WebSocket (browser built-in) | — | `src/App.jsx` |
| Chat Persistence | sessionStorage (browser built-in) | — | `src/App.jsx` |

#### Backend (Server)
| Komponen | Teknologi | Versi | File |
|---|---|---|---|
| Framework | FastAPI | 0.104.1 | `backend/requirements.txt` |
| ASGI Server | Uvicorn | 0.24.0 | `backend/requirements.txt` |
| WebSocket | websockets (via FastAPI) | 12.0 | `backend/requirements.txt` |
| State Storage | Python Dict in-memory | — | `backend/main.py` |
| TTL Scheduler | asyncio built-in | — | `backend/main.py` |

---

## BAGIAN 3: KOMPONEN KRIPTOGRAFI

### 3.1 Layer Classical — AES-GCM-256

**File:** `frontend/src/crypto/encryption.js`

| Parameter | Nilai | Lokasi |
|---|---|---|
| **Algoritma** | AES-GCM | `encryption.js:8-9` |
| **Key Length** | 256 bit | `encryption.js:9` |
| **IV Length** | 12 bytes (96-bit, standar NIST) | `encryption.js:42` |
| **Tag Length** | 128 bit (default AES-GCM) | Web Crypto API default |
| **Format Distribusi Key** | JWK → Base64 → URL `#fragment` | `encryption.js:13-15` |
| **Output Ciphertext** | `[IV (12B) ‖ Ciphertext]` → Base64 | `encryption.js:52-59` |

### 3.2 Layer Post-Quantum — ML-KEM-768 (FIPS 203)

**File:** `frontend/src/crypto/mlkem.js`  
**Library:** `mlkem` npm package v2.7.0

| Parameter | Nilai | Catatan |
|---|---|---|
| **Algoritma** | ML-KEM-768 (CRYSTALS-Kyber) | NIST Security Level 3 |
| **Standar** | FIPS 203 | Standar resmi NIST 2024 |
| **Public Key Size** | 1184 bytes | Dikirim via WebRTC DataChannel |
| **Secret Key Size** | 2400 bytes | RAM browser — dihapus setelah `decap` |
| **Ciphertext Size** | 1088 bytes | Dikirim kembali via WebRTC |
| **Shared Secret Size** | 32 bytes (256-bit) | Input HKDF |
| **Platform** | Pure JavaScript/TypeScript (tanpa WASM) | Berjalan di semua browser modern |

### 3.3 Key Fusion — HKDF-SHA-256

**File:** `frontend/src/crypto/encryption.js` — fungsi `deriveHybridKey`

| Parameter | Nilai | Lokasi |
|---|---|---|
| **Algoritma** | HKDF | `encryption.js:104` |
| **Hash** | SHA-256 | `encryption.js:107` |
| **IKM** | ML-KEM-768 Shared Secret (32 bytes) | `encryption.js:96-102` |
| **Salt** | AES-256-GCM Classical Key (raw bytes) | `encryption.js:108` |
| **Info/Context** | `"nullroom-hybrid-v1"` | `encryption.js:109` |
| **Output** | AES-GCM-256 Hybrid Session Key | `encryption.js:112` |

### 3.4 Protokol 3-Pesan PQ Upgrade

```
PEER A (INITIATOR)                         PEER B (RESPONDER)
       │                                          │
       │  1. generateKey() → AES-GCM-256          │
       │     Disimpan di URL #fragment            │
       │                                          │
       │  2. MlKem768.generateKeyPair()           │
       │     → [publicKey 1184B, secretKey 2400B] │
       │                                          │
       │ ──── pq-pubkey: publicKey (1184B) ──────►│
       │                                          │ 3. MlKem768.encap(publicKey)
       │                                          │    → [ciphertext 1088B, sharedSecret 32B]
       │                                          │ 4. HMAC(sharedSecret, "responder-label")
       │◄─── pq-encap: { ct, responderHMAC } ────│
       │                                          │
       │  5. MlKem768.decap(ct, secretKey)        │
       │     → sharedSecret (32 bytes)            │
       │  6. Verify responderHMAC                 │
       │  7. HMAC(sharedSecret, "initiator-label")│
       │                                          │
       │ ──── pq-confirm: initiatorHMAC ─────────►│
       │                                          │ 8. Verify initiatorHMAC
       │                                          │
HKDF(IKM=sharedSecret, Salt=AES-Key, Info="nullroom-hybrid-v1")
              → HYBRID SESSION KEY (AES-GCM-256)
         Semua pesan selanjutnya dienkripsi key ini
```

### 3.5 Integritas & Verifikasi Mutual

**File:** `frontend/src/crypto/pq_upgrade.js`

| Parameter | Nilai |
|---|---|
| **Label Responder** | `"nullroom-pq-confirm-responder"` |
| **Label Initiator** | `"nullroom-pq-confirm-initiator"` |
| **Timeout PQ Handshake** | 10 detik (`PQ_TIMEOUT_MS = 10_000`) |
| **Aksi jika HMAC gagal** | Promise di-reject → koneksi ditutup |

---

## BAGIAN 4: THREAT MODEL (KERANGKA: TRIKE)

### 4.1 Aset yang Dilindungi

| Aset | Klasifikasi | Perlindungan |
|---|---|---|
| Konten pesan | KRITIS | Enkripsi AES-GCM-256 via Hybrid Key |
| Classical Key (AES) | KRITIS | URL Fragment #, tidak pernah ke server (RFC 3986) |
| ML-KEM Secret Key | KRITIS | RAM browser — `delete peer._pqSecretKey` setelah decap |
| ML-KEM Shared Secret | KRITIS | RAM sementara — dihapus setelah HKDF |
| Room ID | SEDANG | UUID v4 acak; tanpa key tidak berguna |
| Chat history (refresh) | SEDANG | `sessionStorage` — dihapus saat room destroyed |
| Metadata signaling (SDP, ICE) | RENDAH | Relay tanpa penyimpanan; tidak berisi konten pesan |

### 4.2 Aktor Sistem

| Aktor | Peran | Kepercayaan | Aksi |
|---|---|---|---|
| Peer A (Initiator) | Pembuat room | Penuh (trusted) | Create room, inisiasi PQ upgrade, send/receive |
| Peer B (Responder) | Penerima link | Penuh (trusted) | Join room, respond PQ upgrade, send/receive |
| Server (FastAPI) | Signaling relay | Tidak dipercaya (zero-knowledge) | Relay WS, enforce TTL, reject 3rd peer, evict on disconnect |
| Operator Server | Admin infra | Tidak dipercaya | Hanya bisa melihat Room ID & jumlah koneksi |
| Adversary (Passive) | Penyadap jaringan | Musuh | Bisa lihat WS signaling, tidak bisa dekripsi DataChannel |
| Adversary (Active) | MITM / Quantum | Musuh | Ditangkal ML-KEM-768 + HMAC mutual verification |

### 4.3 Matriks Hak Akses (CRUD)

| Aktor | Room Data | Pesan | Classical Key | PQ Keys | Chat History |
|---|---|---|---|---|---|
| Peer A | C, R, D | C, R | C, R | C, R, D | C, R, D |
| Peer B | R | C, R | R (dari URL) | C (encap only) | R, D |
| Server | C, R, D (ID only) | — | — | — | — |
| Adversary (Network) | R (Room ID only) | R (encrypted) | — | — | — |

### 4.4 Skenario Serangan & Mitigasi

| ID | Serangan | Probabilitas | Dampak | Mitigasi |
|---|---|---|---|---|
| T-01 | Passive Eavesdropping | Tinggi | Kritis | AES-GCM-256 + Hybrid Key mengenkripsi seluruh DataChannel |
| T-02 | Quantum Cryptanalysis | Rendah | Kritis | ML-KEM-768 (NIST Level 3) tahan terhadap algoritma Shor |
| T-03 | Server Compromise | Sedang | Rendah | Server adalah dumb relay; kunci ada di URL fragment |
| T-04 | Room Flooding / 3rd Peer | Rendah | Sedang | `room_full` dikirim + WS close 1008 jika `count >= 2` |
| T-05 | MITM pada PQ Exchange | Sedang | Kritis | HMAC mutual authentication di `pq_upgrade.js` |
| T-06 | Key Extraction dari RAM | Rendah | Kritis | `delete peer._pqSecretKey` segera setelah `decap` |
| T-07 | URL Fragment Interception | Sedang | Kritis | TTL 15 menit mengkadaluarsakan key otomatis |
| T-08 | Replay Attack | Rendah | Sedang | AES-GCM IV random 12-byte fresh setiap pesan |
| T-09 | Room Takeover setelah Disconnect | Rendah | Sedang | `room_ended` dikirim → room dihapus sepenuhnya dari server |
| T-10 | Session History Leak saat Refresh | Rendah | Sedang | `sessionStorage` dibersihkan saat `room_ended` / destroy |
| T-11 | CORS Cross-Origin Bypass | Sedang | Tinggi | `ALLOWED_ORIGINS` dari env var — hanya origin whitelist yang diizinkan |
| T-12 | WebSocket Room Bypass (tanpa POST) | Sedang | Tinggi | WS endpoint tolak room ID tidak dikenal; auto-create dihapus |
| T-13 | Resource Exhaustion / DoS (Room Flooding) | Tinggi | Tinggi | Rate limiting 10 req/IP/menit via SlowAPI |
| T-14 | Memory DoS via Payload Besar | Sedang | Tinggi | Payload limit: 5 MB JSON, 50 MB file; koneksi ditutup 1009 |

---

## BAGIAN 5: SECURITY REQUIREMENTS

| ID | Requirement | Kategori | Status |
|---|---|---|---|
| SR-01 | Seluruh konten percakapan dienkripsi E2E dengan AES-GCM-256 | Confidentiality | ✅ `encryption.js:40-63` |
| SR-02 | Kunci enkripsi klasikal tidak boleh pernah melewati server | Key Management | ✅ URL Fragment (RFC 3986) |
| SR-03 | Sistem tahan terhadap ancaman komputasi kuantum | Post-Quantum | ✅ ML-KEM-768 FIPS 203 |
| SR-04 | Kunci sesi akhir adalah derivasi dari dua entropi independen | Key Derivation | ✅ HKDF-SHA-256 `encryption.js:91-118` |
| SR-05 | Data percakapan dihancurkan saat sesi berakhir | Data Protection | ✅ `sessionStorage` dihapus saat `room_ended` / destroy |
| SR-06 | Server tidak menyimpan log percakapan atau kunci | Logging/Privacy | ✅ Tidak ada logging pesan di `main.py` |
| SR-07 | Koneksi P2P menggunakan saluran terenkripsi dan terautentikasi | P2P Security | ✅ WebRTC DTLS + Hybrid Key layer |
| SR-08 | Pertukaran PQ diverifikasi secara mutual | Authentication | ✅ HMAC mutual `pq_upgrade.js:85-131` |
| SR-09 | Room dibatasi ketat pada 2 peserta | Access Control | ✅ `room_full` + close 1008 di `main.py:76-80` |
| SR-10 | Room memiliki masa hidup maksimum 15 menit | Ephemeral State | ✅ `asyncio.sleep(900)` di `main.py:46-58` |
| SR-11 | Room dihancurkan segera saat salah satu peer keluar | Session Integrity | ✅ `room_ended` + `del rooms[room_id]` di `main.py:124-143` |
| SR-12 | Chat history dapat dipulihkan setelah refresh selama room masih aktif | Usability | ✅ `sessionStorage` persist di `App.jsx:21-30` |
| SR-13 | CORS dibatasi ke origin production yang diizinkan secara eksplisit | Transport Security | ✅ `ALLOWED_ORIGINS` env var di `main.py:64` |
| SR-14 | WebSocket hanya menerima koneksi ke room yang dibuat via `POST /rooms` | Access Control | ✅ Room ID divalidasi; auto-create dihapus di `main.py:169` |
| SR-15 | API endpoint dilindungi rate limiting untuk mencegah resource exhaustion | Availability | ✅ SlowAPI 10 req/IP/menit di `main.py:141` |
| SR-16 | Ukuran payload dibatasi untuk mencegah memory DoS melalui WebSocket | Integrity/Availability | ✅ 5 MB JSON, 50 MB file di `main.py:205-218` |

---

## BAGIAN 6: MAPPING SSDLC (MICROSOFT SDL)

### Fase 1: Training
| Topik | Relevansi |
|---|---|
| Web Crypto API | AES-GCM-256, HKDF, HMAC di browser |
| Post-Quantum Cryptography (FIPS 203) | ML-KEM-768 sebagai lapisan PQ |
| WebRTC Security (DTLS, ICE) | Transport P2P |
| Python FastAPI + WebSocket | Backend signaling server |
| React Secure Coding | State kriptografi di frontend |

### Fase 2: Requirements
Security requirements SR-01 s/d SR-16 diturunkan dari:
- Zero-Trace philosophy (inspirasi Nullroom.io)
- NIST FIPS 203 (ML-KEM)
- RFC 3986 (URI Fragment)
- Threat Model Trike (Bagian 4)

### Fase 3: Design
| Keputusan Desain | Alasan |
|---|---|
| URL Fragment untuk distribusi key | RFC 3986: fragment tidak dikirim ke server |
| WebRTC DataChannel untuk pesan | P2P langsung; server tidak melihat konten |
| In-Memory Dict bukan Redis/DB | Minimalisasi data persisten; ephemeral by design |
| 3-Message PQ Upgrade Protocol | Verifikasi mutual sebelum key fusion |
| HKDF sebagai key fusion | NIST standard; dua entropy source independen |
| `sessionStorage` untuk chat persist | Persist across refresh tapi tidak antar tab/device |
| Room destroyed saat peer disconnect | Mencegah "room kosong" yang bisa di-takeover |

### Fase 4: Implementation (Secure Coding Practices)
| Praktek | Lokasi |
|---|---|
| IV random fresh per pesan (cegah IV reuse) | `encryption.js:42` |
| Secret key dihapus setelah penggunaan | `pq_upgrade.js:82` — `delete peer._pqSecretKey` |
| Verifikasi HMAC sebelum key derivation | `pq_upgrade.js:85-91` — `verifyConfirmHmac()` |
| Timeout PQ handshake (10 detik) | `pq_upgrade.js:4` — `PQ_TIMEOUT_MS = 10_000` |
| Room capacity enforcement di server | `main.py:76-80` |
| ICE candidate guard: cek `remoteDescription` dulu | `App.jsx` — `handleSignal()` |
| Storage dihapus saat room destroyed | `App.jsx` — `clearRoomStorage()` |
| Tidak ada penyimpanan key di localStorage/cookie | Semua state di React `useRef` / RAM |

### Fase 5: Verification
Lihat Bagian 7 untuk detail test case.

### Fase 6: Release
- **Local dev:** `npm start` di root — menjalankan FastAPI + Vite via `concurrently`
- **Docker build:** `docker build --build-arg VITE_API_URL=... --build-arg VITE_WS_URL=... -t kiwkiw .`
- **Backend deploy:** Single container melayani FastAPI API + Vite static files (`./static/`)
- **Alternatif split:** Render.com (backend) + Vercel (frontend) dengan env vars berbeda
- **Env Vars Backend:** `ALLOWED_ORIGINS`, `TURN_URL/USERNAME/CREDENTIAL`, `MAX_MSG_BYTES`, `WS_IDLE_TIMEOUT`
- **Env Vars Frontend (baked at build):** `VITE_API_URL`, `VITE_WS_URL`
- **HTTPS:** Wajib — WebCrypto API tidak berfungsi di HTTP

### Fase 7: Response
| Skenario | Tindakan |
|---|---|
| Key bocor melalui URL history | User hapus history; room expired 15 menit |
| Server compromise | Tidak ada data sensitif di server |
| Vulnerability di library mlkem | Update versi di `package.json`, rebuild frontend |
| Room tidak self-destruct | Restart server — seluruh in-memory state terhapus |

---

## BAGIAN 7: TESTING PLAN

| ID | Test Case | Fitur yang Diuji | Expected Result | Status |
|---|---|---|---|---|
| TC-01 | Buka halaman, klik `[ CREATE_SECURE_ROOM ]` | `generateKey()` + `POST /rooms` | URL berubah ke `/rooms/{uuid}#{base64_key}` | ✅ |
| TC-02 | Inspect HTTP requests di DevTools setelah create | URL Fragment tidak ke server | Network tab tidak menampilkan `#` di request | ✅ By Design (RFC 3986) |
| TC-03 | Buka URL room yang sama di tab ketiga | `room_full` enforcement | Tab ketiga tampilkan layar `ACCESS_DENIED / ROOM_FULL` | ✅ |
| TC-04 | Buka dua tab, pantau terminal log di UI | 3-message PQ upgrade | Terminal: `IDENTITY_ASSIGNED` → `REMOTE_PEER_DETECTED` → `E2E_ENCRYPTED_CHANNEL_ESTABLISHED` | ✅ |
| TC-05 | Kirim pesan antar dua tab | `encrypt()`/`decrypt()` via Hybrid Key | Pesan terkirim. Payload WebRTC tampak acak | ✅ |
| TC-06 | Refresh salah satu tab (sender/receiver) | Chat persist + WebRTC reconnect | Chat history tetap ada; koneksi tersambung kembali | ✅ |
| TC-07 | Salah satu peer klik hapus room / tutup tab | `room_ended` + auto-destroy | Peer yang tersisa tampilkan layar `SESSION_TERMINATED`, redirect 5 detik | ✅ |
| TC-08 | Tunggu 15 menit setelah room dibuat | `asyncio.sleep(900)` TTL | Server menutup semua WS; UI menampilkan layar room ended | ✅ |
| TC-09 | Kirim pesan berulang dengan teks yang sama | `crypto.getRandomValues()` per encrypt | Ciphertext berbeda untuk plaintext identik | ✅ By Design (AES-GCM) |
| TC-10 | Simulasi corrupted PQ message | `verifyConfirmHmac()` di `pq_upgrade.js` | HMAC tidak cocok → Promise reject → `PQ_UPGRADE_FAILED` di terminal | ✅ |
| TC-11 | Buka QR code, scan dengan HP lain | QRCodeSVG + `window.location.href` | HP terbuka di URL room yang sama | ✅ |
| TC-12 | Kirim request dari origin tidak diizinkan | CORS whitelist (`ALLOWED_ORIGINS`) | Browser memblokir request; server tidak kirim ACAO header | ✅ SR-13 |
| TC-13 | Connect WS ke room ID acak tanpa POST /rooms | Auto-create dihapus | WS ditutup 1008 dengan pesan `Room not found or expired` | ✅ SR-14 |
| TC-14 | Kirim 11 request POST /rooms dari IP yang sama dalam 1 menit | Rate limiting | Request ke-11 mendapat HTTP 429 Too Many Requests | ✅ SR-15 |
| TC-15 | Kirim pesan WebSocket melebihi 5MB | Payload limit | WS ditutup 1009 dengan pesan `Message exceeds ... byte limit` | ✅ SR-16 |
| TC-16 | Diam di WebSocket selama 65 detik | Idle timeout (60 detik) | Server kirim `Connection closed due to inactivity`, WS tutup 1001 | ✅ SR-16 |

---

## BAGIAN 8: EVALUASI 6 PARAMETER KRIPTOGRAFI

### 8.1 Tujuan Keamanan
| Properti | Algoritma | Detail |
|---|---|---|
| Confidentiality | AES-GCM-256 | Seluruh pesan dienkripsi dengan Hybrid Session Key |
| Integrity | AES-GCM Tag 128-bit | GCM mode otomatis hasilkan authentication tag |
| Mutual Authentication | HMAC-SHA-256 | Verifikasi dua arah sebelum key fusion PQ |
| Forward Secrecy (Parsial) | ML-KEM-768 | Setiap session punya PQ key pair unik |
| Post-Quantum Security | ML-KEM-768 NIST Level 3 | Tahan terhadap algoritma Shor |

### 8.2 Model Ancaman
- **Target yang dilindungi:** Penyadap pasif, server yang dikompromikan, ancaman quantum
- **Metode yang ditangkal:** Passive eavesdropping, server-side logging, quantum cryptanalysis, room takeover
- **Metode yang BELUM ditangkal:** Social engineering (URL di-share ke pihak ketiga), physical device access

### 8.3 Kapasitas Perangkat
| Aspek | Detail |
|---|---|
| Runtime | Browser modern (Chrome, Firefox, Edge, Safari) |
| Library PQ | mlkem — Pure JavaScript/TypeScript (tanpa WASM) |
| Kompatibilitas | Semua platform dengan browser modern |
| Persyaratan Server | Python 3.9+, minimal 50MB RAM |

### 8.4 Performa (Estimasi)
| Operasi | Estimasi | Catatan |
|---|---|---|
| AES Key Generation | < 5ms | Web Crypto API hardware-accelerated |
| ML-KEM KeyPair Generation | 10–30ms | Pure JS |
| ML-KEM Encapsulation | 10–30ms | Pure JS |
| ML-KEM Decapsulation | 10–30ms | Pure JS |
| HKDF Derivation | < 5ms | Web Crypto API |
| Total PQ Handshake | ~100–300ms | Termasuk network round-trip P2P |
| Enkripsi Pesan (AES-GCM) | < 1ms | Web Crypto API hardware-accelerated |

### 8.5 User Experience (UX)
| Aspek | Implementasi |
|---|---|
| Zero Friction | Satu klik buat room — tidak perlu akun, install, setup |
| Link Sharing | URL dengan blur (click-to-reveal) + copy + QR code |
| Status Transparan | Terminal log di UI menampilkan setiap fase handshake |
| Chat Persist | Pesan tetap ada setelah browser refresh (sessionStorage) |
| Room Ended Screen | Layar `SESSION_TERMINATED` + auto-redirect 5 detik |
| Room Full Screen | Layar `ACCESS_DENIED` + pesan privasi untuk joiner ke-3 |
| Timer Visual | Countdown timer dengan urgent pulse di 2 menit terakhir |
| QR Join | Tombol QR di panel share dan input area untuk join via HP |
| Cyber Vibes Design | JetBrains Mono, matrix green `#00ff88`, dark navy palette |

### 8.6 Risiko Salah Pakai
| Risiko | Detail | Mitigasi |
|---|---|---|
| URL disimpan di bookmark | Classical key tersimpan permanen | TTL 15 menit mengkadaluarsakan key |
| URL dikirim lewat channel tidak aman | Key bocor ke pihak ketiga | UI menekankan key ada di #fragment |
| Tab tidak ditutup | Sesi tidak berakhir manual | TTL 15 menit otomatis menangani ini |
| Server restart | Room dan state hilang | UI: "Disconnected from server" |

---

## BAGIAN 9: POIN PEMBAHASAN UNTUK PAPER

### SSDLC
1. **Zero-Trust Architecture by Design** — Server didesain sebagai entitas tidak dipercaya sejak fase requirements.
2. **Shift-Left Security** — Keputusan kriptografi dibuat di fase desain, bukan patch-work setelah deployment.
3. **Threat Modeling Trike** — Matriks CRUD aktor-aset menunjukkan privilege minimum di seluruh komponen.
4. **Ephemeral State sebagai Security Control** — Tidak perlu data-at-rest encryption karena data tidak disimpan.
5. **SDL Fase Release** — Environment variables (`VITE_API_URL`, `VITE_WS_URL`) memisahkan konfigurasi dari kode.
6. **SR-11 & SR-12 Trade-off** — Mempertahankan UX (chat persist saat refresh) tanpa mengorbankan keamanan (dihapus saat room destroyed).

### Applied Cryptography
1. **Hybrid Post-Quantum Architecture** — ML-KEM-768 + AES-GCM-256 sesuai rekomendasi NIST untuk migrasi PQC bertahap.
2. **HKDF sebagai Key Fusion** — HKDF-SHA-256 dengan dua IKM independen; kompromi satu layer tidak ekspos session key.
3. **GCM Mode dan Authenticated Encryption** — AES-GCM menyediakan confidentiality + integrity + authenticity dalam satu primitif.
4. **URI Fragment sebagai Secure Channel** — Properti RFC 3986 sebagai mekanisme zero-knowledge key distribution.
5. **HMAC Mutual Authentication** — Verifikasi dua arah sebelum key derivation mencegah MITM pada fase PQ exchange.

---

## BAGIAN 10: STRUKTUR FOLDER & FILE

```
kiwkiw/
├── package.json              # Root monorepo — "npm start" via concurrently
├── BLUEPRINT.md              # Dokumen ini (living document)
├── DEPLOYMENT.md             # Panduan deploy ke Render + Vercel
├── SECURITY.md               # Security policy
├── CONTRIBUTING.md           # Panduan kontribusi
├── ROADMAP.md                # Rencana fitur ke depan
├── README.md                 # Dokumentasi umum
├── Dockerfile                # Docker build image (opsional)
├── .env.example              # Contoh environment variables
│
├── backend/
│   ├── main.py               # FastAPI — room management + WebSocket relay
│   │                         #   POST /rooms     → buat room + asyncio TTL 15 menit
│   │                         #   WS /rooms/{id}/ws → relay SDP/ICE + event:
│   │                         #     init, peer_ready, signal, room_full, room_ended
│   └── requirements.txt      # fastapi==0.104.1, uvicorn==0.24.0, websockets==12.0
│
└── frontend/
    ├── package.json          # react, vite, tailwindcss, mlkem, qrcode.react
    ├── vite.config.js        # Vite config — plugin react + @tailwindcss/vite
    ├── index.html            # HTML shell — <link> Google Fonts (JetBrains Mono + Inter)
    └── src/
        ├── main.jsx          # React entry point — mount App ke #root
        ├── App.jsx           # Komponen utama — semua logika UI + state
        │                     #   Hooks: useCountdown (timer persist), useEffect (restore)
        │                     #   Helpers: storageKey, loadMessages, saveMessages, clearRoomStorage
        │                     #   Components: Toast, QRModal, DestroyModal, TerminalLog
        │                     #   Screens: Landing, RoomFull, RoomEnded, Room (chat)
        │                     #   WebSocket events: init, peer_ready, signal, room_full, room_ended
        │                     #   WebRTC: initWebRTC, handleSignal, setupDataChannel
        ├── index.css         # Global styles — Tailwind v4 + cyber vibes custom CSS
        │                     #   Design: JetBrains Mono, #00ff88 green, navy #080b12
        │                     #   Classes: .glass-panel, .terminal-log, .room-panel, dll
        └── crypto/
            ├── encryption.js # AES-GCM-256 + HKDF-SHA-256 via Web Crypto API
            │                 #   generateKey, importKey, encrypt, decrypt, deriveHybridKey
            ├── mlkem.js      # ML-KEM-768 (FIPS 203) wrapper via mlkem npm v2.7.0
            └── pq_upgrade.js # 3-message PQ upgrade protocol
                              #   performPQUpgrade, verifyConfirmHmac, HMAC mutual auth
```

---

## BAGIAN 11: WORKFLOWS

### 11.1 Workflow: Membuat dan Bergabung Room

```
Peer A (Pembuat)                      Server                    Peer B (Joiner)
      │                                  │                             │
      │── POST /rooms ──────────────────►│                             │
      │◄─ { room_id, turn_servers } ─────│                             │
      │                                  │                             │
      │  [URL: /rooms/{id}#{key}]        │                             │
      │  sessionStorage: room_start_{id} │                             │
      │                                  │                             │
      │── WS /rooms/{id}/ws ────────────►│                             │
      │◄─ { type: "init", initiator: T } │                             │
      │                                  │                             │
      │  [Bagikan URL via link/QR code]  │                             │
      │                                  │                             │
      │                                  │◄── WS /rooms/{id}/ws ───────│
      │                                  │──► { type: "init", ini: F } │
      │                                  │                             │
      │◄─ { type: "peer_ready" } ────────│                             │
      │                                  │                             │
      │  [isInitiator=true]              │                             │
      │  [peer.current.close() — reset]  │                             │
      │  [initWebRTC()]                  │                             │
      │                                  │                             │
      │── SDP Offer ────────────────────►│──► SDP Offer ───────────────│
      │◄─ SDP Answer ────────────────────│◄── SDP Answer ──────────────│
      │── ICE Candidates ───────────────►│──► ICE Candidates ──────────│
      │                                  │                             │
      │◄════════ WebRTC DataChannel P2P (direct, server tidak terlibat) ════════►│
      │                                  │                             │
      │  3-Message PQ Upgrade Protocol   │                             │
      │── pq-pubkey ───────────────────────────────────────────────────►│
      │◄─ pq-encap ────────────────────────────────────────────────────│
      │── pq-confirm ──────────────────────────────────────────────────►│
      │                                  │                             │
      │  HKDF → Hybrid Session Key       │    HKDF → Hybrid Session Key│
      │                                  │                             │
      │◄════════ Pesan terenkripsi AES-GCM-256 (P2P) ════════════════►│
```

### 11.2 Workflow: Refresh Browser (Chat Persist)

```
Peer A (refresh)                      Server                    Peer B (masih aktif)
      │                                  │                             │
      │  [Browser refresh]               │                             │
      │  [WS otomatis disconnect]        │                             │
      │                                  │──► { type: "room_ended" } ──│
      │                                  │    (Karena peer disconnect)  │
      │                                  │    [del rooms[room_id]]      │
      │                                  │                             │
      │  [React mount ulang]             │                             │
      │  [Baca URL: /rooms/{id}#{key}]   │                             │
      │  [sessionStorage: room_start_{id}]│                            │
      │  [loadMessages(id) → restore chat]│                            │
      │                                  │                             │
      │── WS /rooms/{id}/ws ────────────►│                             │
      │  [Room sudah dihapus di server]  │                             │
      │  [Auto-create room baru]         │                             │
      │◄─ { type: "init", initiator: F } │                             │
      │                                  │                             │
```

> **Catatan:** Saat Peer A refresh, backend mengirim `room_ended` ke Peer B. Peer B akan tampilkan layar `SESSION_TERMINATED` dan redirect ke home. Peer A akan melihat room baru tanpa peer.
> Ini adalah trade-off desain: **refresh = end session** untuk menjaga konsistensi room state.

### 11.3 Workflow: Room Full — Tolak Peer Ketiga

```
Peer C (mencoba join)                 Server
      │                                  │
      │── WS /rooms/{id}/ws ────────────►│
      │  [accept() dulu untuk kirim JSON]│
      │◄─ { type: "room_full",           │
      │      reason: "..." }             │
      │◄─ [WS close code 1008]           │
      │                                  │
      │  [Tampilkan layar ACCESS_DENIED] │
      │  [ROOM_FULL screen]              │
```

### 11.4 Workflow: Room Ended — Salah Satu Peer Keluar

```
Peer A (keluar/hapus)                 Server                    Peer B (tersisa)
      │                                  │                             │
      │  [Klik hapus room]               │                             │
      │  [clearRoomStorage(roomId)]      │                             │
      │  [window.location.href = '/']    │                             │
      │                                  │                             │
      │  [WS disconnect otomatis]        │                             │
      │                                  │                             │
      │                                  │  [del rooms[room_id]]       │
      │                                  │──► { type: "room_ended",  ──│
      │                                  │      reason: "peer_left" }   │
      │                                  │                             │
      │                                  │              [clearRoomStorage(roomId)]
      │                                  │              [setRoomEnded(true)]
      │                                  │              [Layar SESSION_TERMINATED]
      │                                  │              [Auto-redirect 5 detik]
```

### 11.5 Workflow: TTL Expired (15 Menit)

```
Server (asyncio background task)       Peer A                    Peer B
      │                                  │                             │
      │  [asyncio.sleep(900)]            │                             │
      │  [TTL expired]                   │                             │
      │                                  │                             │
      │── ws.close(1008, "TTL expired") ►│                             │
      │── ws.close(1008, "TTL expired") ──────────────────────────────►│
      │  [del rooms[room_id]]            │                             │
      │                                  │                             │
      │              [WS onclose → setStatus("Disconnected")]          │
      │              [timerSeconds === 0 → showToast "TTL expired"]    │
      │              [window.location.href = '/']                      │
```

### 11.6 Workflow: WebRTC Reconnect setelah Disconnect Sementara

```
Peer A (reconnect)                    Server                    Peer B (masih aktif)
      │                                  │                             │
      │── WS /rooms/{id}/ws ────────────►│                             │
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
| 2026-07-28 | 2.0.0 | SECURITY HARDENING — (1) Dockerfile ditulis ulang Python/FastAPI+Vite multi-stage; (2) CORS restricted ke ALLOWED_ORIGINS env var; (3) SecurityHeadersMiddleware: HSTS+X-Frame+nosniff+Referrer; (4) Rate limiting 10/menit via SlowAPI; (5) WebSocket auto-create dihapus — reject room tidak dikenal; (6) Payload limit: 5MB JSON, 50MB file; (7) Idle timeout 60 detik; (8) WebSocket token auth via ws_token; (9) Structured JSON logging (UTCFormatter); (10) Frontend CSP meta tag; (11) secureLog() production-safe; (12) ICE/TURN dynamic dari server; (13) beforeunload cleanup + message cap; (14) BLUEPRINT: SR-13..16, T-11..14, TC-12..16, §13 Deployment Security Controls ditambahkan |
| 2026-07-28 | 2.1.0 | BUGFIX & STABILITY — (1) Dihapus `ws_token` karena memblokir second peer saat race condition URL join; (2) Ditambahkan ICE candidate queuing di Frontend (`pendingCandidates`) untuk memperbaiki WebRTC race condition (menggantung di `Initiating WebRTC`); (3) Cleanup dokumentasi README & BLUEPRINT |

---

*Dokumen ini adalah living document. Setiap perubahan pada kode harus dicatat di BAGIAN 12 dan diperbarui di bagian terkait.*
