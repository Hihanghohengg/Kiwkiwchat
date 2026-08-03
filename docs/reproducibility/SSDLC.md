# Reproducibility Guide: SSDLC Research Track

> **Paper Title**: *“Implementasi Microsoft Security Development Lifecycle dengan Pemodelan Ancaman Trike pada Aplikasi Chat Ephemeral Kiw Kiw Chat”*  
> **Track**: Secure Software Development Lifecycle (SSDLC) & Trike Threat Modeling  
> **Artifacts Directory**: [`artifacts/ssdlc_final/`](../../artifacts/ssdlc_final/)  

---

## 1. Scope

This guide provides instructions for validating and reproducing the security engineering, threat modeling, dynamic verification, and automated vulnerability scanning activities structured under the **Microsoft Security Development Lifecycle (SDL)** and **Trike Threat Modeling** framework for Kiw Kiw Chat.

The SSDLC track encompasses:
- **Microsoft SDL (Fases 0 s/d 7)**: Training, Requirements, Design, Implementation, Verification, Release, and Response
- **Trike Threat Modeling**: 14 Assets, 7 Actors, CRUD Permission Matrix, 16 Threats (`T-01`..`T-16`)
- **Dynamic Security Verification**: 8 Backend, WebSocket, and CORS test cases (`BT-01`..`BT-08`)
- **Static Application Security Testing (SAST)**: Bandit scan on backend Python codebase
- **Software Composition Analysis (SCA)**: Frontend NPM audit and backend Pip-audit reachability analysis
- **Dynamic Application Security Testing (DAST)**: OWASP ZAP passive baseline scan on production frontend

---

## 2. Microsoft SDL & Trike Artifact Mapping

| SDL Phase | Core Engineering Deliverable | Primary Artifact |
|---|---|---|
| **Phase 0: Training** | Core Security Training & PQC/SDL Standards | [`artifacts/ssdlc_final/microsoft_sdl_mapping.md`](../../artifacts/ssdlc_final/microsoft_sdl_mapping.md) |
| **Phase 1: Requirements** | 10 Use Cases, 10 Abuse Cases, 18 Security Requirements | [`artifacts/ssdlc_final/use_abuse_security_requirements.md`](../../artifacts/ssdlc_final/use_abuse_security_requirements.md)<br>[`artifacts/ssdlc_final/use_abuse_security_requirements.csv`](../../artifacts/ssdlc_final/use_abuse_security_requirements.csv) |
| **Phase 2: Design** | Trust Boundaries, Context Diagrams, Trike Modeling | [`artifacts/ssdlc_final/system_context_and_scope.md`](../../artifacts/ssdlc_final/system_context_and_scope.md)<br>[`artifacts/ssdlc_final/trike_assets_actors_operations.md`](../../artifacts/ssdlc_final/trike_assets_actors_operations.md)<br>[`artifacts/ssdlc_final/trike_threat_model.md`](../../artifacts/ssdlc_final/trike_threat_model.md)<br>[`artifacts/ssdlc_final/trike_threat_register.csv`](../../artifacts/ssdlc_final/trike_threat_register.csv) |
| **Phase 3: Implementation** | Secure Coding, 10 Hardening Interventions, Dependency Controls | [`artifacts/ssdlc_final/security_hardening_change_log.md`](../../artifacts/ssdlc_final/security_hardening_change_log.md)<br>[`artifacts/ssdlc_final/repository_inventory.md`](../../artifacts/ssdlc_final/repository_inventory.md) |
| **Phase 4: Verification** | Dynamic Backend Tests (`BT-01`..`08`), Bandit SAST, NPM Audit, Pip-Audit, ZAP DAST | [`artifacts/ssdlc_final/backend_websocket_test_results.md`](../../artifacts/ssdlc_final/backend_websocket_test_results.md)<br>[`artifacts/ssdlc_final/bandit_summary.md`](../../artifacts/ssdlc_final/bandit_summary.md)<br>[`artifacts/ssdlc_final/zap_summary.md`](../../artifacts/ssdlc_final/zap_summary.md) |
| **Phase 5: Release** | Final Security Review (FSR), Security Headers & CSP | [`artifacts/ssdlc_final/release_security_checklist.md`](../../artifacts/ssdlc_final/release_security_checklist.md)<br>[`artifacts/ssdlc_final/zap_dast_verification.md`](../../artifacts/ssdlc_final/zap_dast_verification.md) |
| **Phase 6: Response** | Vulnerability Response & Incident Response SOP | [`artifacts/ssdlc_final/vulnerability_response_plan.md`](../../artifacts/ssdlc_final/vulnerability_response_plan.md) |
| **Phase 7: Synthesis** | Master SDL Verification Report & SSOT Dataset | [`artifacts/ssdlc_final/ssdlc_final_verification_report.md`](../../artifacts/ssdlc_final/ssdlc_final_verification_report.md)<br>[`artifacts/ssdlc_final/canonical_ssdlc_results.md`](../../artifacts/ssdlc_final/canonical_ssdlc_results.md) |

---

## 3. Dynamic Backend, WebSocket & CORS Security Tests (`BT-01`..`BT-08`)

Executes automated standalone dynamic security tests against the FastAPI signaling backend:

```bash
python tests/security/test_backend_websocket_security.py
```

### Verified Test Cases:
| Test ID | Category | Objective | Status |
|---|---|---|:---:|
| `BT-01` | WS Capacity | Enforces strict 2-peer maximum limit (3rd peer receives `room_full` & Close 1008) | **PASS** |
| `BT-02` | REST Rate Limit | Enforces SlowAPI rate limiter on `POST /rooms` (10 req/IP/min; 11th rejected HTTP 429) | **PASS** |
| `BT-03` | WS Frame Guard | Enforces 64 KB `MAX_MSG_BYTES` frame payload cap (Oversized payload rejected Close 1009) | **PASS** |
| `BT-04` | WS Input Fuzzing | Server resilience against malformed/non-JSON payloads without process crash | **PASS** |
| `BT-05` | WS Room Lifecycle | Immediate teardown on room destroy; sends `room_ended` broadcast & blocks reconnects | **PASS** |
| `BT-06` | WS Idle Timeout | Inactive WebSocket connections terminate automatically (Close 1001) | **PASS** |
| `BT-07` | REST CORS (Trusted) | Validates preflight `OPTIONS` from trusted origin (`https://kiwkiwchat.vercel.app`) | **PASS** |
| `BT-08` | REST CORS (Untrusted) | Blocks preflight `OPTIONS` from untrusted origin (`https://untrusted.example` $\to$ HTTP 400) | **PASS** |

---

## 4. Static Application Security Testing (SAST — Bandit)

Runs Bandit static analysis over the Python backend signaling implementation:

```bash
bandit -c backend/.bandit -r backend/ -f json -o artifacts/ssdlc_final/bandit_report.json
```

### Baseline Findings Triage:
- **High Severity**: **0**
- **Medium Severity**: **1** (`B104: hardcoded_bind_all_interfaces` on `0.0.0.0` — Accepted standard finding for containerized Docker deployments)
- **Low Severity**: **3** (`B110: try_except_pass` on WebSocket disconnect teardown loops — Accepted non-exploitable error suppression)
- **Classification**: **PASS_WITH_FINDINGS (0 High Severity)**

---

## 5. Frontend Software Composition Analysis (NPM Audit)

Scans frontend dependency tree for known CVEs:

```bash
cd frontend
npm audit --json > ../artifacts/ssdlc_final/npm_audit_report.json
cd ..
```

### Baseline Finding:
- **0 Vulnerabilities** across 113 scanned packages (**PASS**).

---

## 6. Backend Software Composition Analysis (Pip-Audit)

Scans backend Python packages for known advisories:

```bash
pip-audit -r backend/requirements.txt -f json -o artifacts/ssdlc_final/pip_audit_report.json
```

### Reachability Triage (17 Cataloged Advisories):
- **8 Advisories in `python-multipart`**: Pertain to multipart form parsing; unreachable in current application flow (`POST /rooms` accepts only JSON bodies).
- **5 Advisories in `starlette` / `fastapi`**: Pertain to HTTP URL/host header edge cases; mitigated by CORS middleware and reverse proxy boundaries.
- **4 Transitive Advisories**: Open for upstream package upgrades.
- **Classification**: **OPEN / PARTIAL** (Documented in [`dependency_review.md`](../../artifacts/ssdlc_final/dependency_review.md)).

---

## 7. Dynamic Application Security Testing (OWASP ZAP Scope)

> [!IMPORTANT]
> **DAST Scan Scope & Characterization**:
> The OWASP ZAP scan artifact (`zap_report_2026-08-02.html`) represents an **automated passive baseline scan** performed against the production frontend deployed on Vercel (`https://kiwkiwchat.vercel.app/`).
> - It does **NOT** represent full active penetration testing, backend API fuzzing, or WebSocket stateful DAST.
> - Backend and WebSocket protocols were evaluated through the dedicated dynamic test suite `BT-01`..`BT-08`.

### ZAP Scan Result Summary:
- **0 High Severity Alerts**
- **1 Medium Alert**: `Content Security Policy (CSP) Header Not Set / style-src unsafe-inline` (Required for inline dynamic UI styles)
- **1 Low Alert**: `CSP: Notices`
- **3 Informational Alerts**: `Modern Web Application`, `Re-examine Cache-control Directives`, `Retrieved from Cache`
- **Classification**: **EXECUTED_WITH_OPEN_FINDINGS**

---

## 8. End-to-End Traceability Matrix

Full bidirectional traceability is recorded in [`artifacts/ssdlc_final/traceability_matrix.md`](../../artifacts/ssdlc_final/traceability_matrix.md):

$$\text{Use Case} \longrightarrow \text{Abuse Case} \longrightarrow \text{Security Requirement} \longrightarrow \text{Trike Threat} \longrightarrow \text{Design Control} \longrightarrow \text{Test Case} \longrightarrow \text{Evidence}$$

---

## 9. Expected Output Artifacts

Execution produces structured evidence in `artifacts/ssdlc_final/`:

```
artifacts/ssdlc_final/
├── canonical_ssdlc_results.md           # SSOT evaluation report
├── backend_websocket_test_results.json  # Raw dynamic test output (BT-01..08)
├── backend_websocket_test_results.md    # Formatted dynamic test report
├── backend_websocket_test_raw.log       # Raw console execution log
├── bandit_report.json                   # Raw Bandit SAST JSON report
├── bandit_summary.md                    # SAST findings analysis
├── npm_audit_report.json                # Frontend SCA JSON report
├── pip_audit_report.json                # Backend SCA JSON report
├── dependency_review.md                 # Reachability analysis of backend advisories
├── zap_report_2026-08-02.html           # Raw OWASP ZAP HTML report
├── zap_summary.md                       # DAST findings summary & triage
├── zap_dast_verification.md             # HTTP header & CSP verification
├── use_abuse_security_requirements.md   # Requirements and abuse cases
├── trike_threat_model.md                # Trike threat model (T-01..T-16)
├── traceability_matrix.md               # End-to-end traceability matrix
├── release_security_checklist.md        # Final Security Review checklist
└── vulnerability_response_plan.md       # Incident response plan
```

---

## 10. Residual Risks & Trike Status

Of the 16 modeled Trike threats:
- **13 Threats**: **PASS** or **PASS_WITH_FINDINGS**
- **3 Threats**: **PARTIAL / OPEN_MEDIUM**
  1. `T-06 (PARTIAL)`: JavaScript V8 memory management does not guarantee deterministic physical memory zeroization.
  2. `T-08 (PARTIAL)`: `RP-01` validates sequence counters in the application envelope, but raw encrypted envelope re-injection over active DataChannel was not performed.
  3. `T-16 (PARTIAL)`: OWASP ZAP passive scan has 1 open Medium finding (`style-src 'unsafe-inline'`).

---

## 11. Limitations

1. **Passive vs Active Scanning**: DAST scanning via OWASP ZAP was conducted in passive mode on Vercel. Active fuzzing of stateful WebRTC DataChannels is outside standard web application scanner capabilities.
2. **Backend Hosting Environment**: The backend signaling server was evaluated locally using `BT-01`..`BT-08` and Bandit. Cloud infrastructure hosting (Render/Docker) boundaries are external to application code logic.
