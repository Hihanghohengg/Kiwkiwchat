# Laporan Kesiapan Artefak Publik (Public Artifact Readiness Report) — Kiw Kiw Chat

**Tanggal Laporan**: 2026-08-03  
**Status Evaluasi Riset**: **READY FOR PAPER WITH LIMITATIONS**  
**Klasifikasi Repositori**: **RESEARCH ARTIFACT / PROTOTYPE (NOT EVALUATED AS PRODUCTION-READY)**  
**Repositori**: [Hihanghohengg/Kiwkiwchat](https://github.com/Hihanghohengg/Kiwkiwchat)  
**Putusan Pre-Commit**: `READY_TO_COMMIT_DOCUMENTATION` (Menunggu konfirmasi copyright holder pada `LICENSE`)

---

## 1. Ringkasan Eksekutif (Executive Summary)

Laporan ini menyajikan hasil validasi pre-commit komprehensif terhadap repositori **Kiw Kiw Chat** dalam rangka persiapan pembukaan repositori sebagai artefak penelitian terbuka (*open research artifact*) pendukung dua publikasi ilmiah:

1. **Paper IMPKRIP**:
   > *Implementasi dan Evaluasi Kriptografi Post-Quantum pada Aplikasi Chat Ephemeral Browser-Native Menggunakan ML-KEM-768*
2. **Paper SSDLC**:
   > *Implementasi Microsoft Security Development Lifecycle dengan Pemodelan Ancaman Trike pada Aplikasi Chat Ephemeral Kiw Kiw Chat*

Validasi ini memastikan bahwa seluruh perubahan pada artefak bukti hanya berupa **sanitasi dokumentasi dan tautan (Link Sanitization)**, tidak ada modifikasi metrik atau status pengujian, panduan reproduksi valid dan dapat dieksekusi, serta transparansi penuh atas batasan prototipe riset.

---

## 2. Audit Perubahan Evidence (Evidence Diff Safety)

Pemeriksaan `git diff` terhadap 14 berkas laporan di `artifacts/ssdlc_final/` menghasilkan klasifikasi berikut:

| No | Berkas Evidence | Klasifikasi Perubahan | Uraian Perubahan |
|---|---|:---:|---|
| 1 | `artifacts/ssdlc_final/bandit_summary.md` | `LINK_SANITIZATION_ONLY` | Menghapus tautan `file:///` absolut lokal $\to$ tautan relatif `./bandit_report.json`. |
| 2 | `artifacts/ssdlc_final/canonical_ssdlc_results.md` | `LINK_SANITIZATION_ONLY` | Mengonversi 8 tautan `file:///` ke path relatif `./` dan `../impkrip_final/`. |
| 3 | `artifacts/ssdlc_final/dependency_review.md` | `LINK_SANITIZATION_ONLY` | Mengonversi tautan laporan NPM & Pip Audit ke `./npm_audit_report.json` dan `./pip_audit_report.json`. |
| 4 | `artifacts/ssdlc_final/evidence_consistency_review.md` | `LINK_SANITIZATION_ONLY` | Mengonversi tautan laporan ZAP ke `./zap_report_2026-08-02.html`. |
| 5 | `artifacts/ssdlc_final/final_evidence_reconciliation_report.md` | `LINK_SANITIZATION_ONLY` | Mengonversi tautan bukti ke path relatif lokal. |
| 6 | `artifacts/ssdlc_final/final_regression_results.md` | `LINK_SANITIZATION_ONLY` | Mengonversi tautan bukti ke path relatif lokal. |
| 7 | `artifacts/ssdlc_final/microsoft_sdl_evidence.md` | `LINK_SANITIZATION_ONLY` | Mengonversi 5 tautan bukti gerbang SDL ke path relatif. |
| 8 | `artifacts/ssdlc_final/microsoft_sdl_mapping.md` | `LINK_SANITIZATION_ONLY` | Mengonversi 16 tautan artefak SDL ke path relatif. |
| 9 | `artifacts/ssdlc_final/release_security_checklist.md` | `LINK_SANITIZATION_ONLY` | Mengonversi 13 tautan checklist FSR ke path relatif. |
| 10 | `artifacts/ssdlc_final/repository_inventory.md` | `LINK_SANITIZATION_ONLY` | Mengonversi 20 tautan direktori dan file ke path relatif. |
| 11 | `artifacts/ssdlc_final/security_test_inventory.md` | `LINK_SANITIZATION_ONLY` | Mengonversi 6 tautan test inventory ke path relatif. |
| 12 | `artifacts/ssdlc_final/ssdlc_final_verification_report.md` | `LINK_SANITIZATION_ONLY` | Mengonversi 34 tautan indeks SSOT bukti ke path relatif. |
| 13 | `artifacts/ssdlc_final/zap_dast_verification.md` | `LINK_SANITIZATION_ONLY` | Mengonversi 2 tautan laporan ZAP dan backend tests ke path relatif. |
| 14 | `artifacts/ssdlc_final/zap_summary.md` | `LINK_SANITIZATION_ONLY` | Mengonversi 2 tautan laporan ZAP dan backend tests ke path relatif. |

### Verifikasi Integritas Data & Metrik
- **STATUS_CHANGE**: `0` (Tidak ada perubahan status uji).
- **METRIC_CHANGE**: `0` (Tidak ada perubahan angka benchmark atau hasil scan).
- **Integritas Metrik Terverifikasi**:
  - 10 Use Cases & 10 Abuse Cases
  - 18 Security Requirements (SR-01 s/d SR-18)
  - 14 Assets & 7 Actors
  - 16 Trike Threats (13 PASS/PASS_WITH_FINDINGS, 3 PARTIAL/OPEN_MEDIUM)
  - Application Crypto Test: 18 PASS, 1 PARTIAL (`RP-01`), 0 FAIL
  - Backend/WebSocket/CORS: 8/8 PASS (`BT-01` s/d `BT-08`)
  - Bandit SAST: 0 High, 1 Medium (B104), 3 Low (B110)
  - NPM Audit SCA: 0 Vulnerabilities (113 paket)
  - Pip-Audit SCA: 17 Advisories (8 multipart not reached, 5 URL requires validation, transitive open)
  - OWASP ZAP DAST: 0 High, 1 Medium (`style-src 'unsafe-inline'`), 1 Low, 3 Informational

---

## 3. Validasi Dokumentasi Baru (Documentation Validation)

Hasil pengujian otomatis terhadap `README.md`, `ARTIFACTS.md`, `CITATION.cff`, `docs/reproducibility/`, dan `docs/citation/`:

1. **Resolusi Tautan Relatif**: **201 tautan terverifikasi valid (0 broken links)**.
2. **Ketiadaan Skema Lokal**: **0 tautan `file:///` dan 0 path absolut Windows** ditemukan pada berkas Markdown publik.
3. **Privasi & Rahasia (Secrets/Credentials)**: **0 API Key, 0 token aktif, 0 room ID aktif, 0 email sensitif** di luar identitas kepengarangan publik.
4. **Validasi Command**: Seluruh perintah merujuk ke skrip dan path aktual repositori (`tests/integration/test_impkrip_final.py`, `tests/security/test_backend_websocket_security.py`, dsb.).
5. **Kesesuaian Hasil yang Diharapkan**: Seluruh *expected results* 100% konsisten dengan raw evidence di `artifacts/`.
6. **Klaim Batasan**: Tidak ada klaim *production-ready*, *fully secure*, *full DAST*, atau *100% mitigated*.
7. **Metadata Sitasi**:
   - `CITATION.cff`: Valid YAML syntax, CFF specification 1.2.0, tidak memuat DOI/ORCID rekaan.
   - `docs/citation/impkrip.bib` & `docs/citation/ssdlc.bib`: URL rilis menggunakan status *pending publication / repository baseline*.

---

## 4. Putusan Eksplisit IMPKRIP Artifact Consistency

**Putusan Keseluruhan IMPKRIP**: **`PARTIAL_MATCH`**

| Domain Evaluasi | Artefak / Commit Sumber | Nilai Paper | Nilai Artefak Repositori | Status Match | Batasan & Analisis |
|---|---|---|---|:---:|---|
| **1. Functional Test** | `artifacts/impkrip_final/impkrip_test_report.json`<br/>(Commit `8c8d067`) | 19 tests<br/>18 PASS<br/>1 PARTIAL<br/>0 FAIL<br/>E2E 3/3 | 19 tests<br/>18 PASS<br/>1 PARTIAL (`RP-01`)<br/>0 FAIL<br/>E2E 3/3 (E2E-01..04) | **EXACT_MATCH** | `RP-01` sequence validation diuji pada logika application envelope, tetapi raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual. |
| **2. Test Environment** | `artifacts/impkrip_final/impkrip_environment.json`<br/>`impkrip_benchmark.json` | ASUS VivoBook M1403QA<br/>Ryzen 5 5600H<br/>RAM 16 GB<br/>Windows 11 build 26200<br/>Node.js 20.18.0<br/>Python 3.12.9<br/>Chromium 133<br/>mlkem 2.7.0 | ASUS VivoBook M1403QA<br/>Ryzen 5 5600H<br/>RAM 16 GB (15.41 GB Usable)<br/>Windows 11 build 26200<br/>Node.js v22.17.0<br/>Python 3.11.9<br/>Chromium 149.0.7827.55<br/>mlkem ^2.7.0 | **PARTIAL_MATCH** | Spesifikasi hardware dasar (CPU, RAM, OS Build, ML-KEM package) cocok persis. Terdapat divergensi minor pada versi toolchain lokal (Node.js v22 vs v20, Python 3.11 vs 3.12, Chromium 149 vs 133). |
| **3. Performance Benchmark** | `artifacts/impkrip_final/impkrip_benchmark.json`<br/>(Commit `5700684`, 5 runs, 1000 samples) | KeyGen: 1.730 ms<br/>Encap: 2.280 ms<br/>Decap: 2.820 ms<br/>HKDF: 0.132 ms<br/>HMAC: 0.076 ms<br/>AES Enc: 0.038 ms<br/>AES Dec: 0.035 ms<br/>PQ 0ms: 7.050 ms<br/>PQ 5ms: 18.700 ms<br/>Cold Start: 15.900 ms | KeyGen median: 0.580 ms (cold 2.20 ms)<br/>Encap median: 0.620 ms (cold 4.60 ms)<br/>Decap median: 0.680 ms (cold 3.50 ms)<br/>HKDF median: 0.060 ms (cold 0.20 ms)<br/>HMAC sign: 0.010 ms<br/>AES 1k enc: 0.050 ms (cold 0.30 ms)<br/>AES 1k dec: 0.170 ms (cold 0.50 ms)<br/>PQ 0ms median: 2.700 ms (cold 4.40 ms)<br/>PQ 5ms median: 37.900 ms (cold 27.20 ms) | **DIVERGENT_SNAPSHOT** | Data mentah `impkrip_benchmark.json` merekam iterasi benchmark 1000 sampel mandiri. Repositori mempertahankan raw data otentik tanpa memanipulasi file JSON agar sesuai dengan draft paper. |
| **4. JavaScript Heap Memory** | `artifacts/impkrip_final/impkrip_memory_benchmark.json`<br/>`impkrip_memory_summary.md`<br/>(Commit `d98ca5f`) | Baseline: 5.0850 MiB<br/>Post-KeyGen: 5.3223 MiB<br/>Delta KeyGen: 0.2371 MiB<br/>Post-PQ-Upgrade: 5.6062 MiB<br/>Delta PQ: 0.5212 MiB | Baseline: 5.0850 MiB<br/>Post-KeyGen: 5.3223 MiB<br/>Delta KeyGen: 0.2371 MiB<br/>Post-PQ-Upgrade: 5.6062 MiB<br/>Delta PQ: 0.5212 MiB | **EXACT_MATCH** | 100% identik hingga 4 angka desimal. Pengukuran berbasis Chromium CDP (`Runtime.getHeapUsage`). V8 GC non-deterministik; tidak menjamin deterministic physical RAM zeroization. |

---

## 5. Putusan & Evaluasi SSDLC

**Putusan Keseluruhan SSDLC**: **`READY_WITH_DOCUMENTED_LIMITATIONS`**

- **Status Git Tag Bukti**: Tag `ssdlc-evidence-v2` tersedia secara lokal dan pada remote GitHub, menunjuk ke commit `8c8d06791ffd5bc5b099425fb8d034bcf0834d90`.
- **Cakupan Snapshot Tag Lama**: Snapshot `ssdlc-evidence-v2` memuat 100% artefak bukti pemodelan ancaman Trike T-01 s/d T-16, pengujian dinamis backend BT-01..BT-08, laporan SAST Bandit, NPM/Pip SCA, dan DAST OWASP ZAP.
- **Evaluasi Kebutuhan Reviewer**:
  - Reviewer akademik memerlukan: (1) Kode sumber aplikasi, (2) Bukti mentah (*raw evidence*), (3) Panduan reproduksi mandiri (`docs/reproducibility/`), dan (4) Metadata sitasi (`CITATION.cff`).
  - Dokumentasi publik terbaru (`README.md`, `ARTIFACTS.md`, `docs/reproducibility/`) **belum berada di dalam tag `ssdlc-evidence-v2`** karena dibuat pada commit lanjutan.
- **Rekomendasi Tag & Rilis**:
  - **Langkah 1**: Lakukan git commit terhadap seluruh dokumentasi publik baru yang telah divalidasi.
  - **Langkah 2**: Buat Git tag baru: `v1.0.0-research-artifact` (atau `ssdlc-paper-v1` dan `impkrip-paper-v1`) dari commit dokumentasi terbaru di `main`.
  - **Langkah 3**: Buat GitHub Release resmi yang melampirkan ringkasan `ARTIFACTS.md`. Tag lama `ssdlc-evidence-v2` tetap dipertahankan sebagai penanda snapshot audit raw data historis.

---

## 6. Status GitHub Release

Pemeriksaan status rilis publik via GitHub API (`https://api.github.com/repos/Hihanghohengg/Kiwkiwchat/releases`):

- **GitHub Release Aktif**: `0` (Belum ada GitHub Release yang dipublikasikan / *empty* `[]`).
- **Tag Tanpa Release**: `ssdlc-evidence-v1`, `ssdlc-evidence-v2`.
- **Status `impkrip-paper-v1`**: Belum dibuat.
- **Status `ssdlc-paper-v1`**: Belum dibuat.
- **Status `ssdlc-evidence-v2`**: Tag tersedia di remote GitHub, tetapi belum memiliki GitHub Release.

---

## 7. Status Audit Lisensi (License Audit)

- **File**: `LICENSE` (Baris 3)
- **Isi Teks Saat Ini**: `Copyright (c) 2026 vdw`
- **Status Validasi**: ⚠️ **`NEEDS_USER_CONFIRMATION`**
- **Opsi Pilihan Pengguna**:
  1. `Copyright (c) 2026 Yohanes Obed Musila`
  2. `Copyright (c) 2026 Kiw Kiw Chat Contributors`
  3. `Copyright (c) 2026 [Nama Tim / Institusi Lain]`
  4. Pertahankan nama yang ada (`Copyright (c) 2026 vdw`)

---

## 8. Daftar Hambatan & Prasyarat Commit (Blockers Analysis)

| Item Pemeriksaan | Status | Keterangan / Tindakan |
|---|:---:|---|
| **Evidence Diff Safety** | ✅ CLEAR | Seluruh 14 file evidence berstatus `LINK_SANITIZATION_ONLY`. |
| **Broken Documentation Links** | ✅ CLEAR | 201 valid relative links, 0 broken, 0 file scheme. |
| **Security & Privacy Leaks** | ✅ CLEAR | 0 credential/token/active secret. |
| **CITATION.cff Syntax** | ✅ CLEAR | Valid YAML CFF 1.2.0. |
| **Konfirmasi Copyright LICENSE** | ⚠️ **ACTION REQUIRED** | Menunggu pilihan nama copyright dari pengguna sebelum commit. |

---

## 9. Rekomendasi Commit Selanjutnya (Recommended Next Commit)

Setelah pengguna mengonfirmasi pilihan nama pemegang hak cipta pada `LICENSE`, jalankan tahapan commit berikut:

```powershell
# 1. Update LICENSE jika pengguna memilih opsi 1, 2, atau 3.
# 2. Stage seluruh berkas dokumentasi dan sanitasi:
git add README.md ARTIFACTS.md CITATION.cff LICENSE docs/ artifacts/ssdlc_final/

# 3. Eksekusi commit:
git commit -m "docs: finalize public research artifact preparation for IMPKRIP and SSDLC papers"

# 4. Buat release tag:
git tag -a v1.0.0-research-artifact -m "Release v1.0.0: Research Artifact for IMPKRIP and SSDLC Papers"

# 5. Push ke remote origin (hanya bila pengguna menginstruksikan):
# git push origin main --tags
```

---

## 10. Keputusan Akhir Pre-Commit (Final Verdict)

**Keputusan**: **`READY_TO_COMMIT_DOCUMENTATION`**  
*(Catatan: Repositori sepenuhnya aman untuk commit dokumentasi publik setelah konfirmasi nama copyright `LICENSE` oleh pengguna).*
