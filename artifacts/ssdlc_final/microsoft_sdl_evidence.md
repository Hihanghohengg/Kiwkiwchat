# Bukti Implementasi Microsoft SDL — Kiw Kiw Chat

Rangkuman bukti artefak dari setiap tahapan Microsoft Security Development Lifecycle (SDL) pada Kiw Kiw Chat (Prototipe Riset):

---

## 1. Alur Bukti Tahapan SDL

```
┌──────────────────────────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│ 0. PREPARATION & KNOWLEDGE           │ ──► │ 1. REQUIREMENTS     │ ──► │ 2. DESIGN            │
│ WebCrypto & PQC Standards Review     │     │ SR-01 s/d SR-18     │     │ Trike Threat Model   │
└──────────────────────────────────────┘     └─────────────────────┘     └──────────────────────┘
                                                                                    │
┌──────────────────────────────────────┐     ┌─────────────────────┐                ▼
│ 5. RESPONSE                          │ ◄── │ 4. RELEASE          │ ◄── ┌──────────────────────┐
│ Incident SOP & Room TTL Auto-Destroy │     │ FSR Checklist       │     │ 3. IMPLEMENTATION    │
└──────────────────────────────────────┘     └─────────────────────┘     │ Secure Coding & SAST │
                                                        ▲                └──────────────────────┘
                                                        │
                                             ┌─────────────────────┐
                                             │ 4. VERIFICATION     │
                                             │ Tests & Mem Profile │
                                             └─────────────────────┘
```

### Rincian Artefak Bukti:
1. **Fase 0 (Security Preparation and Knowledge Acquisition)**: Penelaahan standar NIST FIPS 203 (ML-KEM-768 parameter sizing), RFC 5869 (HKDF), dan WebCrypto API (AES-GCM-256 / HMAC-SHA-256).
2. **Fase 1 (Requirements)**: Dokumen [`use_abuse_security_requirements.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/use_abuse_security_requirements.md) mencakup 18 kebutuhan keamanan (SR-01..18).
3. **Fase 2 (Design)**: Dokumen [`trike_threat_model.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/trike_threat_model.md) memetakan 14 aset, 7 aktor, dan 16 ancaman kanonikal (T-01..16).
4. **Fase 3 (Implementation)**: Penerapan IV unik 12-byte per pesan, dereferensi pointer kunci privat di JavaScript, rate limiting SlowAPI pada `POST /rooms`, dan penolakan koneksi ke-3.
5. **Fase 4 (Verification)**: Laporan SAST Bandit ([`bandit_report.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/bandit_report.json)) (0 High), Pengujian Dinamis Backend/WS ([`backend_websocket_test_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/backend_websocket_test_results.md)) (10/10 PASS), Pemindaian Pasif OWASP ZAP 2.17.0 ([`zap_summary.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_summary.md), [`zap_report_2026-08-02.html`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_report_2026-08-02.html)), dan Laporan Pengujian Kriptografi 19 Tests ([`baseline_test_results.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/baseline_test_results.md)).
6. **Fase 5 (Release)**: Final Security Review ([`release_security_checklist.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/release_security_checklist.md)) dengan status **READY FOR PAPER WITH LIMITATIONS (RESEARCH PROTOTYPE)**.
7. **Fase 6 (Response)**: Standar Operasional Prosedur penanganan insiden dan kebijakan CVD ([`vulnerability_response_plan.md`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/vulnerability_response_plan.md)).
