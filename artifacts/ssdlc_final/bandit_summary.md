# Laporan Audit SAST Bandit (Backend Python) — Kiw Kiw Chat

Dokumen ini mendokumentasikan hasil pemindaian keamanan statis (*Static Application Security Testing* - SAST) menggunakan **Bandit v1.9.4** pada kode sumber backend Python (`backend/main.py`).

---

## 1. Ringkasan Eksekutif SAST

- **Target Pemindaian**: `backend/` (269 baris kode sumber / LOC)
- **Waktu Pemindaian**: 2026-08-02T11:39:40Z
- **File Laporan JSON**: [`artifacts/ssdlc_final/bandit_report.json`](file:///d:/Obed/kiwkiw/artifacts/ssdlc_final/bandit_report.json)
- **Status Kepatuhan Bug Bar**: ✅ **LULUS (0 High Severity Vulnerabilities)**

| Tingkat Keparahan (Severity) | Jumlah Temuan | Status Resolusi / Disposisi |
|---|---|---|
| **High Severity** | **0** | Bersih (Tidak ada kerentanan kritis) |
| **Medium Severity** | **1** | **Accepted Deployment Risk** (B104: Bind 0.0.0.0) |
| **Low Severity** | **3** | **Accepted Technical Debt** (B110: Try-Except-Pass pada Teardown) |
| **Total Temuan** | **4** | Seluruh temuan telah ditinjau dan dievaluasi |

---

## 2. Rincian dan Analisis Temuan

### A. Temuan 1 (Medium Severity): B104 — Hardcoded Bind All Interfaces
- **File & Baris**: `backend/main.py:360`
- **CWE**: [CWE-605: Multiple Binds to the Same Port](https://cwe.mitre.org/data/definitions/605.html)
- **Cuplikan Kode**:
  ```python
  if __name__ == "__main__":
      import uvicorn
      uvicorn.run(
          app,
          host="0.0.0.0",
          port=8000,
          log_config=None,
      )
  ```
- **Analisis & Disposisi**:
  - Binding ke `0.0.0.0` pada blok `__main__` diperlukan untuk deployment berbasis container Docker dan PaaS (Render) agar server dapat menerima trafik ingress dari load balancer internal.
  - Pada lingkungan produksi sesungguhnya, port 8000 tidak diekspos langsung ke internet melainkan berada di belakang reverse proxy / Cloudflare TLS termination.
  - **Disposisi**: *Accepted Deployment Risk (No Code Change Required)*.

---

### B. Temuan 2, 3, 4 (Low Severity): B110 — Try, Except, Pass Detected
- **File & Baris**: `backend/main.py:169`, `backend/main.py:313`, `backend/main.py:338`
- **CWE**: [CWE-703: Improper Check or Handling of Exceptional Conditions](https://cwe.mitre.org/data/definitions/703.html)
- **Cuplikan Kode**:
  ```python
  # Baris 168-170 (TTL Destruction):
  try:
      await ws.close(code=1008, reason="Room TTL expired")
  except Exception:
      pass

  # Baris 312-314 (Peer Destroyed Room):
  try:
      await ws.close(code=1008, reason="Room destroyed by peer")
  except Exception:
      pass

  # Baris 337-339 (Peer Disconnect Notification):
  try:
      await ws.send_json({"type": "peer_disconnected"})
  except Exception:
      pass
  ```
- **Analisis & Disposisi**:
  - Blok `try-except-pass` tersebut secara sengaja digunakan untuk menangani kondisi di mana peer klien sudah memutus koneksi TCP/WebSocket terlebih dahulu sebelum server sempat mengirimkan sinyal penutupan.
  - Jika exception tidak ditangkap (`swallowed gracefully`), loop pembersihan memori room akan terhenti (*unhandled exception*) dan berisiko meninggalkan *dangling connections* di memori.
  - **Disposisi**: *Accepted Technical Debt (Safe Idiomatic WebSocket Teardown)*.
