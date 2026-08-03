# Matriks Kelayakan Bukti Ilmiah Paper (Paper Evidence Eligibility Matrix) — Kiw Kiw Chat

Dokumen ini memetakan kelayakan setiap skenario ancaman Trike (T-01 s/d T-16) dan artefak pengujian untuk disajikan dalam manuskrip paper penelitian ilmiah. Seluruh item dievaluasi berdasarkan ketersediaan eksekusi metode aktual dan bukti empiris terverifikasi.

---

## 1. Matriks Kelayakan Bukti Skenario Ancaman (T-01 s/d T-16)

| Threat | Metode dijalankan | Jenis evidence | Status hasil | Layak masuk hasil paper | Cara penyajian |
|:---:|:---:|---|:---:|:---:|---|
| **T-01** | YES | Automated Unit & Integration Test (`AE-01`, `E2E-01`) | **PASS** | **YES** | Tabel hasil & narasi hasil |
| **T-02** | YES | Automated Unit Cryptographic Test (`PQ-01`, `PQ-02`, `KD-01`) | **PASS** | **YES** | Tabel hasil & narasi hasil |
| **T-03** | YES | Automated Integration Test (`E2E-01`) & Code Review | **PASS** | **YES** | Diagram alur signaling & narasi hasil |
| **T-04** | YES | Automated Multi-Run E2E (`E2E-03`) & Dynamic WS Test (`BT-01`) | **PASS** | **YES** | Tabel hasil & ringkasan statistik |
| **T-05** | YES | Automated Unit & Negative Security Test (`KC-01`, `KC-02`) | **PASS** | **YES** | Tabel hasil & narasi hasil |
| **T-06** | YES | Code Review & Heap Profiler Checkpoint (`MEM-01`) | **PARTIAL** | **YES** | Tabel hasil, ringkasan statistik & narasi keterbatasan |
| **T-07** | YES | Automated E2E Test (`E2E-04`) & Code Review | **PASS** | **YES** | Tabel hasil & narasi keterbatasan |
| **T-08** | YES | Automated Unit Test (`AE-04`) & Envelope Validation (`RP-01`) | **PARTIAL** | **YES** | Tabel hasil & narasi keterbatasan |
| **T-09** | YES | Automated Multi-Run E2E (`E2E-04`) & Dynamic WS Test (`BT-05`) | **PASS** | **YES** | Tabel hasil & narasi hasil |
| **T-10** | YES | Automated Multi-Run E2E (`E2E-04`) & Code Review | **PASS** | **YES** | Tabel hasil & narasi hasil |
| **T-11** | YES | Dynamic CORS Preflight Test (`BT-07`, `BT-08`) & Code Review | **PASS** | **YES** | Tabel hasil & narasi hasil |
| **T-12** | YES | Dynamic WS Signaling Test (`BT-01`, `BT-05`) | **PASS** | **YES** | Tabel hasil & narasi hasil |
| **T-13** | YES | Dynamic REST API Rate Limiting Test (`BT-02`) | **PASS** | **YES** | Tabel hasil, ringkasan statistik & narasi hasil |
| **T-14** | YES | Dynamic WS Guard & Timeout Test (`BT-03`, `BT-04`, `BT-06`) | **PASS** | **YES** | Tabel hasil & narasi hasil |
| **T-15** | YES | Automated SAST Code Scanning (Bandit v1.9.4) | **PASS (0 High)** | **YES** | Ringkasan statistik & narasi hasil |
| **T-16** | YES | Automated DAST Passive Scan (OWASP ZAP 2.17.0) | **PARTIAL / OPEN_MEDIUM** | **YES** | Tabel hasil, ringkasan statistik & narasi keterbatasan |

---

## 2. Pedoman Penyajian Data dalam Paper Ilmiah

Sesuai dengan etika akademik dan standar publikasi ilmiah, penyajian data hasil penelitian di dalam manuskrip paper mengikuti ketentuan berikut:

1. **Bentuk Penyajian yang Diizinkan**:
   - **Tabel Hasil**: Menyajikan rekapitulasi ID ancaman, kebutuhan keamanan, status pengujian, dan jumlah pengujian.
   - **Diagram Arsitektur / Alur**: Menggambarkan model ancaman, alur pertukaran pesan signaling, batas kepercayaan (*trust boundaries*), dan alur enkripsi.
   - **Ringkasan Statistik**: Menampilkan metrik agregat seperti persentase kelulusan tes (18/19 PASS, 8/8 dynamic test PASS, 3/3 putaran E2E deterministik), jumlah kerentanan (0 High SAST, 0 High DAST), dan median alokasi memori heap.
   - **Narasi Hasil**: Menjelaskan temuan empiris, mekanisme pertahanan, dan kesesuaian kontrol dengan kebutuhan keamanan.
   - **Narasi Keterbatasan (*Limitations*)**: Mendiskusikan secara transparan batasan pengujian replay envelope, manajemen memori pada runtime JavaScript V8, residu CSP `unsafe-inline`, dan klasifikasi prototipe riset.

2. **Elemen yang Dilarang Ditampilkan dalam Manuskrip Paper**:
   - Path absolut atau direktori lokal sistem operasi pengembang.
   - Nama file internal atau skrip pengujian lokal yang tidak relevan dengan konsep arsitektur.
   - Commit hash git dan status repositori internal.
   - Raw terminal logs yang memuat dump teks mentah.
   - Skema URL lokal (`file:///...`).
   - Token sesi sementara, ID room sementara, data secret acak, atau kredensial uji.
