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

async function computeConfirmHmac(sharedSecret, label) {
  const key = await crypto.subtle.importKey(
    "raw", sharedSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  )
  const sig = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(label)
  )
  return new Uint8Array(sig)
}

async function verifyConfirmHmac(sharedSecret, label, received) {
  const key = await crypto.subtle.importKey(
    "raw", sharedSecret, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  )
  return crypto.subtle.verify(
    "HMAC", key, received, new TextEncoder().encode(label)
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
      progress("Exchanging public shares...")
      peer.send(JSON.stringify({ type: "pq-pubkey", data: toBase64(publicKey) }))
      peer._pqSecretKey = secretKey
    }

    async function handleInitiatorMessage(msg) {
      if (msg.type === "pq-encap") {
        const ciphertext = fromBase64(msg.data)
        const responderHmac = fromBase64(msg.confirm)
        const secretKey = peer._pqSecretKey
        delete peer._pqSecretKey

        const sharedSecret = await mlkem.decapsulate(ciphertext, secretKey)
        const valid = await verifyConfirmHmac(sharedSecret, CONFIRM_LABEL_RESPONDER, responderHmac)
        
        if (!valid) {
          cleanup()
          reject(new Error("PQ confirmation failed: responder HMAC invalid"))
          return
        }

        progress("Verifying mutual HMAC integrity...")

        const initiatorHmac = await computeConfirmHmac(sharedSecret, CONFIRM_LABEL_INITIATOR)
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
        const { ciphertext, sharedSecret } = await mlkem.encapsulate(publicKey)
        progress("Exchanging public shares...")

        peer._pqSharedSecret = sharedSecret
        const responderHmac = await computeConfirmHmac(sharedSecret, CONFIRM_LABEL_RESPONDER)

        peer.send(JSON.stringify({
          type: "pq-encap",
          data: toBase64(ciphertext),
          confirm: toBase64(responderHmac)
        }))
      } else if (msg.type === "pq-confirm") {
        const initiatorHmac = fromBase64(msg.data)
        const sharedSecret = peer._pqSharedSecret
        delete peer._pqSharedSecret

        const valid = await verifyConfirmHmac(sharedSecret, CONFIRM_LABEL_INITIATOR, initiatorHmac)
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
