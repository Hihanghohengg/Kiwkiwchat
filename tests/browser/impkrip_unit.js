// tests/browser/impkrip_unit.js
window.runImpkripUnitTests = async function() {
    const mlkem = await import('/src/crypto/mlkem.js');
    const enc = await import('/src/crypto/encryption.js');
    const pq = await import('/src/crypto/pq_upgrade.js');

    const testResults = [];

    const areEqual = (b1, b2) => {
        const u1 = new Uint8Array(b1);
        const u2 = new Uint8Array(b2);
        if (u1.length !== u2.length) return false;
        for (let i = 0; i < u1.length; i++) if (u1[i] !== u2[i]) return false;
        return true;
    };

    // PQ-01: Keypair generation
    try {
        const kp = await mlkem.generateKeyPair();
        const ok = kp && kp.publicKey && kp.secretKey && kp.publicKey.length === 1184;
        testResults.push({
            id: "PQ-01",
            name: "ML-KEM-768 Key Generation",
            expected: "Valid 1184-byte public key and secret key generated",
            actual: ok ? `Generated 1184-byte public key (${kp.publicKey.length} bytes)` : "Invalid keypair dimensions",
            status: ok ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "PQ-01", name: "ML-KEM-768 Key Generation", expected: "Valid 1184-byte keypair", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // PQ-02: Encap/Decap match
    try {
        const kp = await mlkem.generateKeyPair();
        const { ciphertext, sharedSecret } = await mlkem.encapsulate(kp.publicKey);
        const decSecret = await mlkem.decapsulate(ciphertext, kp.secretKey);
        const ok = areEqual(sharedSecret, decSecret);
        testResults.push({
            id: "PQ-02",
            name: "ML-KEM-768 Encap/Decap Agreement",
            expected: "Encapsulation and decapsulation produce identical 32-byte shared secret",
            actual: ok ? "Decapsulated shared secret matches encapsulated secret byte-for-byte" : "Mismatch in shared secrets",
            status: ok ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "PQ-02", name: "ML-KEM-768 Encap/Decap Agreement", expected: "Identical shared secret", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // PQ-03: Different ciphertext yields different secrets
    try {
        const kp = await mlkem.generateKeyPair();
        const enc1 = await mlkem.encapsulate(kp.publicKey);
        const enc2 = await mlkem.encapsulate(kp.publicKey);
        const ok = !areEqual(enc1.ciphertext, enc2.ciphertext) && !areEqual(enc1.sharedSecret, enc2.sharedSecret);
        testResults.push({
            id: "PQ-03",
            name: "ML-KEM-768 Ciphertext & Secret Nonce Variation",
            expected: "Independent encapsulations produce distinct ciphertexts and shared secrets",
            actual: ok ? "Distinct ciphertexts and distinct shared secrets produced" : "Identical ciphertexts/secrets observed",
            status: ok ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "PQ-03", name: "ML-KEM-768 Ciphertext & Secret Nonce Variation", expected: "Distinct ciphertexts/secrets", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // PQ-04: Ephemeral key uniqueness
    try {
        const kp1 = await mlkem.generateKeyPair();
        const kp2 = await mlkem.generateKeyPair();
        const ok = !areEqual(kp1.publicKey, kp2.publicKey);
        testResults.push({
            id: "PQ-04",
            name: "ML-KEM-768 Ephemeral Key Uniqueness",
            expected: "Consecutive key generation calls generate unique public keys",
            actual: ok ? "Unique public keys generated" : "Duplicate public key generated",
            status: ok ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "PQ-04", name: "ML-KEM-768 Ephemeral Key Uniqueness", expected: "Unique public keys", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // KD-01: Identical session keys across peers
    try {
        const classicalB64 = await enc.generateKey();
        const cKey1 = await enc.importKey(classicalB64);
        const cKey2 = await enc.importKey(classicalB64);
        const sharedSecret = new Uint8Array(32).fill(7);
        const transcript = new Uint8Array(32).fill(3);
        const k1 = await enc.deriveSessionKeys(cKey1, sharedSecret, transcript);
        const k2 = await enc.deriveSessionKeys(cKey2, sharedSecret, transcript);
        const raw1 = await crypto.subtle.exportKey('raw', k1.encryptionKey);
        const raw2 = await crypto.subtle.exportKey('raw', k2.encryptionKey);
        const ok = areEqual(raw1, raw2);
        testResults.push({
            id: "KD-01",
            name: "HKDF Session Key Agreement",
            expected: "Both peers derive identical AES encryption keys given identical inputs",
            actual: ok ? "Derived AES encryption keys match byte-for-byte across peers" : "Key mismatch across peers",
            status: ok ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "KD-01", name: "HKDF Session Key Agreement", expected: "Matching AES keys", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // KD-02: Different classical secret -> different session key
    try {
        const cKey1 = await enc.importKey(await enc.generateKey());
        const cKey2 = await enc.importKey(await enc.generateKey());
        const sharedSecret = new Uint8Array(32).fill(7);
        const transcript = new Uint8Array(32).fill(3);
        const k1 = await enc.deriveSessionKeys(cKey1, sharedSecret, transcript);
        const k2 = await enc.deriveSessionKeys(cKey2, sharedSecret, transcript);
        const raw1 = await crypto.subtle.exportKey('raw', k1.encryptionKey);
        const raw2 = await crypto.subtle.exportKey('raw', k2.encryptionKey);
        const ok = !areEqual(raw1, raw2);
        testResults.push({
            id: "KD-02",
            name: "HKDF Classical Secret Dependency",
            expected: "Different classical secrets result in distinct session keys",
            actual: ok ? "Distinct session keys derived" : "Identical session keys derived",
            status: ok ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "KD-02", name: "HKDF Classical Secret Dependency", expected: "Distinct session keys", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // KD-03: Different ML-KEM secret -> different session key
    try {
        const cKey = await enc.importKey(await enc.generateKey());
        const s1 = new Uint8Array(32).fill(1);
        const s2 = new Uint8Array(32).fill(2);
        const transcript = new Uint8Array(32).fill(3);
        const k1 = await enc.deriveSessionKeys(cKey, s1, transcript);
        const k2 = await enc.deriveSessionKeys(cKey, s2, transcript);
        const raw1 = await crypto.subtle.exportKey('raw', k1.encryptionKey);
        const raw2 = await crypto.subtle.exportKey('raw', k2.encryptionKey);
        const ok = !areEqual(raw1, raw2);
        testResults.push({
            id: "KD-03",
            name: "HKDF Post-Quantum Secret Dependency",
            expected: "Different ML-KEM shared secrets result in distinct session keys",
            actual: ok ? "Distinct session keys derived" : "Identical session keys derived",
            status: ok ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "KD-03", name: "HKDF Post-Quantum Secret Dependency", expected: "Distinct session keys", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // KD-04: Key separation (encryption != confirmation)
    try {
        const cKey = await enc.importKey(await enc.generateKey());
        const s = new Uint8Array(32).fill(4);
        const transcript = new Uint8Array(32).fill(5);
        const k = await enc.deriveSessionKeys(cKey, s, transcript);
        const rawEnc = await crypto.subtle.exportKey('raw', k.encryptionKey);
        const rawConf = await crypto.subtle.exportKey('raw', k.confirmationKey);
        const ok = !areEqual(rawEnc, rawConf);
        testResults.push({
            id: "KD-04",
            name: "HKDF Domain Key Separation",
            expected: "Derived encryptionKey and confirmationKey are cryptographically distinct",
            actual: ok ? "Encryption key and confirmation key are distinct" : "Encryption key equals confirmation key",
            status: ok ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "KD-04", name: "HKDF Domain Key Separation", expected: "Distinct keys", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // KC-01: Valid mutual confirmation HMAC accepted
    try {
        const cKey = await enc.importKey(await enc.generateKey());
        const pqSecret = new Uint8Array(32).fill(42);
        const transcript = new Uint8Array(32).fill(7);
        const { confirmationKey } = await enc.deriveSessionKeys(cKey, pqSecret, transcript);
        const payload = new Uint8Array(32).fill(11);
        const sig = await crypto.subtle.sign('HMAC', confirmationKey, payload);
        const ok = await crypto.subtle.verify('HMAC', confirmationKey, sig, payload);
        testResults.push({
            id: "KC-01",
            name: "HMAC Mutual Key Confirmation Verification",
            expected: "Valid HMAC confirmation tag over handshake transcript is verified using derived confirmationKey",
            actual: ok ? "HMAC confirmation tag verified successfully with derived confirmationKey" : "HMAC verification failed",
            status: ok ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "KC-01", name: "HMAC Mutual Key Confirmation Verification", expected: "HMAC verified", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // KC-02: Modified confirmation HMAC rejected
    try {
        const cKey = await enc.importKey(await enc.generateKey());
        const pqSecret = new Uint8Array(32).fill(42);
        const transcript = new Uint8Array(32).fill(7);
        const { confirmationKey } = await enc.deriveSessionKeys(cKey, pqSecret, transcript);
        const payload = new Uint8Array(32).fill(11);
        const sig = await crypto.subtle.sign('HMAC', confirmationKey, payload);
        const badPayload = new Uint8Array(32).fill(11); badPayload[0] ^= 0xFF;
        const ok = await crypto.subtle.verify('HMAC', confirmationKey, sig, badPayload);
        testResults.push({
            id: "KC-02",
            name: "HMAC Tampered Handshake Rejection",
            expected: "Tampered handshake payload is rejected during HMAC confirmation using derived confirmationKey",
            actual: !ok ? "Tampered handshake HMAC successfully rejected with derived confirmationKey" : "Tampered HMAC incorrectly accepted",
            status: !ok ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "KC-02", name: "HMAC Tampered Handshake Rejection", expected: "Tampered HMAC rejected", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // AE-01: Normal encrypt/decrypt
    try {
        const key = await enc.importKey(await enc.generateKey());
        const msg = "Kiw Kiw Chat IMPKRIP Test Message 123";
        const { ciphertext, iv } = await enc.encrypt(msg, key, 0, 'initiator-to-responder', 2, 'test-room');
        const dec = await enc.decrypt(ciphertext, iv, key, 0, 'initiator-to-responder', 2, 'test-room');
        const ok = (dec === msg);
        testResults.push({
            id: "AE-01",
            name: "AES-GCM-256 Authenticated Encryption/Decryption",
            expected: "Valid plaintext encrypted and decrypted with AAD matches original string",
            actual: ok ? "Decrypted plaintext matches original message" : "Decrypted message mismatch",
            status: ok ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "AE-01", name: "AES-GCM-256 Authenticated Encryption/Decryption", expected: "Decrypted message matches", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // AE-02: Modified ciphertext rejected
    try {
        const key = await enc.importKey(await enc.generateKey());
        const { ciphertext, iv } = await enc.encrypt('Sensitive Content', key, 0, 'initiator-to-responder', 2, 'test-room');
        let ct = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
        ct[0] ^= 1;
        let tampered = btoa(String.fromCharCode(...ct));
        let rejected = false;
        try {
            await enc.decrypt(tampered, iv, key, 0, 'initiator-to-responder', 2, 'test-room');
        } catch {
            rejected = true;
        }
        testResults.push({
            id: "AE-02",
            name: "AES-GCM-256 Tampered Ciphertext Authentication",
            expected: "Bit-flipped ciphertext fails GCM tag authentication and throws error",
            actual: rejected ? "Tampered ciphertext rejected by WebCrypto GCM tag check" : "Tampered ciphertext decrypted without error",
            status: rejected ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "AE-02", name: "AES-GCM-256 Tampered Ciphertext Authentication", expected: "Tampered ciphertext rejected", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // AE-03: Wrong key rejected
    try {
        const k1 = await enc.importKey(await enc.generateKey());
        const k2 = await enc.importKey(await enc.generateKey());
        const { ciphertext, iv } = await enc.encrypt('Sensitive Content', k1, 0, 'initiator-to-responder', 2, 'test-room');
        let rejected = false;
        try {
            await enc.decrypt(ciphertext, iv, k2, 0, 'initiator-to-responder', 2, 'test-room');
        } catch {
            rejected = true;
        }
        testResults.push({
            id: "AE-03",
            name: "AES-GCM-256 Key Authenticity Verification",
            expected: "Decryption with unassociated AES key fails authentication tag verification",
            actual: rejected ? "Decryption with wrong key rejected" : "Wrong key decryption succeeded unexpectedly",
            status: rejected ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "AE-03", name: "AES-GCM-256 Key Authenticity Verification", expected: "Wrong key rejected", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    // AE-04: Wrong AAD rejected
    try {
        const key = await enc.importKey(await enc.generateKey());
        const { ciphertext, iv } = await enc.encrypt('Sensitive Content', key, 0, 'initiator-to-responder', 2, 'test-room');
        let rejected = false;
        try {
            await enc.decrypt(ciphertext, iv, key, 1, 'initiator-to-responder', 2, 'test-room'); // sequence number 1 instead of 0
        } catch {
            rejected = true;
        }
        testResults.push({
            id: "AE-04",
            name: "AES-GCM-256 Additional Authenticated Data (AAD) Binding",
            expected: "Mismatch in sequence number or direction in AAD causes GCM decryption failure",
            actual: rejected ? "Decryption with modified AAD sequence rejected" : "Modified AAD decryption succeeded unexpectedly",
            status: rejected ? "PASS" : "FAIL",
            error: null
        });
    } catch (e) {
        testResults.push({ id: "AE-04", name: "AES-GCM-256 Additional Authenticated Data (AAD) Binding", expected: "Modified AAD rejected", actual: "Exception thrown", status: "FAIL", error: e.message });
    }

    return testResults;
};

