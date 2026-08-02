// tests/browser/benchmark_memory.js
// JavaScript Heap Memory Benchmark Harness for Kiw Kiw Chat
// Tests actual browser cryptographic implementations under controlled CDP heap sampling

(function () {
    let mlkemModule = null;
    let encModule = null;
    let pqModule = null;

    class MockPeer {
        constructor(latency = 0) {
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

    window.initMemoryBenchmark = async function () {
        mlkemModule = await import('/src/crypto/mlkem.js');
        encModule = await import('/src/crypto/encryption.js');
        pqModule = await import('/src/crypto/pq_upgrade.js');
        return { initialized: true };
    };

    window.runSingleKeyGen = async function () {
        if (!mlkemModule) await window.initMemoryBenchmark();
        const kp = await mlkemModule.generateKeyPair();
        window.__lastMemoryKeypair = kp;
        return {
            pubKeyLen: kp.publicKey.length,
            secKeyLen: kp.secretKey.length
        };
    };

    window.runSinglePQUpgrade = async function () {
        if (!pqModule) await window.initMemoryBenchmark();
        const peerA = new MockPeer(0);
        const peerB = new MockPeer(0);
        peerA.other = peerB;
        peerB.other = peerA;

        const classicalB64 = await encModule.generateKey();
        const cKey = await encModule.importKey(classicalB64);

        const pA = pqModule.performPQUpgrade(peerA, cKey, true);
        const pB = pqModule.performPQUpgrade(peerB, cKey, false);

        const [keyA, keyB] = await Promise.all([pA, pB]);
        window.__lastPQUpgradeKeys = { keyA, keyB };

        return {
            success: Boolean(keyA && keyB)
        };
    };

    window.runWorkloadBatch = async function (batchIterations, isWarmup = false) {
        if (!mlkemModule || !encModule || !pqModule) {
            await window.initMemoryBenchmark();
        }

        const payload1k = "A".repeat(1024);
        const payload10k = "A".repeat(10240);
        const payload100k = "A".repeat(102400);
        const transcriptDummy = new Uint8Array(32).fill(6);
        const dummyPayload = new Uint8Array(32).fill(2);

        for (let i = 0; i < batchIterations; i++) {
            // 1. ML-KEM KeyGen, Encap, Decap
            const kp = await mlkemModule.generateKeyPair();
            const encapRes = await mlkemModule.encapsulate(kp.publicKey);
            await mlkemModule.decapsulate(encapRes.ciphertext, kp.secretKey);

            // 2. Classical KeyGen & HKDF
            const benchKeyB64 = await encModule.generateKey();
            const benchKey = await encModule.importKey(benchKeyB64);
            const derived = await encModule.deriveSessionKeys(benchKey, encapRes.sharedSecret, transcriptDummy);

            // 3. HMAC Sign & Verify
            const sig = await crypto.subtle.sign("HMAC", derived.confirmationKey, dummyPayload);
            await crypto.subtle.verify("HMAC", derived.confirmationKey, sig, dummyPayload);

            // 4. AES-GCM Encrypt & Decrypt (1K, 10K, 100K)
            const ct1k = await encModule.encrypt(payload1k, benchKey, i, 'initiator-to-responder', 2, 'mem-bench');
            await encModule.decrypt(ct1k.ciphertext, ct1k.iv, benchKey, i, 'initiator-to-responder', 2, 'mem-bench');

            const ct10k = await encModule.encrypt(payload10k, benchKey, i, 'initiator-to-responder', 2, 'mem-bench');
            await encModule.decrypt(ct10k.ciphertext, ct10k.iv, benchKey, i, 'initiator-to-responder', 2, 'mem-bench');

            const ct100k = await encModule.encrypt(payload100k, benchKey, i, 'initiator-to-responder', 2, 'mem-bench');
            await encModule.decrypt(ct100k.ciphertext, ct100k.iv, benchKey, i, 'initiator-to-responder', 2, 'mem-bench');

            // 5. Full PQ Protocol Handshake
            const peerA = new MockPeer(0);
            const peerB = new MockPeer(0);
            peerA.other = peerB;
            peerB.other = peerA;

            const cKey = await encModule.importKey(await encModule.generateKey());
            await Promise.all([
                pqModule.performPQUpgrade(peerA, cKey, true),
                pqModule.performPQUpgrade(peerB, cKey, false)
            ]);
        }

        return { batchCompleted: batchIterations, isWarmup };
    };
})();
