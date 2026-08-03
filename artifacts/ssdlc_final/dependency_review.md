# Tinjauan Keamanan Dependensi Perangkat Lunak (Software Composition Analysis) — Kiw Kiw Chat

Dokumen ini menyajikan audit keamanan dependensi pihak ketiga (*Software Composition Analysis* - SCA) untuk frontend (NPM) dan backend (PyPI) pada **Kiw Kiw Chat** (Prototipe Riset).

---

## 1. Audit Dependensi Frontend (NPM Audit)

- **Jumlah Paket Dipindai**: 113 paket pihak ketiga (`package-lock.json`).
- **Hasil Pemindaian (`npm audit`)**: **0 Kerentanan Ditemukan (0 Vulnerabilities)**.
- **Raw Report**: [`npm_audit_report.json`](./npm_audit_report.json).
- **Status Frontend SCA**: ✅ **PASS (0 Vulnerabilities)**.

---

## 2. Audit Dependensi Backend (Pip-Audit Analysis)

- **Paket Terpasang di Lingkungan Backend**: `fastapi==0.110.0`, `starlette==0.36.3`, `uvicorn==0.28.0`, `slowapi==0.1.9`, `python-multipart==0.0.9`.
- **Hasil Pemindaian (`pip-audit`)**: Ditemukan **17 catatan advisory keamanan** pada dependensi web backend FastAPI & Starlette.
- **Raw Report**: [`pip_audit_report.json`](./pip_audit_report.json).
- **Status Backend SCA**: ⚠️ **OPEN / PARTIAL (REQUIRES VALIDATION & DEPENDENCY UPGRADE)**.

### Kategorisasi & Analisis Keterjangkauan Jalur Eksekusi:

| Kategori Kerentanan | Paket & Advisory Terkait | Evaluasi Keterjangkauan pada Alur Aplikasi Aktual | Status Penilaian |
|---|---|---|:---:|
| **A. Multipart / Form Parsing** | `python-multipart==0.0.9`<br/>(GHSA-2c7c-4779-pqpf, GHSA-592f-2r5v-h68g, GHSA-79h4-qm46-r723, GHSA-9jcw-2p2m-759f, GHSA-fcv7-x59w-94ph, GHSA-jx5v-xmg9-mj5v, GHSA-v23v-6cw2-m352)<br/>`fastapi==0.110.0`<br/>(GHSA-8h2j-cgx8-6w76 ReDoS) | Kiw Kiw Chat **hanya menggunakan payload JSON** pada `POST /rooms` dan pesan WebSocket mentah. Tidak ada route handler yang mengimpor `Form()`, `File()`, atau `UploadFile()`. Jalur parsing form/multipart **tidak dipanggil dalam alur normal aplikasi**. | **NOT REACHED IN CURRENT APPLICATION FLOW** |
| **B. URL / Path / Host Header Reconstruction** | `starlette==0.36.3`<br/>(GHSA-2c2j-9gv2-fj69 Path Traversal, GHSA-74m5-2c7w-9w3x, GHSA-p5wh-5927-456g Host Bypass, GHSA-v5gw-mw7f-84px Range DoS) | Server backend tidak menyajikan static file directory via `StaticFiles` dan tidak menggunakan `HTTPEndpoint` polymorphic routing. Namun, manipulasi header Host pada level reverse proxy belum diuji secara empiris dengan fuzzing khusus. | **REQUIRES VALIDATION** |
| **C. Transitive / Server Framing** | `uvicorn==0.28.0` / `starlette` / `fastapi` | Kerentanan parsing HTTP request pipelining atau websocket frame abnormal pada web server. | **OPEN FOR DEPENDENCY UPGRADE** |

---

## 3. Rekomendasi Mitigasi SCA

1. **Pembersihan Dependensi Tidak Digunakan**:
   - `python-multipart==0.0.9` dapat dihapus dari `backend/requirements.txt` karena backend sama sekali tidak memproses form upload / file transfer.
2. **Jadwal Pembaruan Dependensi Bertahap**:
   - Jadwalkan upgrade bertahap untuk `fastapi` ($\ge 0.115.0$), `starlette` ($\ge 0.40.0$), dan `uvicorn` ($\ge 0.32.0$).
   - **PENTING**: Jangan melakukan automated major version upgrade secara terburu-buru tanpa menjalankan kembali seluruh regression test suite (`test_impkrip_final.py`), karena potensi *breaking change* pada API WebSocket middleware.
