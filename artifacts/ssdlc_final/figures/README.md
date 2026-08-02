# Inventaris Diagram & Ilustrasi SSDLC (Figures Inventory) — Kiw Kiw Chat

Direktori ini memuat seluruh diagram arsitektural, alur protokol kriptografi, batasan kepercayaan (*Trust Boundaries*), dan diagram alir metodologi SSDLC yang siap digunakan untuk penulisan artikel ilmiah / paper.

---

## 1. Daftar Gambar & Diagram untuk Paper

### Gambar 1: Alur Metodologi Microsoft SDL & Integrasi Trike Threat Modeling
Diagram ini mengilustrasikan fase inti Microsoft SDL dengan penekanan pada integrasi Trike Threat Modeling pada tahap *Requirements* dan *Design*.

```mermaid
flowchart TD
    subgraph SDL_Phases ["Siklus Microsoft SDL"]
        P0["0. Security Preparation & Knowledge<br/>• Standards Review (FIPS 203, RFC 5869)<br/>• Threat Taxonomy Definition"]
        P1["1. Requirements<br/>• Quality Bug Bar<br/>• Use & Abuse Cases<br/>• Security Req (SR-01..18)"]
        P2["2. Design<br/>• Trike Threat Modeling (T-01..16)<br/>• Assets & Actors Matrix<br/>• Trust Boundaries (TB-01, TB-02)"]
        P3["3. Implementation<br/>• WebCrypto & ML-KEM-768<br/>• Bandit SAST Scanning<br/>• Memory Pointer Dereference"]
        P4["4. Verification<br/>• 19 Automated Test Suite<br/>• Multi-run E2E Tests (3 Runs)<br/>• JS Heap Memory Profiling"]
        P5["5. Release<br/>• Final Security Review (FSR)<br/>• SCA Review (NPM & Pip)<br/>• Ready for Paper with Limitations"]
        P6["6. Response<br/>• 15-Min Room TTL Auto-Destroy<br/>• Ephemeral Client Storage Clear<br/>• Vulnerability Disclosure SOP"]
    end
    P0 --> P1 --> P2 --> P3 --> P4 --> P5 --> P6
```

---

### Gambar 2: Batasan Kepercayaan (Trust Boundaries) & Signaling Relay
Diagram ini memperlihatkan pemisahan tegas antara zona browser tepercaya (*Trusted Execution Zone*) dan jaringan perantara backend (*Untrusted Relay Zone*).

```mermaid
flowchart LR
    subgraph BrowserA ["Peer A (Browser Client - Trusted Execution Zone)"]
        A_RAM["Plaintext & Ephemeral SK (RAM)"]
        A_Subtle["WebCrypto & ML-KEM-768 Module"]
    end

    subgraph Signaling ["Backend Signaling Server (Untrusted Relay Zone)"]
        S_WS["WebSocket Connection Manager"]
        S_Mem["In-Memory Room Table (UUIDs only)"]
        S_Note["Signaling Relay: Does Not Receive Keying Material"]
    end

    subgraph BrowserB ["Peer B (Browser Client - Trusted Execution Zone)"]
        B_Subtle["WebCrypto & ML-KEM-768 Module"]
        B_RAM["Plaintext & Shared Secret (RAM)"]
    end

    BrowserA -- "Signaling Metadata (SDP/ICE via WSS) [TB-01]" --> Signaling
    Signaling -- "Relayed Metadata (WSS) [TB-01]" --> BrowserB
    BrowserA <== "Direct E2EE WebRTC DataChannel (DTLS + AES-GCM-256) [TB-02]" ==> BrowserB
```

---

### Gambar 3: Protokol PSK-Assisted ML-KEM Session-Key Establishment (ML-KEM-768 + HKDF + HMAC)
Diagram sekuensial yang merinci pertukaran 3-fase: `pq-pubkey`, `pq-encap`, dan `pq-confirm` (Mutual Key Confirmation).

```mermaid
sequenceDiagram
    autonumber
    participant A as Peer A (Initiator)
    participant B as Peer B (Responder)

    Note over A,B: Prasyarat: Pre-shared Room Secret diimpor dari URL fragment (#)
    A->>A: Bangkitkan pasangan kunci ML-KEM-768 (PK_A, SK_A) & Nonce_A
    A->>B: pq-pubkey { pk: Base64(PK_A), nonce: Nonce_A }
    Note over B: Terima PK_A & Nonce_A
    B->>B: Enkapsulasi ML-KEM-768(PK_A) -> (Ciphertext_B, Secret_B) & Nonce_B
    B->>B: Derivasi Kunci Sesi: HKDF(PSK || Secret_B) -> (K_enc, K_conf)
    B->>A: pq-encap { ct: Base64(Ciphertext_B), nonce: Nonce_B }
    Note over A: Terima Ciphertext_B & Nonce_B
    A->>A: Dekapsulasi ML-KEM-768(SK_A, Ciphertext_B) -> Secret_A
    A->>A: Derivasi Kunci Sesi: HKDF(PSK || Secret_A) -> (K_enc, K_conf)
    A->>A: Hitung Tag: HMAC(K_conf, TranscriptHash_A)
    A->>B: pq-confirm { confirmHmac: Base64(Tag_A) }
    Note over B: Verifikasi Tag_A == HMAC(K_conf, TranscriptHash_B) [Mutual Key Confirmation]
    B->>B: Dereferensi Secret_B dari RAM; Set Sesi = SECURE
    B->>A: pq-confirm-ack { ok: true }
    Note over A: Dereferensi SK_A & Secret_A dari RAM; Set Sesi = SECURE
    Note over A,B: Sesi Obrolan Terenkripsi AES-GCM-256 pada Layer Aplikasi Aktif
```
