# Metodologi Benchmarking & Evaluasi Kriptografi IMPKRIP

Dokumen ini mendokumentasikan metodologi pengujian kinerja dan stabilitas komputasi kriptografi pada browser-native runtime.

---

## 1. Lingkungan Uji Terverifikasi

Pengujian dieksekusi langsung pada perangkat fisik aktual dengan spesifikasi terverifikasi melalui WMI / CIM hardware query:

| Komponen | Spesifikasi Terverifikasi |
|---|---|
| **Model Perangkat** | ASUSTeK COMPUTER INC. VivoBook_ASUSLaptop M1403QA (ASUS VivoBook 14X M1403QA) |
| **Processor (CPU)** | AMD Ryzen 5 5600H with Radeon Graphics (6 Cores, 12 Threads, Base 3.3 GHz, Boost 4.2 GHz) |
| **RAM** | 16 GB DDR4 (Dual-Channel: 2x 8 GB Micron DDR4-3200), 15.41 GB Usable |
| **Storage** | 512 GB M.2 NVMe SSD (Micron 2400 MTFDKBA512QFM, PCIe Gen4 x4) |
| **Operating System** | Microsoft Windows 11 Home Single Language 10.0.26200 (Build 26200, 64-bit) |
| **Runtime Engine** | Chromium 133.0.6943.16 (Playwright Engine) |
| **Package ML-KEM** | `mlkem` npm package v2.7.0 (Pure JS/TS, WebCrypto-compatible) |

---

## 2. Metodologi Pengukuran

### A. Sub-Millisecond Batching
Operasi kriptografi primitif yang berjalan sangat cepat (< 0.1 ms seperti HKDF, HMAC, dan AES-GCM) mengalami kendala pembulatan pada timer browser (`performance.now()`). Untuk menghasilkan data presisi:
- Digunakan teknik **batching 10 iterasi** per pengukuran sampel.
- Total waktu batch dibagi dengan ukuran batch untuk mendapatkan waktu eksekusi riil per operasi.
- Dilakukan **20 iterasi warm-up** sebelum perekaman data untuk menstabilkan optimasi JIT engine V8.

### B. Mutual Key Confirmation Key Binding
Pada pengujian HMAC, kunci yang digunakan adalah `confirmationKey` 256-bit hasil derivasi `HKDF-SHA-256`, merefleksikan alur produksi riil dan memvalidasi *key separation* antara kunci enkripsi pesan dan kunci konfirmasi pertukaran kunci.

### C. Simulasi Latensi Transport
- **Protokol 0 ms (Murni Komputasi)**: Menggunakan `queueMicrotask` untuk mensimulasikan transmisi antar-fungsi tanpa overhead artifisial `setTimeout` timer resolution.
- **Protokol 5 ms (Simulasi Jaringan)**: Menggunakan `setTimeout` 5 ms per paket untuk mensimulasikan latensi jaringan LAN/Wi-Fi berkecepatan tinggi.

---

## 3. Parameter Pengujian & Jumlah Sampel

- **Jumlah Run**: 5 run independen.
- **Iterasi per Run**: 200 iterasi.
- **Total Sampel per Primitif**: 1.000 sampel.
- **Metrik Statistik yang Dicatat**: Median, Mean, Standar Deviasi, Percentile 95 (P95), Nilai Minimum, Nilai Maksimum, dan Throughput (ops/sec).
