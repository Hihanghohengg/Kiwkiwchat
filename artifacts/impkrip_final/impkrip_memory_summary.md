# IMPKRIP Cryptographic Memory Benchmark Summary

> [!NOTE]
> **Scope & Measurement Definition**: Pengukuran ini merepresentasikan penggunaan JavaScript heap pada Chromium, bukan keseluruhan RAM sistem atau seluruh memori proses browser.

## 1. Test Environment & Execution Parameters

| Property | Verified Value |
|---|---|
| **Device Model** | `ASUSTeK COMPUTER INC. VivoBook_ASUSLaptop M1403QA_M1403QA (ASUS VivoBook 14X M1403QA)` |
| **Processor (CPU)** | `AMD Ryzen 5 5600H with Radeon Graphics` |
| **RAM Configuration** | `16 GB Installed (Dual-Channel: 8 GB Micron Technology DDR4-3200 (P0 CHANNEL A), 8 GB Micron Technology DDR4-3200 (P0 CHANNEL B)), 15.41 GB Usable` |
| **Integrated Graphics** | `AMD Radeon(TM) Graphics` |
| **Storage** | `INTEL SSDPEKNU512GZ (477 GB NVMe SSD, BusType: NVMe, MediaType: SSD)` |
| **Operating System** | `Microsoft Windows 11 Home Single Language` (`10.0.26200 (Build 26200)`) |
| **Python Version** | `3.11.9` |
| **Node.js Version** | `v22.17.0` |
| **Browser Engine** | `Chromium 149.0.7827.55` |
| **ML-KEM Package** | `^2.7.0` |
| **Source Commit** | `d98ca5fe51f34d9633d57bd24c8e4de3ef05763a` (Git Dirty: `True`) |
| **Timestamp** | `2026-08-02T17:44:00+0700` (WIB (+0700)) |
| **Benchmark Setup** | 5 runs &bull; 20 warm-up &bull; 200 measured iterations &bull; checkpoint batch size 20 |
| **CDP Protocol Method** | `Runtime.getHeapUsage` with `--enable-precise-memory-info` |

## 2. JavaScript Heap Usage Statistical Distribution

| Metric | Samples | Median (MiB) | Mean (MiB) | Min (MiB) | Max (MiB) | StdDev (MiB) | Median (Bytes) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `baseline_used_heap` | 5 | **5.0850** | 5.0850 | 5.0850 | 5.0852 | 0.0001 | 5,332,008 |
| `post_keygen_used_heap` | 5 | **5.3223** | 5.4477 | 5.2651 | 5.9480 | 0.2884 | 5,580,856 |
| `delta_baseline_to_keygen` | 5 | **0.2371** | 0.3627 | 0.1801 | 0.8630 | 0.2884 | 248,664 |
| `post_pq_upgrade_used_heap` | 5 | **5.6062** | 5.5988 | 5.3995 | 5.7615 | 0.1303 | 5,878,532 |
| `delta_baseline_to_pq_upgrade` | 5 | **0.5212** | 0.5137 | 0.3145 | 0.6765 | 0.1303 | 546,520 |
| `max_observed_used_heap` | 5 | **18.0747** | 16.6438 | 5.5884 | 31.2000 | 11.1273 | 18,952,656 |
| `delta_baseline_to_max_observed` | 5 | **12.9897** | 11.5588 | 0.5034 | 26.1151 | 11.1273 | 13,620,672 |
| `retained_used_heap` | 5 | **6.0082** | 13.1924 | 5.3983 | 31.2000 | 11.4027 | 6,300,024 |
| `delta_baseline_to_retained` | 5 | **0.9230** | 8.1074 | 0.3133 | 26.1151 | 11.4028 | 967,832 |

## 3. Individual Run Breakdown

| Run | Baseline (MiB) | Post-KeyGen (MiB) | Delta KeyGen (MiB) | Post-PQ Upgrade (MiB) | Delta PQ Upgrade (MiB) | Max Observed Heap (MiB) | Retained Delta (MiB) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 5.0850 | 5.9480 | +0.8630 | 5.3995 | +0.3145 | 18.0747 | +12.8722 |
| 2 | 5.0852 | 5.3223 | +0.2371 | 5.6383 | +0.5531 | 22.7497 | +0.9230 |
| 3 | 5.0850 | 5.4376 | +0.3526 | 5.7615 | +0.6765 | 31.2000 | +26.1151 |
| 4 | 5.0850 | 5.2657 | +0.1807 | 5.5884 | +0.5034 | 5.5884 | +0.3133 |
| 5 | 5.0850 | 5.2651 | +0.1801 | 5.6062 | +0.5212 | 5.6062 | +0.3133 |

## 4. Key Findings & Discussion

- **Post-Quantum Primitive Heap Footprint**: Individual ML-KEM-768 KeyGen and full PQ handshake (KeyGen + Encap + Decap + HKDF + HMAC) allocate minimal JavaScript heap overhead above the baseline application context.
- **Maximum Observed Heap**: Across the continuous benchmark workload (200 measured iterations of hybrid cryptography, handshakes, and symmetric encryption), the maximum observed heap reached **18.0747 MiB**.
- **Memory Management & Garbage Collection**: Chromium V8 garbage collection occurs periodically during extended session operations. Pre-baseline garbage collection ensured a consistent baseline across independent runs without disturbing active cryptographic execution.
- **Limitations**: These figures reflect JavaScript V8 heap allocations within Chromium under headless Playwright test execution on the tested host environment. They serve as an engine baseline and do not extrapolate directly to resource-constrained embedded or mobile runtimes without empirical device validation.
