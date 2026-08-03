# Verifikasi Pengujian DAST & Header Keamanan Web — Kiw Kiw Chat

Dokumen ini mendokumentasikan verifikasi empiris pengujian dinamis (*Dynamic Application Security Testing* - DAST) pada frontend produksi menggunakan **OWASP ZAP 2.17.0** serta pemetaan header keamanan HTTP dan Content Security Policy (CSP).

---

## 1. Status Verifikasi DAST Dinamis

- **Status Pemindaian ZAP**: **EXECUTED WITH OPEN FINDINGS**
- **Target**: `https://kiwkiwchat.vercel.app` (Deployment Frontend Produksi)
- **Tanggal Pemindaian**: 2 Agustus 2026
- **Alat**: OWASP ZAP 2.17.0 (Passive Scanner)
- **Raw Report**: [`zap_report_2026-08-02.html`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_report_2026-08-02.html)
- **Hasil Ringkas**: 0 High, 1 Medium, 1 Low, 3 Informational (Total: 5 Alert Types)

> [!IMPORTANT]
> **Pernyataan Lingkup & Batasan**:  
> “OWASP ZAP 2.17.0 passive scan telah dijalankan terhadap frontend produksi Kiw Kiw Chat pada Vercel.”  
> Pemindaian ini tidak mencakup backend Render, endpoint `POST /rooms`, atau protokol WebSocket signaling. Pengujian dinamis untuk backend dan WebSocket dilaksanakan melalui test harness terpisah (`BT-01` s/d `BT-08`) di [`backend_websocket_test_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/backend_websocket_test_results.md).

---

## 2. Verifikasi Respon Header Keamanan HTTP Produksi

Berdasarkan inspeksi respon HTTP aktual yang ditangkap dalam laporan OWASP ZAP 2.17.0 (`GET https://kiwkiwchat.vercel.app/`):

```http
HTTP/1.1 200 OK
Server: Vercel
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Access-Control-Allow-Origin: https://kiwkiwchat.vercel.app
```

| Header Keamanan | Nilai Terverifikasi | Perlindungan & Analisis Mitigasi | Status Verifikasi |
|---|---|---|:---:|
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | Memaksa koneksi HTTPS terenkripsi TLS dan mitigasi SSL-stripping di edge produksi. | ✅ **VERIFIED (Active)** |
| **X-Frame-Options** | `DENY` | Mencegah penyerang menyematkan aplikasi ke dalam iframe berbahaya (*Clickjacking* mitigasi `T-16`). | ✅ **VERIFIED (Active)** |
| **X-Content-Type-Options** | `nosniff` | Mencegah browser mengeksekusi file non-script sebagai script melalui MIME-type sniffing. | ✅ **VERIFIED (Active)** |
| **Referrer-Policy** | `no-referrer` | Mencegah kebocoran URL token/path ke situs luar saat navigasi eksternal. | ✅ **VERIFIED (Active)** |
| **Access-Control-Allow-Origin** | `https://kiwkiwchat.vercel.app` | Membatasi konsumsi resource lintas domain hanya ke origin terdaftar (mitigasi `T-11`). | ✅ **VERIFIED (Active)** |

---

## 3. Analisis Content Security Policy (CSP) & Temuan Terbuka

Deklarasi CSP aktual pada antarmuka frontend:

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

### Hasil Analisis Temuan ZAP:

1. **Medium Alert: `CSP: style-src unsafe-inline` (High Confidence)**:
   - **Penyebab**: Directive `style-src` memuat `'unsafe-inline'`.
   - **Justifikasi Teknis**: Diperlukan untuk injeksi styling dinamis dan komponen UI reaktif berbasis CSS modern.
   - **Residual Risk**: Penyerang yang mampu menginjeksi elemen style dapat memodifikasi tampilan UI (misalnya CSS injection), meskipun `script-src 'self'` tetap memblokir eksekusi JavaScript berbahaya.
   - **Status**: **OPEN / RESIDUAL RISK**.

2. **Low Alert: `CSP: Notices` (High Confidence)**:
   - **Penyebab**: Penggunaan scheme URI WebRTC `stun:...` dan `turn:...` pada `connect-src` yang belum dikenali oleh parser web standard analyzer bawaan ZAP.
   - **Justifikasi Teknis**: Sintaks ini valid dan diperlukan untuk negosiasi konektivitas ICE/STUN/TURN WebRTC peer-to-peer.
   - **Status**: **ACCEPTED (WebRTC Specific Protocol)**.

---

## 4. Rekomendasi Hardening Lanjutan

Untuk peningkatan di luar cakupan prototipe riset:
1. Migrasikan styling ke nonce-based CSP (`'nonce-...'`) atau hash-based styling (`'sha256-...'`) guna mengeliminasi `'unsafe-inline'`.
2. Lakukan pemindaian active scan penetrasi penuh pada endpoint API staging backend dengan otorisasi khusus di luar lingkungan produksi publik.
