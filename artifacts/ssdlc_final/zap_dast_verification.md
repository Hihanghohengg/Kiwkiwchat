# Laporan Verifikasi DAST & Web Security — Kiw Kiw Chat

Dokumen ini mendokumentasikan bukti kepatuhan keamanan dinamis (*Dynamic Application Security Testing*) pada Kiw Kiw Chat.

---

## 1. Evaluasi Header Keamanan HTTP

Konfigurasi keamanan diterapkan melalui `vercel.json` dan middleware backend FastAPI:

| Header Keamanan | Nilai Konfigurasi | Perlindungan yang Diberikan |
|---|---|---|
| **Strict-Transport-Security** | `max-age=63072000; includeSubDomains; preload` | Memaksa koneksi HTTPS aman dan mencegah downgrade attacks. |
| **X-Frame-Options** | `DENY` | Mencegah serangan *Clickjacking* dengan melarang embedding dalam iframe. |
| **X-Content-Type-Options** | `nosniff` | Mencegah browser melakukan MIME-type sniffing pada file statis. |
| **Referrer-Policy** | `no-referrer` | Mencegah kebocoran URL fragment atau metadata jalur ke pihak ketiga. |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=()` | Menonaktifkan API perangkat sensitif yang tidak digunakan oleh aplikasi. |

---

## 2. Kebijakan Keamanan Konten (Content Security Policy)

Didefinisikan pada `frontend/index.html` dan `vercel.json`:

```text
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' ws: wss: https: stun:*.google.com:19302 stun:*.cloudflare.com:3478;
img-src 'self' data: blob:;
frame-ancestors 'none';
```

### Analisis Kepatuhan:
- **No External Untrusted Scripts**: Hanya memuat skrip lokal yang ter-bundle.
- **Strict WebSocket & STUN Whitelist**: Pembatasan target koneksi hanya ke backend signaling dan STUN servers terpercaya.
- **Subresource Integrity (SRI)**: Seluruh font eksternal menggunakan hash integritas untuk mencegah tampering.
