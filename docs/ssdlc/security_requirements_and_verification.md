# Security Requirements & Verification Plan — SSDLC Track

Dokumen ini memuat daftar lengkap **Security Requirements (SR-01 s/d SR-18)**, rencana verifikasi, release checklist, dan incident response plan.

---

## 1. Daftar Security Requirements (SR-01 s/d SR-18)

| ID | Kategori | Deskripsi Kebutuhan Keamanan | Status Implementasi |
|---|---|---|---|
| **SR-01** | Confidentiality | Seluruh konten percakapan dienkripsi E2E menggunakan AES-GCM-256 via WebRTC DataChannel. | ✅ Terverifikasi |
| **SR-02** | Key Management | Kunci enkripsi klasikal didistribusikan out-of-band via URL fragment (#) dan tidak pernah melewati server. | ✅ Terverifikasi |
| **SR-03** | Post-Quantum | Sistem mengimplementasikan algoritma tahan kuantum NIST FIPS 203 (ML-KEM-768). | ✅ Terverifikasi |
| **SR-04** | Key Derivation | Kunci sesi akhir diderivasi dari dua entropi independen menggunakan HKDF-SHA-256 (RFC 5869). | ✅ Terverifikasi |
| **SR-05** | Data Protection | Tidak ada penyimpanan permanen; memori session storage dibersihkan saat room dihancurkan. | ✅ Terverifikasi |
| **SR-06** | Privacy/Logging | Server signaling beroperasi zero-knowledge tanpa mencatat konten pesan atau kunci privat. | ✅ Terverifikasi |
| **SR-07** | P2P Transport | Saluran komunikasi peer-to-peer diamankan dengan enkripsi ganda (DTLS + Hybrid Application Key). | ✅ Terverifikasi |
| **SR-08** | Mutual Auth | Pertukaran kunci post-quantum diverifikasi secara mutual menggunakan tanda tangan HMAC-SHA-256 dan nonces. | ✅ Terverifikasi |
| **SR-09** | Access Control | Kapasitas room dibatasi secara ketat hanya untuk 2 partisipan; koneksi ke-3 ditolak seketika (Close 1008). | ✅ Terverifikasi |
| **SR-10** | Ephemeral State| Masa hidup room dibatasi maksimum 15 menit melalui timer absolut tersinkronisasi di backend dan UI. | ✅ Terverifikasi |
| **SR-11** | Room Lifecycle | Pemutusan koneksi permanen oleh salah satu peer memicu penghapusan room dan event `room_ended`. | ✅ Terverifikasi |
| **SR-12** | Usability/UX | Riwayat chat tetap dipertahankan saat refresh tab lokal melalui sessionStorage selama room belum expired. | ✅ Terverifikasi |
| **SR-13** | Network Security| Kebijakan CORS dibatasi hanya untuk origin produksi yang terdaftar dalam whitelist (`ALLOWED_ORIGINS`). | ✅ Terverifikasi |
| **SR-14** | Access Control | Endpoint WebSocket menolak koneksi ke room ID yang tidak pernah dibuat melalui `POST /rooms`. | ✅ Terverifikasi |
| **SR-15** | Availability | Endpoint pembuatan room dilindungi rate limiting 10 request/IP/menit untuk mencegah DoS. | ✅ Terverifikasi |
| **SR-16** | DoS Prevention | Ukuran payload WebSocket dibatasi maksimal 64 KB; koneksi idle > 60 detik ditutup otomatis. | ✅ Terverifikasi |
| **SR-17** | SAST Compliance | Kode sumber backend lolos audit Static Application Security Testing menggunakan Bandit (0 Vuln). | ✅ Terverifikasi |
| **SR-18** | DAST Compliance | Aplikasi menerapkan Content Security Policy ketat, Subresource Integrity, dan header keamanan HTTP. | ✅ Terverifikasi |

---

## 2. Rencana Verifikasi Keamanan (Verification Plan)

1. **Static Analysis Verification**:
   - Menjalankan Bandit pada `backend/main.py` menggunakan konfigurasi `backend/.bandit`.
   - Menjalankan Oxlint pada seluruh komponen frontend di `frontend/src/`.
2. **Cryptographic & Protocol Verification**:
   - Menjalankan pengujian fungsional kriptografi terautomasi (`test_impkrip_final.py`) mencakup unit test, mitigasi ancaman, dan E2E multi-run.
3. **Capacity & Denial of Service Verification**:
   - Menjalankan skenario third-peer lockout dan room destruction testing via Playwright headless contexts.
4. **Build & Syntax Verification**:
   - Kompilasi Python (`py_compile`) dan bundling Vite frontend (`npm run build`).

---

## 3. Release Checklist (Fase Release SDL)

- [x] Seluruh dependensi terkunci pada `package-lock.json` dan `requirements.txt`.
- [x] Environment variables terpisah antara lokal dan produksi (`.env.example`).
- [x] HTTP Security Headers terkonfigurasi di `vercel.json` dan middleware backend.
- [x] Tidak ada raw key, hardcoded secrets, atau credentials di source code repository.
- [x] Seluruh pengujian otomatis menghasilkan status terverifikasi (18 PASS, 1 PARTIAL, 0 FAIL).

---

## 4. Incident Response Plan (Fase Response SDL)

1. **Deteksi Kebocoran Link Undangan**:
   - Pengguna dapat langsung menekan tombol `[ HAPUS ROOM ]` untuk membersihkan sesi di server dan browser seketika.
   - Sesi otomatis hangus dalam 15 menit jika pengguna lupa menghancurkan room.
2. **Mitigasi Kerentanan Server Signaling**:
   - Karena server beroperasi *zero-knowledge*, penyerang yang menguasai server tidak dapat mendekripsi percakapan P2P.
   - Prosedur restart instan container server untuk menghapus seluruh in-memory state.
3. **Pembaruan Kerentanan Dependensi**:
   - Audit berkala menggunakan dependabot/npm audit dan pembaruan versi library post-quantum (`mlkem`).
