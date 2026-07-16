import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./envConfig";

/**
 * AES-256-GCM encryption for secrets at rest (GHL API keys).
 * Stored format: v1:<iv hex>:<auth tag hex>:<ciphertext hex>
 * The version prefix allows rotating the scheme later without a data migration.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard nonce size

function encryptionKey(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, "hex");
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  const [version, ivHex, tagHex, dataHex] = stored.split(":");
  if (version !== "v1" || !ivHex || !tagHex || !dataHex) {
    throw new Error("Unrecognized encrypted secret format");
  }
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
