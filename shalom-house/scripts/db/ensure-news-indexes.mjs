import { MongoClient } from "mongodb";

const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
const collectionName = "news_posts";

if (!uri) {
  console.error("SHALOM_MONGODB_URI가 설정되지 않았습니다.");
  process.exitCode = 1;
} else {
  const client = new MongoClient(uri);

  try {
    const collection = client.db(databaseName).collection(collectionName);
    const indexNames = await Promise.all([
      collection.createIndex(
        { slug: 1 },
        { unique: true, name: "news_posts_slug_unique" },
      ),
      collection.createIndex(
        { publicationStatus: 1, approvalStatus: 1, publishedAt: -1 },
        { name: "news_posts_public_list" },
      ),
      collection.createIndex(
        { deletedAt: 1, updatedAt: -1, _id: -1 },
        { name: "news_posts_admin_updated" },
      ),
    ]);

    console.log("뉴스 인덱스를 확인했습니다.", {
      databaseName,
      collectionName,
      indexNames,
    });
  } finally {
    await client.close();
  }
}
