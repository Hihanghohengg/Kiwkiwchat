import { deriveHybridKey } from "./encryption.js"
import * as mlkem from "./mlkem.js"

const PQ_TIMEOUT_MS = 10_000
const CONFIRM_LABEL_RESPONDER = "nullroom-pq-confirm-responder"
const CONFIRM_LABEL_INITIATOR = "nullroom-pq-confirm-initiator"

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

async function computeConfirmHmac(sharedSecret, label, initiatorNonce, responderNonce) {
  const key = await crypto.subtle.importKey(
    "raw", sharedSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  )
  const payloadStr = `${label}|${initiatorNonce}|${responderNonce}`
  const sig = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(payloadStr)
  )
  return new Uint8Array(sig)
}

async function verifyConfirmHmac(sharedSecret, label, initiatorNonce, responderNonce, received) {
  const key = await crypto.subtle.importKey(
    "raw", sharedSecret, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  )
  const payloadStr = `${label}|${initiatorNonce}|${responderNonce}`
  return crypto.subtle.verify(
    "HMAC", key, received, new TextEncoder().encode(payloadStr)
  )
}

export async function performPQUpgrade(peer, classicalKey, isInitiator, onProgress) {
  const progress = typeof onProgress === "function" ? onProgress : () => {}

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error("Post-quantum upgrade timed out"))
    }, PQ_TIMEOUT_MS)

    const handler = async (msgStr) => {
      try {
        const msg = JSON.parse(msgStr)
        if (!msg.type || !msg.type.startsWith("pq-")) return false
        await processMessage(msg)
        return true
      } catch {
        return false
      }
    }

    peer._pqHandler = handler

    function cleanup() {
      clearTimeout(timeout)
      peer._pqHandler = null
    }

    async function processMessage(msg) {
      if (isInitiator) {
        await handleInitiatorMessage(msg)
      } else {
        await handleResponderMessage(msg)
      }
    }

    async function runInitiator() {
      const { publicKey, secretKey } = await mlkem.generateKeyPair()
      const initiatorNonce = toBase64(crypto.getRandomValues(new Uint8Array(16)))
      progress("Exchanging public shares...")
      peer.send(JSON.stringify({ 
        type: "pq-pubkey", 
        data: toBase64(publicKey),
        nonce: initiatorNonce
      }))
      peer._pqSecretKey = secretKey
      peer._initiatorNonce = initiatorNonce
    }

    async function handleInitiatorMessage(msg) {
      if (msg.type === "pq-encap") {
        const ciphertext = fromBase64(msg.data)
        const responderHmac = fromBase64(msg.confirm)
        const responderNonce = msg.nonce
        const initiatorNonce = peer._initiatorNonce
        const secretKey = peer._pqSecretKey
        
        delete peer._pqSecretKey
        delete peer._initiatorNonce

        const sharedSecret = await mlkem.decapsulate(ciphertext, secretKey)
        const valid = await verifyConfirmHmac(sharedSecret, CONFIRM_LABEL_RESPONDER, initiatorNonce, responderNonce, responderHmac)
        
        if (!valid) {
          cleanup()
          reject(new Error("PQ confirmation failed: responder HMAC invalid"))
          return
        }

        progress("Verifying mutual HMAC integrity...")

        const initiatorHmac = await computeConfirmHmac(sharedSecret, CONFIRM_LABEL_INITIATOR, initiatorNonce, responderNonce)
        peer.send(JSON.stringify({ type: "pq-confirm", data: toBase64(initiatorHmac) }))

        const hybridKey = await deriveHybridKey(classicalKey, sharedSecret)
        progress("Deriving PQ session keys...")
        cleanup()
        resolve(hybridKey)
      }
    }

    async function handleResponderMessage(msg) {
      if (msg.type === "pq-pubkey") {
        const publicKey = fromBase64(msg.data)
        const initiatorNonce = msg.nonce
        const responderNonce = toBase64(crypto.getRandomValues(new Uint8Array(16)))
        
        const { ciphertext, sharedSecret } = await mlkem.encapsulate(publicKey)
        progress("Exchanging public shares...")

        peer._pqSharedSecret = sharedSecret
        peer._initiatorNonce = initiatorNonce
        peer._responderNonce = responderNonce

        const responderHmac = await computeConfirmHmac(sharedSecret, CONFIRM_LABEL_RESPONDER, initiatorNonce, responderNonce)

        peer.send(JSON.stringify({
          type: "pq-encap",
          data: toBase64(ciphertext),
          confirm: toBase64(responderHmac),
          nonce: responderNonce
        }))
      } else if (msg.type === "pq-confirm") {
        const initiatorHmac = fromBase64(msg.data)
        const sharedSecret = peer._pqSharedSecret
        const initiatorNonce = peer._initiatorNonce
        const responderNonce = peer._responderNonce
        
        delete peer._pqSharedSecret
        delete peer._initiatorNonce
        delete peer._responderNonce

        const valid = await verifyConfirmHmac(sharedSecret, CONFIRM_LABEL_INITIATOR, initiatorNonce, responderNonce, initiatorHmac)
        if (!valid) {
          cleanup()
          reject(new Error("PQ confirmation failed: initiator HMAC invalid"))
          return
        }

        progress("Verifying mutual HMAC integrity...")
        const hybridKey = await deriveHybridKey(classicalKey, sharedSecret)
        progress("Deriving PQ session keys...")
        cleanup()
        resolve(hybridKey)
      }
    }

    if (isInitiator) {
      runInitiator().catch(err => { cleanup(); reject(err) })
    }
  })
}
