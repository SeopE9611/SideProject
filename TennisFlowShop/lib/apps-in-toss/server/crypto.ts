import "server-only";

import { createDecipheriv, createHash } from "node:crypto";

import { getAppsInTossLoginDecryptionConfig } from "./config";

export class AppsInTossCryptoError extends Error {
  constructor() {
    super("Apps in Toss 로그인 정보를 확인하지 못했습니다.");
    this.name = "AppsInTossCryptoError";
  }
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function decryptTossUserNameWithConfig(encryptedName: string, keyBase64: string, aad: string) {
  try {
    const key = Buffer.from(keyBase64, "base64");
    const payload = Buffer.from(encryptedName, "base64");
    if (key.length !== 32 || payload.length <= 12 + 16) throw new AppsInTossCryptoError();

    const iv = payload.subarray(0, 12);
    const authenticationTag = payload.subarray(payload.length - 16);
    const ciphertext = payload.subarray(12, payload.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(authenticationTag);
    const name = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8").trim();
    if (!name) throw new AppsInTossCryptoError();
    return name;
  } catch (error) {
    if (error instanceof AppsInTossCryptoError) throw error;
    throw new AppsInTossCryptoError();
  }
}

export function decryptTossUserName(encryptedName: string) {
  const { keyBase64, aad } = getAppsInTossLoginDecryptionConfig();
  return decryptTossUserNameWithConfig(encryptedName, keyBase64, aad);
}
