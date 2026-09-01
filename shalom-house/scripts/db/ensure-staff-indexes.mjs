import { MongoClient } from "mongodb";
const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
if (!uri) throw new Error("SHALOM_MONGODB_URI가 설정되지 않았습니다.");
const client = new MongoClient(uri);
try { await client.connect(); const database = client.db(databaseName); await database.collection("staff_profiles").createIndexes([{ key: { publicationStatus: 1, displayOrder: 1, publishedAt: 1, _id: 1 }, name: "staff_profiles_public_order" }, { key: { publicationStatus: 1, displayOrder: 1, updatedAt: -1, _id: -1 }, name: "staff_profiles_admin_order" }]); await database.collection("staff_audit_events").createIndexes([{ key: { staffProfileId: 1, toVersionAt: 1 }, unique: true, name: "staff_audit_events_profile_version_unique" }, { key: { staffProfileId: 1, occurredAt: -1, _id: -1 }, name: "staff_audit_events_profile_timeline" }]); } finally { await client.close(); }
