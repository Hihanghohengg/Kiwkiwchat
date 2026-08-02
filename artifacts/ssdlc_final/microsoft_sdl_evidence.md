# Bukti Implementasi Microsoft SDL — Kiw Kiw Chat

Rangkuman bukti artefak dari setiap tahapan Microsoft Security Development Lifecycle (SDL) pada Kiw Kiw Chat:

---

## 1. Bukti Tahapan SDL

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│ 1. TRAINING     │ ──► │ 2. REQUIREMENTS     │ ──► │ 3. DESIGN            │
│ WebCrypto & PQC │     │ SR-01 s/d SR-18     │     │ Trike Threat Model   │
└─────────────────┘     └─────────────────────┘     └──────────────────────┘
                                                               │
┌─────────────────┐     ┌─────────────────────┐                ▼
│ 6. RELEASE      │ ◄── │ 5. VERIFICATION     │ ◄── ┌──────────────────────┐
│ Security Headers│     │ SAST, DAST, E2E     │     │ 4. IMPLEMENTATION    │
└─────────────────┘     └─────────────────────┘     │ Secure Coding & AAD  │
         │                                          └──────────────────────┘
         ▼
┌─────────────────┐
│ 7. RESPONSE     │
│ TTL & Zero-Data │
└─────────────────┘
```

### Rincian Artefak Bukti:
1. **Fase 1 (Training)**: Pemilihan primitif NIST FIPS 203 (ML-KEM-768) dan Web Crypto API tanpa ketergantungan library pihak ketiga yang rentan.
2. **Fase 2 (Requirements)**: Dokumen [Security Requirements](file:///d:/Obed/kiwkiw/docs/ssdlc/security_requirements_and_verification.md) mencakup 18 kebutuhan keamanan yang dapat diuji secara objektif.
3. **Fase 3 (Design)**: Dokumen [Trike Threat Model](file:///d:/Obed/kiwkiw/docs/ssdlc/trike_threat_model.md) dan [Architecture Blueprint](file:///d:/Obed/kiwkiw/docs/shared/BLUEPRINT.md).
4. **Fase 4 (Implementation)**: Penerapan IV random fresh, pembersihan kunci memori, rate limiting SlowAPI, dan penolakan koneksi ketiga.
5. **Fase 5 (Verification)**: Laporan SAST Bandit ([bandit_report.json](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/bandit_report.json)) dan Laporan Pengujian Fungsional ([impkrip_test_report.json](file:///d:/Obed/kiwkiw/artifacts/impkrip_final/impkrip_test_report.json)).
6. **Fase 6 (Release)**: Konfigurasi deployment produksi terpisah dan penguncian dependensi.
7. **Fase 7 (Response)**: Arsitektur ephemeral zero-knowledge yang secara alami memitigasi dampak insiden kompromi server.
