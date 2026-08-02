# Trike Threat Modeling & Risk Register — Kiw Kiw Chat

Dokumen ini mendokumentasikan pemodelan ancaman komprehensif menggunakan metodologi **Trike Threat Modeling** pada **Kiw Kiw Chat**, mencakup analisis 16 skenario ancaman kanonikal (T-01 s/d T-16), kriteria evaluasi risiko, pemetaan kontrol, dan bukti pengujian empiris.

---

## 1. Kriteria Kualitatif Evaluasi Risiko (Risk Criteria)

Evaluasi risiko menggunakan matriks kualitatif standar $3 \times 4$:

### A. Skala Kemungkinan (Likelihood)
- **Low (1)**: Membutuhkan kapabilitas luar biasa, akses fisik perangkat, komputasi kuantum skala penuh, atau kondisi yang sangat jarang terjadi.
- **Medium (2)**: Memerlukan penyerang yang berada pada posisi perantara di jaringan (misal pengelola ISP/Wi-Fi publik) atau alat otomatis standar.
- **High (3)**: Dapat dieksploitasi oleh siapa saja secara publik di internet melalui script sederhana tanpa autentikasi khusus.

### B. Skala Dampak (Impact)
- **Low (1)**: Gangguan minor sementara pada pengguna tunggal tanpa kebocoran data.
- **Medium (2)**: Gangguan ketersediaan layanan (*Denial of Service*) atau kegagalan koneksi sesaat.
- **High (3)**: Kompromi integritas data, pengambilalihan room, atau pemalsuan pesan.
- **Critical (4)**: Kebocoran kunci kriptografi atau plaintext pesan percakapan (kerahasiaan total hancur).

### C. Matriks Tingkat Risiko ($L \times I$)
$$\text{Skor Risiko} = \text{Likelihood} \times \text{Impact}$$

| Likelihood \ Impact | Low (1) | Medium (2) | High (3) | Critical (4) |
|---|---|---|---|---|
| **High (3)** | Medium (3) | Medium (6) | High (9) | **Critical (12)** |
| **Medium (2)**| Low (2) | Medium (4) | Medium (6) | **High (8)** |
| **Low (1)**   | Low (1) | Low (2) | Medium (3) | **Medium (4)** |

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
| **T-04** | **Penyusupan Pihak Ketiga ke Dalam Room (*3rd Peer Join*)** | AST-01, AST-10 | ACT-03 | 3 | 3 | **High (9)** | `backend/main.py:websocket_endpoint` (Penegakan kapasitas maksimal 2 peer; koneksi ke-3 menerima frame `room_full` & ditutup kode 1008). | Automated Multi-run E2E (`E2E-03`) | `impkrip_test_report.json` (3/3 runs) | **PASS** | Terkendali pada level signaling socket server. |
| **T-05** | **Man-in-the-Middle (MitM) pada Handshake Pasca-Kuantum** | AST-04, AST-05, AST-08 | ACT-06 | 2 | 4 | **High (8)** | `frontend/src/crypto/pq_upgrade.js:verifyConfirmHmac, computeTranscriptHash` (Length-prefixed SHA-256 transcript hashing, dual nonce exchange, dan mutual key confirmation via HMAC-SHA-256). | Automated Unit & Negative (`KC-01`, `KC-02`) | `impkrip_test_report.json` | **PASS** | Menyediakan konfirmasi kunci timbal balik (*mutual key confirmation*); bukan autentikasi identitas pihak pengguna (*identity authentication*). |
| **T-06** | **Ekstraksi Kunci Privat ML-KEM dari Memori Browser** | AST-03, AST-06 | ACT-03 | 1 | 4 | **Medium (4)** | `frontend/src/crypto/pq_upgrade.js` (Instruksi penghapusan referensi `delete peer._pqSecretKey` dan dereferensi shared secret setelah dekapsulasi). | Code Review & Heap Profiler Checkpoint | `impkrip_memory_benchmark.json` | **PARTIAL** | **PARTIAL**: Runtime JavaScript (V8 Engine) mengelola memori via Garbage Collection dan tidak menjamin *deterministic secure memory zeroization* pada physical RAM. |
| **T-07** | **Kebocoran Kunci Melalui Riwayat Browser / URL Sharing** | AST-02 | ACT-05 | 2 | 4 | **High (8)** | `frontend/src/App.jsx`, `backend/main.py` (Penyimpanan pre-shared room secret pada URL fragment `#` + pembatasan room TTL 15 menit). | Automated E2E (`E2E-04`) & Code Review | `impkrip_test_report.json` | **PASS** | **Residual Risk**: Entitas mana pun yang memperoleh tautan undangan lengkap beserta fragment (`#`) dapat memperoleh pre-shared room secret. |
| **T-08** | **Serangan Replay Pesan Aplikasi (*Application Envelope Replay*)** | AST-01 | ACT-06 | 2 | 3 | **Medium (6)** | `frontend/src/crypto/encryption.js:encrypt, decrypt`, `App.jsx` (IV acak 12-byte per pesan + sequence counter & direction diikat ke AAD AES-GCM). | Automated Unit (`AE-04`) & Envelope Test (`RP-01`) | `impkrip_test_report.json` | **PARTIAL** | **PARTIAL**: Pengujian `AE-04` membuktikan manipulasi AAD menggagalkan dekripsi GCM; namun test `RP-01` mengevaluasi sequence counter di application envelope layer dan belum melakukan reinjeksi raw encrypted WebRTC DataChannel packet secara fisik. |
| **T-09** | **Pengambilalihan Sesi Setelah Salah Satu Peer Keluar** | AST-10, AST-13 | ACT-03 | 2 | 3 | **Medium (6)** | `backend/main.py:websocket_endpoint` (Broadcast event `room_ended` / `peer_disconnected` dan penghapusan total entri room di memori server). | Automated Multi-run E2E (`E2E-04`) | `impkrip_test_report.json` (3/3 runs) | **PASS** | Terkendali pada siklus hidup koneksi signaling. |
| **T-10** | **Ekstraksi Riwayat Percakapan Pasca Sesi dari Cache Klien** | AST-01, AST-12 | ACT-03 | 1 | 3 | **Medium (3)** | `frontend/src/utils/storage.js:clearRoomStorage` (Penyimpanan hanya di `sessionStorage` per-tab; pembersihan total saat room destroy atau tab close). | Automated Multi-run E2E (`E2E-04`) | `impkrip_test_report.json` (3/3 runs) | **PASS** | Melindungi dari pemulihan cache storage biasa; tidak melindungi jika malware memiliki akses proses memori penuh ke browser. |
| **T-11** | **Akses API Tidak Sah Lintas Domain (CORS Bypass)** | AST-13 | ACT-06 | 2 | 3 | **Medium (6)** | `backend/main.py:114-119` (Kebijakan CORS dibatasi ke whitelist domain terdaftar pada `ALLOWED_ORIGINS`). | Code Review (`backend/main.py`) | Static Code Inspection | **CODE REVIEW ONLY** | Terkonfigurasi pada middleware; pengujian penetrasi DAST otomatis tercatat BLOCKED. |
| **T-12** | **Koneksi Liar Langsung ke WebSocket Tanpa Pembuatan Room** | AST-13, AST-14 | ACT-03 | 3 | 2 | **Medium (6)** | `backend/main.py:websocket_endpoint` (Pemeriksaan keberadaan room di memori server dan verifikasi token query; ditutup kode 1008 jika tidak valid). | Code Review (`backend/main.py`) | Static Code Inspection | **CODE REVIEW ONLY** | Terkonfigurasi pada logika awal handler websocket; belum ada automated unit test mandiri di test harness. |
| **T-13** | **Serangan DoS Flooding Pembuatan Room (*Resource Exhaustion*)** | AST-14 | ACT-03 | 3 | 2 | **Medium (6)** | `backend/main.py:create_room` (Integrasi `SlowAPI` dengan rate limit 10 request per IP per menit). | Code Review (`backend/main.py`) | Static Code Inspection | **CODE REVIEW ONLY** | Terkonfigurasi pada route handler FastAPI; belum diuji beban konkurensi skala besar. |
| **T-14** | **Exhaustion Memori Melalui Frame WebSocket Raksasa** | AST-14 | ACT-06 | 2 | 3 | **Medium (6)** | `backend/main.py:websocket_endpoint` (Batasan ukuran frame WS 64 KB `MAX_MSG_BYTES` & idle timeout 60s `WS_IDLE_TIMEOUT`). | Code Review (`backend/main.py`) | Static Code Inspection | **CODE REVIEW ONLY** | Terkonfigurasi pada loop penerimaan frame; pelanggaran memicu penutupan soket kode 1009. |
| **T-15** | **Eksploitasi Kerentanan Kode Statis Backend** | AST-13, AST-14 | ACT-06 | 2 | 2 | **Medium (4)** | `backend/.bandit` (Pemindaian keamanan statis berkala via Bandit). | Automated SAST Scan (`bandit`) | `bandit_report.json` | **PASS (0 High)** | 0 High Severity, 1 Medium (B104 accepted deployment finding), 3 Low (B110 accepted technical debt). |
| **T-16** | **Injeksi Skrip & Clickjacking Antarmuka Web** | AST-01, AST-12 | ACT-06 | 2 | 3 | **Medium (6)** | `frontend/index.html`, `backend/main.py`, `vercel.json` (Header `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, dan CSP meta tag). | Configuration Review (`index.html`, `vercel.json`) | `zap_summary.md` | **PASS (WITH CAVEAT)** | `style-src` masih memuat `'unsafe-inline'`. DAST automated scan tercatat BLOCKED. |

---

## 3. Ringkasan Status Evaluasi Ancaman

- **Total Ancaman Kanonikal**: 16 Ancaman (T-01 s/d T-16)
- **Status PASS (Automated Test / SAST Verified)**: 8 Ancaman (T-01, T-02, T-03, T-04, T-05, T-09, T-10, T-15)
- **Status PASS WITH CAVEAT / CONFIGURED**: 1 Ancaman (T-16)
- **Status CODE REVIEW ONLY (Terkonfigurasi, belum diotomasi di test harness)**: 4 Ancaman (T-11, T-12, T-13, T-14)
- **Status PARTIAL (Batasan runtime / validasi lingkup)**: 3 Ancaman (T-06, T-07 residual risk note, T-08)
