# Laporan Verifikasi Pemodelan Ancaman Trike — Kiw Kiw Chat

Dokumen ini menyajikan status verifikasi kontrol keamanan berbasis pemodelan ancaman **Trike Threat Modeling** (T-01 s/d T-16) pada **Kiw Kiw Chat** (Prototipe Riset).

---

## 1. Metadata Verifikasi

- **Target Sistem**: Kiw Kiw Chat (Prototipe Riset Perpesanan Efemeral Browser-Native)
- **Status Evaluasi**: **READY FOR PAPER WITH LIMITATIONS (RESEARCH PROTOTYPE)**
- **Tanggal Evaluasi**: 2026-08-02
- **Lingkungan Uji**: AMD Ryzen 5 5600H, 16 GB RAM, Windows 11, Chromium (Playwright headless)
- **Kerangka Kerja**: Microsoft Security Development Lifecycle (SDL) & Trike Threat Modeling

---

## 2. Status Verifikasi Register Ancaman Kanonikal (T-01 s/d T-16)

| ID | Skenario Ancaman | Kontrol Implementasi Sumber | Metode Verifikasi | Status Verifikasi | Catatan Kritis & Residual Risk |
|---|---|---|---|:---:|---|
| **T-01** | Penyadapan Pesan di DataChannel | AES-GCM-256 pada layer aplikasi + DTLS DataChannel | Automated Unit & E2E (`AE-01`, `E2E-01`) | **PASS** | Terlindungi dari penyadapan jaringan transit. |
| **T-02** | Kriptanalisis Kuantum Masa Depan | PSK-assisted ML-KEM-768 session-key establishment + HKDF | Automated Unit (`PQ-01`, `PQ-02`, `KD-01`) | **PASS** | Parameter mengikuti NIST FIPS 203; library pihak ketiga tidak memiliki sertifikasi CMVP. |
| **T-03** | Kompromi Server Signaling Backend | Signaling relay tidak menerima keying material; room secret di fragment `#` | Automated E2E (`E2E-01`) & Code Review | **PASS** | Server beroperasi sebagai relay tanpa akses ke plaintext/kunci dalam alur normal. |
| **T-04** | Penyusupan Pihak Ketiga (3rd Peer) | Kapasitas strict 2-peer (frame `room_full` & Close 1008) | Automated Multi-run E2E (`E2E-03`) | **PASS** | Terverifikasi 3/3 putaran pengujian independen. |
| **T-05** | MitM pada Handshake Pasca-Kuantum | Length-prefixed transcript hash + mutual HMAC confirmation | Automated Unit & Negative (`KC-01`, `KC-02`) | **PASS** | Menyediakan mutual key confirmation, bukan identity authentication. |
| **T-06** | Ekstraksi Kunci Privat dari Memori | Penghapusan referensi pointer `_pqSecretKey` setelah dekapsulasi | Code Review & Heap Profiler Checkpoint | **PARTIAL** | Runtime JavaScript V8 tidak menjamin *secure memory zeroization* deterministik. |
| **T-07** | Kebocoran Kunci via URL Sharing | Room secret pada URL fragment `#` + Room TTL 15 menit | Automated E2E (`E2E-04`) & Code Review | **PASS** | Residual risk: pihak yang memperoleh link utuh beserta fragment `#` memperoleh room secret. |
| **T-08** | Serangan Replay Pesan Aplikasi | IV acak 12-byte + sequence counter & direction pada AAD | Automated Unit (`AE-04`) & Envelope Test (`RP-01`) | **PARTIAL** | Sequence validation terverifikasi pada envelope layer; reinjeksi raw packet WebRTC out-of-scope. |
| **T-09** | Pengambilalihan Sesi Pasca Exit | Pembersihan room di memori server dan emit `room_ended` | Automated Multi-run E2E (`E2E-04`) | **PASS** | Terverifikasi 3/3 putaran pengujian independen. |
| **T-10** | Ekstraksi Cache Browser Pasca Sesi | Penyimpanan `sessionStorage` per-tab & pembersihan total | Automated Multi-run E2E (`E2E-04`) | **PASS** | Data terhapus saat room destroy / tab close. |
| **T-11** | Akses API Lintas Domain (CORS) | CORS Whitelist dibatasi ke `ALLOWED_ORIGINS` | Code Review (`backend/main.py`) | **CODE REVIEW ONLY** | Terkonfigurasi pada middleware; DAST dinamis otomatis tercatat BLOCKED. |
| **T-12** | Koneksi Liar Langsung ke WS | Pemeriksaan keberadaan room di memori server & validasi token | Code Review (`backend/main.py`) | **CODE REVIEW ONLY** | Terkonfigurasi pada route handler websocket backend. |
| **T-13** | DoS Flooding Pembuatan Room | Rate limiting 10 req/IP/menit via SlowAPI pada `POST /rooms` | Code Review (`backend/main.py`) | **CODE REVIEW ONLY** | Terkonfigurasi pada route handler FastAPI. |
| **T-14** | Memory Exhaustion via Frame WS | Batas frame 64 KB (`MAX_MSG_BYTES`) & idle timeout 60s | Code Review (`backend/main.py`) | **CODE REVIEW ONLY** | Terkonfigurasi pada loop socket handler. |
| **T-15** | Eksploitasi Celah Statis Backend | Pemindaian keamanan berkala menggunakan Bandit v1.9.4 | Automated SAST Scan (`bandit`) | **PASS (0 High)** | 0 High, 1 Medium (B104 accepted deployment), 3 Low (B110 accepted technical debt). |
| **T-16** | Injeksi Skrip & Clickjacking UI | HTTP Security Headers (X-Frame-Options: DENY) & CSP | Configuration Review (`index.html`, `vercel.json`) | **PASS (WITH CAVEAT)** | `style-src` masih memuat `'unsafe-inline'`. DAST automated scan tercatat BLOCKED. |

---

## 3. Kesimpulan Verifikasi

Register ancaman Trike telah terpetakan secara lengkap (**100% mapped**) ke kontrol arsitektur dan kode sumber. Tiga skenario ancaman dicatat berstatus **PARTIAL / WITH CAVEAT** (T-06, T-08, T-16) dan empat skenario berstatus **CODE REVIEW ONLY** (T-11, T-12, T-13, T-14) sesuai batasan lingkungan dan runtime.
