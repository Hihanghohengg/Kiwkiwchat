# Configuration Review Against Selected OWASP ZAP Baseline Rules — Kiw Kiw Chat

> [!WARNING]
> **Status Pengujian DAST**: **NOT EXECUTED / BLOCKED**  
> Dynamic Application Security Testing (DAST) otomatis menggunakan OWASP ZAP **tidak dapat dieksekusi** pada mesin pengujian saat ini karena daemon Docker Desktop tidak aktif dan binary mandiri OWASP ZAP (`zap.bat` / `zaproxy`) tidak terpasang di PATH lokal (lihat [`zap_execution_blocker.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_execution_blocker.md)).  
> Dokumen ini adalah **tinjauan konfigurasi statis / manual (*Configuration Review*)** terhadap aturan terpilih pada OWASP ZAP Baseline Rules, dan **bukan hasil pemindaian dinamis DAST aktual**.

---

## 1. Matriks Tinjauan Konfigurasi Aturan OWASP ZAP Baseline

| ZAP Rule ID | Nama Aturan OWASP ZAP | Desain & Implementasi Konfigurasi | Lokasi Kode Sumber | Status Tinjauan Konfigurasi | Catatan Residual Risk & Limitasi |
|---|---|---|---|:---:|---|
| **10020** | Anti-clickjacking Header (X-Frame-Options) | Header `X-Frame-Options: DENY` dikonfigurasi pada middleware backend dan Vercel routing. | `backend/main.py:98`, `vercel.json:9` | **CONFIGURED** | Perlu divalidasi dengan DAST scanner untuk memastikan header tidak ter-strip oleh proxy perantara. |
| **10021** | X-Content-Type-Options Header Missing | Header `X-Content-Type-Options: nosniff` diinjeksikan pada setiap HTTP response. | `backend/main.py:97`, `vercel.json:10` | **CONFIGURED** | Terkonfigurasi pada static server config dan backend middleware. |
| **10035** | Strict-Transport-Security (HSTS) Header | Header HSTS `max-age=31536000; includeSubDomains; preload` disetel aktif. | `backend/main.py:105`, `vercel.json:12` | **CONFIGURED** | Efektif hanya pada koneksi HTTPS produksi; tidak aktif pada testing localhost HTTP. |
| **10037** | Server Information Leak (Server Banner) | Banner default Uvicorn disembunyikan dengan custom log_config=None. | `backend/main.py:362` | **CONFIGURED** | Server header default dari reverse proxy pihak ketiga (PaaS/CDN) tetap berpotensi membocorkan identitas edge server. |
| **10038** | Content Security Policy (CSP) Missing | Meta tag CSP didefinisikan pada HTML frontend dan header Vercel. | `frontend/index.html:15-38` | **PARTIAL / CONFIGURED WITH CAVEAT** | CSP masih memuat directive `'unsafe-inline'` pada `style-src`. Direkomendasikan nonce/hash-based CSP untuk lingkungan produksi. |
| **10055** | CSP: Insecure Script / Object Directives | `default-src 'self'`, `script-src 'self'`, `object-src` default to self. | `frontend/index.html:17,32` | **CONFIGURED** | `script-src` dibatasi ke `'self'`. |
| **10063** | Permissions-Policy Header Missing | Header `Permissions-Policy: geolocation=(), microphone=(), camera=()` disetel aktif. | `backend/main.py:101`, `frontend/index.html:43` | **CONFIGURED** | Terkonfigurasi pada response headers dan meta tags. |
| **90003** | Insecure HTTP Methods Enabled | Endpoint REST dibatasi hanya menerima metode `POST` dan `OPTIONS`. | `backend/main.py:117` | **CONFIGURED** | Terkonfigurasi pada CORS middleware FastAPI. |
| **90004** | Cross-Domain Misconfiguration (CORS) | CORS dibatasi ke whitelist domain eksplisit (`ALLOWED_ORIGINS`). | `backend/main.py:114-119` | **CONFIGURED** | Memerlukan verifikasi DAST runtime untuk menguji respons preflight lintas origin liar. |

---

## 2. Tinjauan Keamanan Protokol Signaling WebSocket (Manual Review)

Pemeriksaan kode sumber pada `backend/main.py` mengonfirmasi adanya kontrol defensif berikut pada layer WebSocket:
1. **Validasi Token & Keberadaan Room**: Menolak koneksi jika room belum terdaftar atau token salah (Close code 1008).
2. **Kapasitas Maksimal 2 Peer**: Menolak koneksi ke-3 dengan frame `room_full` dan penutupan soket (Close code 1008).
3. **Limitasi Ukuran Payload Frame**: Membatasi frame masuk maksimal 64 KB (`MAX_MSG_BYTES` = 65536) dengan penutupan soket kode 1009 jika dilanggar.
4. **Idle Timeout Guard**: Menutup koneksi idle $> 60$ detik (`WS_IDLE_TIMEOUT` = 60) dengan kode 1001.

---

## 3. Rekomendasi Pengujian DAST Lanjutan

Untuk melengkapi paket bukti pada pengujian rilis mendatang:
1. Aktifkan Docker daemon pada runner CI/CD.
2. Jalankan OWASP ZAP Baseline Scan nyata (`zap-baseline.py`) sesuai panduan di [`zap_execution_blocker.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_execution_blocker.md).
3. Simpan raw output `zap_report.json` dan `zap_report.html` sebagai bukti DAST empiris.
