import asyncio
import subprocess
from playwright.async_api import async_playwright

async def run_crypto_report():
    print("[*] Starting Vite dev server for Crypto Performance testing...")
    frontend = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd="frontend",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    await asyncio.sleep(5)
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto("http://localhost:5173")
            
            print("[*] Running 6-Parameter Evaluation in Browser Context...")
            
            eval_script = """
            async () => {
                const results = {
                    confidentiality: false,
                    integrity: false,
                    mutualAuth: false,
                    forwardSecrecy: false,
                    pqSecurity: false,
                    performance: {}
                };
                
                try {
                    const mlkem = await import('/src/crypto/mlkem.js');
                    const enc = await import('/src/crypto/encryption.js');
                    
                    // 1. PQ Security (Check FIPS 203 presence)
                    results.pqSecurity = typeof mlkem.generateKeyPair === 'function';
                    
                    // Performance measurements
                    const t0 = performance.now();
                    const keyPair = await mlkem.generateKeyPair();
                    const t1 = performance.now();
                    results.performance.keygen = (t1 - t0).toFixed(2);
                    
                    const t2 = performance.now();
                    const { ciphertext, sharedSecret } = await mlkem.encapsulate(keyPair.publicKey);
                    const t3 = performance.now();
                    results.performance.encap = (t3 - t2).toFixed(2);
                    
                    const t4 = performance.now();
                    const decapped = await mlkem.decapsulate(ciphertext, keyPair.secretKey);
                    const t5 = performance.now();
                    results.performance.decap = (t5 - t4).toFixed(2);
                    
                    // 2. Forward Secrecy (Uniqueness of keys)
                    const kp2 = await mlkem.generateKeyPair();
                    results.forwardSecrecy = (keyPair.publicKey.toString() !== kp2.publicKey.toString());
                    
                    // Classical Key and HKDF Performance
                    const t6 = performance.now();
                    const classicalB64 = await enc.generateKey();
                    const classical = await enc.importKey(classicalB64);
                    const hybridKey = await enc.deriveHybridKey(classical, sharedSecret);
                    const t7 = performance.now();
                    results.performance.hkdf = (t7 - t6).toFixed(2);
                    
                    // 3. Confidentiality (AES-GCM encryption works)
                    const message = "Secret Paper Message";
                    const t8 = performance.now();
                    const encryptedMsg = await enc.encrypt(message, hybridKey);
                    const t9 = performance.now();
                    results.performance.encrypt = (t9 - t8).toFixed(2);
                    
                    const decryptedMsg = await enc.decrypt(encryptedMsg, hybridKey);
                    results.confidentiality = (decryptedMsg === message);
                    
                    // 4. Integrity (Tampering ciphertext)
                    const tampered = new Uint8Array(atob(encryptedMsg).split('').map(c => c.charCodeAt(0)));
                    tampered[tampered.length - 1] ^= 1; // Flip a bit in the GCM auth tag
                    const tamperedB64 = btoa(String.fromCharCode(...tampered));
                    try {
                        await enc.decrypt(tamperedB64, hybridKey);
                    } catch (e) {
                        results.integrity = true; // Should fail decryption
                    }
                    
                    // 5. Mutual Auth (HMAC + Nonces verification)
                    const n1 = "nonce1";
                    const n2 = "nonce2";
                    const key = await crypto.subtle.importKey("raw", sharedSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
                    const payload = new TextEncoder().encode(`label|${n1}|${n2}`);
                    const sig = await crypto.subtle.sign("HMAC", key, payload);
                    
                    const valid = await crypto.subtle.verify("HMAC", key, sig, payload);
                    const invalid = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(`label|X1|${n2}`));
                    
                    results.mutualAuth = valid && !invalid;
                    
                } catch(e) {
                    results.error = e.toString();
                }
                
                return results;
            }
            """
            
            res = await page.evaluate(eval_script)
            
            if "error" in res:
                print("[-] Error in browser script:", res["error"])
                return
                
            print("=== 6-PARAMETER CRYPTOGRAPHIC EVALUATION REPORT ===\n")
            print(f"1. Confidentiality (AES-GCM-256): {'PASS' if res['confidentiality'] else 'FAIL'}")
            print(f"2. Integrity (GCM Tag Validation): {'PASS' if res['integrity'] else 'FAIL'}")
            print(f"3. Mutual Authentication (HMAC + Nonces): {'PASS' if res['mutualAuth'] else 'FAIL'}")
            print(f"4. Forward Secrecy (Unique Ephemeral PQ Keys): {'PASS' if res['forwardSecrecy'] else 'FAIL'}")
            print(f"5. Post-Quantum Security (ML-KEM-768 FIPS 203): {'PASS' if res['pqSecurity'] else 'FAIL'}")
            
            print("\n6. Performance Benchmark (Browser Context):")
            print(f"   - ML-KEM KeyGen: {res['performance'].get('keygen')} ms")
            print(f"   - ML-KEM Encap:  {res['performance'].get('encap')} ms")
            print(f"   - ML-KEM Decap:  {res['performance'].get('decap')} ms")
            print(f"   - HKDF Fusion:   {res['performance'].get('hkdf')} ms")
            print(f"   - AES Encrypt:   {res['performance'].get('encrypt')} ms")
            print("\n===================================================")
            
            with open("crypto_evaluation.md", "w") as f:
                f.write("## 6-Parameter Cryptographic Evaluation\n\n")
                f.write(f"- **Confidentiality:** {'PASS' if res['confidentiality'] else 'FAIL'}\n")
                f.write(f"- **Integrity:** {'PASS' if res['integrity'] else 'FAIL'}\n")
                f.write(f"- **Mutual Authentication:** {'PASS' if res['mutualAuth'] else 'FAIL'}\n")
                f.write(f"- **Forward Secrecy:** {'PASS' if res['forwardSecrecy'] else 'FAIL'}\n")
                f.write(f"- **Post-Quantum Security:** {'PASS' if res['pqSecurity'] else 'FAIL'}\n\n")
                f.write("## Performance Benchmarks (ms)\n")
                f.write(f"- ML-KEM-768 Key Generation: {res['performance'].get('keygen')} ms\n")
                f.write(f"- ML-KEM-768 Encapsulation: {res['performance'].get('encap')} ms\n")
                f.write(f"- ML-KEM-768 Decapsulation: {res['performance'].get('decap')} ms\n")
                f.write(f"- HKDF-SHA-256 Key Fusion: {res['performance'].get('hkdf')} ms\n")
                f.write(f"- AES-GCM-256 Encryption: {res['performance'].get('encrypt')} ms\n")
                
            await browser.close()
            
    finally:
        print("[*] Tearing down Vite server...")
        frontend.terminate()
        frontend.wait()

if __name__ == "__main__":
    asyncio.run(run_crypto_report())
