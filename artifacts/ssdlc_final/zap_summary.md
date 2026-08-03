# Ringkasan Eksekutif Pemindaian OWASP ZAP (DAST Summary) — Kiw Kiw Chat

Dokumen ini memuat ringkasan eksekutif hasil pemindaian keamanan dinamis (*Dynamic Application Security Testing* - DAST) menggunakan **OWASP ZAP 2.17.0** terhadap deployment produksi frontend **Kiw Kiw Chat** pada platform Vercel.

---

## 1. Metadata Pemindaian OWASP ZAP Aktual

- **Alat Pemindai**: OWASP ZAP (Zed Attack Proxy) Version 2.17.0
- **Target URL Pemindaian**: `https://kiwkiwchat.vercel.app`
- **Tanggal Pemindaian**: Minggu, 2 Agustus 2026 (20:00:53 UTC+7 / 13:00:53 GMT)
- **Metode Pemindaian**: *Passive Scanning* terhadap resource web frontend produksi
- **Status Evaluasi ZAP**: **EXECUTED WITH OPEN FINDINGS**
- **Status Evaluasi CSP**: **PARTIAL / OPEN MEDIUM FINDING**
- **Raw Evidence File**: [`zap_report_2026-08-02.html`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_report_2026-08-02.html)

> [!IMPORTANT]
> **Pernyataan Batas Cakupan Pemindaian**:  
> “OWASP ZAP 2.17.0 passive scan telah dijalankan terhadap frontend produksi Kiw Kiw Chat pada Vercel.”  
> **Batasan Lingkup**:
> 1. Laporan ini **hanya membuktikan pemindaian pasif terhadap antarmuka frontend produksi pada Vercel**.
> 2. Laporan ini **tidak mencakup pemindaian backend API pada Render** (misalnya endpoint `POST /rooms` tidak dipindai oleh ZAP).
> 3. Laporan ini **tidak mencakup pemindaian protokol signaling WebSocket** (`/rooms/{room_id}/ws`).
> 4. Laporan ini **bukan merupakan uji penetrasi aktif penuh (*full active penetration testing*)** melainkan pemindaian pasif (*passive scanning*) terhadap respon HTTP dan resource frontend statis.
> 5. Untuk pengujian dinamis backend dan WebSocket, lihat laporan uji lokal mandiri pada [`backend_websocket_test_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/backend_websocket_test_results.md).

---

## 2. Distribusi Temuan Berdasarkan Tingkat Risiko & Kepercayaan (Alert Counts)

| Tingkat Risiko (Risk) | User Confirmed | High Confidence | Medium Confidence | Low Confidence | Total Temuan | Persentase Total |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **High** | 0 | 0 | 0 | 0 | **0** | 0.0% |
| **Medium** | 0 | 1 | 0 | 0 | **1** | 20.0% |
| **Low** | 0 | 1 | 0 | 0 | **1** | 20.0% |
| **Informational** | 0 | 0 | 2 | 1 | **3** | 60.0% |
| **Total** | 0 | 2 | 2 | 1 | **5** | 100.0% |

---

## 3. Rincian 5 Alert Types Temuan OWASP ZAP

| No | Tipe Peringatan (Alert Type) | Risk Level | Confidence | URL Target / Bukti Terdeteksi | Deskripsi & Analisis Risiko | Status Penanganan |
|:---:|---|:---:|:---:|---|---|:---:|
| **1** | **CSP: style-src unsafe-inline** | **Medium** | **High** | `https://kiwkiwchat.vercel.app/sitemap.xml`, `https://kiwkiwchat.vercel.app/` | Directive `style-src` pada Content Security Policy memuat `'unsafe-inline'` untuk mendukung styling dinamis CSS/font antarmuka. | **OPEN / RESIDUAL RISK** |
| **2** | **CSP: Notices** | **Low** | **High** | `https://kiwkiwchat.vercel.app/` | Parser ZAP mencatat notice: source-expression skema non-standar `stun:stun.l.google.com:19302`, `turn:openrelay.metered.ca:80`, dan `turn:openrelay.metered.ca:443` pada `connect-src` tidak dikenali oleh parser web scanner standar. | **ACCEPTED (WebRTC Specific)** |
| **3** | **Modern Web Application** | **Informational** | **Medium** | `https://kiwkiwchat.vercel.app/` | Scanner mendeteksi karakteristik Single Page Application (SPA) berbasis JavaScript modern (React/Vite) dengan routing sisi klien. | **INFORMATIONAL** |
| **4** | **Re-examine Cache-control Directives** | **Informational** | **Low** | `https://kiwkiwchat.vercel.app/` | Header `Cache-Control: public, max-age=0, must-revalidate` pada edge Vercel disarankan untuk ditinjau agar konten sensitif tidak dicache secara tidak sengaja oleh proxy perantara. | **INFORMATIONAL** |
| **5** | **Retrieved from Cache** | **Informational** | **Medium** | Asset static frontend bundle (`.js`, `.css`, sitemap) | Resource statis terkompilasi disajikan dari cache CDN edge Vercel untuk optimasi performa pengiriman aset publik. | **INFORMATIONAL** |

---

## 4. Evaluasi Status Keamanan & Kontrol Defensif

1. **Header Keamanan HTTP Produksi**:
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` ✅ Terkonfirmasi aktif pada edge response.
   - `X-Frame-Options: DENY` ✅ Terkonfirmasi aktif (mitigasi clickjacking).
   - `X-Content-Type-Options: nosniff` ✅ Terkonfirmasi aktif (mitigasi MIME sniffing).
   - `Referrer-Policy: no-referrer` ✅ Terkonfirmasi aktif (mitigasi kebocoran URL path).

2. **Content Security Policy (CSP)**:
   - `script-src 'self'` ✅ Membatasi eksekusi skrip hanya pada bundle lokal asal.
   - `style-src 'self' https://fonts.googleapis.com 'unsafe-inline'` ⚠️ Memiliki temuan **Medium Severity** karena menyertakan `'unsafe-inline'`. Hal ini dicatat secara transparan sebagai residual risk prototipe.
   - `connect-src` ⚠️ Memuat whitelist endpoint HTTPS/WSS dan ICE servers (STUN/TURN).

3. **Batasan Kesimpulan**:
   - Pemindaian ZAP membuktikan kebersihan dari kerentanan High severity pada frontend statis Vercel.
   - Pemindaian ZAP **bukan bukti bahwa seluruh sistem atau backend bebas dari celah keamanan**.
   - Keamanan backend API dan signaling WebSocket diverifikasi secara terpisah melalui pengujian dinamis lokal (kasus uji `BT-01` s/d `BT-08`) dan tinjauan kode statis Bandit.
