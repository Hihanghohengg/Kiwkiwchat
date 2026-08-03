# Model Ancaman Trike Kanonikal (Trike Threat Model) — Kiw Kiw Chat

Dokumen ini memuat model ancaman formal berbasis **Trike Threat Modeling Methodology** yang dipadukan dalam siklus hidup **Microsoft Security Development Lifecycle (SDL)** untuk prototipe riset **Kiw Kiw Chat**.

---

## 1. Metodologi & Matriks Penilaian Risiko Trike

Model Trike mengevaluasi risiko berdasarkan rumus:
$$\text{Risk Score} = \text{Likelihood (L)} \times \text{Impact (I)}$$

- **Likelihood (1–3)**: 1 (Rendah / Membutuhkan kompromi ganda), 2 (Sedang / Penyerang jaringan aktif), 3 (Tinggi / Akses publik tanpa autentikasi).
- **Impact (1–4)**: 1 (Sangat Rendah / Non-kritis), 2 (Rendah / Metadata non-sensitif), 3 (Sedang / Gangguan ketersediaan sesi), 4 (Kritis / Kompromi kerahasiaan pesan E2EE atau kunci kriptografi).

### Kategori Tingkat Risiko:
- **Low Risk (1–3)**: Risiko diterima dengan kontrol standar.
- **Medium Risk (4–6)**: Memerlukan kontrol mitigasi teknis dan pemantauan.
- **High / Critical Risk (7–12)**: Wajib dimitigasi secara tuntas oleh kontrol teknis dan arsitektur kriptografi.

> [!NOTE]
> **Status Pemetaan**: Seluruh 16 ancaman (**100% mapped**) telah terpetakan ke kebutuhan keamanan (*Security Requirements*), kontrol implementasi kode sumber, dan metode verifikasi.

---

## 2. Register Ancaman Kanonikal Trike (T-01 s/d T-16)

| ID | Skenario Ancaman | Target Aset | Aktor Penyerang | L | I | Skor Awal | Kontrol Implementasi Sumber | Test Method / ID | Raw Evidence Ref | Status | Residual Risk & Batasan |
|---|---|---|---|---|---|---|---|---|---|:---:|---|
| **T-01** | **Penyadapan Pesan di Jalur DataChannel** | AST-01 | ACT-05 | 2 | 4 | **High (8)** | `frontend/src/crypto/encryption.js:encrypt, decrypt` (AES-GCM-256 pada layer aplikasi + transport DTLS WebRTC). | Automated Unit & E2E (`AE-01`, `E2E-01`) | `impkrip_test_report.json` | **PASS** | Terkendali di layer aplikasi dan transport; tidak mencakup kompromi endpoint perangkat. |
| **T-02** | **Kriptanalisis Masa Depan Menggunakan Komputer Kuantum** | AST-01, AST-02 | ACT-07 | 1 | 4 | **Medium (4)** | `frontend/src/crypto/mlkem.js`, `encryption.js:deriveSessionKeys` (PSK-assisted ML-KEM-768 session-key establishment + fusi HKDF-SHA-256). | Automated Unit (`PQ-01`, `PQ-02`, `KD-01`) | `impkrip_test_report.json` | **PASS** | Parameter ML-KEM-768 mengikuti FIPS 203; library JavaScript `mlkem` pihak ketiga tidak diklaim memiliki sertifikasi CMVP. |
| **T-03** | **Kompromi Server Signaling Backend (Relay Sniffing)** | AST-01, AST-02 | ACT-04 | 2 | 4 | **High (8)** | `frontend/src/App.jsx:generateRoomKey`, `backend/main.py:rooms` (Signaling relay tidak menerima keying material dalam alur normal; pre-shared room secret di URL fragment `#` RFC 3986). | Automated Integration (`E2E-01`) & Code Review | `impkrip_test_report.json`, `main.py` inspection | **PASS** | Terkendali selama server tidak memodifikasi client script bundle (asumsi client bundle integritas terjaga). |
| **T-04** | **Penyusupan Pihak Ketiga ke Dalam Room (*3rd Peer Join*)** | AST-01, AST-10 | ACT-03 | 3 | 3 | **High (9)** | `backend/main.py:websocket_endpoint` (Penegakan kapasitas maksimal 2 peer; koneksi ke-3 menerima frame `room_full` & ditutup kode 1008). | Automated Multi-run E2E (`E2E-03`) & Dynamic WS (`BT-01`) | `impkrip_test_report.json`, `backend_websocket_test_results.json` | **PASS** | Terkendali pada level signaling socket server. |
| **T-05** | **Man-in-the-Middle (MitM) pada Handshake Pasca-Kuantum** | AST-04, AST-05, AST-08 | ACT-06 | 2 | 4 | **High (8)** | `frontend/src/crypto/pq_upgrade.js:verifyConfirmHmac, computeTranscriptHash` (Length-prefixed SHA-256 transcript hashing, dual nonce exchange, dan mutual key confirmation via HMAC-SHA-256). | Automated Unit & Negative (`KC-01`, `KC-02`) | `impkrip_test_report.json` | **PASS** | Menyediakan konfirmasi kunci timbal balik (*mutual key confirmation*); bukan autentikasi identitas pihak pengguna (*identity authentication*). |
| **T-06** | **Ekstraksi Kunci Privat ML-KEM dari Memori Browser** | AST-03, AST-06 | ACT-03 | 1 | 4 | **Medium (4)** | `frontend/src/crypto/pq_upgrade.js` (Instruksi penghapusan referensi `delete peer._pqSecretKey` dan dereferensi shared secret setelah dekapsulasi). | Code Review & Heap Profiler Checkpoint | `impkrip_memory_benchmark.json` | **PARTIAL** | **PARTIAL**: Runtime JavaScript (V8 Engine) mengelola memori via Garbage Collection dan tidak menjamin *deterministic secure memory zeroization* pada physical RAM. |
| **T-07** | **Kebocoran Kunci Melalui Riwayat Browser / URL Sharing** | AST-02 | ACT-05 | 2 | 4 | **High (8)** | `frontend/src/App.jsx`, `backend/main.py` (Penyimpanan pre-shared room secret pada URL fragment `#` + pembatasan room TTL 15 menit). | Automated E2E (`E2E-04`) & Code Review | `impkrip_test_report.json` | **PASS** | **Residual Risk**: Entitas mana pun yang memperoleh tautan undangan lengkap beserta fragment (`#`) dapat memperoleh pre-shared room secret. |
| **T-08** | **Serangan Replay Pesan Aplikasi (*Application Envelope Replay*)** | AST-01 | ACT-06 | 2 | 3 | **Medium (6)** | `frontend/src/crypto/encryption.js:encrypt, decrypt`, `App.jsx` (IV acak 12-byte per pesan + sequence counter & direction diikat ke AAD AES-GCM). | Automated Unit (`AE-04`) & Envelope Test (`RP-01`) | `impkrip_test_report.json` | **PARTIAL** | **PARTIAL**: Pengujian `AE-04` membuktikan manipulasi AAD menggagalkan dekripsi GCM; namun test `RP-01` mengevaluasi sequence counter di application envelope layer; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual. |
| **T-09** | **Pengambilalihan Sesi Setelah Salah Satu Peer Keluar** | AST-10, AST-13 | ACT-03 | 2 | 3 | **Medium (6)** | `backend/main.py:websocket_endpoint` (Broadcast event `room_ended` / `peer_disconnected` dan penghapusan total entri room di memori server). | Automated Multi-run E2E (`E2E-04`) & Dynamic WS (`BT-05`) | `impkrip_test_report.json`, `backend_websocket_test_results.json` | **PASS** | Terkendali pada siklus hidup koneksi signaling. |
| **T-10** | **Ekstraksi Riwayat Percakapan Pasca Sesi dari Cache Klien** | AST-01, AST-12 | ACT-03 | 1 | 3 | **Medium (3)** | `frontend/src/utils/storage.js:clearRoomStorage` (Penyimpanan hanya di `sessionStorage` per-tab; pembersihan total saat room destroy atau tab close). | Automated Multi-run E2E (`E2E-04`) | `impkrip_test_report.json` | **PASS** | Melindungi dari pemulihan cache storage biasa; tidak melindungi jika malware memiliki akses proses memori penuh ke browser. |
| **T-11** | **Akses API Tidak Sah Lintas Domain (CORS Bypass)** | AST-13 | ACT-06 | 2 | 3 | **Medium (6)** | `backend/main.py:114-119` (Kebijakan CORS dibatasi ke whitelist domain terdaftar pada `ALLOWED_ORIGINS`). | Automated Dynamic Tests (`BT-07`, `BT-08`) & Code Review | `backend_websocket_test_results.json` | **PASS** | Terverifikasi dinamis: Preflight OPTIONS untuk trusted origin (`https://kiwkiwchat.vercel.app`) diterima dengan status 200 dan ACAO sesuai; preflight untuk untrusted origin (`https://untrusted.example`) ditolak dengan status 400 tanpa ACAO. |
| **T-12** | **Koneksi Liar Langsung ke WebSocket Tanpa Pembuatan Room** | AST-13, AST-14 | ACT-03 | 3 | 2 | **Medium (6)** | `backend/main.py:websocket_endpoint` (Pemeriksaan keberadaan room di memori server dan verifikasi token query; ditutup kode 1008 jika tidak valid). | Automated Dynamic Tests (`BT-01`, `BT-05`) | `backend_websocket_test_results.json` | **PASS** | Terverifikasi dinamis: koneksi tanpa room valid atau dengan token salah ditolak seketika kode 1008. |
| **T-13** | **Serangan DoS Flooding Pembuatan Room (*Resource Exhaustion*)** | AST-14 | ACT-03 | 3 | 2 | **Medium (6)** | `backend/main.py:create_room` (Integrasi `SlowAPI` dengan rate limit 10 request per IP per menit). | Automated Dynamic Test (`BT-02`) | `backend_websocket_test_results.json` | **PASS** | Terverifikasi dinamis: tepat 10 request pertama diterima (HTTP 200), request berikutnya menghasilkan HTTP 429 Too Many Requests. |
| **T-14** | **Exhaustion Memori Melalui Frame WebSocket Raksasa** | AST-14 | ACT-06 | 2 | 3 | **Medium (6)** | `backend/main.py:websocket_endpoint` (Batasan ukuran frame WS 64 KB `MAX_MSG_BYTES` & idle timeout 60s `WS_IDLE_TIMEOUT`). | Automated Dynamic Tests (`BT-03`, `BT-04`, `BT-06`) | `backend_websocket_test_results.json` | **PASS** | Terverifikasi dinamis: frame > 64 KB memicu close code 1009; frame malformed tidak menyebabkan crash server; idle timeout memicu close code 1001. |
| **T-15** | **Eksploitasi Kerentanan Kode Statis Backend** | AST-13, AST-14 | ACT-06 | 2 | 2 | **Medium (4)** | `backend/.bandit` (Pemindaian keamanan statis berkala via Bandit). | Automated SAST Scan (`bandit`) | `bandit_report.json` | **PASS (0 High)** | 0 High Severity, 1 Medium (B104 accepted deployment finding), 3 Low (B110 accepted technical debt). |
| **T-16** | **Injeksi Skrip & Clickjacking Antarmuka Web** | AST-01, AST-12 | ACT-06 | 2 | 3 | **Medium (6)** | `frontend/index.html`, `backend/main.py`, `vercel.json` (Header `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, dan CSP meta tag). | OWASP ZAP 2.17.0 Passive Scan | `zap_report_2026-08-02.html` | **PARTIAL / OPEN_MEDIUM** | Header protektif terverifikasi aktif; CSP memiliki 1 temuan Medium terbuka (`style-src 'unsafe-inline'`), 1 Low (`CSP: Notices`), dan 3 Informational. |

---

## 3. Ringkasan Status Evaluasi Ancaman

- **Total Ancaman Kanonikal**: 16 Ancaman (T-01 s/d T-16)
- **Status PASS / PASS_WITH_FINDINGS**: 13 Ancaman (`T-01`, `T-02`, `T-03`, `T-04`, `T-05`, `T-07`, `T-09`, `T-10`, `T-11`, `T-12`, `T-13`, `T-14`, `T-15`)
  - Termasuk `T-11` yang kini telah diverifikasi secara dinamis via `BT-07` dan `BT-08`.
- **Status PARTIAL / OPEN_MEDIUM**: 3 Ancaman:
  - `T-06`: Batasan runtime JavaScript V8 Engine (tidak menjamin deterministic physical RAM zeroization).
  - `T-08`: Status `RP-01` PARTIAL (validasi sequence counter di application envelope; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual).
  - `T-16`: Status ZAP DAST EXECUTED WITH OPEN FINDINGS (1 Medium open finding: `CSP: style-src unsafe-inline`, 1 Low: `CSP: Notices`, 3 Informational).
