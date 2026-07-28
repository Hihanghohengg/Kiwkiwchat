import { MlKem768 } from "mlkem";

const mlkem = new MlKem768();

export async function generateKeyPair() {
  const [publicKey, secretKey] = await mlkem.generateKeyPair();
  return {
    publicKey,
    secretKey
  };
}

export async function encapsulate(publicKeyBytes) {
  const [ciphertext, sharedSecret] = await mlkem.encap(publicKeyBytes);
  return {
    ciphertext,
    sharedSecret
  };
}

export async function decapsulate(ciphertextBytes, secretKey) {
  const sharedSecret = await mlkem.decap(ciphertextBytes, secretKey);
  return sharedSecret;
}
