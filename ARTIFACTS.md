# Research Artifacts Index — Kiw Kiw Chat

This repository contains the complete research artifacts, source implementation, verification test harnesses, and generated empirical evidence for **Kiw Kiw Chat**, supporting two research tracks:

1. **Track IMPKRIP**: *“Implementasi dan Evaluasi Kriptografi Post-Quantum pada Aplikasi Chat Ephemeral Browser-Native Menggunakan ML-KEM-768”*
2. **Track SSDLC**: *“Implementasi Microsoft Security Development Lifecycle dengan Pemodelan Ancaman Trike pada Aplikasi Chat Ephemeral Kiw Kiw Chat”*

---

## 1. Architectural Boundaries & Artifact Taxonomy

The repository maintains strict separation between source code, test automation harnesses, and generated empirical evidence:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. SOURCE CODE (Implementation Layer)                                  │
│    - frontend/src/crypto/ (mlkem.js, encryption.js, pq_upgrade.js)     │
│    - frontend/src/components/, frontend/src/App.jsx                    │
│    - backend/main.py (In-memory signaling relay & lifecycle manager)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Executed & Measured by
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. TEST HARNESSES & AUTOMATION RUNNERS (Evaluation Layer)              │
│    - test_impkrip_final.py (Functional & E2E runner)                   │
│    - test_crypto_performance_final.py (Sub-millisecond benchmark)      │
│    - test_crypto_memory_final.py (CDP V8 JavaScript Heap benchmark)    │
│    - tests/security/test_backend_websocket_security.py (BT-01..08)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Produces & Verifies
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. GENERATED EMPIRICAL EVIDENCE (Artifact Layer)                       │
│    - artifacts/impkrip_final/ (Test reports, JSON, CSV, memory data)   │
│    - artifacts/ssdlc_final/ (Canonical data, SAST, SCA, DAST, Trike)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Artifact Mapping to Paper Claims

### A. IMPKRIP Track Artifacts

| Paper Claim / Metric | Supporting Artifact | Evidence Format | Primary Metric / Status |
|---|---|---|---|
| **Cryptographic Unit Correctness** (ML-KEM, HKDF, HMAC, AES-GCM) | [`artifacts/impkrip_final/impkrip_test_report.json`](./artifacts/impkrip_final/impkrip_test_report.json)<br>[`artifacts/impkrip_final/impkrip_test_report.html`](./artifacts/impkrip_final/impkrip_test_report.html) | JSON, HTML | 14/14 cryptographic unit tests **PASS** |
| **End-to-End System Flow & Capacity** | [`artifacts/impkrip_final/impkrip_test_report.json`](./artifacts/impkrip_final/impkrip_test_report.json) | JSON | `E2E-01`..`E2E-04` passed **3/3 runs (100%)** |
| **Replay Protection Scope** | [`artifacts/impkrip_final/impkrip_test_report.json`](./artifacts/impkrip_final/impkrip_test_report.json) | JSON | `RP-01` **PARTIAL** (sequence counter validated at application envelope) |
| **Sub-Millisecond Computation Latency** | [`artifacts/impkrip_final/impkrip_benchmark.json`](./artifacts/impkrip_final/impkrip_benchmark.json)<br>[`artifacts/impkrip_final/impkrip_benchmark.csv`](./artifacts/impkrip_final/impkrip_benchmark.csv) | JSON, CSV | 1,000 samples per primitive (5 runs $\times$ 200 iterations) |
| **JavaScript Heap Memory Usage** | [`artifacts/impkrip_final/impkrip_memory_benchmark.json`](./artifacts/impkrip_final/impkrip_memory_benchmark.json)<br>[`artifacts/impkrip_final/impkrip_memory_summary.md`](./artifacts/impkrip_final/impkrip_memory_summary.md) | JSON, CSV, Markdown | Median baseline: **5.0850 MiB**, post-KeyGen delta: **0.2371 MiB**, post-PQ delta: **0.5212 MiB** |
| **Tested Environment Specification** | [`artifacts/impkrip_final/impkrip_environment.json`](./artifacts/impkrip_final/impkrip_environment.json) | JSON | AMD Ryzen 5 5600H, 16 GB RAM, Windows 11, Chromium |

### B. SSDLC Track Artifacts

| Paper Claim / Lifecycle Gate | Supporting Artifact | Evidence Format | Primary Metric / Status |
|---|---|---|---|
| **Single Source of Truth (SSOT)** | [`artifacts/ssdlc_final/canonical_ssdlc_results.md`](./artifacts/ssdlc_final/canonical_ssdlc_results.md) | Markdown | Canonical dataset synthesized across all tools |
| **Security Requirements & Abuse Cases** | [`artifacts/ssdlc_final/use_abuse_security_requirements.md`](./artifacts/ssdlc_final/use_abuse_security_requirements.md) | Markdown, CSV | 10 Use Cases, 10 Abuse Cases, 18 Security Requirements |
| **Trike Threat Modeling & Mitigation** | [`artifacts/ssdlc_final/trike_threat_model.md`](./artifacts/ssdlc_final/trike_threat_model.md)<br>[`artifacts/ssdlc_final/trike_threat_register.csv`](./artifacts/ssdlc_final/trike_threat_register.csv) | Markdown, CSV | 14 Assets, 7 Actors, 16 Trike Threats (`T-01`..`T-16`) |
| **End-to-End Traceability** | [`artifacts/ssdlc_final/traceability_matrix.md`](./artifacts/ssdlc_final/traceability_matrix.md)<br>[`artifacts/ssdlc_final/traceability_matrix.csv`](./artifacts/ssdlc_final/traceability_matrix.csv) | Markdown, CSV | Threat $\to$ Requirement $\to$ Design Control $\to$ Test Case |
| **Dynamic Backend/WS Security Tests** | [`artifacts/ssdlc_final/backend_websocket_test_results.md`](./artifacts/ssdlc_final/backend_websocket_test_results.md)<br>[`artifacts/ssdlc_final/backend_websocket_test_results.json`](./artifacts/ssdlc_final/backend_websocket_test_results.json) | Markdown, JSON, Log | 8/8 dynamic tests **PASS** (`BT-01`..`BT-08`) |
| **SAST (Bandit)** | [`artifacts/ssdlc_final/bandit_report.json`](./artifacts/ssdlc_final/bandit_report.json)<br>[`artifacts/ssdlc_final/bandit_summary.md`](./artifacts/ssdlc_final/bandit_summary.md) | JSON, Markdown | **0 High**, 1 Medium (B104 binding), 3 Low (B110 pass) |
| **SCA (NPM Audit)** | [`artifacts/ssdlc_final/npm_audit_report.json`](./artifacts/ssdlc_final/npm_audit_report.json) | JSON | **0 Vulnerabilities** across 113 frontend packages |
| **SCA (Pip Audit)** | [`artifacts/ssdlc_final/pip_audit_report.json`](./artifacts/ssdlc_final/pip_audit_report.json)<br>[`artifacts/ssdlc_final/dependency_review.md`](./artifacts/ssdlc_final/dependency_review.md) | JSON, Markdown | 17 advisories cataloged & reachability analyzed |
| **DAST (OWASP ZAP)** | [`artifacts/ssdlc_final/zap_report_2026-08-02.html`](./artifacts/ssdlc_final/zap_report_2026-08-02.html)<br>[`artifacts/ssdlc_final/zap_summary.md`](./artifacts/ssdlc_final/zap_summary.md) | HTML, Markdown | Passive scan on Vercel frontend: 0 High, 1 Med, 1 Low, 3 Info |
| **Microsoft SDL Synthesis** | [`artifacts/ssdlc_final/ssdlc_final_verification_report.md`](./artifacts/ssdlc_final/ssdlc_final_verification_report.md) | Markdown | Master verification report covering SDL Phases 0..7 |

---

## 3. Verification & Reproduction Methods

Independent researchers can verify and reproduce results using the provided runners:

1. **IMPKRIP Functional Verification**: Follow [docs/reproducibility/IMPKRIP.md](./docs/reproducibility/IMPKRIP.md) using `python test_impkrip_final.py`.
2. **IMPKRIP Benchmarking**: Execute `python test_crypto_performance_final.py` and `python test_crypto_memory_final.py`.
3. **SSDLC Dynamic & Static Verification**: Follow [docs/reproducibility/SSDLC.md](./docs/reproducibility/SSDLC.md) using `tests/security/test_backend_websocket_security.py` and standard linters/scanners.

---

## 4. Hardware Dependency & Variance Notice

> [!NOTE]
> Performance metrics (latency in milliseconds, throughput in Mbps, and JavaScript heap allocations in MiB) depend on host processor microarchitecture, memory bus bandwidth, operating system scheduler, thermal conditions, and browser JavaScript engine optimizations. Re-running benchmarks on different physical machines or virtualization environments will produce natural metric variations.

---

## 5. Security & Privacy Guarantees

- **No Hardcoded Secrets**: All configuration uses environment templates ([.env.example](./.env.example)).
- **Sanitized Paths**: Documentation uses relative paths; no private local directory structures are exposed.
- **Forensic Preservation**: Raw scanner and benchmark outputs in `artifacts/` are stored in their native tool formats (`.json`, `.csv`, `.html`, `.log`).
