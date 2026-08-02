# Final Project Cleanup Inventory — Kiw Kiw Chat

Dokumen ini berisi inventaris lengkap seluruh file dan folder pada repository **Kiw Kiw Chat** sebelum proses pembersihan final dilakukan. Klasifikasi dilakukan sesuai dengan panduan pemisahan ruang lingkup riset **Shared Application**, **IMPKRIP** (Kriptografi Pasca-Kuantum), dan **SSDLC** (Microsoft SDL & Trike Threat Modeling).

---

## 1. Ringkasan Klasifikasi

| Kategori | Definisi | Jumlah Entri Utama |
|---|---|---|
| `KEEP_SHARED` | Source code inti aplikasi, konfigurasi runtime, infrastruktur, dan dokumentasi bersama yang digunakan kedua riset | 22 file/folder |
| `KEEP_IMPKRIP` | Script pengujian final, harness browser, artefak pengujian/benchmark, dan dokumentasi paper IMPKRIP | 14 file/folder |
| `KEEP_SSDLC` | Konfigurasi/laporan SAST Bandit, DAST ZAP, pemetaan Microsoft SDL, Trike threat model, dan dokumen SSDLC | 10 file/folder |
| `DELETE_OBSOLETE` | File duplikat, laporan lawas, script uji usang, file build, dan temporary cache yang tidak relevan | 18 file/folder |
| `REVIEW_MANUALLY` | File referensi tambahan yang telah ditinjau dan ditentukan statusnya secara eksplisit | 2 file |

---

## 2. Tabel Inventaris Lengkap

| Path File / Folder | Klasifikasi | Alasan / Deskripsi Fungsi |
|---|---|---|
| `.dockerignore` | `KEEP_SHARED` | Konfigurasi ignore untuk Docker build multi-stage |
| `.env.example` | `KEEP_SHARED` | Template environment variables untuk backend dan frontend |
| `.gitignore` | `KEEP_SHARED` | Konfigurasi filter git untuk mencegah file sampah dan secret ter-commit |
| `DEPLOYMENT.md` | `KEEP_SHARED` | Petunjuk deployment produksi (Render + Vercel) |
| `Dockerfile` | `KEEP_SHARED` | Dockerfile multi-stage production build (FastAPI + Vite) |
| `LICENSE` | `KEEP_SHARED` | Lisensi open source MIT |
| `package.json` (root) | `KEEP_SHARED` | Root script runner untuk menjalankan frontend dan backend via concurrently |
| `package-lock.json` (root) | `KEEP_SHARED` | Lockfile dependensi root project |
| `README.md` (root) | `KEEP_SHARED` | Dokumentasi utama project yang mencakup track IMPKRIP dan SSDLC |
| `vercel.json` (root) | `KEEP_SHARED` | Konfigurasi routing SPA dan HTTP security headers untuk Vercel |
| `WALKTHROUGH.md` | `KEEP_SHARED` | Ringkasan audit keselarasan spesifikasi perangkat dan metodologi |
| `backend/.bandit` | `KEEP_SSDLC` | Konfigurasi alat Static Application Security Testing (Bandit) |
| `backend/main.py` | `KEEP_SHARED` | Server signaling WebSocket FastAPI, room lifecycle, rate limiting, and security controls |
| `backend/requirements.txt` | `KEEP_SHARED` | Daftar dependensi Python backend |
| `backend/__pycache__/` | `DELETE_OBSOLETE` | Python bytecode cache, dapat di-generate ulang secara otomatis |
| `frontend/.gitignore` | `KEEP_SHARED` | Gitignore lokal direktori frontend |
| `frontend/.oxlintrc.json` | `KEEP_SHARED` | Konfigurasi linter frontend (Oxlint) |
| `frontend/index.html` | `KEEP_SHARED` | Entrypoint HTML shell dengan meta tag CSP dan Subresource Integrity |
| `frontend/package.json` | `KEEP_SHARED` | Konfigurasi dependensi React, Vite, Tailwind CSS, mlkem, qrcode.react |
| `frontend/package-lock.json` | `KEEP_SHARED` | Lockfile dependensi frontend |
| `frontend/README.md` | `KEEP_SHARED` | Dokumentasi lokal frontend |
| `frontend/vercel.json` | `KEEP_SHARED` | Konfigurasi deploy frontend lokal |
| `frontend/vite.config.js` | `KEEP_SHARED` | Konfigurasi bundler Vite |
| `frontend/dist/` | `DELETE_OBSOLETE` | Direktori build sementara, dibuat ulang saat validasi build |
| `frontend/src/App.css` | `KEEP_SHARED` | Styling komponen utama |
| `frontend/src/App.jsx` | `KEEP_SHARED` | Komponen utama UI, WebRTC state management, signaling handler |
| `frontend/src/index.css` | `KEEP_SHARED` | Design system, token CSS, dan styling global |
| `frontend/src/main.jsx` | `KEEP_SHARED` | React DOM mount point |
| `frontend/src/components/*` | `KEEP_SHARED` | Komponen modular UI (ChatRoom, DestroyModal, LandingPage, QRModal, RoomEnded, RoomFull, TerminalLog, Toast) |
| `frontend/src/crypto/encryption.js` | `KEEP_SHARED` | Implementasi kriptografi AES-GCM-256 dan HKDF-SHA-256 key fusion |
| `frontend/src/crypto/mlkem.js` | `KEEP_SHARED` | Wrapper library NIST FIPS 203 ML-KEM-768 |
| `frontend/src/crypto/pq_upgrade.js` | `KEEP_SHARED` | Protokol 3-pesan post-quantum key exchange & HMAC mutual authentication |
| `frontend/src/hooks/useCountdown.js` | `KEEP_SHARED` | Hook timer TTL 15 menit dengan sinkronisasi absolut |
| `frontend/src/utils/logger.js` | `KEEP_SHARED` | Production-safe structured logger |
| `frontend/src/utils/storage.js` | `KEEP_SHARED` | SessionStorage wrapper untuk chat persistensi dan pembersihan memori |
| `test_impkrip_final.py` | `KEEP_IMPKRIP` | Runner pengujian fungsional dan keamanan final (18 PASS, 1 PARTIAL, 0 FAIL) |
| `test_crypto_performance_final.py` | `KEEP_IMPKRIP` | Runner pengujian benchmark kriptografi final dengan batching sub-milidetik |
| `tests/browser/benchmark_v2.js` | `KEEP_IMPKRIP` | Harness benchmark browser-native yang diinjeksikan Playwright |
| `tests/browser/impkrip_unit.js` | `KEEP_IMPKRIP` | Test suite unit browser untuk ML-KEM, HKDF, HMAC, dan AES-GCM |
| `artifacts/impkrip_final/impkrip_test_report.json` | `KEEP_IMPKRIP` | Laporan JSON hasil evaluasi fungsional dan E2E 3-run |
| `artifacts/impkrip_final/impkrip_test_report.html` | `KEEP_IMPKRIP` | Dashboard HTML visual pengujian fungsional terverifikasi |
| `artifacts/impkrip_final/impkrip_test_report.md` | `KEEP_IMPKRIP` | Laporan Markdown hasil pengujian fungsional dan mitigasi ancaman |
| `artifacts/impkrip_final/impkrip_benchmark.json` | `KEEP_IMPKRIP` | Data statistik lengkap benchmark kriptografi 1.000 sampel |
| `artifacts/impkrip_final/impkrip_benchmark.csv` | `KEEP_IMPKRIP` | Tabular data benchmark dengan metadata perangkat terverifikasi |
| `artifacts/impkrip_final/impkrip_environment.json` | `KEEP_IMPKRIP` | Metadata spesifikasi hardware Ryzen 5 5600H, RAM 16GB, NVMe, Windows 11 |
| `artifacts/impkrip_final/impkrip_testing_summary.md` | `KEEP_IMPKRIP` | Ringkasan eksekutif performa dan efisiensi kriptografi |
| `artifacts/impkrip_final/impkrip_failures.log` | `KEEP_IMPKRIP` | Log kegagalan pengujian fungsional (0 failures) |
| `artifacts/impkrip_cleanup_audit.md` | `DELETE_OBSOLETE` | Catatan audit sementara yang sudah terintegrasi ke laporan final |
| `artifacts/ssdlc_preserved/bandit_report.json` | `KEEP_SSDLC` | Laporan hasil SAST Bandit backend, dipindahkan ke `artifacts/ssdlc_final/` |
| `artifacts/ssdlc_preserved/FINAL_REPORT.md` | `KEEP_SSDLC` | Laporan readiness kriptografi dan security controls |
| `artifacts/ssdlc_preserved/BLUEPRINT.md` | `DELETE_OBSOLETE` | Duplikat identik dari `docs/shared/BLUEPRINT.md` |
| `artifacts/ssdlc_preserved/crypto_evaluation.md` | `DELETE_OBSOLETE` | Laporan lawas dengan benchmark versi lama sebelum batching |
| `artifacts/ssdlc_preserved/crypto_report.html` | `DELETE_OBSOLETE` | Laporan HTML lawas dengan benchmark estimasi kasar |
| `artifacts/ssdlc_preserved/crypto_report.json` | `DELETE_OBSOLETE` | Data JSON lawas dengan spesifikasi target awal |
| `archive/impkrip_experimental/*` | `DELETE_OBSOLETE` | Script eksperimen lama (`test_crypto_performance.py`, `test_crypto_performance_v2.py`, `test_ssdlc_trike.py`, `test_ssdlc_trike_v2.py`) yang telah digantikan oleh `test_impkrip_final.py` dan `test_crypto_performance_final.py` |
| `archive/impkrip_legacy/*` | `DELETE_OBSOLETE` | Seluruh artefak lawas (`before_hardening/`, `after_hardening/`) dengan data uji lama |
| `docs/shared/BLUEPRINT.md` | `KEEP_SHARED` | Blueprint arsitektur hidup mencakup desain sistem, threat model, dan kontrol keamanan |

---

## 3. Rencana Tindakan Pembersihan

1. **Memindahkan Bukti SSDLC**:
   - Pindahkan `artifacts/ssdlc_preserved/bandit_report.json` dan dokumen SSDLC ke `artifacts/ssdlc_final/` dan `docs/ssdlc/`.
2. **Menghapus Folder & File Obsolete**:
   - Hapus direktori `archive/`.
   - Hapus direktori `artifacts/ssdlc_preserved/` setelah file yang relevan dipindahkan ke struktur final.
   - Hapus file sementara `artifacts/impkrip_cleanup_audit.md`.
   - Hapus direktori build `frontend/dist/` dan cache `backend/__pycache__/`.
3. **Memperbarui Dokumen Dokumentasi & Gitignore**:
   - Strukturkan dokumentasi `docs/shared/`, `docs/impkrip/`, dan `docs/ssdlc/`.
   - Perbaiki file `.gitignore` sesuai spesifikasi Bagian G.
   - Perbarui `README.md` sesuai 11 bab spesifikasi Bagian H.
