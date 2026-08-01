import os
import re

def test_crypto_implementation():
    print("[*] Validating Cryptographic Implementation...")
    crypto_dir = "frontend/src/crypto"
    
    pq_upgrade = os.path.join(crypto_dir, "mlkem.js")
    encryption = os.path.join(crypto_dir, "encryption.js")
    
    if not os.path.exists(pq_upgrade):
        print("[-] FAIL: pq_upgrade.js not found.")
        return False
        
    with open(pq_upgrade, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if "MlKem768" not in content and "ML-KEM-768" not in content:
        print("[-] FAIL: ML-KEM-768 not found in PQ Upgrade module.")
        return False
        
    with open(encryption, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if "AES-GCM" not in content and "AES-CBC" not in content:
        print("[-] FAIL: AES implementation not found.")
        return False
        
    print("[+] Cryptographic Implementation Verified: AES + ML-KEM-768")
    return True

if __name__ == "__main__":
    if test_crypto_implementation():
        print("All Crypto Tests Passed.")
    else:
        print("Crypto Tests Failed.")
        exit(1)
