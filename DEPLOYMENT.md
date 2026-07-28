# 🌍 Panduan Deployment (Vercel & Render)

Kiw Kiw Chat terdiri dari dua bagian utama:
1. **Frontend (React/Vite)**
2. **Backend (Python/FastAPI)**

Meskipun dalam satu repository (Monorepo), kamu harus men-deploy keduanya secara terpisah ke layanan hosting agar berfungsi maksimal secara gratis. Kombinasi yang paling direkomendasikan adalah **Vercel** untuk Frontend dan **Render** untuk Backend.

---

## Tahap 1: Persiapan Repository
1. Push semua kode yang ada di folder proyek ini ke repository GitHub kamu.
2. Pastikan file `.env` **TIDAK** ikut ter-push (sudah dicegah oleh `.gitignore`).

---

## Tahap 2: Deploy Backend ke Render (Gratis)
Karena GitHub Pages dan Vercel tidak dirancang untuk menjalankan server Python WebSockets yang aktif terus menerus, kita akan menggunakan **Render**.

1. Buka dan login ke [Render.com](https://render.com).
2. Klik tombol **New +** lalu pilih **Web Service**.
3. Hubungkan dengan akun GitHub kamu dan pilih repository Kiw Kiw Chat.
4. Isi form konfigurasi dengan data berikut:
   - **Name**: `kiwkiw-backend` (atau nama lain)
   - **Root Directory**: `backend` *(sangat penting!)*
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Gulir ke bawah dan klik **Advanced** untuk menambahkan **Environment Variables**:
   - `ALLOWED_ORIGINS` = `https://<nama-domain-vercel-kamu.vercel.app>` *(Nanti bisa diupdate setelah Vercel selesai dibuat)*
   - `MAX_MSG_BYTES` = `5242880`
   - `WS_IDLE_TIMEOUT` = `60`
   - `ROOM_TTL_SECONDS` = `900`
6. Klik **Create Web Service**. Tunggu beberapa menit hingga status menjadi *Live*.
7. Salin URL Render kamu (contoh: `https://kiwkiw-backend-xyz.onrender.com`). URL ini akan dipakai di Frontend.

---

## Tahap 3: Deploy Frontend ke Vercel (Gratis & Cepat)
Vercel sangat optimal untuk mendeploy aplikasi Vite/React.

1. Buka dan login ke [Vercel.com](https://vercel.com).
2. Klik tombol **Add New...** > **Project**.
3. Import repository GitHub Kiw Kiw Chat kamu.
4. Pada bagian **Framework Preset**, pastikan terpilih **Vite**.
5. Pada bagian **Root Directory**, klik Edit dan pilih folder **`frontend`** *(sangat penting!)*.
6. Buka bagian **Environment Variables** dan tambahkan 2 variabel berikut:
   - **Key**: `VITE_API_URL`
     - **Value**: `https://<url-render-kamu>` *(contoh: `https://kiwkiw-backend-xyz.onrender.com`)*
   - **Key**: `VITE_WS_URL`
     - **Value**: `wss://<url-render-kamu>` *(perhatikan penggunaan `wss://` menggantikan `https://`)*
7. Klik **Deploy**.
8. Tunggu hingga proses build selesai. Setelah selesai, kamu akan mendapatkan URL Vercel (contoh: `https://kiwkiw-chat.vercel.app`).

---

## Tahap 4: Finalisasi
Setelah Frontend berhasil di-deploy, copy URL Vercel kamu.
1. Kembali ke Dashboard **Render**.
2. Masuk ke pengaturan **Environment** untuk `kiwkiw-backend`.
3. Update nilai `ALLOWED_ORIGINS` menjadi URL Vercel kamu (contoh: `https://kiwkiw-chat.vercel.app`). **Jangan** pakai tanda slash `/` di akhir URL.
4. Render akan otomatis restart server.

🎉 **Selesai! Aplikasi kamu sudah live dan siap digunakan.**

> **Info TURN Server:**  
> Jika pengguna gagal terhubung satu sama lain (sering tertahan di log *ICE candidates* karena koneksi internet restrict / Symmetric NAT), kamu perlu menambahkan kredensial TURN server gratis (seperti dari Metered.ca) di Environment Variables Backend Render kamu (`TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`).
