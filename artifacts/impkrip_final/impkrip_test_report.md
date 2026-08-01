# IMPKRIP Cryptographic Test Report

## 1. Test Environment & System Specification

### Target Device Specification (Manual Baseline)

- **Device**: ASUS Vivobook 14X M1403QA
- **Processor**: AMD Ryzen 7
- **Integrated Graphics**: AMD Radeon Vega 7
- **RAM**: 8 GB Dual-Channel
- **Storage**: 512 GB M.2 NVMe SSD

### System Detected Specification (Auto-Probed)

- **Device Model**: `VivoBook_ASUSLaptop M1403QA_M1403QA`
- **Exact CPU Model**: `AMD Ryzen 5 5600H with Radeon Graphics`
- **CPU Architecture**: `AMD64 Family 25 Model 80 Stepping 0, AuthenticAMD`
- **Total RAM Detected**: `15.41 GB`
- **Operating System**: `Windows 10` (Version `10.0.26200`)
- **Python Version**: `3.11.9`
- **Node.js Version**: `v22.17.0`
- **Browser Engine**: `Chromium 149.0.7827.55`
- **ML-KEM Package**: `^2.7.0`
- **Storage Detected**: `INTEL SSDPEKNU512GZ (512 GB NVMe SSD)`
- **Timestamp & Timezone**: `2026-08-01T22:11:51+0700` (WIB (+0700))
- **Git Commit Hash**: `609a1fe1c529e0e7fe27ac4fde6eb1da5022af46`

### Specification Comparison & Discrepancy Notes

> [!NOTE]
> Processor Discrepancy: Target spesifikasi manual mencantumkan 'AMD Ryzen 7', sedangkan deteksi aktual hardware mendeteksi 'AMD Ryzen 5 5600H with Radeon Graphics'.

> [!NOTE]
> RAM Discrepancy: Target spesifikasi manual mencantumkan '8 GB Dual-Channel', sedangkan deteksi aktual sistem mendeteksi total RAM fisik sebesar 15.41 GB (RAM terpasang/upgrade 16 GB).

> [!NOTE]
> Graphics & Storage: Deteksi sistem mendeteksi 'AMD Radeon(TM) Graphics' dan SSD 512 GB (INTEL SSDPEKNU512GZ) sesuai profil perangkat.

## 2. Summary of Results

| Status | Count |
|---|---:|
| **PASS** | 18 |
| **PARTIAL** | 1 |
| **FAIL** | 0 |
| **TOTAL** | 19 |

## 3. Detailed Test Results

| ID | Name | Expected | Actual | Status |
|---|---|---|---|:---:|
| `PQ-01` | ML-KEM-768 Key Generation | Valid 1184-byte public key and secret key generated | Generated 1184-byte public key (1184 bytes) | **PASS** |
| `PQ-02` | ML-KEM-768 Encap/Decap Agreement | Encapsulation and decapsulation produce identical 32-byte shared secret | Decapsulated shared secret matches encapsulated secret byte-for-byte | **PASS** |
| `PQ-03` | ML-KEM-768 Ciphertext & Secret Nonce Variation | Independent encapsulations produce distinct ciphertexts and shared secrets | Distinct ciphertexts and distinct shared secrets produced | **PASS** |
| `PQ-04` | ML-KEM-768 Ephemeral Key Uniqueness | Consecutive key generation calls generate unique public keys | Unique public keys generated | **PASS** |
| `KD-01` | HKDF Session Key Agreement | Both peers derive identical AES encryption keys given identical inputs | Derived AES encryption keys match byte-for-byte across peers | **PASS** |
| `KD-02` | HKDF Classical Secret Dependency | Different classical secrets result in distinct session keys | Distinct session keys derived | **PASS** |
| `KD-03` | HKDF Post-Quantum Secret Dependency | Different ML-KEM shared secrets result in distinct session keys | Distinct session keys derived | **PASS** |
| `KD-04` | HKDF Domain Key Separation | Derived encryptionKey and confirmationKey are cryptographically distinct | Encryption key and confirmation key are distinct | **PASS** |
| `KC-01` | HMAC Mutual Key Confirmation Verification | Valid HMAC confirmation tag over handshake transcript is verified | HMAC confirmation tag verified successfully | **PASS** |
| `KC-02` | HMAC Tampered Handshake Rejection | Tampered handshake payload is rejected during HMAC confirmation | Tampered handshake HMAC successfully rejected | **PASS** |
| `AE-01` | AES-GCM-256 Authenticated Encryption/Decryption | Valid plaintext encrypted and decrypted with AAD matches original string | Decrypted plaintext matches original message | **PASS** |
| `AE-02` | AES-GCM-256 Tampered Ciphertext Authentication | Bit-flipped ciphertext fails GCM tag authentication and throws error | Tampered ciphertext rejected by WebCrypto GCM tag check | **PASS** |
| `AE-03` | AES-GCM-256 Key Authenticity Verification | Decryption with unassociated AES key fails authentication tag verification | Decryption with wrong key rejected | **PASS** |
| `AE-04` | AES-GCM-256 Additional Authenticated Data (AAD) Binding | Mismatch in sequence number or direction in AAD causes GCM decryption failure | Decryption with modified AAD sequence rejected | **PASS** |
| `E2E-01` | Two-Way Chat: Creator to Invitee | Messages sent from Creator are received and decrypted by Invitee across all 3 runs | Passed 3/3 runs | **PASS** |
| `E2E-02` | Two-Way Chat: Invitee to Creator | Messages sent from Invitee are received and decrypted by Creator across all 3 runs | Passed 3/3 runs | **PASS** |
| `E2E-03` | Signaling Constraint: Third-Peer Rejection | Attempt by a third peer to enter occupied room is rejected with ROOM_FULL across all 3 runs | Passed 3/3 runs | **PASS** |
| `E2E-04` | Session Teardown: Room Destroy Cleanup | Explicit room destruction removes all session storage keys across all 3 runs | Passed 3/3 runs | **PASS** |
| `RP-01` | Replay Protection: Envelope Sequence Validation | Envelopes with out-of-order or duplicate sequences rejected | Sequence counter validation enforced at application envelope layer; raw WebRTC packet injection out-of-scope for browser unit tests | **PARTIAL** |

## 4. E2E Multi-Run Execution Details

### Run 1 - Overall: SUCCESS
- `E2E-01`: PASS
- `E2E-02`: PASS
- `E2E-03`: PASS
- `E2E-04`: PASS

### Run 2 - Overall: SUCCESS
- `E2E-01`: PASS
- `E2E-02`: PASS
- `E2E-03`: PASS
- `E2E-04`: PASS

### Run 3 - Overall: SUCCESS
- `E2E-01`: PASS
- `E2E-02`: PASS
- `E2E-03`: PASS
- `E2E-04`: PASS

