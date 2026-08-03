# Reproducibility Guide: IMPKRIP Research Track

> **Paper Title**: *“Implementasi dan Evaluasi Kriptografi Post-Quantum pada Aplikasi Chat Ephemeral Browser-Native Menggunakan ML-KEM-768”*  
> **Track**: Implementasi Kriptografi (IMPKRIP)  
> **Artifacts Directory**: [`artifacts/impkrip_final/`](../../artifacts/impkrip_final/)  

---

## 1. Scope

This guide outlines the end-to-end procedure for reproducing the cryptographic evaluations, functional verifications, performance benchmarks, and memory utilization measurements reported in the IMPKRIP research paper.

The evaluation covers:
- **ML-KEM-768** (NIST FIPS 203 Post-Quantum Key Encapsulation Mechanism)
- **HKDF-SHA-256** (Session key derivation and domain separation)
- **HMAC-SHA-256** (Mutual key confirmation over handshake transcripts)
- **AES-GCM-256** (Authenticated application envelope encryption with Additional Authenticated Data / AAD)
- **Playwright-driven E2E Multi-Peer Chat Sessions** on WebRTC DataChannel

---

## 2. Claims Supported

| Claim ID | Paper Claim | Empirical Test / Evidence |
|---|---|---|
| **CLM-01** | Browser-native ML-KEM-768 keypair generation and decapsulation execute successfully without external WASM/native binaries. | Tests `PQ-01`, `PQ-02`, `PQ-03`, `PQ-04` (100% PASS) |
| **CLM-02** | HKDF-SHA-256 enforces cryptographic separation between encryption key (`K_enc`) and confirmation key (`K_conf`). | Tests `KD-01`, `KD-02`, `KD-03`, `KD-04` (100% PASS) |
| **CLM-03** | Mutual key confirmation rejects tampered handshakes before activating encrypted application state. | Tests `KC-01`, `KC-02` (100% PASS) |
| **CLM-04** | AES-GCM-256 enforces payload integrity and AAD direction/sequence binding. | Tests `AE-01`, `AE-02`, `AE-03`, `AE-04` (100% PASS) |
| **CLM-05** | The signaling relay enforces a strict 2-peer capacity limit (`ROOM_FULL` on 3rd peer). | Test `E2E-03` (Passed 3/3 runs) |
| **CLM-06** | Ephemeral room destruction cleans all local browser session storage keys. | Test `E2E-04` (Passed 3/3 runs) |
| **CLM-07** | Cryptographic primitives execute within sub-millisecond to low-millisecond latencies under browser micro-benchmarks. | 1,000 samples per primitive recorded in `impkrip_benchmark.json` |
| **CLM-08** | Post-quantum session establishment adds minimal JavaScript heap overhead (median baseline 5.0850 MiB, post-PQ delta 0.5212 MiB). | 5 independent runs recorded in `impkrip_memory_benchmark.json` |

---

## 3. Requirements

### Hardware:
- **Processor**: x86-64 or ARM64 multi-core processor (tested on AMD Ryzen 5 5600H)
- **RAM**: Minimum 8 GB (16 GB recommended)
- **Display**: Minimum $1280 \times 720$ resolution (or headless display buffer)

### Software & Runtimes:
- **Operating System**: Windows 11, Linux (Ubuntu 22.04+), or macOS 13+
- **Python**: v3.11.x or v3.12.x
- **Node.js**: v20.x or v22.x (npm v10+)
- **Chromium**: Managed via Playwright (`npx playwright install chromium`)

---

## 4. Tested Environment Baseline

The canonical baseline evidence in `artifacts/impkrip_final/` was recorded on the following physical workstation:

| Property | Value |
|---|---|
| **Host Device** | ASUS VivoBook 14X M1403QA (`VivoBook_ASUSLaptop M1403QA_M1403QA`) |
| **Processor** | AMD Ryzen 5 5600H with Radeon Graphics (6 Cores, 12 Threads) |
| **Memory** | 16 GB DDR4-3200 (Dual-Channel, 15.41 GB Usable) |
| **Storage** | 512 GB NVMe SSD (`INTEL SSDPEKNU512GZ`) |
| **Operating System** | Microsoft Windows 11 Home Single Language (Build 26200) |
| **Python** | 3.11.9 / 3.12.x |
| **Node.js** | v22.17.0 (LTS v20.18+ compatible) |
| **Browser Engine** | Chromium (Playwright headless) |
| **ML-KEM Package** | `mlkem` ^2.7.0 (NIST FIPS 203 parameters) |

---

## 5. Installation

```bash
# 1. Clone the repository
git clone https://github.com/Hihanghohengg/Kiwkiwchat.git
cd Kiwkiwchat

# 2. Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Install test runner dependencies & Playwright Chromium browser
npm install
npx playwright install chromium
```

---

## 6. Functional and Negative Cryptographic Tests

Executes unit tests for ML-KEM-768, HKDF key derivation, HMAC key confirmation, AES-GCM-256 authenticated encryption, and negative tampering checks:

```bash
# Run full functional suite (3 multi-run iterations)
python test_impkrip_final.py --runs 3 --output-dir artifacts/impkrip_final
```

### Test Suite Composition (19 Cases):
- **ML-KEM (`PQ-01`..`PQ-04`)**: Keypair size validation, encap/decap determinism, ciphertext format, bit-flip decapsulation failure.
- **Key Derivation (`KD-01`..`KD-04`)**: Session key derivation determinism, PSK dependency, PQC secret dependency, domain separation between encryption and confirmation keys.
- **Mutual Key Confirmation (`KC-01`..`KC-02`)**: Transcript HMAC validation and rejection of modified handshake transcript.
- **Authenticated Encryption (`AE-01`..`AE-04`)**: Plaintext roundtrip, ciphertext bit-flip rejection, wrong key rejection, AAD sequence/direction tampering rejection.
- **Replay Protection (`RP-01`)**: Sequence counter monotonicity validation at application envelope level (**PARTIAL**).

---

## 7. End-to-End (E2E) Multi-Peer Tests

Included automatically in `test_impkrip_final.py`:
- `E2E-01`: Full two-way chat lifecycle between Creator and Invitee (Room creation $\to$ QR/URL share $\to$ Signaling $\to$ PQ Upgrade $\to$ Encrypted Chat).
- `E2E-02`: Rapid multi-message exchange without packet loss or decryption failure.
- `E2E-03`: Strict capacity enforcement: Third peer connection attempt receives `ROOM_FULL` (WebSocket Close code 1008).
- `E2E-04`: Room destruction and complete erasure of `sessionStorage` cryptographic keys.

---

## 8. Performance Benchmark (Sub-Millisecond Batching)

Measures computational execution latency and throughput across 1,000 samples per primitive:

```bash
python test_crypto_performance_final.py --warmup 20 --iterations 200 --runs 5 --output-dir artifacts/impkrip_final
```

### Measured Primitives:
1. `mlkem_keygen`: ML-KEM-768 keypair generation
2. `mlkem_encap`: ML-KEM-768 encapsulation
3. `mlkem_decap`: ML-KEM-768 decapsulation
4. `hkdf_derive`: HKDF-SHA-256 key separation
5. `hmac_sign` & `hmac_verify`: HMAC-SHA-256 transcript confirmation
6. `aes_enc` & `aes_dec` (1 KB, 10 KB, 100 KB payloads)
7. `aes_throughput_mbps`: Symmetric AEAD throughput
8. `protocol_0ms` & `protocol_5ms`: Full PQ upgrade handshake simulation

---

## 9. Memory Benchmark (JavaScript V8 Heap Usage)

Measures JavaScript heap memory allocation via Chrome DevTools Protocol (`Runtime.getHeapUsage` with `--enable-precise-memory-info`):

```bash
python test_crypto_memory_final.py --warmup 20 --iterations 200 --runs 5 --output-dir artifacts/impkrip_final
```

### Memory Checkpoints:
- `baseline_used_heap`: Idle browser memory with application loaded
- `post_keygen_used_heap`: Memory following ML-KEM keypair generation
- `delta_baseline_to_keygen`: Net heap allocated by key generation
- `post_pq_upgrade_used_heap`: Memory following complete PQ handshake
- `delta_baseline_to_pq_upgrade`: Net heap allocated by full handshake
- `max_observed_used_heap`: Peak heap usage during 200 continuous iterations

---

## 10. Expected Output Structure

Execution produces structured files in `artifacts/impkrip_final/`:

```
artifacts/impkrip_final/
├── impkrip_environment.json        # Probed host specifications & test metadata
├── impkrip_test_report.json        # Full JSON test results (18 PASS, 1 PARTIAL)
├── impkrip_test_report.md          # Formatted Markdown test report
├── impkrip_test_report.html        # Interactive HTML test dashboard
├── impkrip_testing_summary.md      # Synthesis and discussion of functional findings
├── impkrip_failures.log            # Execution log of negative edge cases
├── impkrip_benchmark.json          # Latency & throughput statistics (1,000 samples)
├── impkrip_benchmark.csv           # Raw individual timing measurements
├── impkrip_memory_benchmark.json   # V8 heap memory measurement dataset
├── impkrip_memory_benchmark.csv    # Raw individual memory sample points
└── impkrip_memory_summary.md       # Statistical distribution and discussion of heap metrics
```

---

## 11. Interpretation Rules

1. **Functional Suite**: A successful reproduction must show 18 PASS, 1 PARTIAL (`RP-01`), 0 FAIL, and 3/3 E2E runs passed.
2. **Benchmark Comparison**: Latency and throughput figures represent hardware-dependent empirical samples. Variations within normal CPU performance bounds are expected on different hardware or OS setups.
3. **Memory Metrics**: Heap metrics evaluate JavaScript V8 heap allocations within Chromium. These figures do not represent entire operating system RAM footprint or non-V8 browser process memory.

---

## 12. Known Limitations

- **RP-01 (Replay Protection)**: Sequence counter validation is enforced on the application envelope layer. Injection of raw replayed packets directly into the underlying WebRTC SCTP transport is beyond browser unit testing harness capabilities.
- **Physical Zeroization**: JavaScript V8 garbage collector does not provide deterministic C-style `memset_s` physical zeroization of deallocated memory buffers.
- **Single-Core Single-Threaded JS**: Browser cryptographic execution runs on the browser main execution thread unless delegated to Web Workers.
