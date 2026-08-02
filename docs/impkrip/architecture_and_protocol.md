# Arsitektur & Alur Protokol Kriptografi IMPKRIP

Dokumen ini mendeskripsikan implementasi arsitektur dan alur protokol kriptografi pasca-kuantum (*Post-Quantum Cryptography*) pada aplikasi Kiw Kiw Chat.

---

## 1. Diagram Arsitektur Kriptografi

```mermaid
graph TD
    subgraph Browser_A["Browser Initiator (Peer A)"]
        UI_A["React UI & Storage"]
        MLKEM_A["ML-KEM-768 Engine"]
        HKDF_A["HKDF-SHA-256 Fusion"]
        AES_A["AES-GCM-256 Engine"]
        HMAC_A["HMAC-SHA-256 Verifier"]
    end

    subgraph OutOfBand["Out-of-Band Channel (RFC 3986)"]
        URL_Hash["URL Fragment (#token|classical_key)"]
    end

    subgraph Signaling["FastAPI WebSocket Relay (Zero-Knowledge)"]
        WS_Relay["WebSocket Signaling Server (/rooms/{id}/ws)"]
    end

    subgraph Browser_B["Browser Responder (Peer B)"]
        UI_B["React UI & Storage"]
        MLKEM_B["ML-KEM-768 Engine"]
        HKDF_B["HKDF-SHA-256 Fusion"]
        AES_B["AES-GCM-256 Engine"]
        HMAC_B["HMAC-SHA-256 Generator"]
    end

    UI_A -->|"1. Generate Room Secret & Hash"| URL_Hash
    URL_Hash -->|"2. Share Link Out-of-Band"| UI_B
    UI_A <-->|"3. Relay SDP & ICE Only"| WS_Relay
    WS_Relay <-->|"3. Relay SDP & ICE Only"| UI_B
    Browser_A <==|"4. WebRTC DataChannel (Direct P2P)"|==> Browser_B
    MLKEM_A <==|"5. ML-KEM Key Exchange + HMAC"|==> MLKEM_B
    HKDF_A -->|"6. Derive Session Keys"| AES_A
    HKDF_B -->|"6. Derive Session Keys"| AES_B
    AES_A <==|"7. AEAD Encrypted Messages"|==> AES_B
```

---

## 2. Alur Protokol Kriptografi 3-Pesan

Pertukaran kunci menggunakan kombinasi **ML-KEM-768 (NIST FIPS 203)**, **HKDF-SHA-256**, **HMAC-SHA-256**, dan **AES-GCM-256**:

```
PEER A (INITIATOR)                                         PEER B (RESPONDER)
       │                                                          │
       │  1. Bangkitkan Classical Key (256-bit AES)               │
       │     Disematkan di URL Fragment (#token|classicalKey)    │
       │                                                          │
       │  2. Bangkitkan Pasangan Kunci Ephemeral ML-KEM-768       │
       │     (ek, dk) = MlKem768.generateKeyPair()                │
       │     ek: 1184 bytes, dk: 2400 bytes                       │
       │     Bangkitkan initiatorNonce (16 bytes)                 │
       │                                                          │
       │ ──── Pesan 1: pq-pubkey { ek, initiatorNonce } ─────────►│
       │                                                          │
       │                                                          │  3. Enkapsulasi Secret ML-KEM-768
       │                                                          │     (c, ss) = MlKem768.encap(ek)
       │                                                          │     c: 1088 bytes, ss: 32 bytes
       │                                                          │     Bangkitkan responderNonce (16 bytes)
       │                                                          │  4. Derivasi Kunci Sesi:
       │                                                          │     (encKey, confKey) = HKDF(ss, classicalKey)
       │                                                          │  5. Hitung HMAC Responder:
       │                                                          │     respHmac = HMAC(confKey, "responder" || nonces)
       │                                                          │
       │◄─── Pesan 2: pq-encap { c, responderNonce, respHmac } ───│
       │                                                          │
       │  6. Dekapsulasi Secret ML-KEM-768:                       │
       │     ss = MlKem768.decap(c, dk)                           │
       │     Hapus dk dari memori (`delete peer._pqSecretKey`)    │
       │  7. Derivasi Kunci Sesi:                                 │
       │     (encKey, confKey) = HKDF(ss, classicalKey)           │
       │  8. Verifikasi respHmac menggunakan confKey              │
       │  9. Hitung HMAC Initiator:                               │
       │     initHmac = HMAC(confKey, "initiator" || nonces)      │
       │                                                          │
       │ ──── Pesan 3: pq-confirm { initHmac } ──────────────────►│
       │                                                          │ 10. Verifikasi initHmac menggunakan confKey
       │                                                          │
       ▼                                                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   HYBRID SESSION ENCRYPTION (AES-GCM-256)                │
│  - Enkripsi Pesan & File P2P menggunakan `encKey`                        │
│  - Nonce acak 96-bit (12 bytes) fresh per pesan                          │
│  - AAD Binding (Session ID + Sequence Counter)                           │
│  - Auth Tag 128-bit untuk verifikasi integritas data                     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Primitif Kriptografi yang Digunakan

1. **ML-KEM-768 (CRYSTALS-Kyber, NIST FIPS 203)**:
   - Tingkat Keamanan: NIST Security Level 3 (setara AES-192 / tahan serangan kuantum Shor).
   - Ukuran Public Key: 1.184 byte.
   - Ukuran Secret Key: 2.400 byte (ephemeral, dihapus setelah dekapsulasi).
   - Ukuran Ciphertext: 1.088 byte.
   - Ukuran Shared Secret: 32 byte (256 bit).
2. **HKDF-SHA-256 (RFC 5869)**:
   - Menggabungkan entropi kuantum (`ss`) dan entropi klasik (`classicalKey`).
   - Melakukan *key separation* untuk menghasilkan `encryptionKey` dan `confirmationKey` 256-bit independen.
3. **HMAC-SHA-256 (RFC 2104)**:
   - Digunakan untuk mutual key confirmation vector.
   - Mengikat label arah, `initiatorNonce`, dan `responderNonce` untuk menjamin kesegaran (*freshness*) dan mencegah manipulasi MitM.
4. **AES-GCM-256 (NIST SP 800-38D)**:
   - Menyediakan Authenticated Encryption with Associated Data (AEAD).
   - Tag autentikasi 128-bit menjamin *confidentiality* sekaligus *integrity*.
