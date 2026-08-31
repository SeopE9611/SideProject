import { MongoClient } from "mongodb";
const uri = process.env.SHALOM_MONGODB_URI,
  databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
if (!uri) {
  console.error("SHALOM_MONGODB_URI가 설정되지 않았습니다.");
  process.exitCode = 1;
} else {
  const client = new MongoClient(uri);
  try {
    const database = client.db(databaseName),
      items = database.collection("gallery_items"),
      audits = database.collection("gallery_audit_events");
    const galleryIndexNames = await Promise.all([
      items.createIndex(
        { slug: 1 },
        { unique: true, name: "gallery_items_slug_unique" },
      ),
      items.createIndex(
        { "media.sha256": 1 },
        { unique: true, name: "gallery_items_media_sha256_unique" },
      ),
      items.createIndex(
        {
          publicationStatus: 1,
          approvalStatus: 1,
          consentStatus: 1,
          updatedAt: -1,
          _id: -1,
        },
        { name: "gallery_items_admin_status" },
      ),
      items.createIndex(
        { publicationStatus: 1, approvalStatus: 1, consentStatus: 1, consentWithdrawnAt: 1, displayStartOn: 1, displayEndOn: 1, activityDate: -1, publishedAt: -1, _id: -1 },
        { name: "gallery_items_public_visibility" },
      ),
      items.createIndex(
        { deletedAt: 1, updatedAt: -1, _id: -1 },
        { name: "gallery_items_admin_updated" },
      ),
    ]);
    const auditIndexNames = await Promise.all([
      audits.createIndex(
        { galleryItemId: 1, toVersionAt: 1 },
        { unique: true, name: "gallery_audit_events_item_version_unique" },
      ),
      audits.createIndex(
        { galleryItemId: 1, occurredAt: -1, _id: -1 },
        { name: "gallery_audit_events_content_occurred" },
      ),
      audits.createIndex(
        { occurredAt: -1, _id: -1 },
        { name: "gallery_audit_events_recent" },
      ),
    ]);
    console.log("활동사진 인덱스를 확인했습니다.", {
      databaseName,
      galleryIndexNames,
      auditIndexNames,
    });
  } finally {
    await client.close();
  }
}
