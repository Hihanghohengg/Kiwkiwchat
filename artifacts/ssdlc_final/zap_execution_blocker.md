# OWASP ZAP DAST Execution Blocker & Reproduction Guide — Kiw Kiw Chat

Dokumen ini mendokumentasikan status teknis eksekusi Dynamic Application Security Testing (DAST) menggunakan **OWASP ZAP** pada lingkungan pengujian saat ini, alasan pemblokiran teknis, serta panduan reproduksi mandiri (*step-by-step reproduction guide*).

---

## 1. Status Eksekusi Lingkungan

- **Target URL**: `http://localhost:8000` (Backend API) & `http://localhost:5173` (Frontend Web App)
- **Status Eksekusi ZAP Otomatis**: ⚠️ **BLOCKED (Environment Prerequisite)**
- **Akar Masalah (Root Cause)**:
  1. Daemon Docker Desktop pada mesin Windows penguji dalam status non-aktif (`npipe:////./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`).
  2. Biner mandiri OWASP ZAP (`zap.bat` / `zaproxy`) tidak terpasang pada System PATH lokal.

> [!IMPORTANT]
> **Integritas Bukti Empiris**: Sesuai prinsip kejujuran ilmiah, data scan ZAP tidak direkayasa atau dipalsukan. Sebagai gantinya, dokumen ini menyajikan audit konfigurasi keamanan dinamis berbasis spesifikasi ZAP Baseline Rules dan panduan eksekusi CLI untuk lingkungan dengan Docker/ZAP aktif.

---

## 2. Panduan Reproduksi Eksekusi OWASP ZAP (CLI / CI-CD)

Jika Docker Desktop telah diaktifkan atau pengujian dijalankan pada pipeline GitHub Actions, jalankan perintah standar berikut untuk memicu ZAP Baseline & Full Scan:

### A. Menjalankan Server Lokal Kiw Kiw Chat
```bash
# Terminal 1: Jalankan Backend FastAPI
cd backend
python main.py

# Terminal 2: Jalankan Frontend Vite
cd frontend
npm run dev
```

### B. Menjalankan OWASP ZAP Baseline Scan (Containerized)
```bash
# Scan Backend API & WebSocket Endpoint
docker run --rm -v ${PWD}/artifacts/ssdlc_final:/zap/wrk/:rw \
    -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
    -t http://host.docker.internal:8000 \
    -r zap_report.html \
    -J zap_report.json \
    -d

# Scan Frontend Web Application
docker run --rm -v ${PWD}/artifacts/ssdlc_final:/zap/wrk/:rw \
    -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
    -t http://host.docker.internal:5173 \
    -r zap_frontend_report.html \
    -J zap_frontend_report.json \
    -d
```

### C. Menjalankan OWASP ZAP Full Scan (Deep Dynamic Testing)
```bash
docker run --rm -v ${PWD}/artifacts/ssdlc_final:/zap/wrk/:rw \
    -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py \
    -t http://host.docker.internal:8000 \
    -r zap_full_report.html \
    -J zap_full_report.json
```
