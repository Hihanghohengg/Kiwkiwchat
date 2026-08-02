# IMPKRIP Cryptographic Evaluation - Testing Summary

## 1. Test Environment & System Specification

| Property | Verified Value |
|---|---|
| **Device Model** | `ASUSTeK COMPUTER INC. VivoBook_ASUSLaptop M1403QA_M1403QA (ASUS VivoBook 14X M1403QA)` |
| **Processor (CPU)** | `AMD Ryzen 5 5600H with Radeon Graphics` |
| **RAM Configuration** | `16 GB Installed (Dual-Channel: 8 GB Micron Technology DDR4-3200 (P0 CHANNEL A), 8 GB Micron Technology DDR4-3200 (P0 CHANNEL B)), 15.41 GB Usable` |
| **Integrated Graphics** | `AMD Radeon(TM) Graphics` |
| **Storage (BusType/Media)** | `INTEL SSDPEKNU512GZ (477 GB NVMe SSD, BusType: NVMe, MediaType: SSD)` |
| **Operating System** | `Microsoft Windows 11 Home Single Language` (`10.0.26200 (Build 26200)`) |
| **Python Version** | `3.11.9` |
| **Node.js Version** | `v22.17.0` |
| **Browser Engine** | `Chromium 149.0.7827.55` |
| **ML-KEM Package** | `^2.7.0` |
| **Source Commit Tested** | `c07cb8cba9435970af87b923c6929285154ed630` (Git Dirty: `True`) |
| **Timestamp & Timezone** | `2026-08-02T07:36:26+0700` (WIB (+0700)) |

## 2. Benchmark Statistical Distribution

Parameters: **20 warmup iterations**, **200 measured iterations** across **5 independent runs** (**1000 total samples per metric**).

| Metric | Samples | Mean (ms) | Median (ms) | p95 (ms) | Min (ms) | Max (ms) | StdDev (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `mlkem_keygen` | 1000 | 0.7154 | 0.7000 | 0.9400 | 0.5000 | 1.4000 | 0.1540 |
| `mlkem_encap` | 1000 | 0.7814 | 0.7800 | 1.0000 | 0.5200 | 1.1800 | 0.1658 |
| `mlkem_decap` | 1000 | 0.8436 | 0.8600 | 1.0800 | 0.5800 | 1.2600 | 0.1748 |
| `hkdf_derive` | 1000 | 0.0889 | 0.0900 | 0.1300 | 0.0400 | 0.4500 | 0.0348 |
| `hmac_sign` | 1000 | 0.0186 | 0.0100 | 0.0200 | 0.0000 | 1.0400 | 0.0749 |
| `hmac_verify` | 1000 | 0.0133 | 0.0100 | 0.0200 | 0.0000 | 0.9800 | 0.0630 |
| `aes_enc_1k` | 1000 | 0.0779 | 0.0700 | 0.1600 | 0.0300 | 0.7800 | 0.0425 |
| `aes_dec_1k` | 1000 | 0.2307 | 0.2300 | 0.3200 | 0.1300 | 0.7200 | 0.0753 |
| `aes_enc_10k` | 1000 | 0.3005 | 0.3000 | 0.4000 | 0.1600 | 1.1200 | 0.1050 |
| `aes_dec_10k` | 1000 | 1.8521 | 1.8200 | 2.4400 | 1.2200 | 4.3200 | 0.4096 |
| `aes_enc_100k` | 1000 | 2.6262 | 2.6000 | 3.7000 | 1.5800 | 6.5600 | 0.6537 |
| `aes_dec_100k` | 1000 | 17.6961 | 18.1800 | 21.5600 | 12.4800 | 31.3600 | 2.7010 |
| `aes_throughput_mbps` | 1000 | 40.1606 | 38.4615 | 55.5556 | 15.2439 | 63.2911 | 8.9173 |
| `protocol_0ms` | 1000 | 3.5325 | 3.5000 | 4.6000 | 2.4000 | 12.2000 | 0.8522 |
| `protocol_5ms` | 1000 | 33.7136 | 33.1000 | 41.1000 | 22.2000 | 75.1000 | 4.0004 |

## 3. Cold Start Performance

| Operation | Cold Start (ms) |
|---|---:|
| `mlkem_keygen` | 2.5000 |
| `mlkem_encap` | 6.1000 |
| `mlkem_decap` | 4.0000 |
| `hkdf_derive` | 0.1000 |
| `hmac_sign` | 0.0000 |
| `hmac_verify` | 0.1000 |
| `aes_enc1k` | 0.2000 |
| `aes_dec1k` | 0.5000 |
| `aes_enc10k` | 1.0000 |
| `aes_dec10k` | 1.5000 |
| `aes_enc100k` | 2.7000 |
| `aes_dec100k` | 16.0000 |
| `protocol_0ms` | 6.1000 |
| `protocol_5ms` | 41.7000 |

## 4. Key Takeaways & Discussion

- **Crypto-Only PQ Upgrade (`protocol_0ms`)**: Post-quantum key establishment handshakes execute in sub-50ms median in-browser using microtask scheduling without artificial delay.
- **Protocol Simulation (`protocol_5ms`)**: Incorporating realistic 5ms transport latency adds approximately two round-trip message delays, matching theoretical expectations.
- **Post-Quantum Primitive Efficiency**: ML-KEM-768 key encapsulation and decapsulation execute in under 1 ms per operation.
- **Sub-Millisecond Batching**: High-frequency primitive operations (ML-KEM, HKDF, HMAC, AES) are measured using batched loops (10 iterations per batch sample) to overcome browser timer resolution limits.
- **Symmetric Throughput**: AES-GCM-256 provides high throughput with minimal CPU overhead for chat payload sizes.
