import { MongoClient } from "mongodb";

const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
const newsCollectionName = "news_posts";
const auditCollectionName = "news_audit_events";

if (!uri) {
  console.error("SHALOM_MONGODB_URI가 설정되지 않았습니다.");
  process.exitCode = 1;
} else {
  const client = new MongoClient(uri);

  try {
    const database = client.db(databaseName);
    const newsCollection = database.collection(newsCollectionName);
    const auditCollection = database.collection(auditCollectionName);
    const newsIndexNames = await Promise.all([
      newsCollection.createIndex({ slug: 1 }, { unique: true, name: "news_posts_slug_unique" }),
      newsCollection.createIndex(
        { publicationStatus: 1, approvalStatus: 1, publishedAt: -1 },
        { name: "news_posts_public_list" },
      ),
      newsCollection.createIndex({ deletedAt: -1, _id: -1 }, { name: "news_posts_deleted_timeline" }),
      newsCollection.createIndex({ deletedAt: 1, updatedAt: -1, _id: -1 }, { name: "news_posts_admin_updated" }),
    ]);
    const auditIndexNames = await Promise.all([
      auditCollection.createIndex(
        { newsPostId: 1, toVersionAt: 1 },
        { unique: true, name: "news_audit_events_post_version_unique" },
      ),
      auditCollection.createIndex(
        { newsPostId: 1, occurredAt: -1, _id: -1 },
        { name: "news_audit_events_post_timeline" },
      ),
      auditCollection.createIndex({ occurredAt: -1, _id: -1 }, { name: "news_audit_events_recent" }),
      auditCollection.createIndex(
        { "actor.adminId": 1, occurredAt: -1, _id: -1 },
        { name: "news_audit_events_actor_timeline" },
      ),
    ]);

    console.log("뉴스 인덱스를 확인했습니다.", {
      databaseName,
      newsCollectionName,
      newsIndexNames,
      auditCollectionName,
      auditIndexNames,
    });
  } finally {
    await client.close();
  }
}
