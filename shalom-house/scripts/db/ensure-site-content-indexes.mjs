import { MongoClient } from "mongodb";
const uri = process.env.SHALOM_MONGODB_URI; const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
if (!uri) throw new Error("SHALOM_MONGODB_URI가 필요합니다.");
const client = new MongoClient(uri);
try { const db = client.db(databaseName); await db.collection("site_content_documents").createIndex({ key: 1 }, { unique: true, name: "site_content_documents_key_unique" }); await db.collection("site_content_audit_events").createIndex({ siteContentKey: 1, occurredAt: -1, _id: -1 }, { name: "site_content_audit_events_key_timeline" }); } finally { await client.close(); }
