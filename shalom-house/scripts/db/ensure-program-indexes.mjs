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
    const [programCollectionName, auditCollectionName] = INDEX_COLLECTION_GROUPS.program;
    const [programIndexNames, auditIndexNames] = await Promise.all(
      INDEX_COLLECTION_GROUPS.program.map((collectionName) =>
        database.collection(collectionName).createIndexes(toCreateIndexSpecs(collectionName)),
      ),
    );
    console.log("프로그램 인덱스를 확인했습니다.", {
      databaseName, programCollectionName, programIndexNames, auditCollectionName, auditIndexNames,
    });
  } finally {
    await client.close();
  }
}
