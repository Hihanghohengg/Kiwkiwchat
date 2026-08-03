# 🚀 Kiw Kiw Chat — P2P Ephemeral Post-Quantum Messenger Research Artifacts

> *"The conversation that never happened."*  
> Repository publik pendukung dan artefak riset untuk aplikasi perpesanan instan ephemeral berbasis **Peer-to-Peer (WebRTC DataChannel)** dengan pembentukan kunci pasca-kuantum **PSK-assisted ML-KEM session-key establishment (ML-KEM-768)** dan kerangka kerja pengembangan aman **Microsoft Security Development Lifecycle (SDL) & Trike Threat Modeling**.

---

## 1. Project Overview

Kiw Kiw Chat adalah platform komunikasi *browser-native* yang dirancang untuk kebutuhan privasi tinggi dengan karakteristik pesan sementara (*ephemeral*):
- **Tanpa Akun & Tanpa Instalasi**: Berjalan murni di browser modern melalui WebRTC DataChannel dan Web Crypto API tanpa memerlukan biner atau WASM pihak ketiga.
- **Kriptografi Pasca-Kuantum & Simetris**: Mengombinasikan enkripsi simetris AES-GCM-256 dan enkapsulasi kunci NIST FIPS 203 (ML-KEM-768) melalui mekanisme **PSK-assisted ML-KEM session-key establishment with AES-GCM application-layer encryption**.
- **In-Memory Signaling Relay**: Server signaling bertindak sebagai relay paket SDP/ICE in-memory; *signaling relay does not receive application keying material or message plaintext in the normal application flow*.
- **Self-Destruct & Strict Capacity**: Penegakan batas ketat maksimal 2 partisipan per room dan masa hidup room 15 menit melalui timer absolut dengan pembersihan state/`sessionStorage` saat sesi berakhir.

---

## 2. Research Scope

Repository ini memuat kode sumber implementasi, *test harnesses*, dan artefak bukti empiris (*raw evidence*) untuk mendukung dua publikasi riset:

1. **Track IMPKRIP**:
   > *“Implementasi dan Evaluasi Kriptografi Post-Quantum pada Aplikasi Chat Ephemeral Browser-Native Menggunakan ML-KEM-768”*
   - Fokus: Implementasi primitif kriptografi pasca-kuantum (ML-KEM-768), derivasi kunci HKDF-SHA-256, *mutual key confirmation* HMAC-SHA-256, dan evaluasi berbasis 6 parameter kriptografi terapan (termasuk performa sub-millisecond dan jejak memori JavaScript Heap V8).

2. **Track SSDLC**:
   > *“Implementasi Microsoft Security Development Lifecycle dengan Pemodelan Ancaman Trike pada Aplikasi Chat Ephemeral Kiw Kiw Chat”*
   - Fokus: Penerapan Microsoft SDL (Fase 0 hingga 7) dan pemodelan ancaman Trike menyeluruh (10 Use Cases, 10 Abuse Cases, 18 Security Requirements, 14 Assets, 7 Actors, 16 Trike Threats, 8 Dynamic Backend/WebSocket/CORS tests, SAST Bandit, SCA, dan DAST OWASP ZAP).

---

## 3. Shared Architecture

```
┌────────────────────────────────────────────────────────┐
│  BROWSER — Peer A (Initiator)                          │
│  React 19 + sessionStorage (Chat/Timer Persist)        │
│  encryption.js (AES-GCM-256 + HKDF-SHA-256)            │
│  pq_upgrade.js (ML-KEM-768 + HMAC Key Confirmation)    │
│  WebSocket Client (Signaling Relay Only)               │
└──────────────┬─────────────────────────────────────────┘
               │ WebSocket /rooms/{id}/ws (SDP/ICE Relay)
               │ HTTP POST /rooms (Create Ephemeral Room)
               ▼
┌────────────────────────────────────────────────────────┐
│  SIGNALING SERVER — FastAPI Python (backend/main.py)   │
│  - In-memory State Only (No Database, No Chat Logs)    │
│  - Strict 2-Peer Enforcement (Room Full -> Close 1008) │
│  - 15-Minute Absolute TTL Task (asyncio.sleep)         │
│  - Rate Limiting 10 req/IP/min via SlowAPI             │
│  - Payload Guard 64 KB JSON (MAX_MSG_BYTES)            │
└──────────────┬─────────────────────────────────────────┘
               │ WebSocket /rooms/{id}/ws (SDP/ICE Relay)
               ▼
┌────────────────────────────────────────────────────────┐
│  BROWSER — Peer B (Responder)                          │
│  (Struktur identik dengan Peer A)                      │
└────────────────────────────────────────────────────────┘
               │
               │ ◄═══ WebRTC DataChannel P2P (Direct Transport) ═══►
               │      Application-layer encrypted session (AES-GCM-256)
```

---

## 4. IMPKRIP Research Track

Track **Implementasi Kriptografi (IMPKRIP)** mengevaluasi kelayakan dan kinerja penerapan kriptografi pasca-kuantum pada konteks *browser-native* berdasarkan **Enam Parameter**:

1. **Tujuan Keamanan (Security Goals)**: Confidentiality (AES-GCM-256), Integrity (AEAD Tag 128-bit), Mutual Key Confirmation (HMAC-SHA-256), dan Post-Quantum Security (ML-KEM-768) melalui mekanisme *PSK-assisted ML-KEM session-key establishment*.
2. **Model Ancaman (Threat Model)**: Menangkal penyadapan pasif, manipulasi payload (MitM), kunci tidak valid, dan percobaan join dari pihak ketiga (*third-peer lockout*).
3. **Kapasitas Perangkat (Device Capacity)**: Kompatibel dengan browser modern tanpa WASM/biner eksternal pada spesifikasi hardware standar.
4. **Performa Komputasi (Computational Performance)**: Dievaluasi melalui 1.000 sampel pengukuran performa per primitif menggunakan sub-millisecond batching.
5. **Pengalaman Pengguna (User Experience)**: Pembuatan room instan, link sharing via QR/URL hash fragment, sinkronisasi countdown timer, dan terminal visualisasi status kriptografi.
6. **Risiko Salah Pakai (Misuse Risk)**: Enkripsi otomatis tanpa negosiasi cipher lemah, kunci out-of-band via URL fragment (`#`), dan pembersihan state/`sessionStorage` saat room dihancurkan.

---

## 5. SSDLC Research Track

Track **Secure Software Development Lifecycle (SSDLC)** menerapkan metodologi pengembangan perangkat lunak aman hulu-ke-hilir:

- **Microsoft SDL (Fase 0 s/d 7)**: Training, Requirements (SR-01..18), Design, Implementation (Secure Coding), Verification (SAST/DAST/E2E), Release (Security Headers & Secrets Guard), dan Response (Incident Plan).
- **Trike Threat Modeling**: Analisis 14 aset data & komputasi (AST-01..14), 7 aktor (ACT-01..07), matriks hak akses CRUD, mitigasi 16 ancaman Trike (T-01..16), dan evaluasi residual risk.
- **Dynamic Security Verification**: 8 pengujian dinamis backend, WebSocket, dan CORS (`BT-01` s/d `BT-08`).
- **Static & Dynamic Scans**: SAST Bandit (0 High, 1 Med, 3 Low), NPM audit (0 vulnerabilities), Pip-audit (17 advisories dianalisis keterjangkauannya), dan OWASP ZAP passive scan pada frontend produksi.
- **Traceability Matrix**: Keterlacakan penuh dari *Threat $\rightarrow$ Requirement $\rightarrow$ Design Control $\rightarrow$ Source Code $\rightarrow$ Test Case $\rightarrow$ Evidence*.

---

## 6. Repository Structure

```
kiwkiw/
├── .env.example                               # Environment variable blueprint
├── .gitattributes                             # Consistent line endings (LF)
├── .gitignore                                 # Git tracking and exclusion rules
├── ARTIFACTS.md                               # Index of research artifacts & evidence
├── CITATION.cff                               # Software citation metadata
├── DEPLOYMENT.md                              # Multi-platform deployment guide
├── Dockerfile                                 # Multi-stage production container build
├── LICENSE                                    # MIT License
├── README.md                                  # Main research repository documentation
├── package.json                               # Root runner dependencies (Playwright)
├── package-lock.json                          # Root dependency lockfile
├── vercel.json                                # Root deployment configuration
├── backend/                                   # FastAPI WebSocket signaling server
│   ├── .bandit                                # Bandit SAST security configuration
│   ├── main.py                                # Room lifecycle, rate limiter, relay
│   └── requirements.txt                       # Python dependencies
├── frontend/                                  # React 19 UI + WebCrypto + ML-KEM-768
│   ├── .oxlintrc.json                         # Oxlint linter configuration
│   ├── index.html                             # HTML shell and CSP configuration
│   ├── package.json                           # Frontend dependencies
│   ├── vite.config.js                         # Bundler configuration
│   ├── vercel.json                            # SPA routing & HTTP security headers
│   └── src/
│       ├── components/                        # UI modular components (Chat, Landing, QR, etc.)
│       ├── crypto/                            # encryption.js, mlkem.js, pq_upgrade.js
│       ├── hooks/                             # useCountdown.js (synchronized timer)
│       ├── utils/                             # logger.js, storage.js
│       ├── App.jsx                            # WebRTC state & signaling coordinator
│       └── main.jsx                           # React entrypoint
├── tests/
│   ├── browser/
│   │   ├── impkrip_unit.js                    # Browser-native cryptographic unit tests
│   │   ├── benchmark_v2.js                    # Sub-millisecond batching benchmark harness
│   │   └── benchmark_memory.js                # CDP V8 heap memory benchmark harness
│   └── security/
│       └── test_backend_websocket_security.py # Dynamic backend & WebSocket security tests (BT-01..08)
├── test_impkrip_final.py                      # Final functional, negative, and E2E test runner
├── test_crypto_performance_final.py           # Final cryptographic performance benchmark runner
├── test_crypto_memory_final.py                # Final JavaScript heap memory benchmark runner
├── docs/
│   ├── citation/                              # BibTeX citation entries (impkrip.bib, ssdlc.bib)
│   ├── impkrip/                               # Protocol specs, benchmark notes, summary
│   ├── reproducibility/                       # Reproducibility guides (IMPKRIP.md, SSDLC.md, audit)
│   └── shared/                                # Shared architecture blueprint (BLUEPRINT.md)
└── artifacts/
    ├── impkrip_final/                         # Verified IMPKRIP test reports, CSV, HTML, logs
    └── ssdlc_final/                           # Canonical SSDLC results, Bandit, ZAP, Trike artifacts
```

---

## 7. Installation

### Prasyarat:
- **Node.js**: v20.x atau lebih baru
- **Python**: v3.11 atau v3.12
- **Google Chrome / Chromium**: Untuk eksekusi Playwright test suite

### Langkah Instalasi:

```bash
# 1. Clone repository
git clone https://github.com/Hihanghohengg/Kiwkiwchat.git
cd Kiwkiwchat

# 2. Install dependensi Backend
cd backend
pip install -r requirements.txt
cd ..

# 3. Install dependensi Frontend
cd frontend
npm install
cd ..

# 4. Install dependensi Root runner & Playwright
npm install
npx playwright install chromium
```

---

## 8. Running the Application

### Mode Development:

```bash
# Menjalankan frontend dan backend secara bersamaan
npm start
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API & WebSocket**: [http://localhost:8000](http://localhost:8000)

---

## 9. Reproducing IMPKRIP Evaluation

Panduan reproduksi mendalam tersedia di [docs/reproducibility/IMPKRIP.md](./docs/reproducibility/IMPKRIP.md).

### A. Pengujian Fungsional, Negatif & E2E (3 Runs):
```bash
python test_impkrip_final.py --runs 3 --output-dir artifacts/impkrip_final
```
*Hasil:* 19 kasus uji (18 PASS, 1 PARTIAL `RP-01`, 0 FAIL, E2E multi-run 3/3 passed).

### B. Pengujian Benchmark Kriptografi Sub-Millisecond (1.000 Sampel):
```bash
python test_crypto_performance_final.py --warmup 20 --iterations 200 --runs 5 --output-dir artifacts/impkrip_final
```

### C. Pengujian Penggunaan Memori JavaScript Heap V8:
```bash
python test_crypto_memory_final.py --warmup 20 --iterations 200 --runs 5 --output-dir artifacts/impkrip_final
```

---

## 10. Reproducing SSDLC Evaluation

Panduan reproduksi mendalam tersedia di [docs/reproducibility/SSDLC.md](./docs/reproducibility/SSDLC.md).

### A. Dynamic Backend, WebSocket & CORS Security Tests (`BT-01`..`BT-08`):
```bash
python tests/security/test_backend_websocket_security.py
```

### B. Static Application Security Testing (SAST - Bandit):
```bash
bandit -c backend/.bandit -r backend/ -f json -o artifacts/ssdlc_final/bandit_report.json
```

### C. Software Composition Analysis (SCA):
```bash
# Frontend NPM Audit
cd frontend && npm audit --json > ../artifacts/ssdlc_final/npm_audit_report.json && cd ..

# Backend Pip Audit
pip-audit -r backend/requirements.txt -f json -o artifacts/ssdlc_final/pip_audit_report.json
```

### D. Frontend Linter & Build Verification:
```bash
cd frontend
npm run lint
npm run build
cd ..
```

---

## 11. Research Artifacts

Indeks lengkap seluruh artefak penelitian tersedia pada [ARTIFACTS.md](./ARTIFACTS.md).

| Kategori | Path Artefak | Deskripsi Ringkas |
|---|---|---|
| **IMPKRIP** | [`artifacts/impkrip_final/impkrip_test_report.json`](./artifacts/impkrip_final/impkrip_test_report.json) | Laporan JSON pengujian fungsional (18 PASS, 1 PARTIAL) |
| **IMPKRIP** | [`artifacts/impkrip_final/impkrip_test_report.html`](./artifacts/impkrip_final/impkrip_test_report.html) | Visual dashboard interaktif hasil evaluasi fungsional |
| **IMPKRIP** | [`artifacts/impkrip_final/impkrip_benchmark.json`](./artifacts/impkrip_final/impkrip_benchmark.json) | Statistik performa latency & throughput 1.000 sampel |
| **IMPKRIP** | [`artifacts/impkrip_final/impkrip_memory_benchmark.json`](./artifacts/impkrip_final/impkrip_memory_benchmark.json) | Data pengukuran JavaScript Heap memori CDP V8 |
| **IMPKRIP** | [`artifacts/impkrip_final/impkrip_environment.json`](./artifacts/impkrip_final/impkrip_environment.json) | Metadata spesifikasi hardware & software teruji |
| **SSDLC** | [`artifacts/ssdlc_final/canonical_ssdlc_results.md`](./artifacts/ssdlc_final/canonical_ssdlc_results.md) | Single Source of Truth hasil evaluasi SSDLC & Trike |
| **SSDLC** | [`artifacts/ssdlc_final/ssdlc_final_verification_report.md`](./artifacts/ssdlc_final/ssdlc_final_verification_report.md) | Laporan sintesis master verifikasi Microsoft SDL |
| **SSDLC** | [`artifacts/ssdlc_final/trike_threat_model.md`](./artifacts/ssdlc_final/trike_threat_model.md) | Model ancaman Trike lengkap (T-01 s/d T-16) |
| **SSDLC** | [`artifacts/ssdlc_final/traceability_matrix.md`](./artifacts/ssdlc_final/traceability_matrix.md) | Matriks keterlacakan hulu-hilir (Use Case $\to$ Threat $\to$ Test) |
| **SSDLC** | [`artifacts/ssdlc_final/backend_websocket_test_results.md`](./artifacts/ssdlc_final/backend_websocket_test_results.md) | Hasil pengujian dinamis backend & CORS (BT-01..08) |
| **SSDLC** | [`artifacts/ssdlc_final/bandit_report.json`](./artifacts/ssdlc_final/bandit_report.json) | Raw report pemindaian SAST Bandit backend |
| **SSDLC** | [`artifacts/ssdlc_final/zap_summary.md`](./artifacts/ssdlc_final/zap_summary.md) | Ringkasan dan analisis pemindaian pasif OWASP ZAP |

---

## 12. Limitations

1. **Replay Protection Scope (`RP-01: PARTIAL`)**: Sequence validation telah diuji pada logika application envelope, tetapi raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual.
2. **P2P Direct NAT Traversal**: Menggunakan STUN Google publik; lingkungan *symmetric NAT to symmetric NAT* memerlukan relay TURN server tambahan untuk konektivitas 100%.
3. **Pembersihan Memori JavaScript (`T-06: PARTIAL`)**: Engine JavaScript V8 mengelola memori secara otomatis via Garbage Collector dan tidak memberikan jaminan deterministik pembersihan fisik RAM (*secure zeroization*).
4. **Cakupan Pemindaian DAST OWASP ZAP**: Pemindaian ZAP membuktikan pemindaian pasif (*passive scan*) terhadap frontend produksi Vercel (0 High, 1 Med, 1 Low, 3 Info), bukan pengujian penetrasi aktif penuh (*full active penetration testing*) atau backend/WebSocket DAST.
5. **Variansi Hardware Benchmark**: Angka latensi komputasi dan konsumsi memori dipengaruhi oleh arsitektur CPU, thermal throttling, dan runtime engine browser; eksekusi pada lingkungan perangkat keras yang berbeda akan menghasilkan angka metrik yang bervariasi.

---

## 13. Citation

Jika Anda menggunakan perangkat lunak ini atau artefak riset di dalamnya untuk penelitian akademis, silakan mengacu pada metadata sitasi berikut:

- **Machine-readable Citation**: [`CITATION.cff`](./CITATION.cff)
- **BibTeX IMPKRIP Track**: [`docs/citation/impkrip.bib`](./docs/citation/impkrip.bib)
- **BibTeX SSDLC Track**: [`docs/citation/ssdlc.bib`](./docs/citation/ssdlc.bib)

---

## 14. License

Perangkat lunak ini didistribusikan di bawah lisensi terbuka [MIT License](./LICENSE).
