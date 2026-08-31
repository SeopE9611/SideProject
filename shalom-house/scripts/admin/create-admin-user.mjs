import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

import { MongoClient } from "mongodb";

const scrypt = promisify(scryptCallback);
const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
const email = process.env.SHALOM_ADMIN_EMAIL?.trim();
const password = process.env.SHALOM_ADMIN_PASSWORD;
const displayName = process.env.SHALOM_ADMIN_NAME?.trim();
const role = process.env.SHALOM_ADMIN_ROLE?.trim() || "admin";
const adminRoles = ["admin", "editor", "reviewer", "publisher"];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (!uri || !email || !password || !displayName) {
  fail("필수 관리자 생성 환경변수가 설정되지 않았습니다.");
} else if (!adminRoles.includes(role)) {
  fail("관리자 역할은 admin, editor, reviewer, publisher 중 하나여야 합니다.");
} else if (email.length > 254 || !email.includes("@")) {
  fail("관리자 이메일 형식을 확인해 주세요.");
} else if (displayName.length < 2 || displayName.length > 50) {
  fail("관리자 표시 이름은 2~50자여야 합니다.");
} else if (password.length < 12 || password.length > 128) {
  fail("관리자 비밀번호는 12~128자여야 합니다.");
} else {
  const client = new MongoClient(uri);
  try {
    const collection = client.db(databaseName).collection("admin_users");
    await collection.createIndex(
      { normalizedEmail: 1 },
      { name: "admin_users_normalized_email_unique", unique: true },
    );
    const normalizedEmail = email.toLowerCase();
    if (await collection.findOne({ normalizedEmail }, { projection: { _id: 1 } })) {
      fail("동일한 이메일의 관리자 계정이 이미 존재합니다.");
    } else {
      const salt = randomBytes(24);
      const hash = await scrypt(password, salt, 64, {
        N: 32768,
        r: 8,
        p: 1,
        maxmem: 128 * 1024 * 1024,
      });
      const passwordHash = `scrypt$32768$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
      const now = new Date();
      await collection.insertOne({
        email,
        normalizedEmail,
        displayName,
        passwordHash,
        role,
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      });
      console.log("관리자 계정을 생성했습니다.");
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      fail("동일한 이메일의 관리자 계정이 이미 존재합니다.");
    } else {
      fail("관리자 계정을 생성하지 못했습니다.");
    }
  } finally {
    await client.close();
  }
}
