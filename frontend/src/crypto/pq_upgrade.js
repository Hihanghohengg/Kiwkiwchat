import { deriveSessionKeys } from "./encryption.js"
import * as mlkem from "./mlkem.js"

const PQ_TIMEOUT_MS = 10_000
const CONFIRM_LABEL_RESPONDER = "nullroom-pq-confirm-responder"
const CONFIRM_LABEL_INITIATOR = "nullroom-pq-confirm-initiator"
const PROTOCOL_VERSION = 2

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

async function computeTranscriptHash(version, roomId, initiatorNonce, responderNonce, pubKeyBytes, ciphertextBytes) {
  const enc = new TextEncoder();
  const parts = [
    enc.encode(version.toString()),
    enc.encode(roomId),
    enc.encode(initiatorNonce),
    enc.encode(responderNonce),
    pubKeyBytes,
    ciphertextBytes
  ];
  let totalLen = 0;
  for (let p of parts) totalLen += 4 + p.length;
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (let p of parts) {
    const view = new DataView(out.buffer, offset, 4);
    view.setUint32(0, p.length, false); // Big endian length prefix
    out.set(p, offset + 4);
    offset += 4 + p.length;
  }
  const hash = await crypto.subtle.digest("SHA-256", out);
  return new Uint8Array(hash);
}

async function computeConfirmHmac(confirmationKey, label, transcriptHash) {
  const payloadStr = `${label}|`;
  const payloadBytes = new TextEncoder().encode(payloadStr);
  const out = new Uint8Array(payloadBytes.length + transcriptHash.length);
  out.set(payloadBytes, 0);
  out.set(transcriptHash, payloadBytes.length);
  
  const sig = await crypto.subtle.sign("HMAC", confirmationKey, out);
  return new Uint8Array(sig);
}

async function verifyConfirmHmac(confirmationKey, label, transcriptHash, received) {
  const payloadStr = `${label}|`;
  const payloadBytes = new TextEncoder().encode(payloadStr);
  const out = new Uint8Array(payloadBytes.length + transcriptHash.length);
  out.set(payloadBytes, 0);
  out.set(transcriptHash, payloadBytes.length);
  
  return crypto.subtle.verify("HMAC", confirmationKey, received, out);
}

export async function performPQUpgrade(peer, classicalKey, isInitiator, onProgress, roomId = "unknown") {
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
        if (msg.version !== PROTOCOL_VERSION) {
          cleanup()
          reject(new Error("Unsupported protocol version"))
          return false
        }
        await processMessage(msg)
        return true
      } catch (err) {
        cleanup()
        reject(err)
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
        version: PROTOCOL_VERSION,
        data: toBase64(publicKey),
        nonce: initiatorNonce
      }))
      peer._pqSecretKey = secretKey
      peer._initiatorNonce = initiatorNonce
      peer._publicKeyBytes = publicKey
    }

    async function handleInitiatorMessage(msg) {
      if (msg.type === "pq-encap") {
        const ciphertext = fromBase64(msg.data)
        const responderHmac = fromBase64(msg.confirm)
        const responderNonce = msg.nonce
        const initiatorNonce = peer._initiatorNonce
        const secretKey = peer._pqSecretKey
        const publicKeyBytes = peer._publicKeyBytes
        
        delete peer._pqSecretKey
        delete peer._initiatorNonce
        delete peer._publicKeyBytes

        const sharedSecret = await mlkem.decapsulate(ciphertext, secretKey)
        
        const transcriptHash = await computeTranscriptHash(
          PROTOCOL_VERSION, roomId, initiatorNonce, responderNonce, publicKeyBytes, ciphertext
        )
        
        progress("Deriving PQ session keys...")
        const sessionKeys = await deriveSessionKeys(classicalKey, sharedSecret, transcriptHash)

        const valid = await verifyConfirmHmac(sessionKeys.confirmationKey, CONFIRM_LABEL_RESPONDER, transcriptHash, responderHmac)
        
        if (!valid) {
          cleanup()
          reject(new Error("PQ confirmation failed: responder HMAC invalid"))
          return
        }

        progress("Verifying mutual HMAC integrity...")

        const initiatorHmac = await computeConfirmHmac(sessionKeys.confirmationKey, CONFIRM_LABEL_INITIATOR, transcriptHash)
        peer.send(JSON.stringify({ 
          type: "pq-confirm", 
          version: PROTOCOL_VERSION,
          data: toBase64(initiatorHmac) 
        }))

        cleanup()
        resolve(sessionKeys.encryptionKey) // Return the derived encryption key!
      }
    }

    async function handleResponderMessage(msg) {
      if (msg.type === "pq-pubkey") {
        const publicKey = fromBase64(msg.data)
        const initiatorNonce = msg.nonce
        const responderNonce = toBase64(crypto.getRandomValues(new Uint8Array(16)))
        
        const { ciphertext, sharedSecret } = await mlkem.encapsulate(publicKey)
        progress("Exchanging public shares...")

        peer._initiatorNonce = initiatorNonce
        peer._responderNonce = responderNonce

        const transcriptHash = await computeTranscriptHash(
          PROTOCOL_VERSION, roomId, initiatorNonce, responderNonce, publicKey, ciphertext
        )
        
        progress("Deriving PQ session keys...")
        const sessionKeys = await deriveSessionKeys(classicalKey, sharedSecret, transcriptHash)
        peer._sessionKeys = sessionKeys
        peer._transcriptHash = transcriptHash

        const responderHmac = await computeConfirmHmac(sessionKeys.confirmationKey, CONFIRM_LABEL_RESPONDER, transcriptHash)

        peer.send(JSON.stringify({
          type: "pq-encap",
          version: PROTOCOL_VERSION,
          data: toBase64(ciphertext),
          confirm: toBase64(responderHmac),
          nonce: responderNonce
        }))
      } else if (msg.type === "pq-confirm") {
        const initiatorHmac = fromBase64(msg.data)
        const sessionKeys = peer._sessionKeys
        const transcriptHash = peer._transcriptHash
        
        delete peer._sessionKeys
        delete peer._initiatorNonce
        delete peer._responderNonce
        delete peer._transcriptHash

        const valid = await verifyConfirmHmac(sessionKeys.confirmationKey, CONFIRM_LABEL_INITIATOR, transcriptHash, initiatorHmac)
        if (!valid) {
          cleanup()
          reject(new Error("PQ confirmation failed: initiator HMAC invalid"))
          return
        }

        progress("Verifying mutual HMAC integrity...")
        cleanup()
        resolve(sessionKeys.encryptionKey)
      }
    }

    if (isInitiator) {
      runInitiator().catch(err => { cleanup(); reject(err) })
    }
  })
}
