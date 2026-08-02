# Laporan Tinjauan Konfigurasi Keamanan Web & HTTP Headers — Kiw Kiw Chat

> [!NOTE]
> **Status**: **Configuration Review (DAST Automated Scan: BLOCKED / NOT EXECUTED)**  
> Dokumen ini memverifikasi deklarasi konfigurasi HTTP Security Headers dan Content Security Policy pada kode sumber.

---

## 1. Evaluasi Header Keamanan HTTP (Configuration Review)

Konfigurasi keamanan dideklarasikan melalui `vercel.json` dan middleware backend FastAPI (`backend/main.py`):

| Header Keamanan | Nilai Konfigurasi Terpasang | Perlindungan yang Diharapkan | Status Review |
|---|---|---|:---:|
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | Memaksa koneksi HTTPS aman dan mitigasi SSL stripping di lingkungan produksi. | **CONFIGURED** |
| **X-Frame-Options** | `DENY` | Mencegah serangan *Clickjacking* dengan melarang embedding dalam iframe. | **CONFIGURED** |
| **X-Content-Type-Options** | `nosniff` | Mencegah browser melakukan MIME-type sniffing pada file statis. | **CONFIGURED** |
| **Referrer-Policy** | `no-referrer` | Mencegah kebocoran URL path/metadata ke pihak ketiga saat navigasi keluar. | **CONFIGURED** |
| **Permissions-Policy** | `geolocation=(), microphone=(), camera=()` | Menonaktifkan API perangkat sensitif yang tidak digunakan oleh aplikasi. | **CONFIGURED** |

---

## 2. Kebijakan Keamanan Konten (Content Security Policy Review)

Deklarasi CSP aktual pada `frontend/index.html`:

```html
<meta http-equiv="Content-Security-Policy"
      content="
        default-src 'self';
        connect-src 'self'
                    wss://kiwkiwchat.vercel.app
                    https://kiwkiwchat.vercel.app
                    wss://*.onrender.com
                    https://*.onrender.com
                    ws://localhost:8000
                    http://localhost:8000
                    ws://localhost:5173
                    http://localhost:5173
                    ws://localhost:4173
                    http://localhost:4173
                    stun:stun.l.google.com:19302
                    turn:openrelay.metered.ca:80
                    turn:openrelay.metered.ca:443;
        script-src  'self';
        style-src   'self' https://fonts.googleapis.com 'unsafe-inline';
        font-src    https://fonts.gstatic.com;
        img-src     'self' data:;
        base-uri    'self';
        form-action 'self';
      " />
```

### Analisis Kepatuhan & Residual Risk:
1. **Script Restriction**: `script-src` dibatasi ke `'self'`, mencegah eksekusi skrip dari domain luar yang tidak diizinkan.
2. **Residual Risk pada `style-src`**: Masih terdapat directive `'unsafe-inline'` pada `style-src` untuk mendukung style dinamis library UI. Hal ini dicatat sebagai residual risk; direkomendasikan penggunaan nonce-based atau hash-based styling untuk deployment produksi tingkat tinggi.
3. **Subresource Integrity (SRI)**: Atribut `integrity` terpasang secara eksplisit pada Google Fonts CSS stylesheet di `frontend/index.html`. Modul JavaScript aplikasi lokal dibundel oleh Vite tanpa SRI terpisah pada bundle lokal.
