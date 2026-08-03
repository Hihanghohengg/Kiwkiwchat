# Data Hasil Evaluasi SSDLC Kanonikal (Canonical SSDLC Results) — Kiw Kiw Chat

Dokumen ini merupakan lembar data referensi tunggal (*Single Source of Truth* - SSOT) yang memuat seluruh data final kanonikal yang didukung penuh oleh bukti empiris mentah (*raw evidence*) dari pengujian aktual **Kiw Kiw Chat** (Prototipe Riset).

---

## 1. Metadata & Status Evaluasi Sistem

- **Nama Sistem**: Kiw Kiw Chat
- **Klasifikasi Arsitektur**: PSK-assisted ML-KEM session-key establishment with AES-GCM application-layer encryption on browser-native WebRTC DataChannel with signaling relay that does not receive application keying material in the normal flow.
- **Status Evaluasi**: **READY FOR PAPER WITH LIMITATIONS**
- **Klasifikasi Kesiapan**: **RESEARCH PROTOTYPE (NOT EVALUATED AS PRODUCTION-READY)**
- **Tanggal Rekonsiliasi Final**: 2026-08-02 (Sinkronisasi: 2026-08-03)
- **Lingkungan Pengujian**: Windows 11, AMD Ryzen 5 5600H, 16 GB RAM, Node.js v22, Python 3.11, Chromium (Playwright headless), OWASP ZAP 2.17.0

---

## 2. Metrik Kinerja & Penggunaan Memori JavaScript Heap (Kanonikal)

Sumber data mentah: [`artifacts/impkrip_final/impkrip_memory_benchmark.json`](file:///d:/Obed/kiwkiw/artifacts/impkrip_final/impkrip_memory_benchmark.json) (5 Independent Runs, 20 Warm-up, 200 Measured Iterations per Run via Chrome DevTools Protocol):

| Metrik Checkpoint Heap | Median (MiB) | Mean (MiB) | Min (MiB) | Max (MiB) | StdDev (MiB) | Median (Bytes) |
|---|---:|---:|---:|---:|---:|---:|
| `baseline_used_heap` | **5.0850** | 5.0850 | 5.0850 | 5.0852 | 0.0001 | 5,332,008 |
| `post_keygen_used_heap` | **5.3223** | 5.4477 | 5.2651 | 5.9480 | 0.2884 | 5,580,856 |
| `delta_baseline_to_keygen` | **0.2371** | 0.3627 | 0.1801 | 0.8630 | 0.2884 | 248,664 |
| `post_pq_upgrade_used_heap` | **5.6062** | 5.5988 | 5.3995 | 5.7615 | 0.1303 | 5,878,532 |
| `delta_baseline_to_pq_upgrade` | **0.5212** | 0.5137 | 0.3145 | 0.6765 | 0.1303 | 546,520 |
| `max_observed_used_heap` | **18.0747** | 16.6438 | 5.5884 | 31.2000 | 11.1273 | 18,952,656 |
| `retained_used_heap` | **6.0082** | 13.1924 | 5.3983 | 31.2000 | 11.4027 | 6,300,024 |
| `delta_baseline_to_retained` | **0.9230** | 8.1074 | 0.3133 | 26.1151 | 11.4028 | 967,832 |

> [!NOTE]
> Metrik ini mencatat alokasi checkpoint memori selama alur uji terkontrol. Ini bukan pengujian kebocoran memori jangka panjang (*long-term memory leak testing*).

---

## 3. Hasil Pengujian Kriptografi & Fungsional Otomatis (19 Test Cases)

Sumber data mentah: [`artifacts/impkrip_final/impkrip_test_report.json`](file:///d:/Obed/kiwkiw/artifacts/impkrip_final/impkrip_test_report.json) (`test_impkrip_final.py --runs 3`):

- **Total Test Cases**: 19
- **PASS**: **18**
- **PARTIAL**: **1** (`RP-01` - Replay Protection sequence validation di application envelope layer)
- **FAIL**: **0**
- **E2E Multi-Run Execution**: **3/3 runs passed (100% success rate)**

| Test ID | Kategori | Deskripsi Singkat | Status |
|---|---|---|:---:|
| `PQ-01` | ML-KEM-768 | Validasi ukuran keypair (PK: 1184 B, SK: 2400 B) | **PASS** |
| `PQ-02` | ML-KEM-768 | Determinisme enkapsulasi/dekapsulasi shared secret (32 B) | **PASS** |
| `PQ-03` | ML-KEM-768 | Validasi ukuran ciphertext ML-KEM-768 (1088 B) | **PASS** |
| `PQ-04` | ML-KEM-768 | Penolakan dekapsulasi ciphertext rusak (*bit-flipping*) | **PASS** |
| `KD-01` | HKDF-SHA-256 | Fusi kunci PSK + PQC shared secret menjadi session key 32 B | **PASS** |
| `KD-02` | HKDF-SHA-256 | Pemisahan kunci enkripsi (`K_enc`) dan kunci konfirmasi (`K_conf`) | **PASS** |
| `KD-03` | HKDF-SHA-256 | Efek avalans pada perbedaan 1-bit PSK | **PASS** |
| `KD-04` | HKDF-SHA-256 | Efek avalans pada perbedaan 1-bit PQC secret | **PASS** |
| `KC-01` | HMAC-SHA-256 | Verifikasi mutual key confirmation transcript valid | **PASS** |
| `KC-02` | HMAC-SHA-256 | Penolakan handshake pada manipulasi transcript/HMAC tag | **PASS** |
| `AE-01` | AES-GCM-256 | Siklus enkripsi/dekripsi pesan teks normal | **PASS** |
| `AE-02` | AES-GCM-256 | Penolakan dekripsi pada manipulasi ciphertext | **PASS** |
| `AE-03` | AES-GCM-256 | Penolakan dekripsi pada key atau IV yang salah | **PASS** |
| `AE-04` | AES-GCM-256 | Penolakan dekripsi pada manipulasi AAD sequence/direction | **PASS** |
| `RP-01` | Replay Guard | Validasi urutan sequence counter pada application envelope | **PARTIAL** |
| `E2E-01` | E2E Flow | Siklus lengkap chat 2 peer (Room $\to$ Signaling $\to$ Upgrade $\to$ Chat) | **PASS** |
| `E2E-02` | E2E Stress | Pengiriman 10 pesan beruntun 2 arah tanpa packet loss | **PASS** |
| `E2E-03` | E2E Capacity | Penolakan koneksi browser ketiga (`room_full` + close 1008) | **PASS** |
| `E2E-04` | E2E Teardown | Pemusnahan room & penghapusan `sessionStorage` saat disconnect | **PASS** |

---

## 4. Hasil Pengujian Dinamis Minimum Backend API & WebSocket Signaling (6 Test Cases)

Sumber data mentah: [`artifacts/ssdlc_final/backend_websocket_test_results.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/backend_websocket_test_results.json) (`tests/security/test_backend_websocket_security.py`):

- **Total Minimum Dynamic Test Cases**: 6
- **PASS**: **6 (100%)**
- **FAIL**: **0**

| Test ID | Modul & Skenario Uji | Deskripsi Kasus Uji | Status |
|---|---|---|:---:|
| `BT-01` | WS Capacity | Penegakan kapasitas strict 2-peer: Penolakan peer ke-3 (`room_full` & Close 1008) | **PASS** |
| `BT-02` | REST API (Rate Limit) | Penegakan SlowAPI rate limiting pada `POST /rooms` (10 req/IP/min: 10 diterima, 11+ ditolak HTTP 429) | **PASS** |
| `BT-03` | WS Frame Guard | Penolakan frame payload melebihi batas 64 KB `MAX_MSG_BYTES` (Close 1009) | **PASS** |
| `BT-04` | WS Input Handling | Ketahanan terhadap pengiriman frame non-JSON/malformed tanpa crash server | **PASS** |
| `BT-05` | WS Lifecycle & Teardown | Teardown room seketika: Broadcast `room_ended` & penolakan rekoneksi ('Room not found') | **PASS** |
| `BT-06` | WS Idle Timeout | Timeout inaktivitas koneksi WebSocket (`WS_IDLE_TIMEOUT=3s` di test env) ditutup kode 1001 | **PASS** |

---

## 5. Hasil Audit Keamanan Statis & Dependensi

1. **Static Application Security Testing (SAST)**:
   - Tool: Bandit v1.9.4 pada `backend/` (269 LOC)
   - High Severity: **0**
   - Medium Severity: **1** (B104: Binding to `0.0.0.0` — accepted deployment finding untuk hosting container)
   - Low Severity: **3** (B110: Try-except-pass pada loop teardown koneksi — accepted technical debt)
   - Status: ✅ **PASS_WITH_FINDINGS (0 High)**
   - Raw Report: [`bandit_report.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/bandit_report.json)

2. **Software Composition Analysis (SCA)**:
   - Frontend (NPM): 113 paket dipindai $\to$ **0 Vulnerabilities** (Status: ✅ **PASS**). Raw Report: [`npm_audit_report.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/npm_audit_report.json).
   - Backend (Pip): Ditemukan 17 catatan advisory PyPI pada FastAPI/Starlette/python-multipart.
     - 8 advisories multipart $\longrightarrow$ *Not reached in current application flow*
     - 5 advisories URL/Host $\longrightarrow$ *Requires validation*
     - Transitive $\longrightarrow$ *Open for dependency upgrade*
   - Status Backend SCA: ⚠️ **OPEN / PARTIAL**. Raw Report: [`pip_audit_report.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/pip_audit_report.json).

3. **Dynamic Application Security Testing (DAST)**:
   - Tool: OWASP ZAP 2.17.0 Passive Scan
   - Target: Frontend Produksi Vercel (`https://kiwkiwchat.vercel.app/`)
   - Tanggal Scan: 2026-08-02
   - Hasil Alert: **0 High, 1 Medium, 1 Low, 3 Informational (Total: 5 Alert Types)**
     - Medium (1): *CSP: style-src unsafe-inline* (Confidence: High)
     - Low (1): *CSP: Notices* (Confidence: High)
     - Informational (3): *Modern Web Application* (Confidence: Medium), *Re-examine Cache-control Directives* (Confidence: Low), *Retrieved from Cache* (Confidence: Medium)
   - Status: ⚠️ **EXECUTED_WITH_OPEN_FINDINGS**
   - Raw Report: [`zap_report_2026-08-02.html`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/zap_report_2026-08-02.html)

---

## 6. Ringkasan Status 16 Ancaman Trike (T-01 s/d T-16)

- **Total Ancaman**: 16 (100% terpetakan ke kebutuhan dan kontrol).
- **PASS / PASS_WITH_FINDINGS**: **12 Ancaman** (`T-01`, `T-02`, `T-03`, `T-04`, `T-05`, `T-07`, `T-09`, `T-10`, `T-12`, `T-13`, `T-14`, `T-15`)
- **CODE_REVIEW_ONLY**: **1 Ancaman** (`T-11` — CORS Whitelist `backend/main.py:ALLOWED_ORIGINS`; pengujian dinamis lintas origin belum diotomasi di test harness).
- **PARTIAL / OPEN_MEDIUM**: **3 Ancaman**:
  - `T-06`: Batasan runtime JavaScript V8 Engine (tidak menjamin deterministic memory zeroization pada physical RAM).
  - `T-08`: Status `RP-01` PARTIAL (validasi sequence counter di application envelope; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual).
  - `T-16`: Status ZAP DAST EXECUTED WITH OPEN FINDINGS (1 Medium open: `CSP: style-src unsafe-inline`, 1 Low: `CSP: Notices`, 3 Informational).

---

## 7. Ringkasan Batasan Empiris & Integritas Ilmiah (Honesty & Limitations)

1. **Replay Protection Test (`RP-01`)**: Dicatat sebagai **PARTIAL** karena test harness memvalidasi penolakan duplikasi sequence counter pada layer *application envelope*; raw encrypted application envelope belum ditangkap dan direinjeksi secara end-to-end melalui DataChannel aktual.
2. **Pemindaian DAST OWASP ZAP**: Dicatat sebagai **EXECUTED_WITH_OPEN_FINDINGS** (0 High, 1 Medium, 1 Low, 3 Informational) pada frontend produksi Vercel; pemindaian ZAP tidak mencakup backend Render atau WebSocket signaling, yang diverifikasi secara lokal melalui test harness `BT-01` s/d `BT-06`.
3. **Pembersihan Memori pada JavaScript (`T-06`)**: Dicatat sebagai **PARTIAL** karena engine V8 mengelola memori secara otomatis via Garbage Collector dan tidak memberikan jaminan deterministik pembersihan fisik RAM (*secure zeroization*).
4. **Dependensi Backend (SCA)**: Dicatat sebagai **OPEN / PARTIAL** di mana 17 catatan advisory PyPI dikategorikan berdasarkan alur aplikasi aktual.
5. **Klaim Kriptografi**: Protokol diklasifikasikan sebagai *PSK-assisted ML-KEM session-key establishment with AES-GCM application-layer encryption* dan menyediakan *mutual key confirmation* (bukan *identity authentication*). Parameter ML-KEM-768 mengikuti NIST FIPS 203, tanpa klaim sertifikasi NIST CMVP pada library JavaScript pihak ketiga.
