import { MongoClient } from "mongodb";
import { INDEX_COLLECTION_GROUPS, toCreateIndexSpecs } from "./index-specs.mjs";
const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
if (!uri) throw new Error("SHALOM_MONGODB_URI가 설정되지 않았습니다.");
const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(databaseName);
  for (const collectionName of INDEX_COLLECTION_GROUPS.inquiry) await db.collection(collectionName).createIndexes(toCreateIndexSpecs(collectionName));
  console.log("문의 인덱스를 확인했습니다.");
} finally {
  await client.close();
}
