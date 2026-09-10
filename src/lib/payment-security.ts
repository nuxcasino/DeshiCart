import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM envelope for gateway credentials (§24). Key comes ONLY from the
// PAYMENT_CREDENTIALS_KEY env var (64 hex chars = 32 bytes). Generate one with:
//   openssl rand -hex 32
// Without the key, credential saves are refused (see gateway service) —
// secrets are never stored or logged in plaintext.

function getKey(): Buffer {
  const hex = process.env.PAYMENT_CREDENTIALS_KEY?.trim() || "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "PAYMENT_CREDENTIALS_KEY is missing or invalid. Generate one with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptSecrets(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm:${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecrets(payload: string): string {
  const key = getKey();
  const [scheme, ivHex, tagHex, dataHex] = payload.split(":");
  if (scheme !== "gcm" || !ivHex || !tagHex || !dataHex) {
    throw new Error("Unsupported credential envelope.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return (
    decipher.update(Buffer.from(dataHex, "hex")).toString("utf8") +
    decipher.final("utf8")
  );
}

export function hasCredentialsKey(): boolean {
  return /^[0-9a-fA-F]{64}$/.test(process.env.PAYMENT_CREDENTIALS_KEY?.trim() || "");
}
