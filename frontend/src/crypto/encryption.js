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

export async function encrypt(plaintext, key) {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoder = new TextEncoder()
    const plaintextBuffer = encoder.encode(plaintext)
    
    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      plaintextBuffer
    )
    
    const combined = new Uint8Array(iv.length + ciphertextBuffer.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(ciphertextBuffer), iv.length)
    
    const binaryString = Array.from(combined)
      .map(byte => String.fromCharCode(byte))
      .join("")
    return btoa(binaryString)
  } catch (error) {
    console.error("Error encrypting:", error)
    throw error
  }
}

export async function decrypt(encryptedString, key) {
  try {
    const binaryString = atob(encryptedString)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    const iv = bytes.slice(0, 12)
    const ciphertextBuffer = bytes.slice(12).buffer
    
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertextBuffer
    )
    
    const decoder = new TextDecoder()
    return decoder.decode(plaintextBuffer)
  } catch (error) {
    console.error("Error decrypting:", error)
    throw error
  }
}

export async function deriveHybridKey(classicalKey, quantumSecret) {
  const classicalRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", classicalKey)
  )
  
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    quantumSecret,
    "HKDF",
    false,
    ["deriveKey"]
  )
  
  const hybridKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: classicalRaw,
      info: new TextEncoder().encode("nullroom-hybrid-v1")
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  )
  
  return hybridKey
}
