import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getAuthSecret } from "@/lib/auth/secret";

const PREFIX = "enc:v1:";

function deriveKey(): Buffer {
  return createHash("sha256").update(getAuthSecret(), "utf8").digest();
}

/**
 * Encrypt a secret with AES-256-GCM.
 * Output format: enc:v1:<iv_b64>:<tag_b64>:<data_b64>
 */
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt a ciphertext produced by encryptSecret.
 * Values that do not start with enc:v1: are treated as legacy plaintext.
 */
export function decryptSecret(ciphertext: string): string {
  const value = ciphertext ?? "";
  if (!value.startsWith(PREFIX)) {
    return value;
  }

  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret format");
  }

  const [ivB64, tagB64, dataB64] = parts;
  const key = deriveKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
