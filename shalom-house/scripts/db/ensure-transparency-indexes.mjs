import { MongoClient } from "mongodb";
import { INDEX_COLLECTION_GROUPS, toCreateIndexSpecs } from "./index-specs.mjs";
const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
if (!uri) {
  console.error("SHALOM_MONGODB_URI가 설정되지 않았습니다.");
  process.exitCode = 1;
} else {
  const client = new MongoClient(uri);
  try {
    const database = client.db(databaseName);
    const [indexNames, auditIndexNames] = await Promise.all(
      INDEX_COLLECTION_GROUPS.transparency.map((collectionName) =>
        database.collection(collectionName).createIndexes(toCreateIndexSpecs(collectionName)),
      ),
    );
    console.log("자료공개 인덱스를 확인했습니다.", {
      databaseName, indexNames, auditIndexName: auditIndexNames[0],
    });
  } finally {
    await client.close();
  }
}
