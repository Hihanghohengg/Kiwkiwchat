// frontend/public/impkrip_unit.js
window.runImpkripUnitTests = async function() {
    const mlkem = await import('/src/crypto/mlkem.js');
    const enc = await import('/src/crypto/encryption.js');
    const pq = await import('/src/crypto/pq_upgrade.js');

    const tests = {};

    // Helper byte equality
    const areEqual = (b1, b2) => {
        const u1 = new Uint8Array(b1);
        const u2 = new Uint8Array(b2);
        if (u1.length !== u2.length) return false;
        for (let i = 0; i < u1.length; i++) if (u1[i] !== u2[i]) return false;
        return true;
    };

    // PQ-01: Keypair generation validity
    try {
        const kp = await mlkem.generateKeyPair();
        tests['PQ-01'] = (kp && kp.publicKey && kp.secretKey && kp.publicKey.length === 1184) ? 'PASS' : 'FAIL';
    } catch (e) { tests['PQ-01'] = 'FAIL'; }

    // PQ-02: Encap/Decap shared secret match
    try {
        const kp = await mlkem.generateKeyPair();
        const { ciphertext, sharedSecret } = await mlkem.encapsulate(kp.publicKey);
        const decSecret = await mlkem.decapsulate(ciphertext, kp.secretKey);
        tests['PQ-02'] = areEqual(sharedSecret, decSecret) ? 'PASS' : 'FAIL';
    } catch (e) { tests['PQ-02'] = 'FAIL'; }

    // PQ-03: Different ciphertexts produce different secrets
    try {
        const kp = await mlkem.generateKeyPair();
        const enc1 = await mlkem.encapsulate(kp.publicKey);
        const enc2 = await mlkem.encapsulate(kp.publicKey);
        tests['PQ-03'] = (!areEqual(enc1.ciphertext, enc2.ciphertext) && !areEqual(enc1.sharedSecret, enc2.sharedSecret)) ? 'PASS' : 'FAIL';
    } catch (e) { tests['PQ-03'] = 'FAIL'; }

    // PQ-04: Ephemeral key uniqueness
    try {
        const kp1 = await mlkem.generateKeyPair();
        const kp2 = await mlkem.generateKeyPair();
        tests['PQ-04'] = !areEqual(kp1.publicKey, kp2.publicKey) ? 'PASS' : 'FAIL';
    } catch (e) { tests['PQ-04'] = 'FAIL'; }

    // KD-01: Identical session keys across both peers for identical inputs
    try {
        const classicalB64 = await enc.generateKey();
        const cKey1 = await enc.importKey(classicalB64);
        const cKey2 = await enc.importKey(classicalB64);
        const sharedSecret = new Uint8Array(32);
        const transcript = new Uint8Array(32);
        const k1 = await enc.deriveSessionKeys(cKey1, sharedSecret, transcript);
        const k2 = await enc.deriveSessionKeys(cKey2, sharedSecret, transcript);
        const raw1 = await crypto.subtle.exportKey('raw', k1.encryptionKey);
        const raw2 = await crypto.subtle.exportKey('raw', k2.encryptionKey);
        tests['KD-01'] = areEqual(raw1, raw2) ? 'PASS' : 'FAIL';
    } catch (e) { tests['KD-01'] = 'FAIL'; }

    // KD-02: Different classical secret -> different session key
    try {
        const cKey1 = await enc.importKey(await enc.generateKey());
        const cKey2 = await enc.importKey(await enc.generateKey());
        const sharedSecret = new Uint8Array(32);
        const transcript = new Uint8Array(32);
        const k1 = await enc.deriveSessionKeys(cKey1, sharedSecret, transcript);
        const k2 = await enc.deriveSessionKeys(cKey2, sharedSecret, transcript);
        const raw1 = await crypto.subtle.exportKey('raw', k1.encryptionKey);
        const raw2 = await crypto.subtle.exportKey('raw', k2.encryptionKey);
        tests['KD-02'] = !areEqual(raw1, raw2) ? 'PASS' : 'FAIL';
    } catch (e) { tests['KD-02'] = 'FAIL'; }

    // KD-03: Different ML-KEM secret -> different session key
    try {
        const cKey = await enc.importKey(await enc.generateKey());
        const s1 = new Uint8Array(32);
        const s2 = new Uint8Array(32); s2[0] = 1;
        const transcript = new Uint8Array(32);
        const k1 = await enc.deriveSessionKeys(cKey, s1, transcript);
        const k2 = await enc.deriveSessionKeys(cKey, s2, transcript);
        const raw1 = await crypto.subtle.exportKey('raw', k1.encryptionKey);
        const raw2 = await crypto.subtle.exportKey('raw', k2.encryptionKey);
        tests['KD-03'] = !areEqual(raw1, raw2) ? 'PASS' : 'FAIL';
    } catch (e) { tests['KD-03'] = 'FAIL'; }

    // KD-04: Key separation (encryption != confirmation)
    try {
        const cKey = await enc.importKey(await enc.generateKey());
        const s = new Uint8Array(32);
        const transcript = new Uint8Array(32);
        const k = await enc.deriveSessionKeys(cKey, s, transcript);
        const rawEnc = await crypto.subtle.exportKey('raw', k.encryptionKey);
        const rawConf = await crypto.subtle.exportKey('raw', k.confirmationKey);
        tests['KD-04'] = !areEqual(rawEnc, rawConf) ? 'PASS' : 'FAIL';
    } catch (e) { tests['KD-04'] = 'FAIL'; }

    // KC-01: Valid mutual confirmation HMAC accepted
    try {
        const hmacKey = await crypto.subtle.importKey('raw', new Uint8Array(32), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
        const payload = new Uint8Array(32);
        const sig = await crypto.subtle.sign('HMAC', hmacKey, payload);
        const ok = await crypto.subtle.verify('HMAC', hmacKey, sig, payload);
        tests['KC-01'] = ok ? 'PASS' : 'FAIL';
    } catch (e) { tests['KC-01'] = 'FAIL'; }

    // KC-02: Modified confirmation HMAC rejected
    try {
        const hmacKey = await crypto.subtle.importKey('raw', new Uint8Array(32), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
        const payload = new Uint8Array(32);
        const sig = await crypto.subtle.sign('HMAC', hmacKey, payload);
        const badPayload = new Uint8Array(32); badPayload[0] = 1;
        const ok = await crypto.subtle.verify('HMAC', hmacKey, sig, badPayload);
        tests['KC-02'] = !ok ? 'PASS' : 'FAIL';
    } catch (e) { tests['KC-02'] = 'FAIL'; }

    // AE-01: Encrypt/decrypt normal succeeds
    try {
        const key = await enc.importKey(await enc.generateKey());
        const msg = 'Test normal message';
        const { ciphertext, iv } = await enc.encrypt(msg, key, 0, 'initiator-to-responder', 2, 'room123');
        const dec = await enc.decrypt(ciphertext, iv, key, 0, 'initiator-to-responder', 2, 'room123');
        tests['AE-01'] = (dec === msg) ? 'PASS' : 'FAIL';
    } catch (e) { tests['AE-01'] = 'FAIL'; }

    // AE-02: Modified ciphertext rejected
    try {
        const key = await enc.importKey(await enc.generateKey());
        const { ciphertext, iv } = await enc.encrypt('Test', key, 0, 'initiator-to-responder', 2, 'room123');
        let ct = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
        ct[0] ^= 1;
        let tampered = btoa(String.fromCharCode(...ct));
        await enc.decrypt(tampered, iv, key, 0, 'initiator-to-responder', 2, 'room123');
        tests['AE-02'] = 'FAIL';
    } catch (e) { tests['AE-02'] = 'PASS'; }

    // AE-03: Wrong key rejected
    try {
        const k1 = await enc.importKey(await enc.generateKey());
        const k2 = await enc.importKey(await enc.generateKey());
        const { ciphertext, iv } = await enc.encrypt('Test', k1, 0, 'initiator-to-responder', 2, 'room123');
        await enc.decrypt(ciphertext, iv, k2, 0, 'initiator-to-responder', 2, 'room123');
        tests['AE-03'] = 'FAIL';
    } catch (e) { tests['AE-03'] = 'PASS'; }

    // AE-04: Wrong AAD rejected
    try {
        const key = await enc.importKey(await enc.generateKey());
        const { ciphertext, iv } = await enc.encrypt('Test', key, 0, 'initiator-to-responder', 2, 'room123');
        await enc.decrypt(ciphertext, iv, key, 1, 'initiator-to-responder', 2, 'room123'); // wrong sequence
        tests['AE-04'] = 'FAIL';
    } catch (e) { tests['AE-04'] = 'PASS'; }

    return tests;
};
