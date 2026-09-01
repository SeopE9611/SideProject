import { MongoClient } from "mongodb";
const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
if (!uri) throw new Error("SHALOM_MONGODB_URI 환경 변수가 필요합니다.");
const client = new MongoClient(uri);
try {
  await client.connect(); const database = client.db(databaseName);
  await database.collection("facility_spaces").createIndexes([
    { key: { publicationStatus: 1, displayOrder: 1, publishedAt: 1, _id: 1 }, name: "facility_spaces_public_order" },
    { key: { publicationStatus: 1, displayOrder: 1, updatedAt: -1, _id: -1 }, name: "facility_spaces_admin_order" },
  ]);
  await database.collection("facility_space_audit_events").createIndexes([
    { key: { facilitySpaceId: 1, toVersionAt: 1 }, unique: true, name: "facility_space_audit_events_version_unique" },
    { key: { facilitySpaceId: 1, occurredAt: -1, _id: -1 }, name: "facility_space_audit_events_timeline" },
  ]);
} finally { await client.close(); }
