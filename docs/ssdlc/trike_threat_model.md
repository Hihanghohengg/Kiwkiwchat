# Trike Threat Modeling & Risk Assessment — Kiw Kiw Chat

Dokumen ini mendokumentasikan pemodelan ancaman menggunakan kerangka kerja **Trike Threat Modeling** pada Kiw Kiw Chat.

---

## 1. Daftar Aset Sistem

| ID Aset | Nama Aset | Klasifikasi | Dampak Jika Bocor | Deskripsi & Lokasi Penyimpanan |
|---|---|---|---|---|
| **AST-01** | Konten Pesan Percakapan | Kritis | Kritis | Teks percakapan ephemeral, dienkripsi AES-GCM-256 via WebRTC DataChannel (hanya di memori RAM). |
| **AST-02** | Classical Encryption Key | Kritis | Kritis | Kunci 256-bit AES di URL fragment (#), tidak pernah menyentuh server backend (RFC 3986). |
| **AST-03** | ML-KEM Secret Key | Kritis | Kritis | Kunci privat post-quantum ephemeral di RAM browser, dihapus segera setelah proses decapsulation. |
| **AST-04** | ML-KEM Shared Secret | Kritis | Kritis | Secret 32-byte hasil pertukaran kunci post-quantum, dihapus dari RAM setelah proses derivasi HKDF. |
| **AST-05** | Hybrid Session Key | Kritis | Kritis | Kunci sesi 256-bit hasil derivasi HKDF untuk enkripsi lalu lintas DataChannel. |
| **AST-06** | Room ID & Signaling State | Sedang | Rendah | UUID v4 acak untuk routing signaling WebRTC di server memory (in-memory dict). |
| **AST-07** | Session Storage Cache | Sedang | Sedang | Cache pesan di `sessionStorage` lokal untuk mendukung refresh halaman sebelum sesi dihancurkan. |

---

## 2. Daftar Aktor Sistem

| ID Aktor | Nama Aktor | Tingkat Kepercayaan | Deskripsi & Batasan Akses |
|---|---|---|---|
| **ACT-01** | Peer A (Initiator) | Trusted | Pembuat room, membangkitkan classical key dan kunci ML-KEM, mengundang responder. |
| **ACT-02** | Peer B (Responder) | Trusted | Penerima undangan, membaca token/key dari fragment, melakukan enkapsulasi ML-KEM. |
| **ACT-03** | Signaling Server (FastAPI) | Untrusted (Zero-Knowledge) | Meneruskan paket SDP/ICE tanpa mengetahui kunci atau konten pesan. Menegakkan kapasitas dan TTL. |
| **ACT-04** | Third-Party Peer / Attacker | Untrusted / Malicious | Entitas luar yang mencoba memasuki room privat atau membajak sesi signaling. |
| **ACT-05** | Network Adversary (Eavesdropper) | Malicious | Entitas jaringan pasif/aktif yang mencoba menyadap atau memanipulasi paket data. |

---

## 3. Matriks Hak Akses (Permission Matrix)

| Aktor | AST-01 (Pesan) | AST-02 (Class Key) | AST-03 (PQ SK) | AST-04 (Shared Sec) | AST-06 (Room ID) | AST-07 (Storage) |
|---|---|---|---|---|---|---|
| **Peer A** | Create, Read | Create, Read | Create, Read, Delete | Create, Read, Delete | Create, Read, Delete | Create, Read, Delete |
| **Peer B** | Create, Read | Read (via URL) | None | Create, Read, Delete | Read | Create, Read, Delete |
| **Signaling Server** | None | None | None | None | Create, Read, Delete | None |
| **Adversary (Net)** | Read (Encrypted) | None | None | None | Read (Metadata) | None |

---

## 4. Analisis Skenario Ancaman & Evaluasi Risiko (T-01 s/d T-14)

| ID | Skenario Ancaman | Kemungkinan | Dampak | Tingkat Risiko | Kontrol Mitigasi Teknis | Risiko Residual |
|---|---|---|---|---|---|---|
| **T-01** | Penyadapan Pasif Lalu Lintas WebRTC | Tinggi | Kritis | **Tinggi** | Enkripsi end-to-end ganda: DTLS pada layer WebRTC + AES-GCM-256 pada layer aplikasi. | Rendah (Terkendali) |
| **T-02** | Kriptanalisis Menggunakan Komputer Kuantum | Rendah | Kritis | **Sedang** | Penggunaan ML-KEM-768 (NIST FIPS 203 Level 3) tahan terhadap algoritma Shor. | Rendah (Terkendali) |
| **T-03** | Kompromi Server Signaling Backend | Sedang | Rendah | **Rendah** | Server didesain *zero-knowledge*; kunci dan pesan tidak pernah dikirim ke server. | Rendah (Terkendali) |
| **T-04** | Penyusupan Pihak Ketiga ke Dalam Room (*3rd Peer Flooding*) | Sedang | Sedang | **Sedang** | Penegakan kapasitas strict 2 orang (`room_full` event + WS close code 1008). | Rendah (Terkendali) |
| **T-05** | Man-in-the-Middle (MitM) pada Pertukaran Kunci Post-Quantum | Sedang | Kritis | **Tinggi** | HMAC-SHA-256 Mutual Key Confirmation dengan binding nonce acak dua arah. | Rendah (Terkendali) |
| **T-06** | Ekstraksi Kunci Privat dari Memori RAM Browser | Rendah | Kritis | **Sedang** | Penghapusan variabel `_pqSecretKey` dan secret sementara segera setelah operasi selesai. | Rendah (Terkendali) |
| **T-07** | Intersepsi Kunci Melalui URL History Browser | Sedang | Kritis | **Tinggi** | Kunci diletakkan pada URL Fragment (#) + masa hidup room dibatasi TTL 15 menit. | Rendah (Terkendali) |
| **T-08** | Serangan Ulangan Pesan (*Replay Attack*) | Rendah | Sedang | **Rendah** | Penggunaan IV acak 12-byte fresh per pesan + pengikatan sequence counter pada AAD. | Rendah (Terkendali) |
| **T-09** | Pengambilalihan Room Setelah Peer Meninggalkan Sesi | Rendah | Sedang | **Rendah** | Notifikasi `room_ended` instan dan pembersihan memori room di server saat peer disconnect. | Rendah (Terkendali) |
| **T-10** | Kebocoran Riwayat Pesan dari Cache Browser | Rendah | Sedang | **Rendah** | Penggunaan `sessionStorage` yang dibersihkan total saat room dihancurkan / tab ditutup. | Rendah (Terkendali) |
| **T-11** | Akses Tidak Sah Lintas Domain (CORS Bypass) | Sedang | Tinggi | **Sedang** | CORS middleware ketat dengan konfigurasi whitelist domain produksi (`ALLOWED_ORIGINS`). | Rendah (Terkendali) |
| **T-12** | Pembuatan Room Liar Melalui WebSocket Langsung | Sedang | Tinggi | **Sedang** | Validasi keberadaan room ID di backend; menolak koneksi WebSocket tanpa `POST /rooms`. | Rendah (Terkendali) |
| **T-13** | Serangan Penolakan Layanan (DoS via Room Flooding) | Tinggi | Tinggi | **Tinggi** | Rate limiting 10 request/IP/menit pada pembuatan room menggunakan SlowAPI. | Rendah (Terkendali) |
| **T-14** | Serangan Exhaustion Memori melalui Payload Besar | Sedang | Tinggi | **Sedang** | Pembatasan ukuran frame WebSocket maksimal 64 KB JSON; pelanggaran ditutup code 1009. | Rendah (Terkendali) |
