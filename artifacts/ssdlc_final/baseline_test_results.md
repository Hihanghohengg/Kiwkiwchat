# Laporan Hasil Pengujian Garis Dasar (Baseline Test Results) — Kiw Kiw Chat

Dokumen ini mendokumentasikan hasil pengujian baseline empiris untuk 19 kasus uji otomatis kriptografi dan alur E2E pada `test_impkrip_final.py`, serta hasil pengukuran JavaScript Heap Memory pada `test_crypto_memory_final.py`.

---

## 1. Ringkasan Eksekusi 19 Kasus Uji Otomatis

- **Runner Script**: `test_impkrip_final.py` (Playwright headless Chromium)
- **Konfigurasi Eksekusi**: Multi-run 3 putaran independen (`--runs 3`)
- **Total Kasus Uji**: 19 Test Cases
- **Status Kelulusan**: **18 PASS**, **1 PARTIAL** (`RP-01`), **0 FAIL**

### Rincian Status Per-Kategori:

| Kategori | Test IDs | Hasil Pengujian | Status |
|---|---|---|:---:|
| **Post-Quantum Key Encapsulation (ML-KEM-768)** | `PQ-01`, `PQ-02`, `PQ-03`, `PQ-04` | Panjang PK/SK/CT tervalidasi; dekapsulasi deterministik; bit-flipping ditolak. | **PASS** |
| **Key Derivation Function (HKDF-SHA-256)** | `KD-01`, `KD-02`, `KD-03`, `KD-04` | Pemisahan domain `K_enc` dan `K_conf`; efek avalans terverifikasi pada manipulasi 1-bit. | **PASS** |
| **Mutual Key Confirmation (HMAC-SHA-256)** | `KC-01`, `KC-02` | Verifikasi tag HMAC transcript dua arah berhasil; manipulasi transcript memicu penolakan. | **PASS** |
| **Authenticated Encryption (AES-GCM-256)** | `AE-01`, `AE-02`, `AE-03`, `AE-04` | Enkripsi/dekripsi normal lolos; tampering pada ciphertext, wrong key/IV, dan AAD ditolak tag GCM. | **PASS** |
| **Replay Protection Validation** | `RP-01` | Validasi sequence counter di application envelope; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual. | **PARTIAL** |
| **End-to-End Multi-Run Integration** | `E2E-01`, `E2E-02`, `E2E-03`, `E2E-04` | Alur penuh chat, 10 pesan beruntun, penolakan peer ke-3, dan room teardown lolos pada 3/3 putaran. | **PASS** |

---

## 2. Pengukuran Penggunaan Memori JavaScript Heap (V8)

Pengukuran dilakukan melalui Chromium DevTools Protocol (`Runtime.getHeapUsage`) dengan alur 5 putaran independen (20 warm-up, 200 iterasi terukur per run).

### Nilai Statistik Kanonikal (Sumber: `impkrip_memory_benchmark.json`):

| Metrik Checkpoint Heap | Median (MiB) | Mean (MiB) | Min (MiB) | Max (MiB) | Median (Bytes) |
|---|---:|---:|---:|---:|---:|
| `baseline_used_heap` | **5.0850** | 5.0850 | 5.0850 | 5.0852 | 5,332,008 |
| `post_keygen_used_heap` | **5.3223** | 5.4477 | 5.2651 | 5.9480 | 5,580,856 |
| `delta_baseline_to_keygen` | **0.2371** | 0.3627 | 0.1801 | 0.8630 | 248,664 |
| `post_pq_upgrade_used_heap` | **5.6062** | 5.5988 | 5.3995 | 5.7615 | 5,878,532 |
| `delta_baseline_to_pq_upgrade` | **0.5212** | 0.5137 | 0.3145 | 0.6765 | 546,520 |
| `max_observed_used_heap` | **18.0747** | 16.6438 | 5.5884 | 31.2000 | 18,952,656 |
| `retained_used_heap` | **6.0082** | 13.1924 | 5.3983 | 31.2000 | 6,300,024 |
| `delta_baseline_to_retained` | **0.9230** | 8.1074 | 0.3133 | 26.1151 | 967,832 |

> [!NOTE]
> **Catatan Limitasi Pengukuran Memori**:  
> Benchmark di atas mencatat titik-titik sampel (*checkpoints*) alokasi memori V8 selama siklus uji terkontrol. Pengujian ini **bukan evaluasi kebocoran memori jangka panjang (*long-term memory leak testing*)** dan dapat dipengaruhi oleh siklus non-deterministik Garbage Collector mesin V8.
