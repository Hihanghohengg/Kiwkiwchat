# Laporan Hasil Pengujian Regresi Final (Final Regression Results) — Kiw Kiw Chat

Dokumen ini merangkum seluruh hasil evaluasi regresi akhir yang dijalankan pada **Kiw Kiw Chat** (Prototipe Riset).

---

## 1. Ikhtisar Hasil Pengujian Multi-Dimensi

| Dimensi Pengujian | Target Evaluasi | Kasus Uji / Ruang Lingkup | Hasil Aktual | Status Akhir |
|---|---|---|---|:---:|
| **Cryptographic Unit Tests** | PQC ML-KEM-768, HKDF-SHA-256, HMAC-SHA-256, AES-GCM-256 | `PQ-01`..`PQ-04`, `KD-01`..`KD-04`, `KC-01`..`KC-02`, `AE-01`..`AE-04` | 14 Kasus Uji Lolos Sempurna | ✅ **PASS** |
| **Negative Security Tests** | Bit-flipping, Tampered AAD, Wrong Key, MitM Handshake | `AE-02`, `AE-03`, `AE-04`, `KC-02` | Seluruh injeksi anomali ditolak oleh tag GCM & HMAC | ✅ **PASS** |
| **Replay Protection** | Validasi Sequence Counter pada Application Envelope | `RP-01` | Validasi sequence counter aktif di layer envelope; raw packet reinjection out-of-scope | ⚠️ **PARTIAL** |
| **End-to-End Multi-Run** | Skenario Chat P2P 2-Arah, Penolakan Peer ke-3, Room Destroy | `E2E-01`, `E2E-02`, `E2E-03`, `E2E-04` (3 Run Independen) | Lolos 3 dari 3 putaran pengujian beruntun (100% reliability) | ✅ **PASS** |
| **Static Security (SAST)** | Analisis Kode Sumber Backend Python | `backend/` (269 LOC) via Bandit v1.9.4 | 0 High Severity, 1 Medium (B104 accepted deployment finding), 3 Low (B110 accepted technical debt) | ✅ **PASS (0 High)** |
| **Software Composition (SCA)** | Dependensi Frontend NPM & Backend PyPI | 113 paket NPM, 5 direct requirements Pip | NPM: 0 Vulnerabilities; Pip: 17 advisories pada backend (dikategorikan & open for upgrade) | ⚠️ **OPEN / PARTIAL** |
| **Dynamic Headers & DAST** | Respon HTTP & Pemindaian Pasif OWASP ZAP 2.17.0 | Frontend Produksi Vercel | 0 High, 1 Med (`style-src 'unsafe-inline'`), 1 Low, 3 Info | ⚠️ **EXECUTED WITH OPEN FINDINGS** |
| **Memory Consumption** | Alokasi JavaScript Heap selama Operasi Chat | Benchmark 200 iterasi terukur di Chromium (5 Run) | Median baseline: 5.0850 MiB; Median delta keygen: 0.2371 MiB; Median delta PQ upgrade: 0.5212 MiB | 📊 **RECORDED (CHECKPOINT METRICS)** |

---

## 2. Rangkuman Metrik Memori Kanonikal

Berdasarkan berkas canonical [`impkrip_memory_benchmark.json`](../impkrip_final/impkrip_memory_benchmark.json):
- **Median Baseline Heap**: 5.0850 MiB (5,332,008 Bytes)
- **Median Post-KeyGen Heap**: 5.3223 MiB (5,580,856 Bytes)
- **Median Delta KeyGen**: +0.2371 MiB (+248,664 Bytes)
- **Median Post-PQ Upgrade Heap**: 5.6062 MiB (5,878,532 Bytes)
- **Median Delta PQ Upgrade**: +0.5212 MiB (+546,520 Bytes)
- **Median Max Observed Heap**: 18.0747 MiB (18,952,656 Bytes)
- **Median Retained Heap**: 6.0082 MiB (6,300,024 Bytes)

> [!NOTE]
> Metrik ini mencerminkan alokasi memori pada checkpoint uji tertentu dalam pengujian browser terkontrol, dan bukan merupakan pengujian kebocoran memori jangka panjang.
