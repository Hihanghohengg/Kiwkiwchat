/**
 * Web Crypto API helper module for nullroom E2EE
 * All encryption/decryption happens in the browser
 */

export async function generateKey() {
  try {
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true, 
      ["encrypt", "decrypt"]
    )
    const jwk = await crypto.subtle.exportKey("jwk", key)
    const jsonString = JSON.stringify(jwk)
    return btoa(jsonString)
  } catch (error) {
    console.error("Error generating key:", error)
    throw error
  }
}

export async function importKey(keyString) {
  try {
    const jsonString = atob(keyString)
    const jwk = JSON.parse(jsonString)
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    )
    return key
  } catch (error) {
    console.error("Error importing key:", error)
    throw error
  }
}

export async function encrypt(plaintext, key, sequence = 0, direction = "none", version = 2, roomId = "unknown") {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoder = new TextEncoder()
    const plaintextBuffer = encoder.encode(plaintext)
    
    const aadStr = `${version}|${roomId}|${direction}|${sequence}`
    const aad = encoder.encode(aadStr)

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv, additionalData: aad },
      key,
      plaintextBuffer
    )
    
    function uint8ToBase64(bytes) {
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    return {
      ciphertext: uint8ToBase64(new Uint8Array(ciphertextBuffer)),
      iv: uint8ToBase64(iv)
    }
  } catch (error) {
    console.error("Error encrypting:", error)
    throw error
  }
}

export async function decrypt(ciphertextB64, ivB64, key, sequence = 0, direction = "none", version = 2, roomId = "unknown") {
  try {
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0))
    const aadStr = `${version}|${roomId}|${direction}|${sequence}`
    const aad = new TextEncoder().encode(aadStr)

    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv, additionalData: aad },
      key,
      ciphertext
    )
    
    return new TextDecoder().decode(plaintextBuffer)
  } catch (error) {
    console.error("Error decrypting:", error)
    throw error
  }
}

export async function deriveSessionKeys(classicalKey, quantumSecret, transcriptHash) {
  const classicalRaw = new Uint8Array(await crypto.subtle.exportKey("raw", classicalKey))
  
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    quantumSecret,
    "HKDF",
    false,
    ["deriveKey"]
  )
  
  const derive = async (domainString, keyName, length, usage) => {
    const domainBytes = new TextEncoder().encode(domainString)
    const info = new Uint8Array(domainBytes.length + transcriptHash.length)
    info.set(domainBytes, 0)
    info.set(transcriptHash, domainBytes.length)

    return await crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: classicalRaw, info: info },
      hkdfKey,
      { name: keyName, length: length, hash: "SHA-256" },
      true,
      usage
    )
  }

  const encryptionKey = await derive("kiwkiw/session/encryption/v2", "AES-GCM", 256, ["encrypt", "decrypt"])
  const confirmationKey = await derive("kiwkiw/session/confirmation/v2", "HMAC", 256, ["sign", "verify"])

  return { encryptionKey, confirmationKey, sessionContext: transcriptHash }
}

export async function deriveHybridKey(classicalKey, quantumSecret) {
  const classicalRaw = new Uint8Array(await crypto.subtle.exportKey("raw", classicalKey))
  const hkdfKey = await crypto.subtle.importKey("raw", quantumSecret, "HKDF", false, ["deriveKey"])
  return await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: classicalRaw, info: new TextEncoder().encode("nullroom-hybrid-v1") },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  )
}
