# Pemetaan Metodologi Microsoft Security Development Lifecycle (SDL)

Dokumen ini memetakan seluruh tahapan pengembangan Kiw Kiw Chat ke dalam 7 Fase Microsoft Security Development Lifecycle (SDL).

---

## 1. Fase 1: Training (Pelatihan Keamanan)

| Domain Pelatihan | Topik Khusus | Penerapan pada Project |
|---|---|---|
| **Web Cryptography** | Web Crypto API (SubtleCrypto), nonce management, AEAD modes | Implementasi AES-GCM-256 dan HKDF-SHA-256 di `frontend/src/crypto/encryption.js` |
| **Post-Quantum Cryptography** | NIST FIPS 203, CRYSTALS-Kyber, encapsulation/decapsulation | Integrasi library ML-KEM-768 di `frontend/src/crypto/mlkem.js` |
| **WebRTC Security** | DTLS handshake, SCTP over DTLS, ICE candidate handling, signaling risks | Desain zero-knowledge signaling dan DataChannel P2P di `frontend/src/App.jsx` |
| **FastAPI & Async Security** | Rate limiting, CORS, WebSocket connection lifecycle, memory exhaustion | Security middleware, SlowAPI, payload guard di `backend/main.py` |
| **Frontend Security** | Content Security Policy (CSP), Subresource Integrity (SRI), XSS prevention | Konfigurasi CSP, no-eval policy, SRI hashing di `frontend/index.html` dan `vercel.json` |

---

## 2. Fase 2: Requirements (Kebutuhan Keamanan)

- Penentuan **Security Requirements** inti (SR-01 s/d SR-18).
- Analisis **Abuse & Misuse Cases** (misalnya pengambilalihan room, flooding koneksi ketiga, penyadapan relay).
- Klasifikasi data dan privasi: Kebijakan *Zero Data at Rest* dan *Zero Knowledge Signaling*.

---

## 3. Fase 3: Design (Desain Keamanan)

- **Threat Modeling Trike**: Analisis aset, aktor, permission matrix, dan pohon ancaman (T-01 s/d T-14).
- **Out-of-Band Key Distribution**: Menggunakan URI Fragment RFC 3986 agar kunci klasik tidak pernah dikirim ke server.
- **Key Fusion & Separation Architecture**: HKDF menghasilkan dua kunci terpisah untuk enkripsi data dan konfirmasi kunci.
- **Strict Capacity & TTL**: Server bertindak sebagai dumb relay dengan batasan tegas 2 peer dan masa hidup room 15 menit.

---

## 4. Fase 4: Implementation (Implementasi Aman)

- **Secure Coding Standard**:
  - IV random 12-byte fresh untuk setiap ciphertext AES-GCM (mencegah IV reuse).
  - Penghapusan secret key ML-KEM segera setelah dekapsulasi (`delete peer._pqSecretKey`).
  - Validasi ketat ukuran payload WebSocket (maksimum 64 KB).
  - Rate limiting 10 request/IP/menit pada endpoint pembuatan room.
  - Sanitasi logging produksi: tidak ada data sensitif yang dicetak ke konsol atau log server.

---

## 5. Fase 5: Verification (Verifikasi & Pengujian Keamanan)

- **Static Application Security Testing (SAST)**:
  - Pemindaian backend menggunakan Bandit (`backend/.bandit`) dengan hasil 0 High / 0 Medium vulnerabilities.
  - Linting frontend menggunakan Oxlint untuk memastikan kebersihan kode JavaScript.
- **Dynamic Application Security Testing (DAST)**:
  - Evaluasi header keamanan, CSP strict, dan manipulasi request.
- **Automated Security & Negative Testing**:
  - Uji penolakan third-peer (E2E-03).
  - Uji perusakan payload ciphertext / Auth Tag (AE-02, AE-03, AE-04, ATK-01).
  - Uji ketidakcocokan kunci dan manipulasi tanda tangan HMAC (ATK-02, ATK-04).
  - Uji pembersihan memori sessionStorage saat penghancuran room (E2E-04).

---

## 6. Fase 6: Release (Kesiapan Rilis)

- **Final Security Review (FSR)**: Seluruh checklist mitigasi Trike dan security requirements telah divalidasi.
- **Deployment Security Configuration**:
  - Konfigurasi environment variables yang terpisah (`ALLOWED_ORIGINS`, `MAX_MSG_BYTES`, `WS_IDLE_TIMEOUT`).
  - Penerapan security headers lengkap pada `vercel.json` (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
  - Penggunaan HTTPS/WSS wajib di lingkungan produksi agar WebCrypto dan WebRTC dapat beroperasi.

---

## 7. Fase 7: Response (Rencana Tanggap Insiden)

- **Prosedur Tanggap Insiden Kriptografi**:
  - Kebocoran Link: Room kedaluwarsa otomatis via TTL 15 menit atau dihancurkan manual oleh pengguna.
  - Kompromi Server Signaling: Server tidak memiliki akses ke kunci atau konten pesan (zero-knowledge); komunikasi P2P tetap aman.
  - Kerentanan Library Dependensi: Prosedur pembaruan dependensi otomatis dan rebuild frontend.
