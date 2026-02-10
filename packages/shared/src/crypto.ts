import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function deriveKey(masterKey: string): Buffer {
  return createHash("sha256").update(masterKey).digest();
}

/**
 * Encrypt a secret value using AES-256-GCM.
 * @returns Base64-encoded string: IV + ciphertext + auth tag
 */
export function encrypt(value: string, masterKey: string): string {
  const key = deriveKey(masterKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

/**
 * Decrypt a secret value encrypted with {@link encrypt}.
 * @returns Plaintext secret value
 */
export function decrypt(cipher: string, masterKey: string): string {
  const key = deriveKey(masterKey);
  const data = Buffer.from(cipher, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(data.length - TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf-8");
}

/**
 * Hash a CLI token using SHA-256 (one-way, like GitHub PATs).
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a raw CLI token with the evp_ prefix.
 */
export function generateRawToken(): string {
  return `evp_${randomBytes(32).toString("hex")}`;
}
