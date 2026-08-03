# Daftar Periksa Keamanan Pra-Rilis (Release Security Checklist) — Kiw Kiw Chat

Dokumen ini memuat lembar evaluasi keamanan akhir (*Final Security Review* - FSR) pada **Kiw Kiw Chat** (Prototipe Riset) sesuai kerangka kerja **Microsoft Security Development Lifecycle (SDL)** dan **Trike Threat Modeling**.

---

## 1. Lembar Verifikasi Final Security Review (FSR Checklist)

| No | Kategori & Item Pemeriksaan | Bukti Verifikasi / Sumber Data | Status Evaluasi Terstandar | Rincian Analisis & Batasan |
|:---:|---|---|---|:---:|---|
| **1** | **Trike Threat Modeling** | [`trike_threat_model.md`](./trike_threat_model.md) | **PASS_WITH_RESIDUAL_RISK** | 16 ancaman (T-01 s/d T-16) 100% terpetakan ke kebutuhan & kontrol. Residual risk dicatat pada T-06, T-07, T-08, dan T-16. |
| **2** | **Security Requirements Verification** | [`use_abuse_security_requirements.md`](./use_abuse_security_requirements.md) | **PASS** | 18 kebutuhan keamanan (SR-01 s/d SR-18) terdefinisi dari 10 Use Cases dan 10 Abuse Cases serta diverifikasi oleh test suite. |
| **3** | **Application Cryptographic Tests** | [`baseline_test_results.md`](./baseline_test_results.md), [`impkrip_test_report.json`](../impkrip_final/impkrip_test_report.json) | **PARTIAL** | 19 kasus uji kriptografi & E2E: 18 PASS, 1 PARTIAL (`RP-01` Replay Protection divalidasi di layer application envelope; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual). |
| **4** | **SAST Static Code Analysis (Bandit)** | [`bandit_summary.md`](./bandit_summary.md), [`bandit_report.json`](./bandit_report.json) | **PASS_WITH_FINDINGS** | Bandit v1.9.4: 0 High Severity, 1 Medium (B104 binding `0.0.0.0` - accepted deployment), 3 Low (B110 try-except-pass - accepted debt). |
| **5** | **Frontend Dependency SCA (NPM Audit)** | [`dependency_review.md`](./dependency_review.md), [`npm_audit_report.json`](./npm_audit_report.json) | **PASS** | 113 paket frontend dipindai via npm audit dengan hasil 0 kerentanan (0 vulnerabilities). |
| **6** | **Backend Dependency SCA (Pip-audit)** | [`dependency_review.md`](./dependency_review.md), [`pip_audit_report.json`](./pip_audit_report.json) | **OPEN / PARTIAL** | 17 catatan advisory PyPI terdeteksi (FastAPI/Starlette/multipart); 8 multipart tidak dipanggil pada alur aplikasi, 5 URL/Host perlu validasi, open for upgrade. |
| **7** | **Frontend Dynamic Scan (OWASP ZAP)** | [`zap_summary.md`](./zap_summary.md), [`zap_report_2026-08-02.html`](./zap_report_2026-08-02.html) | **EXECUTED_WITH_OPEN_FINDINGS** | OWASP ZAP 2.17.0 passive scan pada frontend produksi Vercel: 0 High, 1 Medium (`style-src 'unsafe-inline'`), 1 Low (`CSP: Notices`), 3 Informational. |
| **8** | **Content Security Policy (CSP)** | [`zap_dast_verification.md`](./zap_dast_verification.md) | **OPEN_MEDIUM** | Header protektif aktif di edge response; `style-src` memuat `'unsafe-inline'` sebagai residu teknis yang dicatat terbuka. |
| **9** | **Backend API Dynamic Testing** | [`backend_websocket_test_results.md`](./backend_websocket_test_results.md) | **PASS** | Kasus uji `BT-02` (Rate Limiting POST /rooms: 10 request diterima, 11+ ditolak HTTP 429) berhasil 100% pada instance uji lokal. |
| **10** | **WebSocket Signaling Dynamic Testing** | [`backend_websocket_test_results.md`](./backend_websocket_test_results.md) | **PASS** | Kasus uji `BT-01`, `BT-03`, `BT-04`, `BT-05`, `BT-06` (2-peer capacity, frame limit 64KB, malformed resilient, teardown, idle timeout) berhasil 100%. |
| **11** | **Backend CORS Configuration** | [`backend/main.py`](../../backend/main.py), [`backend_websocket_test_results.md`](./backend_websocket_test_results.md) | **PASS** | Whitelist `ALLOWED_ORIGINS` terverifikasi dinamis (`BT-07` preflight 200 dengan ACAO untuk trusted origin; `BT-08` penolakan 400 tanpa ACAO untuk untrusted origin) dan inspeksi kode sumber `backend/main.py:114-119`. |
| **12** | **Secure Memory Zeroization** | [`trike_threat_model.md`](./trike_threat_model.md), [`impkrip_memory_benchmark.json`](../impkrip_final/impkrip_memory_benchmark.json) | **PARTIAL** | Dereferensi pointer JavaScript aktif; runtime V8 Engine mengelola memori via GC dan tidak menjamin *zeroization* deterministik pada physical RAM. |
| **13** | **Incident Response & CVD Plan** | [`vulnerability_response_plan.md`](./vulnerability_response_plan.md) | **PREPARED_NOT_EXERCISED** | Prosedur penanganan insiden dan kebijakan Coordinated Vulnerability Disclosure telah disusun lengkap namun belum disimulasikan (*tabletop exercise*). |
| **14** | **Production Readiness Assessment** | Seluruh dokumen evaluasi keamanan | **NOT_EVALUATED** | Sistem dievaluasi sebagai prototipe riset akademik dan **tidak dievaluasi untuk kesiapan produksi komersial (*not evaluated as production-ready*)**. |

---

## 2. Pernyataan Keputusan Evaluasi Final (Final Evaluation Decision)

- **Keputusan Evaluasi Final**: **READY FOR PAPER WITH LIMITATIONS**
- **Klasifikasi Kesiapan**: **RESEARCH PROTOTYPE (NOT EVALUATED AS PRODUCTION-READY)**
- **Tanggal Keputusan**: 2026-08-02 (Rekonsiliasi Final: 2026-08-03)

### Rasional Keputusan:
1. **Pencapaian**:
   - Seluruh 18 Kebutuhan Keamanan (SR-01 s/d SR-18) dan 16 Ancaman Trike (T-01 s/d T-16) telah 100% terpetakan ke kontrol teknis arsitektur.
   - Pengujian kriptografi dan integrasi E2E mencapai tingkat kelulusan 18 PASS, 1 PARTIAL (`RP-01`), 0 FAIL dengan reliabilitas 3/3 putaran (100%).
   - Audit SAST Bandit backend menunjukkan 0 kerentanan High Severity; audit SCA frontend (NPM) menunjukkan 0 kerentanan.
   - Pengujian dinamis backend, CORS, dan WebSocket (`BT-01` s/d `BT-08`) membuktikan keandalan kontrol kapasitas 2-peer, rate limiting, batas frame, ketahanan malformed input, pemusnahan room, idle timeout, serta pembatasan domain CORS whitelist.
   - Pemindaian pasif OWASP ZAP 2.17.0 pada frontend produksi Vercel menunjukkan 0 kerentanan High Severity.

2. **Keterbatasan & Alasan Kualifikasi (*Limitations*)**:
   - Status pengujian `RP-01` adalah **PARTIAL** karena validasi sequence counter dilakukan pada layer *application envelope*; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual.
   - Pemindaian OWASP ZAP mencatat **1 temuan Medium terbuka** pada Content Security Policy (`style-src 'unsafe-inline'`).
   - Pemindaian OWASP ZAP **hanya mencakup frontend produksi Vercel**, tidak memindai backend API Render atau protokol WebSocket secara aktif di lingkungan produksi cloud.
   - Audit dependensi backend (Pip-audit) mencatat **17 advisory PyPI berstatus OPEN / PARTIAL** yang memerlukan siklus pembaruan dependensi lanjutan.
   - Runtime JavaScript (V8) **tidak menjamin secure memory zeroization deterministik pada RAM fisik** untuk pembersihan kunci privat.
   - Rencana tanggap insiden dan pengungkapan kerentanan berstatus **PREPARED_NOT_EXERCISED** (belum diuji simulasi latihan penanganan insiden).

Berdasarkan rasional di atas, sistem dinilai layak dan siap untuk pelaporan bukti penelitian ilmiah (**READY FOR PAPER WITH LIMITATIONS**) sebagai prototipe riset.
