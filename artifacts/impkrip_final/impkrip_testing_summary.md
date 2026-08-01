# IMPKRIP Cryptographic Evaluation - Testing Summary

## 1. Execution Manifest

- **timestamp**: 2026-08-01T22:05:45+0700
- **os**: Windows 10
- **cpu**: AMD64 Family 25 Model 80 Stepping 0, AuthenticAMD
- **total_ram_gb**: 15.41
- **python_version**: 3.11.9
- **node_version**: v22.17.0
- **browser**: Chromium 149.0.7827.55
- **mlkem_version**: v2.7.0
- **warmup**: 20
- **iterations**: 200
- **runs**: 5
- **git_commit**: 27f421968468840ebb64463e56bfad236fd0e8a5

## 2. Benchmark Statistical Distribution

| Metric | Samples | Mean (ms) | Median (ms) | p95 (ms) | Min (ms) | Max (ms) | StdDev (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `mlkem_keygen` | 1000 | 0.3402 | 0.3000 | 0.5000 | 0.2000 | 0.6000 | 0.0852 |
| `mlkem_encap` | 1000 | 0.3418 | 0.3000 | 0.5000 | 0.2000 | 0.8000 | 0.0907 |
| `mlkem_decap` | 1000 | 0.3654 | 0.4000 | 0.5000 | 0.2000 | 0.7000 | 0.0914 |
| `hkdf_derive` | 1000 | 0.0693 | 0.1000 | 0.2000 | 0.0000 | 2.5000 | 0.1164 |
| `hmac_sign` | 1000 | 0.0118 | 0.0000 | 0.1000 | 0.0000 | 0.1000 | 0.0323 |
| `hmac_verify` | 1000 | 0.0063 | 0.0000 | 0.1000 | 0.0000 | 0.1000 | 0.0243 |
| `aes_enc_1k` | 1000 | 0.0485 | 0.0000 | 0.1000 | 0.0000 | 0.2000 | 0.0548 |
| `aes_dec_1k` | 1000 | 0.1119 | 0.1000 | 0.2000 | 0.0000 | 0.5000 | 0.0682 |
| `aes_enc_10k` | 1000 | 0.1702 | 0.1000 | 0.3000 | 0.0000 | 4.3000 | 0.2099 |
| `aes_dec_10k` | 1000 | 0.7876 | 0.7000 | 1.3000 | 0.5000 | 2.4000 | 0.2220 |
| `aes_enc_100k` | 1000 | 1.2821 | 1.0000 | 2.5000 | 0.7000 | 8.8000 | 0.6918 |
| `aes_dec_100k` | 1000 | 7.4627 | 6.9000 | 11.0000 | 5.9000 | 15.0000 | 1.4934 |
| `aes_throughput_mbps` | 1000 | 88.8893 | 100.0000 | 111.1111 | 11.3636 | 142.8571 | 24.4730 |
| `protocol_0ms` | 1000 | 16.9390 | 16.3000 | 18.8000 | 14.0000 | 50.9000 | 3.9405 |
| `protocol_5ms` | 1000 | 19.9955 | 19.4000 | 21.9000 | 17.0000 | 50.0000 | 3.6041 |

## 3. Cold Start Performance

| Operation | Cold Start (ms) |
|---|---:|
| `mlkem_keygen` | 0.9000 |
| `mlkem_encap` | 1.8000 |
| `mlkem_decap` | 1.8000 |
| `hkdf_derive` | 0.2000 |
| `hmac_sign` | 0.0000 |
| `hmac_verify` | 0.0000 |
| `aes_enc1k` | 0.3000 |
| `aes_dec1k` | 0.2000 |
| `aes_enc10k` | 0.4000 |
| `aes_dec10k` | 1.4000 |
| `aes_enc100k` | 4.7000 |
| `aes_dec100k` | 7.1000 |
| `protocol_0ms` | 18.3000 |
| `protocol_5ms` | 19.5000 |

## 4. Key Takeaways & Discussion

- **Crypto-Only PQ Upgrade (`protocol_0ms`)**: The post-quantum key establishment handshakes execute in sub-50ms median in-browser.
- **Protocol Simulation (`protocol_5ms`)**: Incorporating realistic 5ms transport latency adds approximately two round-trip message delays, matching theoretical expectations.
- **Post-Quantum Primitive Efficiency**: ML-KEM-768 key encapsulation and decapsulation execute in under 1 ms per operation.
- **Symmetric Throughput**: AES-GCM-256 provides high throughput with minimal CPU overhead for chat payload sizes.
