import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
const cost = 32768;
const blockSize = 8;
const parallelization = 1;
const keyLength = 64;
const saltLength = 24;
const maxmem = 128 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      { N: cost, r: blockSize, p: parallelization, maxmem },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

function isValidPasswordLength(password: string): boolean {
  return password.length >= 12 && password.length <= 128;
}

export async function hashAdminPassword(password: string): Promise<string> {
  if (!isValidPasswordLength(password)) {
    throw new RangeError("관리자 비밀번호는 12~128자여야 합니다.");
  }

  const salt = randomBytes(saltLength);
  const hash = await deriveKey(password, salt);

  return `scrypt$${cost}$${blockSize}$${parallelization}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

function decodeBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.toString("base64url") === value.replace(/=+$/, "")
      ? decoded
      : null;
  } catch {
    return null;
  }
}

export async function verifyAdminPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  if (password.length < 1 || password.length > 128) return false;
  const parts = encodedHash.split("$");
  if (
    parts.length !== 6 ||
    parts[0] !== "scrypt" ||
    parts[1] !== String(cost) ||
    parts[2] !== String(blockSize) ||
    parts[3] !== String(parallelization)
  ) {
    return false;
  }

  const salt = decodeBase64Url(parts[4]);
  const expected = decodeBase64Url(parts[5]);
  if (!salt || salt.length !== saltLength || !expected || expected.length !== keyLength) {
    return false;
  }

  try {
    const actual = await deriveKey(password, salt);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
