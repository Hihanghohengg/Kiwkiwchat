# Use Cases, Abuse Cases, dan Security Requirements — Kiw Kiw Chat

Dokumen ini mendefinisikan relasi hulu kebutuhan keamanan sistem pada **Kiw Kiw Chat** (Prototipe Riset), menghubungkan skenario penggunaan normal (*Use Case*), skenario penyalahgunaan (*Abuse Case*), dan persyaratan keamanan spesifik (*Security Requirements* - SR-01 s/d SR-18).

---

## 1. Matriks Relasi Use Case, Abuse Case, & Security Requirements

| Use Case ID | Nama Use Case | Abuse Case ID | Nama Abuse Case & Skenario Serangan | Security Requirement ID & Deskripsi |
|---|---|---|---|---|
| **UC-01** | **Inisialisasi Room Baru** (Peer A membuka web dan membuat room acak). | **AC-06** | **Room Creation Flooding**: Penyerang membanjiri endpoint pembuatan room dengan ribuan request per detik untuk melumpuhkan server. | **SR-15 (Rate Limiting API)**: Sistem wajib membatasi pembuatan room maksimal 10 request per IP per menit menggunakan middleware rate limiting. |
| **UC-02** | **Berbagi Tautan Undangan** (Peer A menyalin dan membagikan link ke Peer B). | **AC-01** | **Signaling Key Interception**: Penyerang menyadap traffic HTTP menuju signaling server untuk mencuri kunci enkripsi. | **SR-02 (Zero-Knowledge Relay via URL Fragment)**: Pre-shared room secret wajib ditempatkan pada URL fragment (`#`) agar tidak pernah dikirim ke server backend (RFC 3986). |
| **UC-03** | **Peer B Bergabung ke Room** (Peer B membuka link dengan room secret). | **AC-02** | **Unauthorized Room Entry**: Penyerang mencoba menyusup ke room privat tanpa token atau link yang sah. | **SR-08 (Room Existence & Token Auth)**: Server wajib memvalidasi keberadaan room dan parameter token sebelum mengizinkan koneksi WebSocket. |
| **UC-04** | **Pertukaran Sinyal WebRTC** (Signaling SDP/ICE via WebSocket backend). | **AC-07** | **WebSocket Frame Bombing**: Penyerang mengirim frame pesan biner berukuran sangat besar untuk menguras memori server. | **SR-16 (Signaling Frame & Timeout Guard)**: Server wajib membatasi payload frame WebSocket maksimal 64 KB dan menutup soket idle $>60$ detik. |
| **UC-04** | **Pertukaran Sinyal WebRTC** | **AC-08** | **CORS Spoofing**: Web pihak ketiga jahat memicu koneksi WebSocket atau API tanpa izin dari domain luar. | **SR-13 (CORS Origin Whitelisting)**: Server wajib membatasi CORS ke domain terdaftar pada `ALLOWED_ORIGINS`. |
| **UC-05** | **Handshake Pasca-Kuantum** (Pertukaran public key & ciphertext ML-KEM-768). | **AC-03** | **Man-in-the-Middle (MitM) & Quantum Sniffing**: Penyerang merekam traffic untuk didekripsi komputer kuantum masa depan atau menyuntikkan public key palsu saat handshake. | **SR-03 (PQC Session-Key Establishment)**: Sistem wajib menggunakan ML-KEM-768 (parameter mengikuti FIPS 203) untuk pertukaran kunci sesi pasca-kuantum.<br/>**SR-04 (HKDF Secret Fusion)**: Sistem wajib menggabungkan pre-shared room secret dan PQC shared secret via HKDF-SHA-256 (RFC 5869).<br/>**SR-08 (Mutual Key Confirmation)**: Sistem wajib memverifikasi transcript handshake dengan HMAC-SHA-256 dua arah (*mutual key confirmation*). |
| **UC-06** | **Obrolan Terenkripsi P2P** (Pengiriman pesan teks terenkripsi dua arah). | **AC-04** | **DataChannel Passive Sniffing & Replay Attack**: Penyerang menyadap lalu lintas DataChannel atau menginjeksi ulang pesan lama. | **SR-01 (AES-GCM Application Layer Encryption)**: Pesan wajib dienkripsi AES-GCM-256 dengan IV unik 12-byte per pesan.<br/>**SR-07 (AAD Metadata Binding)**: Metadata sequence counter dan direction wajib diikat ke dalam Additional Authenticated Data (AAD). |
| **UC-07** | **Penghitungan Waktu Room** (Room aktif selama 15 menit). | **AC-10** | **Zombie Room Hijacking**: Room terbengkalai tetap aktif di server dan digunakan kembali oleh pihak lain. | **SR-10 (Strict 15-Minute Room TTL)**: Server wajib memusnahkan room dan memutuskan seluruh soket secara otomatis setelah 900 detik. |
| **UC-08** | **Penyegaran Tab / Navigasi** (Pengguna menutup atau merefresh browser). | **AC-09** | **Client Storage Forensics**: Penyerang membaca riwayat pesan dari sisa cache penyimpanan browser lokal. | **SR-05 (Ephemeral Client Storage)**: Riwayat chat hanya boleh disimpan pada `sessionStorage` per-tab dan dihapus total saat pemusnahan room. |
| **UC-09** | **Pemusnahan Room Manual** (Pengguna menekan tombol Hapus Room). | **AC-02** | **Post-Exit Room Reuse**: Pihak ketiga mencoba masuk ke room yang telah ditinggalkan pengguna sebelumnya. | **SR-11 (Instant Room Purging)**: Server wajib menghapus entri room dari memori dan mengirim event `room_ended` ke peer lawan seketika. |
| **UC-10** | **Penolakan Peer ke-3** (Pihak ketiga membuka link room yang sudah terisi 2 orang). | **AC-02** | **Third-Party Eavesdropping**: Pihak ketiga mencoba mendengarkan percakapan dengan menyambung sebagai peer tambahan. | **SR-09 (Strict 2-Peer Max Capacity)**: Server wajib menolak koneksi ke-3 seketika dengan frame `room_full` dan kode penutupan 1008. |
| **N/A** | **Integritas Kode Backend** | **AC-06** | **Static Code Flaws / Misconfigurations**: Kerentanan umum seperti hardcoded secrets atau loop unhandled exception. | **SR-17 (SAST Security Quality Gate)**: Kode backend Python wajib dipindai berkala dengan Bandit tanpa adanya temuan High Severity. |
| **N/A** | **Ketahanan Frontend Web** | **AC-08** | **UI Script Injection & Clickjacking**: Serangan XSS atau penyematan UI dalam iframe jahat. | **SR-18 (Security Headers & CSP)**: Web wajib menerapkan header `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, dan CSP meta tag. |

---

## 2. Inventaris Lengkap Security Requirements (SR-01 s/d SR-18)

1. **SR-01**: Enkripsi AES-GCM-256 pada layer aplikasi dengan pembangkitan IV unik 12-byte acak per pesan.
2. **SR-02**: Penempatan pre-shared room secret pada URL fragment (`#`) untuk isolasi dari server signaling (Zero-Knowledge Relay).
3. **SR-03**: Pembentukan kunci sesi berbasis ML-KEM-768 dengan ukuran parameter sesuai NIST FIPS 203.
4. **SR-04**: Fusi kunci kriptografi (pre-shared secret + PQC shared secret) menggunakan HKDF-SHA-256 sesuai RFC 5869.
5. **SR-05**: Isolasi data perpesanan secara efemeral hanya pada memori browser dan `sessionStorage` per-tab.
6. **SR-06**: Pelepasan referensi memori (*memory pointer dereference*) kunci privat ML-KEM setelah dekapsulasi selesai.
7. **SR-07**: Pengikatan metadata (`version|roomId|direction|sequence`) ke dalam Additional Authenticated Data (AAD) AES-GCM.
8. **SR-08**: Konfirmasi kunci timbal balik (*mutual key confirmation*) menggunakan HMAC-SHA-256 atas transcript handshake dengan *length-prefixed framing*.
9. **SR-09**: Penegakan kapasitas maksimal 2 peer per room pada layer signaling socket server.
10. **SR-10**: Pembatasan masa hidup room maksimal 15 menit (900 detik) sejak inisialisasi di server (*Server Room TTL*).
11. **SR-11**: Pemusnahan instan seluruh state room di memori server saat salah satu peer memutuskan koneksi atau menekan Hapus Room.
12. **SR-12**: Pembersihan total state penyimpanan klien (`sessionStorage`) saat penerimaan event `room_ended`.
13. **SR-13**: Pembatasan Cross-Origin Resource Sharing (CORS) hanya untuk domain resmi terdaftar pada whitelist `ALLOWED_ORIGINS`.
14. **SR-14**: Validasi keberadaan room ID di memori dan keabsahan token otorisasi sebelum mengizinkan upgrade WebSocket.
15. **SR-15**: Pembatasan laju request (Rate Limiting) maksimal 10 request per IP per menit pada endpoint `POST /rooms`.
16. **SR-16**: Pembatasan ukuran frame WebSocket maksimal 64 KB (`MAX_MSG_BYTES`) dan idle timeout koneksi 60 detik (`WS_IDLE_TIMEOUT`).
17. **SR-17**: Penegakan kualitas kode statis backend Python dengan 0 kerentanan High Severity pada analisis Bandit.
18. **SR-18**: Penegakan header pertahanan HTTP (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`) dan CSP meta tag.
