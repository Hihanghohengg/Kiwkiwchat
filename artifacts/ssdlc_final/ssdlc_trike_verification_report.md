# Laporan Verifikasi Keamanan SSDLC & Trike — Kiw Kiw Chat

Dokumen ini berisi rangkuman verifikasi kontrol keamanan dan pemodelan ancaman Trike pada aplikasi Kiw Kiw Chat.

---

## 1. Metadata Verifikasi

- **Proyek**: Kiw Kiw Chat — P2P Ephemeral Secure Messenger
- **Tanggal Evaluasi**: 2026-08-02
- **Lingkungan Uji**: AMD Ryzen 5 5600H, 16 GB RAM, Windows 11, Chromium (Playwright)
- **Kerangka Kerja**: Microsoft Security Development Lifecycle (SDL) & Trike Threat Modeling

---

## 2. Status Verifikasi Kontrol Keamanan Trike (T-01 s/d T-14)

| ID | Skenario Ancaman | Kontrol Keamanan yang Diterapkan | Status Verifikasi |
|---|---|---|---|
| **T-01** | Penyadapan Pasif WebRTC | Enkripsi AES-GCM-256 pada saluran WebRTC DataChannel | **TERVERIFIKASI** |
| **T-02** | Kriptanalisis Kuantum | Penggunaan ML-KEM-768 (NIST FIPS 203 Level 3) | **TERVERIFIKASI** |
| **T-03** | Kompromi Server Signaling | Server beroperasi sebagai dumb relay in-memory; kunci di URL fragment (#) | **TERVERIFIKASI** |
| **T-04** | Penyusupan Pihak Ketiga | Server menolak koneksi ke-3 (`room_full` + Close 1008) | **TERVERIFIKASI** |
| **T-05** | MitM Pertukaran Kunci | HMAC-SHA-256 Mutual Key Confirmation dengan nonces | **TERVERIFIKASI** |
| **T-06** | Ekstraksi Kunci dari Memori | Penghapusan variabel secret key ephemeral setelah dekapsulasi | **TERVERIFIKASI** |
| **T-07** | Intersepsi Kunci via URL | Kunci di #fragment + Room expired otomatis dalam 15 menit | **TERVERIFIKASI** |
| **T-08** | Serangan Ulangan (Replay) | IV acak 12-byte fresh per pesan + sequence counter pada AAD | **TERVERIFIKASI (RP-01 PARTIAL)** |
| **T-09** | Pengambilalihan Room | Room langsung dihapus dan emit `room_ended` saat disconnect | **TERVERIFIKASI** |
| **T-10** | Kebocoran Cache Browser | Pembersihan `sessionStorage` total saat room dihancurkan | **TERVERIFIKASI** |
| **T-11** | CORS Cross-Origin Bypass | Whitelist origin yang ketat melalui middleware backend | **TERVERIFIKASI** |
| **T-12** | Direct WS Creation Bypass | Penolakan koneksi WebSocket tanpa `POST /rooms` terlebih dahulu | **TERVERIFIKASI** |
| **T-13** | DoS via Room Flooding | Rate limiting 10 req/IP/menit menggunakan SlowAPI | **TERVERIFIKASI** |
| **T-14** | Memory DoS via Payload | Pembatasan ukuran pesan WebSocket maksimal 64 KB | **TERVERIFIKASI** |

---

## 3. Hasil Pengujian Statis & Konfigurasi

1. **Static Application Security Testing (SAST)**:
   - Tool: Bandit v1.9.4
   - Total Files Scanned: 1 (`backend/main.py`)
   - High Severity Issues: 0
   - Medium Severity Issues: 1 (B104: Binding to `0.0.0.0` — accepted deployment finding untuk container hosting)
   - Low Severity Issues: 3 (B110: Try-except-pass pada handler penutupan koneksi — residual technical debt)
2. **Security Configuration & Headers Verification (DAST Scope)**:
   - Headers: Strict-Transport-Security, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: no-referrer
   - Content Security Policy: Strict CSP membatasi script-src 'self', connect-src 'self' WSS dan STUN terpercaya.
