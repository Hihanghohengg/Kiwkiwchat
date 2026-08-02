# Daftar Periksa Keamanan Pra-Rilis (Release Security Checklist) — Kiw Kiw Chat

Dokumen ini memuat lembar evaluasi keamanan akhir (*Final Security Review* - FSR) pada **Kiw Kiw Chat** (Prototipe Riset) sesuai standar kerangka kerja **Microsoft Security Development Lifecycle (SDL)**.

---

## 1. Lembar Verifikasi Final Security Review (FSR Checklist)

| Kategori Pemeriksaan | Item Pemeriksaan Keamanan | Bukti Verifikasi / Referensi | Status Evaluasi | Catatan Kritis & Limitasi |
|---|---|---|:---:|---|
| **1. Threat Modeling** | Seluruh 16 ancaman Trike (T-01 s/d T-16) telah dipetakan ke kontrol teknis dan dicatat residual risk-nya. | [`trike_threat_model.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_threat_model.md) | ✅ **100% MAPPED** | 3 ancaman berstatus PARTIAL / WITH CAVEAT; 4 berstatus CODE REVIEW ONLY. |
| **2. Cryptographic Review** | Parameter ML-KEM-768 mengikuti NIST FIPS 203; HKDF-SHA-256 (RFC 5869); AES-GCM-256 dengan IV unik 12-byte. | [`baseline_test_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/baseline_test_results.md) | ✅ **VERIFIED** | Library `mlkem` JavaScript pihak ketiga tidak diklaim memiliki sertifikasi CMVP. |
| **3. Zero-Knowledge Relay** | Backend signaling tidak menerima material kunci aplikasi dalam alur normal; room secret di fragment `#` (RFC 3986). | [`repository_inventory.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/repository_inventory.md) | ✅ **VERIFIED** | Asumsi integritas client delivery channel. |
| **4. SAST Code Gate** | Audit Bandit pada backend menunjukkan 0 kerentanan High Severity. | [`bandit_summary.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/bandit_summary.md) | ✅ **PASS (0 High)** | 1 Med B104 (accepted deployment finding); 3 Low B110 (accepted technical debt). |
| **5. SCA Dependency Gate** | Frontend: 0 vulnerabilities (NPM). Backend: 17 catatan advisory PyPI dikategorikan. | [`dependency_review.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/dependency_review.md) | ⚠️ **OPEN / PARTIAL** | 8 advisory multipart tidak dipanggil dalam alur aplikasi; 5 URL/Host perlu validasi; open for upgrade. |
| **6. Dynamic DAST Gate** | Pemindaian dinamis otomatis menggunakan OWASP ZAP. | [`zap_execution_blocker.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_execution_blocker.md) | 🛑 **BLOCKED / NOT EXECUTED** | Docker tidak aktif dan binary ZAP tidak tersedia di PATH. Configuration review dilakukan secara manual. |
| **7. Web Security & CSP** | Header keamanan terkonfigurasi pada `vercel.json` dan middleware backend; CSP terpasang pada `index.html`. | [`zap_summary.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_summary.md) | ⚠️ **CONFIGURED (WITH CAVEAT)** | Directive `style-src` masih memuat `'unsafe-inline'` sebagai residual risk. |
| **8. Secure Memory Zeroization** | Pembersihan variabel kunci privat ML-KEM dan shared secret dari RAM browser. | [`trike_threat_model.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_threat_model.md) | ⚠️ **PARTIAL** | Engine JavaScript (V8) mengelola memori via GC dan tidak menjamin secure memory zeroization fisik. |
| **9. Replay Protection Test** | Pengujian proteksi replay pesan aplikasi. | [`baseline_test_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/baseline_test_results.md) | ⚠️ **PARTIAL** | Test `RP-01` memvalidasi sequence counter di application envelope; raw packet WebRTC reinjection out-of-scope. |
| **10. Regression Reliability** | Eksekusi 19 test case otomatis dan 3/3 putaran E2E multi-run deterministik. | [`final_regression_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/final_regression_results.md) | ✅ **PASS (18 PASS, 1 PARTIAL)** | 100% reliabilitas pada run pengujian multi-run. |

---

## 2. Pernyataan Keputusan Evaluasi (Evaluation Decision Statement)

Berdasarkan hasil evaluasi objektif dan rekonsiliasi bukti terhadap seluruh artefak Microsoft SDL dan Trike Threat Modeling:

- **Keputusan Evaluasi**: **READY FOR PAPER WITH LIMITATIONS**
- **Klasifikasi Perangkat Lunak**: **RESEARCH PROTOTYPE (NOT EVALUATED AS PRODUCTION-READY)**
- **Tanggal Evaluasi**: 2026-08-02
- **Ringkasan Kondisi**: Perangkat lunak memenuhi seluruh kriteria kelayakan sebagai prototipe riset akademik untuk publikasi ilmiah dengan limitasi empiris yang terdokumentasi secara transparan dan jujur.
