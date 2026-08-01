# IMPKRIP Finalization & Hardware Specification Alignment Walkthrough

Semua artefak pengujian dan benchmarking kriptografi untuk paper IMPKRIP telah disinkronkan dan dihasilkan ulang dengan spesifikasi perangkat uji aktual yang terverifikasi dan tervalidasi oleh sistem operasi dan hardware probing.

---

## 1. Test Environment & System Specification

Spesifikasi perangkat aktual hasil deteksi hardware terverifikasi:

| Property | Verified Value |
|---|---|
| **Device Model** | `ASUSTeK COMPUTER INC. VivoBook_ASUSLaptop M1403QA_M1403QA (ASUS VivoBook 14X M1403QA)` |
| **Processor (CPU)** | `AMD Ryzen 5 5600H with Radeon Graphics` (6 Cores, 12 Threads) |
| **RAM Configuration** | `16 GB Installed (Dual-Channel: 2x 8 GB Micron DDR4-3200), 15.41 GB Usable` |
| **Integrated Graphics** | `AMD Radeon(TM) Graphics` |
| **Storage (BusType/Media)** | `INTEL SSDPEKNU512GZ (512 GB NVMe SSD, BusType: NVMe, MediaType: SSD)` |
| **Operating System** | `Microsoft Windows 11 Home Single Language` (`10.0.26200 (Build 26200)`) |
| **Python Version** | `3.11.9` |
| **Node.js Version** | `v22.17.0` |
| **Browser Engine** | `Chromium 149.0.7827.55` (Playwright Engine) |
| **ML-KEM Package** | `^2.7.0` (`mlkem`) |

*Catatan Audit*: Spesifikasi manual awal (`Ryzen 7`, `8 GB RAM`) disimpan dalam field audit `initial_user_provided_specification` untuk keperluan ketertelusuran historis.

---

## 2. Struktur Artefak yang Dihasilkan

Seluruh artefak pengujian dan benchmark tersimpan di `artifacts/impkrip_final/`:

| File | Deskripsi |
|---|---|
| `impkrip_environment.json` | Metadata JSON lingkungan pengujian terverifikasi beserta parameter benchmark dan audit baseline |
| `impkrip_test_report.json` | Hasil evaluasi fungsional (18 PASS, 1 PARTIAL) + 3 E2E test runs history |
| `impkrip_test_report.md` | Laporan markdown pengujian fungsional dan keamanan |
| `impkrip_test_report.html` | Dashboard visual HTML interaktif dengan tabel spesifikasi terverifikasi & badge status |
| `impkrip_benchmark.json` | Hasil 1.000 sampel benchmark (5 run × 200 iterasi) untuk seluruh primitif & protokol |
| `impkrip_benchmark.csv` | Data tabular CSV dengan header komentar metadata perangkat terverifikasi |
| `impkrip_testing_summary.md` | Ringkasan performa, cold start, dan analisis efisiensi post-quantum |
| `impkrip_failures.log` | Log kegagalan eksekusi (bersih / 0 failures) |

---

## 3. Ringkasan Metodologi Benchmarking

1. **Sub-Millisecond Batching**: Operasi kriptografi frekuensi tinggi (`ML-KEM`, `HKDF`, `HMAC`, `AES-GCM`) diukur menggunakan loop batch (10 iterasi per sampel batch) untuk mengatasi keterbatasan resolusi timer browser (`performance.now()`).
2. **Key Confirmation Benchmarking**: HMAC benchmarking menggunakan `confirmationKey` 256-bit hasil derivasi `deriveSessionKeys()`.
3. **Microtask Protocol Timing**: Protokol `protocol_0ms` menggunakan `queueMicrotask` untuk merefleksikan alur kripto murni tanpa jeda `setTimeout`, sedangkan `protocol_5ms` mensimulasikan latensi transmisi jaringan 5 ms per paket.
