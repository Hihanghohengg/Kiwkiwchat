# Pemetaan Microsoft Security Development Lifecycle (SDL) — Kiw Kiw Chat

Dokumen ini mendokumentasikan pemetaan komprehensif seluruh aktivitas pengembangan sistem **Kiw Kiw Chat** (Prototipe Riset) ke dalam kerangka kerja **Microsoft Security Development Lifecycle (SDL)**.

---

## 1. Tahap 0: Security Preparation and Knowledge Acquisition

| Aktivitas SDL | Implementasi Proyek Kiw Kiw Chat | Bukti Artefak |
|---|---|---|
| **Penyusunan Pedoman Kriptografi Modern** | Penelaahan standar NIST FIPS 203 (ML-KEM), RFC 5869 (HKDF), dan RFC 5116 (Authenticated Encryption). | [`system_context_and_scope.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/system_context_and_scope.md) |
| **Prinsip Zero-Knowledge Signaling** | Perancangan arsitektur signaling relay yang tidak menerima material kunci aplikasi dalam alur normal (RFC 3986 URL Fragment). | [`repository_inventory.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/repository_inventory.md) |
| **Prinsip Minimasi Permukaan Serang** | Pembatasan endpoint HTTP backend hanya untuk pembuatan room, penonaktifan dokumentasi interaktif pada rilis publik, dan isolasi memori klien. | `backend/main.py` |

---

## 2. Tahap 1: Requirements

| Aktivitas SDL | Implementasi Proyek Kiw Kiw Chat | Bukti Artefak |
|---|---|---|
| **Penetapan Security Quality Bug Bar** | Menetapkan batas kelulusan: 0 kerentanan High Severity pada SAST/SCA, lolos 100% unit test kriptografi, dan determinisme E2E multi-run. | [`use_abuse_security_requirements.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/use_abuse_security_requirements.md) |
| **Analisis Kebutuhan Keamanan (Security Requirements)** | Mendefinisikan 10 Use Cases $\longrightarrow$ 10 Abuse Cases $\longrightarrow$ 18 Persyaratan Keamanan Spesifik (SR-01 s/d SR-18). | [`use_abuse_security_requirements.csv`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/use_abuse_security_requirements.csv) |

---

## 3. Tahap 2: Design

| Aktivitas SDL | Implementasi Proyek Kiw Kiw Chat | Bukti Artefak |
|---|---|---|
| **Pemodelan Ancaman (Threat Modeling)** | Menerapkan metodologi **Trike Threat Modeling**: analisis 14 aset sistem, 7 aktor, matriks otorisasi CRUD, dan 16 skenario ancaman kanonikal (T-01..T-16). | [`trike_threat_model.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_threat_model.md)<br/>[`trike_threat_register.csv`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_threat_register.csv) |
| **Pemisahan Batasan Kepercayaan (Trust Boundaries)** | Mendefinisikan TB-01 (Client-to-Signaling) dan TB-02 (Direct WebRTC DataChannel) secara tegas. | [`system_context_and_scope.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/system_context_and_scope.md) |

---

## 4. Tahap 3: Implementation

| Aktivitas SDL | Implementasi Proyek Kiw Kiw Chat | Bukti Artefak |
|---|---|---|
| **Penggunaan Primitif Kriptografi Baku** | Menggunakan WebCrypto API native browser untuk AES-GCM-256 dan HMAC-SHA-256; implementasi ML-KEM-768 mengikuti parameter NIST FIPS 203. | `frontend/src/crypto/` |
| **Pemindaian Keamanan Statis (SAST)** | Integrasi Bandit v1.9.4 pada backend Python: 0 High Severity, 1 Medium (B104 accepted deployment), 3 Low (B110 accepted technical debt). | [`bandit_summary.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/bandit_summary.md)<br/>[`bandit_report.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/bandit_report.json) |
| **Audit Komposisi Perangkat Lunak (SCA)** | Audit dependensi NPM frontend (0 vulnerabilities) dan audit dependensi Pip backend (analisis keterjangkauan). | [`dependency_review.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/dependency_review.md) |

---

## 5. Tahap 4: Verification

| Aktivitas SDL | Implementasi Proyek Kiw Kiw Chat | Bukti Artefak |
|---|---|---|
| **Pengujian Kriptografi Otomatis** | Eksekusi 19 test case otomatis via `test_impkrip_final.py`: 18 PASS, 1 PARTIAL (`RP-01`), 0 FAIL. | [`baseline_test_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/baseline_test_results.md) |
| **Pengujian End-to-End Multi-Run** | Eksekusi 3 run E2E independen (`E2E-01` s/d `E2E-04`) dengan tingkat keberhasilan 3/3 (100%). | [`final_regression_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/final_regression_results.md) |
| **Pengukuran JavaScript Heap Memori** | Evaluasi checkpoint memori via CDP: Baseline 5.0850 MiB, Post-KeyGen 5.3223 MiB, Post-PQ Upgrade 5.6062 MiB. | [`impkrip_memory_summary.md`](file:///d:/Obed/kiwkiw/artifacts/impkrip_final/impkrip_memory_summary.md) |
| **Pengujian Dinamis Backend & WebSocket** | Eksekusi 8 kasus uji dinamis minimum (`BT-01` s/d `BT-08`) memverifikasi kapasitas 2-peer, rate limiting, batas payload WS, ketahanan malformed input, teardown, idle timeout, serta preflight CORS: 8/8 PASS (100%). | [`backend_websocket_test_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/backend_websocket_test_results.md) |
| **Pemindaian DAST OWASP ZAP & Headers** | Pemindaian pasif OWASP ZAP 2.17.0 terhadap frontend produksi Vercel: 0 High, 1 Medium (`style-src 'unsafe-inline'`), 1 Low, 3 Informational. | [`zap_summary.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_summary.md)<br/>[`zap_report_2026-08-02.html`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_report_2026-08-02.html) |

---

## 6. Tahap 5: Release

| Aktivitas SDL | Implementasi Proyek Kiw Kiw Chat | Bukti Artefak |
|---|---|---|
| **Final Security Review (FSR)** | Peninjauan menyeluruh terhadap daftar periksa keamanan rilis dengan status **READY FOR PAPER WITH LIMITATIONS (RESEARCH PROTOTYPE)**. | [`release_security_checklist.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/release_security_checklist.md) |
| **Matriks Keterlacakan (Traceability Matrix)** | Matriks keterlacakan hulu-hilir (Use Case $\to$ Threat $\to$ Control $\to$ Test). | [`traceability_matrix.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/traceability_matrix.md) |

---

## 7. Tahap 6: Response

| Aktivitas SDL | Implementasi Proyek Kiw Kiw Chat | Bukti Artefak |
|---|---|---|
| **Rencana Tanggap Insiden & CVD** | SOP respons insiden, kebijakan Coordinated Vulnerability Disclosure, dan alur rilis patch darurat. | [`vulnerability_response_plan.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/vulnerability_response_plan.md) |
| **Mitigasi Efemeral Otomatis** | Server memusnahkan room otomatis dalam 15 menit (900 detik) dan klien membersihkan storage saat pemusnahan room. | `backend/main.py`, `frontend/src/utils/storage.js` |
