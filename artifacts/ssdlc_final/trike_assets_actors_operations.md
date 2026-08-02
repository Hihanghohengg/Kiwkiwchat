# Trike Threat Modeling: Assets, Actors & Operations — Kiw Kiw Chat

Dokumen ini mendefinisikan inventaris aset sistem, profil aktor, operasi yang didukung, serta matriks otorisasi (*Permission Matrix*) pada **Kiw Kiw Chat** (Prototipe Riset) sesuai metodologi **Trike Threat Modeling**.

---

## 1. Inventaris Aset Sistem (AST-01 s/d AST-14)

| ID Aset | Nama Aset | Klasifikasi Kerahasiaan | Dampak Jika Bocor / Rusak | Deskripsi Teknis & Lokasi Penyimpanan |
|---|---|---|---|---|
| **AST-01** | **Plaintext Chat Message** | Kritis | Kritis (Privasi total hancur) | Konten percakapan teks efemeral; hanya ada di RAM browser selama sesi aktif. |
| **AST-02** | **Pre-Shared Room Secret** | Kritis | Kritis (Dekripsi sesi awal terbuka) | Secret acak base64 di URL fragment (`#`), dibangkitkan oleh Peer A, dibagikan out-of-band ke Peer B. |
| **AST-03** | **ML-KEM Secret Key (SK)** | Kritis | Kritis (Dekapsulasi kuantum terbuka) | Kunci privat post-quantum 2400-byte di RAM Peer A; didereferensikan (`delete`) setelah dekapsulasi. |
| **AST-04** | **ML-KEM Public Key (PK)** | Publik | Rendah (Hanya kunci publik) | Kunci publik 1184-byte yang dikirimkan via DataChannel dalam pesan `pq-pubkey`. |
| **AST-05** | **ML-KEM Ciphertext (CT)** | Publik Terenkripsi | Rendah (Tahan komputasi kuantum) | Ciphertext enkapsulasi 1088-byte yang dikirimkan via DataChannel dalam pesan `pq-encap`. |
| **AST-06** | **ML-KEM Shared Secret** | Kritis | Kritis (Bahan fusi kunci terbongkar) | Secret 32-byte hasil pertukaran kuantum di RAM; langsung dikonsumsi HKDF dan didereferensikan. |
| **AST-07** | **Session Encryption Key (`K_enc`)** | Kritis | Kritis (Ciphertext pesan terbongkar) | CryptoKey AES-GCM-256 hasil derivasi HKDF untuk enkripsi payload DataChannel. |
| **AST-08** | **Confirmation HMAC Key (`K_conf`)** | Kritis | Kritis (Autentikasi handshake palsu) | CryptoKey HMAC-SHA-256 hasil derivasi HKDF untuk mutual key confirmation transcript. |
| **AST-09** | **Transcript Hash & Nonces** | Integritas Tinggi | Tinggi (MitM tidak terdeteksi) | Dua nonce 16-byte acak dan hash SHA-256 length-prefixed pengikat transcript handshake. |
| **AST-10** | **Room ID & WS Token** | Sedang | Rendah (Hanya identitas routing) | UUID v4 dan token autentikasi single-use di URL fragment dan memori server. |
| **AST-11** | **Signaling SDP/ICE Metadata** | Publik Terbatas | Rendah (Metadata IP/Port kandidat) | Objek SDP Offer/Answer dan ICE Candidate yang direlay oleh server backend. |
| **AST-12** | **Session Storage Cache** | Sedang | Sedang (Riwayat lokal saat tab aktif) | Cache lokal pesan terdekripsi di `sessionStorage` per-tab; dibersihkan saat room destroy. |
| **AST-13** | **Server In-Memory Room Table** | Integritas Sedang | Sedang (Gangguan perutean room) | Struktur data `dict` di memori proses FastAPI backend untuk tracking koneksi. |
| **AST-14** | **Server Compute & RAM Resources** | Ketersediaan | Tinggi (Denial of Service server) | Kapasitas CPU, socket descriptor, dan RAM pada server backend hosting. |

---

## 2. Profil Aktor Sistem (ACT-01 s/d ACT-07)

| ID Aktor | Nama Aktor | Tingkat Kepercayaan | Deskripsi & Batasan Akses |
|---|---|---|---|
| **ACT-01** | **Peer A (Room Initiator)** | Trusted | Pengguna yang membuat room, membangkitkan room secret, membangkitkan pasangan kunci ML-KEM-768, dan mengundang Peer B. |
| **ACT-02** | **Peer B (Room Responder)** | Trusted | Pengguna yang menerima link undangan, mengimpor room secret dari URL fragment, dan melakukan enkapsulasi ML-KEM-768. |
| **ACT-03** | **Third-Party Peer (Uninvited)** | Untrusted / Malicious | Pengguna luar yang mencoba menyusup ke dalam room privat tanpa otorisasi atau setelah room penuh. |
| **ACT-04** | **Signaling Server (Backend)** | Untrusted Relay | Layanan FastAPI yang meneruskan pesan signaling; diasumsikan *honest-but-curious* hingga *compromised*. Tidak menerima material kunci aplikasi dalam alur normal. |
| **ACT-05** | **Passive Network Eavesdropper** | Malicious | Entitas jaringan (ISP, sniffer Wi-Fi) yang menyadap seluruh paket TCP/UDP yang lewat di jaringan transit. |
| **ACT-06** | **Active Network Attacker (MitM)** | Malicious | Penyerang jaringan aktif yang mampu mengubah, menginjeksi, menghapus, atau mereinjeksi paket data. |
| **ACT-07** | **Quantum-Capable Adversary** | Malicious | Penyerang yang menyimpan rekaman lalu lintas jaringan (*Harvest Now, Decrypt Later*) dan menggunakan algoritma Shor di masa depan. |

---

## 3. Matriks Otorisasi / Hak Akses Trike (Permission Matrix)

Aturan otorisasi:
- **ALLOW**: Operasi diizinkan secara sah oleh desain arsitektur.
- **DENY**: Operasi ditolak keras dan dicegah oleh kontrol teknis.
- **COND**: Diizinkan hanya jika kondisi prasyarat terpenuhi (misal validasi token/kunci).
- **N/A**: Operasi tidak relevan atau tidak dimungkinkan secara fisik/arsitektur.

| Aset | Operasi | Peer A (ACT-01) | Peer B (ACT-02) | 3rd Peer (ACT-03) | Signaling Server (ACT-04) | Passive Sniffer (ACT-05) | Active MitM (ACT-06) | Quantum Adv (ACT-07) |
|---|---|---|---|---|---|---|---|---|
| **AST-01 (Plaintext)** | Read / Write | ALLOW | ALLOW | DENY | DENY | DENY | DENY | DENY |
| **AST-02 (PSK URL Fragment)** | Read / Write | ALLOW (Gen) | COND (via Link) | DENY | DENY (RFC 3986) | DENY | DENY | DENY |
| **AST-03 (ML-KEM SK)** | Read / Delete | ALLOW (RAM) | DENY | DENY | DENY | DENY | DENY | DENY |
| **AST-04 (ML-KEM PK)** | Read / Relay | ALLOW (Gen) | ALLOW (Read) | DENY | ALLOW (Relay) | ALLOW (Wire) | COND (Tamper $\to$ Drop) | ALLOW (Wire) |
| **AST-05 (ML-KEM CT)** | Read / Relay | ALLOW (Read) | ALLOW (Gen) | DENY | ALLOW (Relay) | ALLOW (Wire) | COND (Tamper $\to$ Drop) | ALLOW (Wire) |
| **AST-06 (Shared Secret)** | Read / Derive | ALLOW (RAM) | ALLOW (RAM) | DENY | DENY | DENY | DENY | DENY |
| **AST-07 (Session Enc Key)** | Read / Use | ALLOW (Subtle) | ALLOW (Subtle) | DENY | DENY | DENY | DENY | DENY |
| **AST-08 (Confirm HMAC Key)**| Read / Use | ALLOW (Subtle) | ALLOW (Subtle) | DENY | DENY | DENY | DENY | DENY |
| **AST-09 (Transcript Hash)** | Compute / Verify | ALLOW | ALLOW | DENY | DENY | DENY | DENY (Drop on Mismatch) | DENY |
| **AST-10 (Room ID & Token)** | Read / Verify | ALLOW | ALLOW | COND (Valid) | ALLOW (Verify) | ALLOW (Metadata) | ALLOW (Metadata) | ALLOW (Metadata) |
| **AST-11 (Signaling Data)** | Read / Relay | ALLOW | ALLOW | DENY | ALLOW (Relay) | ALLOW (Wire/TLS) | COND (Integrity TLS) | ALLOW |
| **AST-12 (sessionStorage)** | Read / Clear | ALLOW (Local) | ALLOW (Local) | DENY | DENY | DENY | DENY | DENY |
| **AST-13 (Server Room Dict)**| Create / Delete | COND (via API) | COND (via API) | DENY | ALLOW (Host) | DENY | DENY | DENY |
| **AST-14 (Server Resources)**| Consume | COND (RateLimit)| COND (RateLimit)| COND (Blocked)| ALLOW (Host) | N/A | COND (RateLimit) | N/A |
