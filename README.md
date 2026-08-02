# 🚀 Kiw Kiw Chat — P2P Ephemeral Post-Quantum Messenger

> *"The conversation that never happened."*  
> Aplikasi perpesanan instan ephemeral (sementara) berbasis **Peer-to-Peer (WebRTC)** dengan keamanan **PSK-assisted ML-KEM session-key establishment (ML-KEM-768)** dan arsitektur pengembangan aman **Microsoft SDL & Trike Threat Modeling**.

---

## 1. Project Overview

Kiw Kiw Chat adalah platform komunikasi browser-native yang mengutamakan privasi dan sifat data yang sementara (ephemeral):
- **Tanpa Akun & Tanpa Instalasi**: Berjalan murni di browser modern melalui WebRTC DataChannel dan Web Crypto API.
- **Kerahasiaan Ganda (Hybrid Cryptography)**: Mengombinasikan enkripsi simetris klasik AES-GCM-256 dan enkapsulasi kunci tahan kuantum NIST FIPS 203 (ML-KEM-768) melalui mekanisme *PSK-assisted ML-KEM session-key establishment*.
- **In-Memory Signaling Relay**: Server signaling bertindak sebagai *dumb relay* paket SDP/ICE tanpa pernah menerima kunci kriptografi atau konten pesan.
- **Self-Destruct & Strict Capacity**: Batas maksimal 2 partisipan per room dan masa hidup room 15 menit melalui timer absolut.

Repository ini menjadi basis implementasi untuk dua fokus riset:
1. **Track IMPKRIP**: Implementasi kriptografi pasca-kuantum pada aplikasi dan evaluasi berdasarkan enam parameter kriptografi terapan.
2. **Track SSDLC**: Implementasi pengembangan aplikasi yang aman menggunakan Microsoft Security Development Lifecycle (SDL) dan Trike threat modeling.

---

## 2. Shared Application Architecture

```
┌────────────────────────────────────────────────────────┐
│  BROWSER — Peer A (Initiator)                          │
│  React 19 + sessionStorage (Chat/Timer Persist)        │
│  encryption.js (AES-GCM-256 + HKDF-SHA-256)            │
│  pq_upgrade.js (ML-KEM-768 + HMAC-SHA-256 Key Confirm) │
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
│  - Payload Guard 64 KB JSON                            │
└──────────────┬─────────────────────────────────────────┘
               │ WebSocket /rooms/{id}/ws (SDP/ICE Relay)
               ▼
┌────────────────────────────────────────────────────────┐
│  BROWSER — Peer B (Responder)                          │
│  (Struktur identik dengan Peer A)                      │
└────────────────────────────────────────────────────────┘
               │
               │ ◄═══ WebRTC DataChannel P2P (Direct Transport) ═══►
               │      Hybrid Encrypted Session (AES-GCM-256)
```

---

## 3. IMPKRIP Research Track

Track **Implementasi Kriptografi (IMPKRIP)** mengevaluasi kelayakan dan kinerja penerapan kriptografi pasca-kuantum pada browser-native context berdasarkan **Enam Parameter**:

1. **Tujuan Keamanan (Security Goals)**: Confidentiality (AES-GCM-256), Integrity (AEAD Tag 128-bit), Mutual Key Confirmation (HMAC-SHA-256), dan Post-Quantum Security (ML-KEM-768) melalui *PSK-assisted ML-KEM session-key establishment*.
2. **Model Ancaman (Threat Model)**: Menangkal penyadapan pasif, manipulasi payload (MitM), kunci palsu, dan percobaan join dari pihak ketiga.
3. **Kapasitas Perangkat (Device Capacity)**: Kompatibel dengan browser modern tanpa WASM/biner eksternal pada spesifikasi hardware laptop/PC standar.
4. **Performa Komputasi (Computational Performance)**: Dievaluasi melalui 1.000 sampel pengukuran performa per primitif menggunakan sub-millisecond batching.
5. **Pengalaman Pengguna (User Experience)**: Pembuatan room instan, link sharing via QR/URL, dan terminal log status kriptografi.
6. **Risiko Salah Pakai (Misuse Risk)**: Enkripsi otomatis tanpa negosiasi cipher lemah dan pembersihan state/sessionStorage saat sesi berakhir.

---

## 4. SSDLC Research Track

Track **Secure Software Development Lifecycle (SSDLC)** menerapkan metodologi pengembangan perangkat lunak aman:

- **Microsoft SDL (7 Fase)**: Training, Requirements (SR-01..18), Design, Implementation (Secure Coding), Verification (SAST/DAST/E2E), Release (Security Headers & Secrets Guard), dan Response (Incident Plan).
- **Trike Threat Modeling**: Analisis aset (AST-01..07), aktor (ACT-01..05), matriks hak akses CRUD, mitigasi ancaman (T-01..14), dan evaluasi residual risk.
- **Traceability Matrix**: Keterlacakan penuh dari *Threat $\rightarrow$ Requirement $\rightarrow$ Design Control $\rightarrow$ Source Code $\rightarrow$ Test Case $\rightarrow$ Evidence*.

---

## 5. Folder Structure

```
kiwkiw/
├── frontend/                     # React 19 UI + WebCrypto + ML-KEM-768
│   ├── src/
│   │   ├── components/           # UI modular components
│   │   ├── crypto/               # encryption.js, mlkem.js, pq_upgrade.js
│   │   ├── hooks/                # useCountdown.js (synchronized timer)
│   │   ├── utils/                # logger.js, storage.js
│   │   ├── App.jsx               # WebRTC state & signaling coordinator
│   │   └── main.jsx              # React entrypoint
│   ├── package.json              # Frontend dependencies
│   └── vite.config.js            # Bundler configuration
├── backend/                      # FastAPI WebSocket signaling server
│   ├── main.py                   # Room lifecycle, rate limiter, relay
│   ├── requirements.txt          # Python dependencies
│   └── .bandit                   # Bandit SAST security configuration
├── tests/
│   └── browser/
│       ├── impkrip_unit.js       # Browser-native cryptographic unit tests
│       └── benchmark_v2.js       # Sub-millisecond batching benchmark harness
├── test_impkrip_final.py         # Final functional, negative, and E2E test runner
├── test_crypto_performance_final.py # Final cryptographic benchmark runner
├── docs/
│   ├── shared/                   # BLUEPRINT.md, FINAL_CLEANUP_INVENTORY.md
│   ├── impkrip/                  # Architecture, protocol, benchmark notes, summary
│   └── ssdlc/                    # Microsoft SDL, Trike threat model, traceability
├── artifacts/
│   ├── impkrip_final/            # Verified IMPKRIP test reports, CSV, HTML, logs
│   └── ssdlc_final/              # Bandit SAST, Header Verification, Trike, and SDL verification
├── README.md                     # Comprehensive project documentation
├── .gitattributes                # Consistent line endings (LF)
├── .gitignore                    # Git tracking rules
├── .env.example                  # Environment variable blueprint
├── Dockerfile                    # Multi-stage production container build
├── DEPLOYMENT.md                 # Production deployment guide
└── vercel.json                   # SPA routing & HTTP security headers
```

---

## 6. Installation

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

## 7. Running the Application

### Mode Development:

```bash
npm start
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API & WebSocket**: [http://localhost:8000](http://localhost:8000)

---

## 8. Running IMPKRIP Tests

### A. Pengujian Fungsional, Negatif & E2E (3 Runs):

```bash
python test_impkrip_final.py --runs 3 --output-dir artifacts/impkrip_final
```

### B. Pengujian Benchmark Kriptografi (5 Runs x 200 Iterasi, Batching 10):

```bash
python test_crypto_performance_final.py --warmup 20 --iterations 200 --runs 5 --output-dir artifacts/impkrip_final
```

---

## 9. Running SSDLC Verification

### A. Static Application Security Testing (SAST - Bandit):

```bash
bandit -c backend/.bandit -r backend/ -f json -o artifacts/ssdlc_final/bandit_report.json
```

### B. Frontend Linting & Type/Syntax Check:

```bash
cd frontend
npm run lint
npm run build
cd ..
```

### C. Backend Python Syntax Compilation:

```bash
python -m py_compile backend/main.py
python -m py_compile test_impkrip_final.py
python -m py_compile test_crypto_performance_final.py
```

---

## 10. Final Artifact Locations

| Kategori | Path Artefak | Deskripsi |
|---|---|---|
| **IMPKRIP** | `artifacts/impkrip_final/impkrip_test_report.json` | Laporan JSON pengujian fungsional (18 PASS, 1 PARTIAL) |
| **IMPKRIP** | `artifacts/impkrip_final/impkrip_test_report.html` | Visual dashboard interaktif hasil evaluasi fungsional |
| **IMPKRIP** | `artifacts/impkrip_final/impkrip_benchmark.json` | Statistik performa 1.000 sampel per primitif |
| **IMPKRIP** | `artifacts/impkrip_final/impkrip_benchmark.csv` | Dataset tabular benchmark dengan metadata hardware terverifikasi |
| **IMPKRIP** | `artifacts/impkrip_final/impkrip_environment.json` | Metadata spesifikasi hardware terverifikasi |
| **SSDLC** | `artifacts/ssdlc_final/bandit_report.json` | Hasil pemindaian SAST Bandit backend |
| **SSDLC** | `artifacts/ssdlc_final/ssdlc_trike_verification_report.md` | Laporan verifikasi kontrol mitigasi Trike (T-01..14) |
| **SSDLC** | `artifacts/ssdlc_final/zap_dast_verification.md` | Evaluasi CSP, SRI, dan HTTP Security Headers |
| **SSDLC** | `artifacts/ssdlc_final/microsoft_sdl_evidence.md` | Bukti kepatuhan 7 fase Microsoft SDL |

---

## 11. Known Limitations

1. **Replay Protection Scope (`RP-01: PARTIAL`)**: Proteksi replay pada level pertukaran kunci berstatus PASS melalui mutual nonce binding (`KC-02`), namun evaluasi replay raw envelope data aplikasi dicatat secara objektif sebagai PARTIAL karena WebRTC SCTP layer telah memiliki proteksi internal (SSRC sequence numbers).
2. **P2P Direct NAT Traversal**: Menggunakan STUN Google publik; lingkungan *symmetric NAT to symmetric NAT* memerlukan relay TURN server tambahan untuk konektivitas 100%.
3. **Browser Refresh Trade-off**: Refresh browser mempertahankan riwayat chat di tab yang me-refresh via `sessionStorage`, tetapi memutus koneksi WebRTC sementara hingga re-handshake berhasil.

---

## 📝 Lisensi
[MIT License](./LICENSE)
