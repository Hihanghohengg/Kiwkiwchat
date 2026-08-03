# Laporan Sintesis Akhir Verifikasi SSDLC (Final SSDLC Verification Report) — Kiw Kiw Chat

Dokumen ini merupakan laporan sintesis master dari seluruh paket bukti **Secure Software Development Life Cycle (SSDLC)** pada proyek **Kiw Kiw Chat** (Prototipe Riset), yang mengintegrasikan kerangka kerja **Microsoft Security Development Lifecycle (SDL)** dan **Trike Threat Modeling**.

---

## 1. Ringkasan Eksekutif & Status Keputusan Evaluasi

Pengembangan perangkat lunak komunikasi efemeral **Kiw Kiw Chat** menerapkan pendekatan *Security-by-Design* berlapis untuk mengamankan pertukaran pesan antar dua pengguna pada browser desktop/laptop modern standar.

### Status Keputusan Akhir:
- **Status Evaluasi**: **READY FOR PAPER WITH LIMITATIONS**
- **Klasifikasi Sistem**: **RESEARCH PROTOTYPE (NOT EVALUATED AS PRODUCTION-READY)**
- **Tanggal Rekonsiliasi Final**: 2026-08-02 (Sinkronisasi: 2026-08-03)

### Indikator Kunci Keamanan & Kualitas (KPIs):
- **Cakupan Kebutuhan Keamanan**: 10 Use Cases $\longrightarrow$ 10 Abuse Cases $\longrightarrow$ 18 Security Requirements (SR-01 s/d SR-18).
- **Pemodelan Ancaman Trike**: 14 Aset Sistem, 7 Aktor, 16 Skenario Ancaman (T-01 s/d T-16) dengan **100% pemetaan kontrol**.
- **Hasil Pengujian Kriptografi & E2E**: 19 Kasus Uji Otomatis (**18 PASS, 1 PARTIAL `RP-01`, 0 FAIL**) dengan reliabilitas 3/3 putaran E2E independen (100%).
- **Pengujian Dinamis Backend & WebSocket**: 10 Kasus Uji Dinamis (`BT-01` s/d `BT-10`) (**10/10 PASS - 100%**) memverifikasi CORS, token gate, rate limiting, kapasitas 2-peer, batas frame 64 KB, ketahanan malformed frame, dan teardown.
- **Audit Statis (SAST)**: 0 High Severity Vulnerabilities pada pemindaian Bandit backend Python (1 Medium B104 accepted deployment finding, 3 Low B110 accepted technical debt).
- **Audit Dependensi (SCA)**: Frontend: 0 Vulnerabilities (113 paket NPM); Backend: 17 catatan advisory PyPI dikategorikan (status: *Open / Partial*).
- **Pemindaian Dinamis DAST (OWASP ZAP 2.17.0)**: *Passive scan* terhadap frontend produksi Vercel (**0 High, 1 Medium [`style-src 'unsafe-inline'`], 1 Low, 3 Informational**). Status: **EXECUTED_WITH_OPEN_FINDINGS**.
- **Profil Memori JavaScript Heap**: Pengukuran checkpoint heap V8 (Median baseline: 5.0850 MiB, Median post-keygen: 5.3223 MiB, Median post-PQ upgrade: 5.6062 MiB).

---

## 2. Struktur Paket Bukti SSDLC (`artifacts/ssdlc_final/`)

| No | Nama File Artefak | Format | Deskripsi & Konten Utama |
|---|---|---|---|
| 1 | [`canonical_ssdlc_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/canonical_ssdlc_results.md) | Markdown | **Single Source of Truth** yang memuat seluruh data final kanonikal yang didukung raw evidence. |
| 2 | [`repository_inventory.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/repository_inventory.md) | Markdown | Inventaris lengkap modul frontend, backend, kriptografi, dan dependensi. |
| 3 | [`system_context_and_scope.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/system_context_and_scope.md) | Markdown | Batasan kepercayaan (*Trust Boundaries* TB-01/TB-02), diagram konteks, dan batasan lingkup. |
| 4 | [`use_abuse_security_requirements.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/use_abuse_security_requirements.md) | Markdown | Rincian relasi Use Case, Abuse Case, dan Security Requirements (SR-01..18). |
## 2. Struktur Inventaris Bukti Kanonikal (`artifacts/ssdlc_final/`)

| No | Berkas Artefak Bukti | Format | Deskripsi & Konten Kanonikal |
|:---:|---|---|---|
| 1 | [`trike_threat_model.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_threat_model.md) | Markdown | Model ancaman Trike kanonikal (T-01 s/d T-16), mitigasi arsitektur, dan pemetaan kontrol. |
| 2 | [`trike_threat_register.csv`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_threat_register.csv) | CSV | Register ancaman tabular (16 baris) dengan skor risiko, kontrol, status, dan residual risk. |
| 3 | [`trike_permission_matrix.csv`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_permission_matrix.csv) | CSV | Matriks aturan akses/operasi CRUD per-aktor terhadap seluruh aset sistem. |
| 4 | [`trike_assets_actors_operations.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_assets_actors_operations.md) | Markdown | Taksonomi 14 aset data/komputasi, 7 aktor penyerang/pengguna, dan aturan otorisasi. |
| 5 | [`use_abuse_security_requirements.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/use_abuse_security_requirements.md) | Markdown | 10 Use Cases, 10 Abuse Cases, dan 18 Kebutuhan Keamanan Software (SR-01 s/d SR-18). |
| 6 | [`use_abuse_security_requirements.csv`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/use_abuse_security_requirements.csv) | CSV | Pemetaan tabular Use Case $\to$ Abuse Case $\to$ Security Requirement. |
| 7 | [`microsoft_sdl_mapping.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/microsoft_sdl_mapping.md) | Markdown | Pemetaan komprehensif implementasi seluruh fase SDL (Fase 0 s/d 7) terhadap artefak riset. |
| 8 | [`microsoft_sdl_evidence.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/microsoft_sdl_evidence.md) | Markdown | Bukti eksekusi teknis pemenuhan gerbang keamanan (*security gates*) Microsoft SDL. |
| 9 | [`canonical_ssdlc_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/canonical_ssdlc_results.md) | Markdown | **Single Source of Truth (SSOT)** ringkasan seluruh hasil pengujian dan data metrik sistem. |
| 10 | [`impkrip_test_report.json`](file:///d:/Obed/kiwkiw/artifacts/impkrip_final/impkrip_test_report.json) | JSON | Raw data eksekusi 19 kasus uji kriptografi & E2E (Playwright headless Chromium). |
| 11 | [`impkrip_memory_benchmark.json`](file:///d:/Obed/kiwkiw/artifacts/impkrip_final/impkrip_memory_benchmark.json) | JSON | Raw data benchmark memori JavaScript Heap via Chrome DevTools Protocol (5 runs). |
| 12 | [`backend_websocket_test_results.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/backend_websocket_test_results.json) | JSON | Raw data eksekusi pengujian dinamis backend API & WebSocket signaling (BT-01..06). |
| 13 | [`backend_websocket_test_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/backend_websocket_test_results.md) | Markdown | Laporan pengujian dinamis 6 kasus uji minimum backend API & WebSocket signaling (`BT-01` s/d `BT-06`). |
| 14 | [`backend_websocket_test_results.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/backend_websocket_test_results.json) | JSON | Raw data hasil pengujian dinamis backend API & WebSocket signaling. |
| 15 | [`backend_websocket_test_raw.log`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/backend_websocket_test_raw.log) | Log | Raw log eksekusi test runner pengujian dinamis backend & WebSocket. |
| 16 | [`bandit_report.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/bandit_report.json) | JSON | Raw output pemindaian SAST Bandit v1.9.4 pada backend Python. |
| 17 | [`bandit_summary.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/bandit_summary.md) | Markdown | Ringkasan dan analisis teknis temuan SAST Bandit. |
| 18 | [`npm_audit_report.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/npm_audit_report.json) | JSON | Raw output audit dependensi NPM frontend (0 vulnerabilities). |
| 20 | [`dependency_review.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/dependency_review.md) | Markdown | Kategorisasi keterjangkauan (*reachability analysis*) dependensi backend. |
| 21 | [`zap_report_2026-08-02.html`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_report_2026-08-02.html) | HTML | Raw report resmi pemindaian OWASP ZAP 2.17.0 terhadap frontend produksi Vercel. |
| 22 | [`zap_summary.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_summary.md) | Markdown | Ringkasan eksekutif dan analisis 5 alert types pemindaian OWASP ZAP. |
| 23 | [`zap_dast_verification.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_dast_verification.md) | Markdown | Verifikasi teknis respon header keamanan HTTP dan analisis CSP. |
| 24 | [`security_test_inventory.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/security_test_inventory.md) | Markdown | Inventaris lengkap 19 kasus uji kriptografi, 10 kasus uji dinamis backend, SAST, SCA, dan DAST. |
| 25 | [`traceability_matrix.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/traceability_matrix.md) | Markdown | Matriks keterlacakan hulu-hilir (Use Case $\to$ Threat $\to$ Control $\to$ Test). |
| 26 | [`traceability_matrix.csv`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/traceability_matrix.csv) | CSV | Tabel keterlacakan tabular untuk matriks verifikasi paper. |
| 27 | [`security_hardening_change_log.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/security_hardening_change_log.md) | Markdown | Kronologi 10 intervensi penguatan keamanan (SEC-01 s/d SEC-10). |
| 28 | [`final_regression_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/final_regression_results.md) | Markdown | Evaluasi regresi multi-dimensi dan metrik heap checkpoint. |
| 29 | [`release_security_checklist.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/release_security_checklist.md) | Markdown | Lembar evaluasi Final Security Review (FSR) dan pernyataan keputusan rilis. |
| 30 | [`vulnerability_response_plan.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/vulnerability_response_plan.md) | Markdown | Standar operasional prosedur tanggap insiden dan pengungkapan kerentanan. |
| 31 | [`evidence_consistency_review.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/evidence_consistency_review.md) | Markdown | Catatan audit rekonsiliasi konsistensi bukti antar seluruh dokumen. |
| 32 | [`ssdlc_trike_verification_report.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/ssdlc_trike_verification_report.md) | Markdown | Laporan verifikasi khusus pemodelan ancaman Trike T-01 s/d T-16. |

---

## 3. Ringkasan Batasan Empiris & Integritas Ilmiah (Honesty & Limitations)

1. **Replay Protection Test (`RP-01`)**: Dicatat sebagai **PARTIAL** karena test harness memvalidasi penolakan duplikasi sequence counter pada layer *application envelope*; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual.
2. **Pemindaian DAST OWASP ZAP**: Dicatat sebagai **EXECUTED_WITH_OPEN_FINDINGS** (0 High, 1 Medium, 1 Low, 3 Informational) pada frontend produksi Vercel; pemindaian ZAP tidak mencakup backend Render atau WebSocket signaling, yang diverifikasi secara lokal melalui test harness `BT-01` s/d `BT-06`.
3. **Pembersihan Memori pada JavaScript (`T-06`)**: Dicatat sebagai **PARTIAL** karena engine V8 mengelola memori secara otomatis via Garbage Collector dan tidak memberikan jaminan deterministik pembersihan fisik RAM (*secure zeroization*).
4. **Dependensi Backend (SCA)**: Dicatat sebagai **OPEN / PARTIAL** di mana 17 catatan advisory PyPI dikategorikan berdasarkan jalur eksekusi aplikasi aktual.
5. **Klaim Kriptografi**: Protokol diklasifikasikan sebagai *PSK-assisted ML-KEM session-key establishment with AES-GCM application-layer encryption* dan menyediakan *mutual key confirmation* (bukan *identity authentication*). Parameter ML-KEM-768 mengikuti NIST FIPS 203, tanpa klaim sertifikasi NIST CMVP pada library JavaScript pihak ketiga.
