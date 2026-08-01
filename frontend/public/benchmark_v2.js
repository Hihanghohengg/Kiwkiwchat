// frontend/public/benchmark_v2.js
window.runBenchmarkV2 = async function (config) {
    const { warmup, iterations } = config;
    const mlkem = await import('/src/crypto/mlkem.js');
    const enc = await import('/src/crypto/encryption.js');
    const pq = await import('/src/crypto/pq_upgrade.js');

    const results = {
        mlkem: { keygen: [], encap: [], decap: [] },
        aes: { keygen: [], import: [], enc1k: [], dec1k: [], enc10k: [], dec10k: [], enc100k: [], dec100k: [], enc1m: [], dec1m: [] },
        hkdf: { raw: [], deriveHybrid: [] },
        hmac: { import: [], sign: [], validVerify: [], invalidVerify: [] },
        protocol: { cold: null, warm: [], successRate: 0, initiatorTime: [], responderTime: [], totalWallClock: [] },
        negative: {
            ephemeralKeyUniqueness: false,
            aesBitFlip: false,
            aesWrongTag: false,
            aesWrongKey: false,
            hmacModified: false,
            hkdfDifferentSecret: false
        },
        errors: []
    };

    const measure = async (name, arr, fn) => {
        const start = performance.now();
        await fn();
        const end = performance.now();
        arr.push(end - start);
    };

    const getMedian = (arr) => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    try {
        // --- NEGATIVE SECURITY TESTS ---
        // ML-KEM
        const kp1 = await mlkem.generateKeyPair();
        const kp2 = await mlkem.generateKeyPair();
        results.negative.ephemeralKeyUniqueness = (kp1.publicKey.toString() !== kp2.publicKey.toString());
        
        // AES
        const keyB64 = await enc.generateKey();
        const key = await enc.importKey(keyB64);
        const msg = "test";
        const { ciphertext: ct, iv } = await enc.encrypt(msg, key);
        
        let tamperedCt = new Uint8Array(atob(ct).split('').map(c => c.charCodeAt(0)));
        tamperedCt[tamperedCt.length - 1] ^= 1; // Bit flip in tag
        let tamperedB64 = btoa(String.fromCharCode(...tamperedCt));
        try { await enc.decrypt(tamperedB64, iv, key); } catch { results.negative.aesWrongTag = true; }
        
        tamperedCt = new Uint8Array(atob(ct).split('').map(c => c.charCodeAt(0)));
        tamperedCt[1] ^= 1; // Bit flip in ciphertext
        tamperedB64 = btoa(String.fromCharCode(...tamperedCt));
        try { await enc.decrypt(tamperedB64, iv, key); } catch { results.negative.aesBitFlip = true; }

        const wrongKeyB64 = await enc.generateKey();
        const wrongKey = await enc.importKey(wrongKeyB64);
        try { await enc.decrypt(ct, iv, wrongKey); } catch { results.negative.aesWrongKey = true; }

        // HMAC
        const hmacKey = await crypto.subtle.importKey("raw", new Uint8Array(32), {name: "HMAC", hash: "SHA-256"}, false, ["sign", "verify"]);
        const payload = new Uint8Array(10);
        const sig = await crypto.subtle.sign("HMAC", hmacKey, payload);
        const badPayload = new Uint8Array(10); badPayload[0] = 1;
        const badVerify = await crypto.subtle.verify("HMAC", hmacKey, sig, badPayload);
        results.negative.hmacModified = !badVerify;

        // HKDF
        const secret1 = new Uint8Array(32);
        const secret2 = new Uint8Array(32); secret2[0] = 1;
        
        const hkdf1 = await enc.deriveHybridKey(key, secret1);
        if(hkdf1) {
            const hkdf2 = await enc.deriveHybridKey(key, secret2);
            // compare keys
            const e1 = await crypto.subtle.exportKey("raw", hkdf1);
            const e2 = await crypto.subtle.exportKey("raw", hkdf2);
            results.negative.hkdfDifferentSecret = (e1.toString() !== e2.toString());
        }

        // --- BENCHMARK LOOPS ---
        let payload1k = "a".repeat(1024);
        let payload10k = "a".repeat(10240);
        let payload100k = "a".repeat(102400);
        let payload1m = "a".repeat(1048576);

        for (let i = 0; i < warmup + iterations; i++) {
            const isWarmup = i < warmup;
            const r_mlkem_keygen = isWarmup ? [] : results.mlkem.keygen;
            const r_mlkem_encap = isWarmup ? [] : results.mlkem.encap;
            const r_mlkem_decap = isWarmup ? [] : results.mlkem.decap;

            let kp;
            await measure("mlkem.keygen", r_mlkem_keygen, async () => { kp = await mlkem.generateKeyPair(); });
            let encapRes;
            await measure("mlkem.encap", r_mlkem_encap, async () => { encapRes = await mlkem.encapsulate(kp.publicKey); });
            await measure("mlkem.decap", r_mlkem_decap, async () => { await mlkem.decapsulate(encapRes.ciphertext, kp.secretKey); });

            const r_aes_keygen = isWarmup ? [] : results.aes.keygen;
            const r_aes_import = isWarmup ? [] : results.aes.import;
            const r_aes_enc1k = isWarmup ? [] : results.aes.enc1k;
            const r_aes_dec1k = isWarmup ? [] : results.aes.dec1k;
            
            let b64k, aKey, ct1k, ct10k, ct100k, ct1m;
            await measure("aes.keygen", r_aes_keygen, async () => { b64k = await enc.generateKey(); });
            await measure("aes.import", r_aes_import, async () => { aKey = await enc.importKey(b64k); });

            await measure("aes.enc1k", r_aes_enc1k, async () => { ct1k = await enc.encrypt(payload1k, aKey); });
            await measure("aes.dec1k", r_aes_dec1k, async () => { await enc.decrypt(ct1k.ciphertext, ct1k.iv, aKey); });

            if (!isWarmup) {
                await measure("aes.enc10k", results.aes.enc10k, async () => { ct10k = await enc.encrypt(payload10k, aKey); });
                await measure("aes.dec10k", results.aes.dec10k, async () => { await enc.decrypt(ct10k.ciphertext, ct10k.iv, aKey); });
                await measure("aes.enc100k", results.aes.enc100k, async () => { ct100k = await enc.encrypt(payload100k, aKey); });
                await measure("aes.dec100k", results.aes.dec100k, async () => { await enc.decrypt(ct100k.ciphertext, ct100k.iv, aKey); });
                await measure("aes.enc1m", results.aes.enc1m, async () => { ct1m = await enc.encrypt(payload1m, aKey); });
                await measure("aes.dec1m", results.aes.dec1m, async () => { await enc.decrypt(ct1m.ciphertext, ct1m.iv, aKey); });
            }

            // HKDF
            if (enc.deriveHybridKey) {
                const r_hkdf_derive = isWarmup ? [] : results.hkdf.deriveHybrid;
                await measure("hkdf.derive", r_hkdf_derive, async () => { await enc.deriveHybridKey(aKey, encapRes.sharedSecret); });
            }

            // HMAC
            const r_hmac_import = isWarmup ? [] : results.hmac.import;
            const r_hmac_sign = isWarmup ? [] : results.hmac.sign;
            const r_hmac_valid = isWarmup ? [] : results.hmac.validVerify;
            const r_hmac_invalid = isWarmup ? [] : results.hmac.invalidVerify;
            
            let hk, hs;
            await measure("hmac.import", r_hmac_import, async () => { 
                hk = await crypto.subtle.importKey("raw", encapRes.sharedSecret, {name: "HMAC", hash: "SHA-256"}, false, ["sign", "verify"]); 
            });
            await measure("hmac.sign", r_hmac_sign, async () => { hs = await crypto.subtle.sign("HMAC", hk, payload); });
            await measure("hmac.valid", r_hmac_valid, async () => { await crypto.subtle.verify("HMAC", hk, hs, payload); });
            await measure("hmac.invalid", r_hmac_invalid, async () => { await crypto.subtle.verify("HMAC", hk, hs, badPayload); });
        }

        // --- PROTOCOL MOCK ---
        class MockPeer {
            constructor() {
                this.other = null;
                this.latency = 5; // 5ms simulated network latency
            }
            send(msg) {
                setTimeout(() => {
                    if(this.other && this.other._pqHandler) {
                        this.other._pqHandler(msg);
                    }
                }, this.latency);
            }
        }

        for (let i = 0; i < warmup + iterations; i++) {
            const isWarmup = i < warmup;
            let success = false;
            
            const peerA = new MockPeer();
            const peerB = new MockPeer();
            peerA.other = peerB;
            peerB.other = peerA;
            
            const classicalB64 = await enc.generateKey();
            const cKey = await enc.importKey(classicalB64);

            const tStart = performance.now();
            let tAEnd = 0, tBEnd = 0;

            const pA = pq.performPQUpgrade(peerA, cKey, true).then(() => {
                tAEnd = performance.now();
            });
            const pB = pq.performPQUpgrade(peerB, cKey, false).then(() => {
                tBEnd = performance.now();
            });

            await Promise.all([pA, pB]);
            const tEnd = performance.now();
            success = true;

            if (i === 0) {
                results.protocol.cold = tEnd - tStart;
            } else if (!isWarmup) {
                results.protocol.warm.push(tEnd - tStart);
                results.protocol.initiatorTime.push(tAEnd - tStart);
                results.protocol.responderTime.push(tBEnd - tStart);
                results.protocol.totalWallClock.push(tEnd - tStart);
                if (success) results.protocol.successRate++;
            }
        }

        results.protocol.successRate = (results.protocol.successRate / iterations) * 100;

    } catch (e) {
        results.errors.push(e.toString());
    }

    return results;
};
