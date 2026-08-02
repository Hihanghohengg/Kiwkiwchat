# Ringkasan Evaluasi 6 Parameter IMPKRIP

Dokumen ini memetakan implementasi sistem Kiw Kiw Chat terhadap **Enam Parameter Evaluasi Kriptografi Terapan** menggunakan data hasil pengujian final.

---

## 1. Tabel Evaluasi 6 Parameter

| Parameter Evaluasi | Implementasi & Kontrol Teknis | Hasil Uji / Bukti Utama | Status |
|---|---|---|---|
| **1. Tujuan Keamanan (Security Goals)** | Mengombinasikan ML-KEM-768 (PQC), AES-GCM-256 (AEAD), HKDF-SHA-256 (Key Separation), dan HMAC-SHA-256 (Mutual Key Confirmation) melalui skema *PSK-assisted ML-KEM session-key establishment*. | Lulus seluruh uji unit kriptografi (PQ-01..04, KD-01..04, KC-01..02, AE-01..04). | **TERPENUHI** |
| **2. Model Ancaman (Threat Model)** | Menangkal penyadapan pasif, manipulasi payload (MitM), kunci tidak valid, replay attack, dan percobaan join dari pihak ketiga (*third-peer lockout*). | Lulus uji penolakan tampering dan unauthorized join (KC-02, AE-02, AE-03, AE-04, E2E-03). Evaluasi replay envelope tercatat pada RP-01 (PARTIAL). | **TERPENUHI** |
| **3. Kapasitas Perangkat (Device Capacity)** | Berjalan murni *browser-native* tanpa dependensi biner/WASM eksternal. | Diuji pada lingkungan komputasi fisik: AMD Ryzen 5 5600H, RAM 16 GB, Chromium (Playwright engine). | **TERPENUHI** |
| **4. Performa Komputasi (Computational Performance)** | Evaluasi waktu komputasi per primitif dan overhead protokol melalui 1.000 sampel per primitif (5 run x 200 iterasi) dengan sub-millisecond batching. | Data lengkap tercatat pada `impkrip_benchmark.json` dan `impkrip_benchmark.csv`. | **TERPENUHI** |
| **5. Pengalaman Pengguna (User Experience)** | Desain zero-friction: Satu klik buat room, link sharing instan via QR code/URL fragment, sinkronisasi countdown timer, dan terminal visualisasi status kripto. | Lulus uji E2E dua arah (E2E-01, E2E-02) secara konsisten pada seluruh independent runs. | **TERPENUHI** |
| **6. Risiko Salah Pakai (Misuse Risk)** | Enkripsi otomatis tanpa opsi algoritma lemah, kunci out-of-band via URL fragment (#), timer TTL 15 menit, dan pembersihan state/sessionStorage saat room dihancurkan. | Lulus uji pembersihan state (E2E-04). Risiko kebocoran tautan dimitigasi dengan pembatasan kapasitas 2 partisipan dan masa hidup room 15 menit. | **TERPENUHI** |

---

## 2. Ringkasan Status Pengujian Fungsional

- **Canonical Test Suite**:
  - Unit ML-KEM: `PQ-01`, `PQ-02`, `PQ-03`, `PQ-04`
  - Unit Key Derivation: `KD-01`, `KD-02`, `KD-03`, `KD-04`
  - Unit Key Confirmation: `KC-01`, `KC-02`
  - Unit Authenticated Encryption: `AE-01`, `AE-02`, `AE-03`, `AE-04`
  - End-to-End System: `E2E-01`, `E2E-02`, `E2E-03`, `E2E-04`
  - Replay Protection Evaluation: `RP-01`
- **Total Kasus Uji**: 19 Kasus Uji
- **PASS**: 18 Kasus Uji
- **PARTIAL**: 1 Kasus Uji (`RP-01` dicatat secara objektif sebagai PARTIAL karena evaluasi envelope aplikasi)
- **FAIL**: 0 Kasus Uji
- **E2E Multi-Run Stability**: 3/3 Independent E2E Runs SUCCESS (100%)
