import { MongoClient } from "mongodb";
import { INDEX_COLLECTION_GROUPS, toCreateIndexSpecs } from "./index-specs.mjs";
const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
if (!uri) throw new Error("SHALOM_MONGODB_URI가 필요합니다.");
const client = new MongoClient(uri);
try {
  const db = client.db(databaseName);
  for (const collectionName of INDEX_COLLECTION_GROUPS.siteContent) await db.collection(collectionName).createIndexes(toCreateIndexSpecs(collectionName));
} finally {
  await client.close();
}
