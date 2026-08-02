# Laporan Sintesis Akhir Verifikasi SSDLC (Final SSDLC Verification Report) — Kiw Kiw Chat

Dokumen ini merupakan laporan sintesis master dari seluruh paket bukti **Secure Software Development Life Cycle (SSDLC)** pada proyek **Kiw Kiw Chat** (Prototipe Riset), yang mengintegrasikan metodologi **Microsoft Security Development Lifecycle (SDL)** dan **Trike Threat Modeling**.

---

## 1. Ringkasan Eksekutif & Status Keputusan Evaluasi

Pengembangan perangkat lunak komunikasi efemeral **Kiw Kiw Chat** menerapkan pendekatan *Security-by-Design* berlapis untuk mengamankan pertukaran pesan antar dua pengguna pada browser desktop/laptop modern standar.

### Status Keputusan Akhir:
- **Status Evaluasi**: **READY FOR PAPER WITH LIMITATIONS**
- **Klasifikasi Sistem**: **RESEARCH PROTOTYPE (NOT EVALUATED AS PRODUCTION-READY)**
- **Tanggal Evaluasi**: 2026-08-02

### Indikator Kunci Keamanan & Kualitas (KPIs):
- **Cakupan Kebutuhan Keamanan**: 10 Use Cases $\longrightarrow$ 10 Abuse Cases $\longrightarrow$ 18 Security Requirements (SR-01 s/d SR-18).
- **Pemodelan Ancaman Trike**: 14 Aset Sistem, 7 Aktor, 16 Skenario Ancaman (T-01 s/d T-16) dengan **100% pemetaan kontrol**.
- **Hasil Pengujian Otomatis**: 19 Kasus Uji Kriptografi & Fungsional (**18 PASS, 1 PARTIAL `RP-01`, 0 FAIL**) dengan reliabilitas 3/3 putaran E2E independen (100%).
- **Audit Statis (SAST)**: 0 High Severity Vulnerabilities pada pemindaian Bandit backend Python (1 Medium B104 accepted deployment finding, 3 Low B110 accepted technical debt).
- **Audit Dependensi (SCA)**: Frontend: 0 Vulnerabilities (113 paket NPM); Backend: 17 catatan advisory PyPI dikategorikan (status: *Open / Partial*).
- **Tinjauan Konfigurasi Web & Header**: Kepatuhan konfigurasi terhadap OWASP ZAP Baseline Rules terpilih (Status DAST otomatis: *Blocked / Not Executed* karena ketiadaan Docker/ZAP binary).
- **Profil Memori JavaScript Heap**: Pengukuran checkpoint heap V8 (Median baseline: 5.0850 MiB, Median post-keygen: 5.3223 MiB, Median post-PQ upgrade: 5.6062 MiB).

---

## 2. Struktur Paket Bukti SSDLC (`artifacts/ssdlc_final/`)

| No | Nama File Artefak | Format | Deskripsi & Konten Utama |
|---|---|---|---|
| 1 | [`repository_inventory.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/repository_inventory.md) | Markdown | Inventaris lengkap modul frontend, backend, kriptografi, dan dependensi. |
| 2 | [`system_context_and_scope.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/system_context_and_scope.md) | Markdown | Batasan kepercayaan (*Trust Boundaries* TB-01/TB-02), diagram konteks, dan batasan lingkup. |
| 3 | [`use_abuse_security_requirements.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/use_abuse_security_requirements.md) | Markdown | Rincian relasi Use Case, Abuse Case, dan Security Requirements (SR-01..18). |
| 4 | [`use_abuse_security_requirements.csv`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/use_abuse_security_requirements.csv) | CSV | Tabel tabular relasi kebutuhan keamanan untuk lampiran paper. |
| 5 | [`trike_assets_actors_operations.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_assets_actors_operations.md) | Markdown | Analisis Trike: 14 Aset, 7 Aktor, dan operasi CRUD yang didukung. |
| 6 | [`trike_permission_matrix.csv`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_permission_matrix.csv) | CSV | Matriks otorisasi hak akses Trike (ALLOW, DENY, COND, NA). |
| 7 | [`trike_threat_model.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_threat_model.md) | Markdown | Model ancaman Trike: Kriteria risiko, 16 ancaman kanonikal (T-01..16), dan pemetaan kontrol. |
| 8 | [`trike_threat_register.csv`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_threat_register.csv) | CSV | Register ancaman Trike terstruktur untuk analisis data kuantitatif. |
| 9 | [`microsoft_sdl_mapping.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/microsoft_sdl_mapping.md) | Markdown | Pemetaan komprehensif ke 6 fase inti Microsoft SDL (+ Preparation). |
| 10 | [`baseline_test_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/baseline_test_results.md) | Markdown | Hasil empiris eksekusi test suite 19 tests dan metrik memori kanonikal. |
| 11 | [`bandit_report.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/bandit_report.json) | JSON | Raw output pemindaian SAST Bandit v1.9.4 pada backend Python. |
| 12 | [`bandit_summary.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/bandit_summary.md) | Markdown | Ringkasan dan analisis teknis temuan SAST Bandit. |
| 13 | [`npm_audit_report.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/npm_audit_report.json) | JSON | Raw output audit dependensi NPM frontend (0 vulnerabilities). |
| 14 | [`pip_audit_report.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/pip_audit_report.json) | JSON | Raw output audit dependensi Pip backend Python. |
| 15 | [`dependency_review.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/dependency_review.md) | Markdown | Kategorisasi keterjangkauan (*reachability analysis*) dependensi backend. |
| 16 | [`zap_execution_blocker.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_execution_blocker.md) | Markdown | Dokumentasi blocker Docker ZAP dan panduan reproduksi mandiri CLI. |
| 17 | [`zap_summary.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_summary.md) | Markdown | Configuration review terhadap aturan terpilih OWASP ZAP Baseline Rules. |
| 18 | [`security_test_inventory.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/security_test_inventory.md) | Markdown | Pemetaan 19 kasus uji otomatis terhadap kebutuhan keamanan dan ancaman. |
| 19 | [`traceability_matrix.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/traceability_matrix.md) | Markdown | Matriks keterlacakan hulu-hilir (Use Case $\to$ Threat $\to$ Control $\to$ Test). |
| 20 | [`traceability_matrix.csv`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/traceability_matrix.csv) | CSV | Tabel keterlacakan tabular untuk matriks verifikasi paper. |
| 21 | [`security_hardening_change_log.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/security_hardening_change_log.md) | Markdown | Kronologi 10 intervensi penguatan keamanan (SEC-01 s/d SEC-10). |
| 22 | [`final_regression_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/final_regression_results.md) | Markdown | Evaluasi regresi multi-dimensi dan metrik heap checkpoint. |
| 23 | [`release_security_checklist.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/release_security_checklist.md) | Markdown | Lembar evaluasi Final Security Review (FSR) dan pernyataan keputusan rilis. |
| 24 | [`vulnerability_response_plan.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/vulnerability_response_plan.md) | Markdown | Standar operasional prosedur tanggap insiden dan pengungkapan kerentanan. |
| 25 | [`figures/README.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/figures/README.md) | Markdown | Direktori gambar arsitektur, trust boundaries, dan diagram handshake Mermaid. |
| 26 | [`evidence_consistency_review.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/evidence_consistency_review.md) | Markdown | Catatan audit rekonsiliasi inkonsistensi dan penurunan status klaim berlebihan. |
| 27 | [`canonical_ssdlc_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/canonical_ssdlc_results.md) | Markdown | Lembar data tunggal canonical yang 100% didukung raw evidence. |

---

## 3. Ringkasan Batasan Empiris & Integritas Ilmiah (Honesty & Limitations)

1. **Replay Protection Test (`RP-01`)**: Dicatat sebagai **PARTIAL** karena test harness memvalidasi penolakan duplikasi sequence counter pada layer application envelope, namun belum melakukan penangkapan dan reinjeksi raw encrypted WebRTC DataChannel packet secara fisik.
2. **Pemindaian DAST OWASP ZAP**: Dicatat secara jujur sebagai **BLOCKED / NOT EXECUTED** karena ketiadaan Docker daemon pada lingkungan pengujian; tinjauan dilakukan melalui *Configuration Review* statis terhadap aturan ZAP.
3. **Pembersihan Memori pada JavaScript (`T-06`)**: Dicatat sebagai **PARTIAL** karena engine V8 mengelola memori secara otomatis via Garbage Collector dan tidak memberikan jaminan deterministik pembersihan fisik RAM (*secure zeroization*).
4. **Dependensi Backend (SCA)**: Dicatat sebagai **OPEN / PARTIAL** di mana 17 catatan advisory PyPI dikategorikan berdasarkan jalur eksekusi aplikasi aktual.
5. **Klaim Kriptografi**: Protokol diklasifikasikan sebagai *PSK-assisted ML-KEM session-key establishment with AES-GCM application-layer encryption* dan menyediakan *mutual key confirmation* (bukan *identity authentication*). Parameter ML-KEM-768 mengikuti NIST FIPS 203, tanpa klaim sertifikasi NIST CMVP pada library JavaScript pihak ketiga.
