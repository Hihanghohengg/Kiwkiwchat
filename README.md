# 🚀 Kiw Kiw Chat

**The Conversation That Never Happened.**  
*Aplikasi chat ephemeral (sementara) berbasis Peer-to-Peer (P2P) dengan filosofi zero-trace.*

Kiw Kiw Chat adalah aplikasi percakapan real-time yang memanfaatkan **WebRTC** untuk komunikasi langsung antar browser dan **Post-Quantum Cryptography (ML-KEM-768)** sebagai pelindung ekstra pada proses pertukaran kunci. Tidak ada akun, tidak ada instalasi, dan tidak ada jejak digital setelah sesi berakhir.

---

## 🎯 Fitur Utama

- **Zero-Trace & Ephemeral:** Room akan otomatis hancur setelah 15 menit atau ketika pengguna keluar dari percakapan. Tidak ada data chat yang disimpan di server.
- **Peer-to-Peer (WebRTC):** Chat dilakukan *langsung* antar browser, tanpa melalui server sebagai perantara (server hanya berfungsi untuk inisialisasi koneksi / *signaling*).
- **Post-Quantum Ready:** Menggunakan algoritma **ML-KEM-768** (standar NIST FIPS 203) digabungkan dengan **AES-GCM-256** untuk menjamin kerahasiaan pesan dari ancaman komputasi kuantum di masa depan.
- **No Database:** Backend murni menggunakan *in-memory state* (RAM) yang akan musnah seketika saat server di-restart.
- **Security Audited:** Teruji ketat oleh SAST (Bandit Python) dan DAST (OWASP ZAP) compliance dengan strict CSP, SRI, dan Security Headers (`vercel.json`).

---

## 🏗 Arsitektur & Teknologi

| Bagian | Teknologi Utama |
|---|---|
| **Frontend** | React 19, Vite, TailwindCSS v4 |
| **Backend** | Python 3.12, FastAPI, Uvicorn, WebSockets |
| **Kriptografi** | Web Crypto API (AES-GCM-256, HKDF-SHA-256), `mlkem` v2.7.0 (ML-KEM-768) |
| **P2P Transport** | WebRTC (DataChannels), RTCPeerConnection |

> **Catatan Akademis:**  
> Untuk detail lengkap mengenai arsitektur, ancaman keamanan, evaluasi kriptografi, dan test plan, silakan rujuk ke dokumen **[BLUEPRINT.md](./BLUEPRINT.md)**.

---

## 🚀 Cara Menjalankan Lokal (Development)

Pastikan kamu sudah menginstal **Node.js (v20+)** dan **Python (3.11+)**.

1. **Install Dependencies Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

2. **Install Dependencies Frontend:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Jalankan Keduanya (via Concurrently):**
   ```bash
   npm install   # install concurrently di root
   npm start
   ```

- Frontend dapat diakses di: `http://localhost:5173`
- Backend API & WebSocket berjalan di: `http://localhost:8000`

---

## 🌍 Cara Deploy (Production)

Kiw Kiw Chat sudah dirancang siap *deploy* ke production dengan berbagai parameter keamanan yang dapat dikonfigurasi melalui *Environment Variables*. 

Lihat dokumen **[DEPLOYMENT.md](./DEPLOYMENT.md)** untuk panduan langkah demi langkah *deploy* ke **GitHub**, **Vercel** (untuk Frontend), dan platform seperti **Render** (untuk Backend).

---

## 📝 Lisensi
[MIT License](./LICENSE)
