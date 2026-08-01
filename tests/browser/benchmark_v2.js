// tests/browser/benchmark_v2.js
window.runBenchmarkV2 = async function (config) {
    const { warmup, iterations } = config;
    const mlkem = await import('/src/crypto/mlkem.js');
    const enc = await import('/src/crypto/encryption.js');
    const pq = await import('/src/crypto/pq_upgrade.js');

    const results = {
        mlkem: { keygen: [], encap: [], decap: [] },
        aes: {
            keygen: [],
            enc1k: [], dec1k: [],
            enc10k: [], dec10k: [],
            enc100k: [], dec100k: []
        },
        hkdf: { deriveSessionKeys: [] },
        hmac: { sign: [], verify: [] },
        protocol: {
            cold: null,
            warm: [],
            successRate: 0,
            initiatorTime: [],
            responderTime: [],
            totalWallClock: []
        },
        protocolLatent: {
            cold: null,
            warm: [],
            successRate: 0,
            initiatorTime: [],
            responderTime: [],
            totalWallClock: []
        },
        coldStart: {},
        negative: {
            ephemeralKeyUniqueness: false,
            aesBitFlip: false,
            aesWrongTag: false,
            aesWrongKey: false,
            hmacModified: false,
            hkdfDifferentSecret: false,
            hkdfDifferentClassical: false,
            hkdfDifferentTranscript: false,
            keysMatchPeers: false,
            encAndConfirmKeysDiffer: false
        },
        errors: []
    };

    const measure = async (arr, fn) => {
        const start = performance.now();
        await fn();
        const end = performance.now();
        const dur = end - start;
        arr.push(dur);
        return dur;
    };

    const measureBatch = async (arr, fn, batchSize = 10) => {
        const start = performance.now();
        for (let b = 0; b < batchSize; b++) {
            await fn();
        }
        const end = performance.now();
        const dur = (end - start) / batchSize;
        arr.push(dur);
        return dur;
    };

    const areEqual = (b1, b2) => {
        const u1 = new Uint8Array(b1);
        const u2 = new Uint8Array(b2);
        if (u1.length !== u2.length) return false;
        for (let i = 0; i < u1.length; i++) if (u1[i] !== u2[i]) return false;
        return true;
    };

    try {
        // --- NEGATIVE SECURITY VALIDATIONS ---
        const kp1 = await mlkem.generateKeyPair();
        const kp2 = await mlkem.generateKeyPair();
        results.negative.ephemeralKeyUniqueness = (!areEqual(kp1.publicKey, kp2.publicKey));

        const keyB64 = await enc.generateKey();
        const aKey = await enc.importKey(keyB64);
        const msg = "Benchmark Security Test Payload";
        const { ciphertext: ct, iv } = await enc.encrypt(msg, aKey, 0, 'initiator-to-responder', 2, 'bench-room');

        let tamperedCt = new Uint8Array(atob(ct).split('').map(c => c.charCodeAt(0)));
        tamperedCt[tamperedCt.length - 1] ^= 1;
        let tamperedB64 = btoa(String.fromCharCode(...tamperedCt));
        try { await enc.decrypt(tamperedB64, iv, aKey, 0, 'initiator-to-responder', 2, 'bench-room'); } catch { results.negative.aesWrongTag = true; }

        tamperedCt = new Uint8Array(atob(ct).split('').map(c => c.charCodeAt(0)));
        tamperedCt[1] ^= 1;
        tamperedB64 = btoa(String.fromCharCode(...tamperedCt));
        try { await enc.decrypt(tamperedB64, iv, aKey, 0, 'initiator-to-responder', 2, 'bench-room'); } catch { results.negative.aesBitFlip = true; }

        const wrongKey = await enc.importKey(await enc.generateKey());
        try { await enc.decrypt(ct, iv, wrongKey, 0, 'initiator-to-responder', 2, 'bench-room'); } catch { results.negative.aesWrongKey = true; }

        const hmacKey = await crypto.subtle.importKey("raw", new Uint8Array(32).fill(1), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
        const payload = new Uint8Array(32).fill(2);
        const sig = await crypto.subtle.sign("HMAC", hmacKey, payload);
        const badPayload = new Uint8Array(32).fill(2); badPayload[0] ^= 0xFF;
        const badVerify = await crypto.subtle.verify("HMAC", hmacKey, sig, badPayload);
        results.negative.hmacModified = !badVerify;

        const classical1 = await enc.importKey(await enc.generateKey());
        const classical2 = await enc.importKey(await enc.generateKey());
        const s1 = new Uint8Array(32).fill(1);
        const s2 = new Uint8Array(32).fill(2);
        const t1 = new Uint8Array(32).fill(3);
        const t2 = new Uint8Array(32).fill(4);

        const keys1 = await enc.deriveSessionKeys(classical1, s1, t1);
        const keys2 = await enc.deriveSessionKeys(classical1, s2, t1);
        const keys3 = await enc.deriveSessionKeys(classical2, s1, t1);
        const keys4 = await enc.deriveSessionKeys(classical1, s1, t2);

        const eEnc1 = await crypto.subtle.exportKey("raw", keys1.encryptionKey);
        const eConf1 = await crypto.subtle.exportKey("raw", keys1.confirmationKey);
        const eEnc2 = await crypto.subtle.exportKey("raw", keys2.encryptionKey);
        const eEnc3 = await crypto.subtle.exportKey("raw", keys3.encryptionKey);
        const eEnc4 = await crypto.subtle.exportKey("raw", keys4.encryptionKey);

        results.negative.encAndConfirmKeysDiffer = !areEqual(eEnc1, eConf1);
        results.negative.hkdfDifferentSecret = !areEqual(eEnc1, eEnc2);
        results.negative.hkdfDifferentClassical = !areEqual(eEnc1, eEnc3);
        results.negative.hkdfDifferentTranscript = !areEqual(eEnc1, eEnc4);

        // --- BENCHMARK PRIMITIVE LOOPS ---
        const payload1k = "A".repeat(1024);
        const payload10k = "A".repeat(10240);
        const payload100k = "A".repeat(102400);

        let transcriptDummy = new Uint8Array(32).fill(6);

        for (let i = 0; i < warmup + iterations; i++) {
            const isWarmup = (i < warmup);
            const isFirst = (i === 0);

            // ML-KEM KeyGen
            let kp;
            if (isFirst) {
                const tKeygen = await measure([], async () => { kp = await mlkem.generateKeyPair(); });
                results.coldStart['mlkem_keygen'] = tKeygen;
            }
            await measureBatch(isWarmup ? [] : results.mlkem.keygen, async () => {
                kp = await mlkem.generateKeyPair();
            }, 5);

            // ML-KEM Encap
            let encapRes;
            if (isFirst) {
                const tEncap = await measure([], async () => { encapRes = await mlkem.encapsulate(kp.publicKey); });
                results.coldStart['mlkem_encap'] = tEncap;
            }
            await measureBatch(isWarmup ? [] : results.mlkem.encap, async () => {
                encapRes = await mlkem.encapsulate(kp.publicKey);
            }, 5);

            // ML-KEM Decap
            if (isFirst) {
                const tDecap = await measure([], async () => { await mlkem.decapsulate(encapRes.ciphertext, kp.secretKey); });
                results.coldStart['mlkem_decap'] = tDecap;
            }
            await measureBatch(isWarmup ? [] : results.mlkem.decap, async () => {
                await mlkem.decapsulate(encapRes.ciphertext, kp.secretKey);
            }, 5);

            // AES KeyGen
            let benchKeyB64, benchKey;
            await measure(isWarmup ? [] : results.aes.keygen, async () => {
                benchKeyB64 = await enc.generateKey();
                benchKey = await enc.importKey(benchKeyB64);
            });

            // HKDF deriveSessionKeys
            let derivedKeys;
            if (isFirst) {
                const tHkdf = await measure([], async () => {
                    derivedKeys = await enc.deriveSessionKeys(benchKey, encapRes.sharedSecret, transcriptDummy);
                });
                results.coldStart['hkdf_derive'] = tHkdf;
            }
            await measureBatch(isWarmup ? [] : results.hkdf.deriveSessionKeys, async () => {
                derivedKeys = await enc.deriveSessionKeys(benchKey, encapRes.sharedSecret, transcriptDummy);
            }, 10);

            // HMAC sign & verify using confirmationKey from deriveSessionKeys()
            let hmacSig;
            const hmacBenchKey = derivedKeys.confirmationKey;
            if (isFirst) {
                const tHmacSign = await measure([], async () => {
                    hmacSig = await crypto.subtle.sign("HMAC", hmacBenchKey, payload);
                });
                const tHmacVerify = await measure([], async () => {
                    await crypto.subtle.verify("HMAC", hmacBenchKey, hmacSig, payload);
                });
                results.coldStart['hmac_sign'] = tHmacSign;
                results.coldStart['hmac_verify'] = tHmacVerify;
            }
            await measureBatch(isWarmup ? [] : results.hmac.sign, async () => {
                hmacSig = await crypto.subtle.sign("HMAC", hmacBenchKey, payload);
            }, 10);
            await measureBatch(isWarmup ? [] : results.hmac.verify, async () => {
                await crypto.subtle.verify("HMAC", hmacBenchKey, hmacSig, payload);
            }, 10);

            // AES Encrypt/Decrypt 1 KB
            let ct1k;
            if (isFirst) {
                const tEnc1k = await measure([], async () => {
                    ct1k = await enc.encrypt(payload1k, benchKey, i, 'initiator-to-responder', 2, 'bench');
                });
                const tDec1k = await measure([], async () => {
                    await enc.decrypt(ct1k.ciphertext, ct1k.iv, benchKey, i, 'initiator-to-responder', 2, 'bench');
                });
                results.coldStart['aes_enc1k'] = tEnc1k;
                results.coldStart['aes_dec1k'] = tDec1k;
            }
            await measureBatch(isWarmup ? [] : results.aes.enc1k, async () => {
                ct1k = await enc.encrypt(payload1k, benchKey, i, 'initiator-to-responder', 2, 'bench');
            }, 10);
            await measureBatch(isWarmup ? [] : results.aes.dec1k, async () => {
                await enc.decrypt(ct1k.ciphertext, ct1k.iv, benchKey, i, 'initiator-to-responder', 2, 'bench');
            }, 10);

            // AES Encrypt/Decrypt 10 KB
            let ct10k;
            if (isFirst) {
                const tEnc10k = await measure([], async () => {
                    ct10k = await enc.encrypt(payload10k, benchKey, i, 'initiator-to-responder', 2, 'bench');
                });
                const tDec10k = await measure([], async () => {
                    await enc.decrypt(ct10k.ciphertext, ct10k.iv, benchKey, i, 'initiator-to-responder', 2, 'bench');
                });
                results.coldStart['aes_enc10k'] = tEnc10k;
                results.coldStart['aes_dec10k'] = tDec10k;
            }
            await measureBatch(isWarmup ? [] : results.aes.enc10k, async () => {
                ct10k = await enc.encrypt(payload10k, benchKey, i, 'initiator-to-responder', 2, 'bench');
            }, 5);
            await measureBatch(isWarmup ? [] : results.aes.dec10k, async () => {
                await enc.decrypt(ct10k.ciphertext, ct10k.iv, benchKey, i, 'initiator-to-responder', 2, 'bench');
            }, 5);

            // AES Encrypt/Decrypt 100 KB
            let ct100k;
            if (isFirst) {
                const tEnc100k = await measure([], async () => {
                    ct100k = await enc.encrypt(payload100k, benchKey, i, 'initiator-to-responder', 2, 'bench');
                });
                const tDec100k = await measure([], async () => {
                    await enc.decrypt(ct100k.ciphertext, ct100k.iv, benchKey, i, 'initiator-to-responder', 2, 'bench');
                });
                results.coldStart['aes_enc100k'] = tEnc100k;
                results.coldStart['aes_dec100k'] = tDec100k;
            }
            await measure(isWarmup ? [] : results.aes.enc100k, async () => {
                ct100k = await enc.encrypt(payload100k, benchKey, i, 'initiator-to-responder', 2, 'bench');
            });
            await measure(isWarmup ? [] : results.aes.dec100k, async () => {
                await enc.decrypt(ct100k.ciphertext, ct100k.iv, benchKey, i, 'initiator-to-responder', 2, 'bench');
            });
        }

        // --- PROTOCOL SIMULATION ---
        class MockPeer {
            constructor(latency) {
                this.other = null;
                this.latency = latency;
            }
            send(msg) {
                if (this.latency === 0) {
                    queueMicrotask(() => {
                        if (this.other && this.other._pqHandler) {
                            this.other._pqHandler(msg);
                        }
                    });
                } else {
                    setTimeout(() => {
                        if (this.other && this.other._pqHandler) {
                            this.other._pqHandler(msg);
                        }
                    }, this.latency);
                }
            }
        }

        async function runProtocolLoop(latency, resObj, isLatent) {
            let matches = 0;
            for (let i = 0; i < warmup + iterations; i++) {
                const isWarmup = (i < warmup);
                const isFirst = (i === 0);
                let success = false;

                const peerA = new MockPeer(latency);
                const peerB = new MockPeer(latency);
                peerA.other = peerB;
                peerB.other = peerA;

                const classicalB64 = await enc.generateKey();
                const cKey = await enc.importKey(classicalB64);

                const tStart = performance.now();
                let tAEnd = 0, tBEnd = 0;
                let kA, kB;

                const pA = pq.performPQUpgrade(peerA, cKey, true).then(k => {
                    kA = k;
                    tAEnd = performance.now();
                }).catch(e => { if (isWarmup) console.error(e); });

                const pB = pq.performPQUpgrade(peerB, cKey, false).then(k => {
                    kB = k;
                    tBEnd = performance.now();
                }).catch(e => { if (isWarmup) console.error(e); });

                await Promise.all([pA, pB]);
                const tEnd = performance.now();
                const dur = tEnd - tStart;

                if (kA && kB) {
                    success = true;
                    const eA = new Uint8Array(await crypto.subtle.exportKey("raw", kA));
                    const eB = new Uint8Array(await crypto.subtle.exportKey("raw", kB));
                    if (areEqual(eA, eB)) matches++;
                }

                if (isFirst) {
                    resObj.cold = dur;
                    if (!isLatent) results.coldStart['protocol_0ms'] = dur;
                    else results.coldStart['protocol_5ms'] = dur;
                } else if (!isWarmup) {
                    resObj.warm.push(dur);
                    resObj.initiatorTime.push(tAEnd - tStart);
                    resObj.responderTime.push(tBEnd - tStart);
                    resObj.totalWallClock.push(dur);
                    if (success) resObj.successRate++;
                }
            }
            resObj.successRate = (resObj.successRate / iterations) * 100;
            if (matches === (warmup + iterations) && !isLatent) {
                results.negative.keysMatchPeers = true;
            }
        }

        // Run 0ms latency (crypto-only)
        await runProtocolLoop(0, results.protocol, false);

        // Run 5ms latency (simulated network transport)
        await runProtocolLoop(5, results.protocolLatent, true);

    } catch (e) {
        results.errors.push(e.toString());
    }

    return results;
};

