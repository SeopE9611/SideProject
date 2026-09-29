import { MongoClient } from "mongodb";
import { INDEX_COLLECTION_GROUPS, toCreateIndexSpecs } from "./index-specs.mjs";
const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
if (!uri) throw new Error("SHALOM_MONGODB_URI 환경 변수가 필요합니다.");
const client = new MongoClient(uri);
try {
  await client.connect();
  const database = client.db(databaseName);
  for (const collectionName of INDEX_COLLECTION_GROUPS.facilitySpace) await database.collection(collectionName).createIndexes(toCreateIndexSpecs(collectionName));
} finally {
  await client.close();
}
