# Repository Artifact & Tracking Audit

> **Audit Date**: 2026-08-03  
> **Repository**: [https://github.com/Hihanghohengg/Kiwkiwchat](https://github.com/Hihanghohengg/Kiwkiwchat)  
> **Classification**: Research Artifact Repository for IMPKRIP & SSDLC Papers  

---

## 1. Git State Checkpoint

| Checkpoint Property | Value | Status |
|---|---|:---:|
| **Current Branch** | `main` | ✅ Clean |
| **Commit HEAD** | `38607225a4ce22ac7d491c5253113727b01b0e1d` | ✅ Verified |
| **Working Tree Status** | Clean (nothing to commit, working tree clean) | ✅ Clean |
| **Existing Tags** | `ssdlc-evidence-v1` (`9252e98b05d70ece66996b384ec12545a40742f3`)<br>`ssdlc-evidence-v2` (`e2db6729b426930e68d5a7ee671aeac6acfdeaa9`) | ✅ Verified |
| **Remote URL** | `https://github.com/Hihanghohengg/Kiwkiwchat.git` | ✅ Verified |

---

## 2. Sensitive & Temporary File Exclusion Audit

Using `git ls-files` and `git status -uall`, every tracked entry was audited against exclusion criteria:

| Category | Checked Patterns | Tracked Status | Finding / Detail |
|---|---|:---:|---|
| **Node Modules** | `node_modules/`, `frontend/node_modules/` | ❌ Not Tracked | Properly ignored via `.gitignore` |
| **Git Metadata** | `.git/` internal objects | ❌ Not Tracked | Only standard `.gitignore`, `.gitattributes` tracked |
| **Python Bytecode & Cache** | `__pycache__/`, `*.pyc`, `.pytest_cache/` | ❌ Not Tracked | Properly ignored |
| **Environment & Secrets** | `.env`, `.env.local`, `.env.production` | ❌ Not Tracked | Only sanitized [.env.example](../../.env.example) is tracked |
| **Credentials & API Keys** | Hardcoded secrets, production tokens | ❌ Not Tracked | No live credentials or private keys in tracked files |
| **Browser Profiles / User Data** | Playwright userDataDir, cookies, storage | ❌ Not Tracked | Ephemeral headless execution; no session files tracked |
| **Temporary & Test Caches** | `*.tmp`, `*.temp`, `coverage/`, `test-results/` | ❌ Not Tracked | Properly ignored |
| **Build Artifacts** | `frontend/dist/`, `dist/`, `dist-ssr/` | ❌ Not Tracked | Excluded from version control |

---

## 3. Complete Tracked File Inventory (68 Files)

Every tracked file is categorized by role within the dual-track research architecture:

### A. Root & Repository Configuration (7 Files)
1. `.dockerignore` — Container build exclusion rules
2. `.env.example` — Environment variable schema and default values
3. `.gitattributes` — Consistent LF line ending enforcement
4. `.gitignore` — Exclusion rules for dependencies, caches, and secrets
5. `DEPLOYMENT.md` — Multi-platform deployment architecture documentation
6. `Dockerfile` — Multi-stage production container definition
7. `LICENSE` — Project open-source license (MIT License)

### B. Documentation (6 Files)
8. `README.md` — Primary research artifact and project overview
9. `WALKTHROUGH.md` — Historical implementation walkthrough
10. `docs/shared/BLUEPRINT.md` — Comprehensive architectural specification
11. `docs/impkrip/architecture_and_protocol.md` — IMPKRIP cryptographic protocol specification
12. `docs/impkrip/benchmark_methodology.md` — IMPKRIP sub-millisecond benchmarking methodology
13. `docs/impkrip/evaluation_summary.md` — IMPKRIP 6-parameter evaluation summary

### C. Backend Application (FastAPI Signaling Server) (3 Files)
14. `backend/main.py` — In-memory signaling relay, rate limiter, and room lifecycle manager
15. `backend/requirements.txt` — Python dependencies specification
16. `backend/.bandit` — Bandit SAST scanner configuration

### D. Frontend Application (React 19 + WebCrypto + ML-KEM) (22 Files)
17. `frontend/.gitignore` — Frontend-specific gitignore rules
18. `frontend/.oxlintrc.json` — Oxlint linter configuration
19. `frontend/README.md` — Frontend component documentation
20. `frontend/index.html` — HTML shell and CSP meta configuration
21. `frontend/package.json` — Frontend package metadata and dependencies
22. `frontend/package-lock.json` — Frontend dependency lockfile
23. `frontend/vite.config.js` — Vite build tool and bundler configuration
24. `frontend/vercel.json` — Vercel SPA routing and HTTP security headers
25. `frontend/public/favicon.svg` — Application favicon asset
26. `frontend/public/icons.svg` — SVG icons collection
27. `frontend/src/App.css` — Core application styles
28. `frontend/src/App.jsx` — WebRTC signaling coordinator and state manager
29. `frontend/src/index.css` — Global CSS stylesheet
30. `frontend/src/main.jsx` — React DOM entrypoint
31. `frontend/src/assets/hero.png` — Landing page visual asset
32. `frontend/src/assets/react.svg` — Framework icon asset
33. `frontend/src/assets/vite.svg` — Bundler icon asset
34. `frontend/src/components/ChatRoom.jsx` — Ephemeral chatroom interface component
35. `frontend/src/components/DestroyModal.jsx` — Room destruction confirmation modal
36. `frontend/src/components/LandingPage.jsx` — Room creation & join landing page
37. `frontend/src/components/QRModal.jsx` — Room QR code sharing modal
38. `frontend/src/components/RoomEnded.jsx` — Room expiration and teardown notification
39. `frontend/src/components/RoomFull.jsx` — 3rd-peer rejection notification
40. `frontend/src/components/TerminalLog.jsx` — Cryptographic status visualization terminal
41. `frontend/src/components/Toast.jsx` — Temporary notification component
42. `frontend/src/crypto/encryption.js` — AES-GCM-256 and HKDF-SHA-256 cryptographic module
43. `frontend/src/crypto/mlkem.js` — ML-KEM-768 key generation, encapsulation, and decapsulation
44. `frontend/src/crypto/pq_upgrade.js` — Post-quantum handshake state machine & HMAC mutual key confirmation
45. `frontend/src/hooks/useCountdown.js` — Synchronized absolute room TTL countdown hook
46. `frontend/src/utils/logger.js` — Client-side logger utility
47. `frontend/src/utils/storage.js` — Session storage helper and state sanitization

### E. Test Suites & Test Harnesses (8 Files)
48. `package.json` — Root runner dependencies (Playwright)
49. `package-lock.json` — Root dependency lockfile
50. `test_impkrip_final.py` — IMPKRIP functional, negative, and E2E multi-run test runner
51. `test_crypto_performance_final.py` — IMPKRIP sub-millisecond cryptographic benchmark runner
52. `test_crypto_memory_final.py` — IMPKRIP JavaScript V8 heap memory benchmark runner
53. `tests/browser/impkrip_unit.js` — Browser-native cryptographic unit test suite
54. `tests/browser/benchmark_v2.js` — Browser-native performance benchmark harness
55. `tests/browser/benchmark_memory.js` — Browser-native memory benchmark harness
56. `tests/security/test_backend_websocket_security.py` — SSDLC dynamic backend & WebSocket test suite (`BT-01`..`BT-08`)
57. `vercel.json` — Root Vercel deployment configuration

### F. IMPKRIP Research Evidence Artifacts (10 Files)
58. `artifacts/impkrip_final/impkrip_environment.json` — Probed test environment specifications
59. `artifacts/impkrip_final/impkrip_test_report.json` — Functional test execution results (18 PASS, 1 PARTIAL)
60. `artifacts/impkrip_final/impkrip_test_report.md` — Markdown summary of functional tests
61. `artifacts/impkrip_final/impkrip_test_report.html` — Interactive visual test dashboard
62. `artifacts/impkrip_final/impkrip_testing_summary.md` — Synthesized test evaluation report
63. `artifacts/impkrip_final/impkrip_failures.log` — Test failure and edge-case execution log
64. `artifacts/impkrip_final/impkrip_benchmark.json` — 1,000-sample latency benchmark statistics
65. `artifacts/impkrip_final/impkrip_benchmark.csv` — Raw latency benchmark data points
66. `artifacts/impkrip_final/impkrip_memory_benchmark.json` — CDP V8 heap memory measurement data
67. `artifacts/impkrip_final/impkrip_memory_benchmark.csv` — Memory benchmark data points
68. `artifacts/impkrip_final/impkrip_memory_summary.md` — JavaScript heap usage summary and analysis

### G. SSDLC Research Evidence Artifacts (37 Files)
69. `artifacts/ssdlc_final/canonical_ssdlc_results.md` — Single Source of Truth (SSOT) evaluation results
70. `artifacts/ssdlc_final/system_context_and_scope.md` — Trust boundaries, context diagrams, scope definitions
71. `artifacts/ssdlc_final/use_abuse_security_requirements.md` — 10 Use Cases, 10 Abuse Cases, 18 Security Requirements
72. `artifacts/ssdlc_final/use_abuse_security_requirements.csv` — Tabular Use/Abuse/Requirement mappings
73. `artifacts/ssdlc_final/trike_assets_actors_operations.md` — Taxonomy of 14 assets, 7 actors, CRUD operations
74. `artifacts/ssdlc_final/trike_permission_matrix.csv` — Actor authorization rule matrix
75. `artifacts/ssdlc_final/trike_threat_model.md` — Trike threat model (`T-01`..`T-16`), controls, mitigations
76. `artifacts/ssdlc_final/trike_threat_register.csv` — Tabular threat register with risk ratings and residual status
77. `artifacts/ssdlc_final/microsoft_sdl_mapping.md` — Microsoft SDL Phase 0..7 implementation mapping
78. `artifacts/ssdlc_final/microsoft_sdl_evidence.md` — Technical evidence of SDL security gates execution
79. `artifacts/ssdlc_final/traceability_matrix.md` — Full traceability (Threat $\to$ Requirement $\to$ Control $\to$ Test)
80. `artifacts/ssdlc_final/traceability_matrix.csv` — Tabular traceability matrix
81. `artifacts/ssdlc_final/bandit_report.json` — Raw Bandit SAST scan output (0 High, 1 Med, 3 Low)
82. `artifacts/ssdlc_final/bandit_summary.md` — Bandit SAST analysis and triage report
83. `artifacts/ssdlc_final/npm_audit_report.json` — Frontend NPM dependency audit (0 vulnerabilities)
84. `artifacts/ssdlc_final/pip_audit_report.json` — Backend Pip dependency audit (17 advisories analyzed)
85. `artifacts/ssdlc_final/dependency_review.md` — Dependency reachability and risk analysis
86. `artifacts/ssdlc_final/zap_report_2026-08-02.html` — OWASP ZAP passive DAST report on Vercel frontend
87. `artifacts/ssdlc_final/2026-08-02-ZAP-Report-.html` — Alternate ZAP tool output artifact
88. `artifacts/ssdlc_final/zap_summary.md` — OWASP ZAP executive summary and findings triage
89. `artifacts/ssdlc_final/zap_dast_verification.md` — HTTP security header and CSP verification
90. `artifacts/ssdlc_final/zap_execution_blocker.md` — Documentation of active scanning boundaries
91. `artifacts/ssdlc_final/backend_websocket_test_results.json` — Dynamic test results for `BT-01`..`BT-08`
92. `artifacts/ssdlc_final/backend_websocket_test_results.md` — Dynamic backend & WebSocket test report
93. `artifacts/ssdlc_final/backend_websocket_test_raw.log` — Dynamic test raw execution log
94. `artifacts/ssdlc_final/security_test_inventory.md` — Complete inventory of all security tests and tools
95. `artifacts/ssdlc_final/security_hardening_change_log.md` — Chronology of 10 security hardening interventions
96. `artifacts/ssdlc_final/baseline_test_results.md` — Baseline test execution notes
97. `artifacts/ssdlc_final/final_regression_results.md` — Regression test and memory checkpoint summary
98. `artifacts/ssdlc_final/release_security_checklist.md` — Final Security Review (FSR) evaluation checklist
99. `artifacts/ssdlc_final/vulnerability_response_plan.md` — Incident response and vulnerability disclosure plan
100. `artifacts/ssdlc_final/evidence_consistency_review.md` — Reconciliation audit log across all evidence files
101. `artifacts/ssdlc_final/ssdlc_trike_verification_report.md` — Dedicated Trike threat verification report
102. `artifacts/ssdlc_final/ssdlc_final_verification_report.md` — Master synthesis report for Microsoft SDL verification
103. `artifacts/ssdlc_final/final_evidence_reconciliation_report.md` — SSDLC evidence reconciliation report
104. `artifacts/ssdlc_final/final_threat_evidence_audit.md` — Complete T-01..T-16 threat evidence audit
105. `artifacts/ssdlc_final/paper_evidence_eligibility_matrix.md` — Paper evidence eligibility matrix
106. `artifacts/ssdlc_final/repository_inventory.md` — Module and asset security inventory
107. `artifacts/ssdlc_final/figures/README.md` — Threat modeling figures and architectural diagrams index

---

## 4. Audit Conclusion

The repository working tree is clean. Version control tracks only genuine source code, architectural documentation, test runners, and reproducible evidence artifacts. All sensitive files, build targets, local caches, and private tokens remain strictly excluded.
