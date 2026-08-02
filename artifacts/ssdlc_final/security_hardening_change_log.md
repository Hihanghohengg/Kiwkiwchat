# Log Riwayat Penguatan Keamanan (Security Hardening Change Log) — Kiw Kiw Chat

Dokumen ini mencatat seluruh intervensi penguatan keamanan (*Security Hardening*) yang telah diimplementasikan pada **Kiw Kiw Chat** selama siklus pengembangan aman (SSDLC).

---

## 1. Kronologi Penguatan Keamanan Sistem (SEC-01 s/d SEC-10)

| ID Hardening | Modul Target | Kerentanan / Ancaman yang Ditangani | Deskripsi Intervensi Penguatan Keamanan | Komitmen Kode / File Terkait |
|---|---|---|---|---|
| **SEC-01** | Backend Signaling | **T-12 (Rogue WS Connection)**: Penyerang membuat koneksi WebSocket langsung ke room acak tanpa melewati endpoint pembuatan room. | Menambahkan validasi keberadaan room ID di memori server dan mewajibkan token valid (`token`). Koneksi ilegal ditutup seketika dengan kode 1008. | `backend/main.py:websocket_endpoint` |
| **SEC-02** | Backend API | **T-13 (Room Creation DoS)**: Penyerang membanjiri server dengan request pembuatan ribuan room per detik. | Mengintegrasikan middleware `SlowAPI` dengan batas kuota 10 request per IP per menit pada endpoint `POST /rooms`. | `backend/main.py:create_room` |
| **SEC-03** | Frontend Crypto | **T-05 (MitM Transcript Collision)**: Risiko ambiguitas atau collision pada penggabungan komponen transcript handshake kuantum. | Menerapkan *Length-Prefixed Framing* (4-byte length prefix) pada serialisasi setiap komponen transcript sebelum di-hash SHA-256. | `frontend/src/crypto/pq_upgrade.js:computeTranscriptHash` |
| **SEC-04** | Frontend Handshake | **T-05 (MitM Handshake Injection)**: Penyerang menyusupkan kunci publik palsu tanpa verifikasi timbal balik. | Menerapkan pertukaran dua nonce acak 16-byte (`initiatorNonce` dan `responderNonce`) serta verifikasi mutual HMAC-SHA-256 (`pq-confirm`). | `frontend/src/crypto/pq_upgrade.js:verifyConfirmHmac` |
| **SEC-05** | Frontend Encryption | **T-08 (Message Tampering / Replay)**: Penyerang mengubah urutan pesan atau menginjeksi ulang pesan lama. | Mengikat metadata (`version\|roomId\|direction\|sequence`) ke dalam Additional Authenticated Data (AAD) AES-GCM-256. | `frontend/src/crypto/encryption.js:encrypt, decrypt` |
| **SEC-06** | Backend Signaling | **T-14 (Memory Exhaustion & Zombie WS)**: Penyerang mengirim frame data raksasa atau membuka soket idle berkepanjangan. | Menetapkan batasan payload frame WS maksimal 64 KB (`MAX_MSG_BYTES`) dan idle timeout 60 detik (`WS_IDLE_TIMEOUT`). | `backend/main.py:websocket_endpoint` |
| **SEC-07** | Backend Teardown | **T-15 (Unhandled Exception Crash)**: Penggunaan *bare except* menyebabkan penghentian tak terduga pada siklus pembersihan room. | Mengganti *bare except* dengan `except Exception: pass` terstruktur dan logging error terisolasi saat operasi penutupan soket. | `backend/main.py:destroy_room_later` |
| **SEC-08** | Deployment / Web Headers | **T-16 (XSS & Clickjacking)**: Halaman disematkan dalam iframe jahat atau memuat skrip pihak ketiga tanpa izin. | Mengonfigurasi `Content-Security-Policy` strict, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, dan `Referrer-Policy: no-referrer`. | `backend/main.py`, `vercel.json` |
| **SEC-09** | Frontend Key Lifecycle | **T-06 (Private Key Retention in RAM)**: Kunci privat ML-KEM dan shared secret tertinggal di memori browser setelah handshake. | Menambahkan instruksi penghapusan eksplisit (`delete peer._pqSecretKey`) dan dereferensi memori segera setelah dekapsulasi selesai. | `frontend/src/crypto/pq_upgrade.js` |
| **SEC-10** | Frontend Ephemeral Cache | **T-10 (Persistent Forensic Artifacts)**: Sisa percakapan tertinggal pada storage browser setelah room dimusnahkan. | Membatasi penyimpanan hanya pada `sessionStorage` per-tab dan memicu `clearRoomStorage()` seketika saat event `room_ended` diterima. | `frontend/src/utils/storage.js` |
