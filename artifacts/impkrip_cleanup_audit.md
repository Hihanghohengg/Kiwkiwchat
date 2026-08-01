# IMPKRIP Cleanup Audit

## KEEP
- **ML-KEM-768, AES-GCM-256, HKDF-SHA-256, HMAC-SHA-256**: Core cryptographic requirements for the IMPKRIP paper.
- **WebCrypto API & WebRTC DataChannel**: Standard mechanisms for secure transport layer.
- **URL fragment secret**: For transferring the confirmation key and classical secret without hitting the server.
- **FastAPI Signaling**: Reliable lightweight backend.
- **Room TTL & 2-Peer Limit**: Basic operational requirements for ephemeral P2P rooms.

## SIMPLIFY
- **Testing Scripts**: Consolidated `test_crypto_performance_v2.py`, `test_ssdlc_trike_v2.py` into a unified `test_impkrip_final.py` (for correctness) and `test_crypto_performance_final.py` (for performance benchmark).
- **Hardening Mechanisms**: Key separation (encryption vs confirmation), HMAC transcript binding, and AES-GCM AAD are kept but verified cleanly via the final testing scripts without expanding into new bespoke features.

## ARCHIVE
- **SSDLC Artifacts**: `bandit_report.json`, `crypto_report.json`, `crypto_report.html`, `FINAL_REPORT.md`, `BLUEPRINT.md` moved to `artifacts/ssdlc_preserved/` as they belong to the SSDLC paper trajectory, not IMPKRIP.
- **Experimental Testing Scripts**: `test_ssdlc_trike.py`, `test_crypto_performance.py`, `test_ssdlc_trike_v2.py`, `test_crypto_performance_v2.py` moved to `archive/impkrip_experimental/`.

## REMOVE
- **Overly complex untested formal verification attempts or placeholder ML-DSA code**: None exist currently, ensuring the scope remains focused exclusively on the core primitives.
