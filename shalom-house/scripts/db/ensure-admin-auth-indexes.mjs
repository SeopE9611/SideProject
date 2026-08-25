import { MongoClient } from "mongodb";

const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";

if (!uri) {
  console.error("SHALOM_MONGODB_URI가 설정되지 않았습니다.");
  process.exitCode = 1;
} else {
  const client = new MongoClient(uri);
  try {
    const database = client.db(databaseName);
    const indexResults = await Promise.all([
      database.collection("admin_users").createIndex(
        { normalizedEmail: 1 },
        { name: "admin_users_normalized_email_unique", unique: true },
      ),
      database.collection("admin_sessions").createIndex(
        { tokenHash: 1 },
        { name: "admin_sessions_token_hash_unique", unique: true },
      ),
      database.collection("admin_sessions").createIndex(
        { expiresAt: 1 },
        { name: "admin_sessions_expires_ttl", expireAfterSeconds: 0 },
      ),
      database.collection("admin_sessions").createIndex(
        { userId: 1, revokedAt: 1, expiresAt: -1 },
        { name: "admin_sessions_user_active" },
      ),
      database.collection("admin_login_attempts").createIndex(
        { keyHash: 1 },
        { name: "admin_login_attempts_key_hash_unique", unique: true },
      ),
      database.collection("admin_login_attempts").createIndex(
        { expiresAt: 1 },
        { name: "admin_login_attempts_expires_ttl", expireAfterSeconds: 0 },
      ),
    ]);
    console.log("관리자 인증 인덱스를 확인했습니다.", {
      databaseName,
      collections: ["admin_users", "admin_sessions", "admin_login_attempts"],
      indexNames: indexResults,
    });
  } finally {
    await client.close();
  }
}
