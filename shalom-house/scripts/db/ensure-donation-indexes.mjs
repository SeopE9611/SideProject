import { MongoClient } from "mongodb";
const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
if (!uri) throw new Error("SHALOM_MONGODB_URI is required");
const client = new MongoClient(uri);
try {
  await client.connect(); const db = client.db(databaseName);
  await db.collection("donors").createIndexes([{ key: { reference: 1 }, unique: true, name: "donors_reference_unique" }, { key: { status: 1, type: 1, displayName: 1, _id: 1 }, name: "donors_admin_list" }]);
  await db.collection("donations").createIndexes([{ key: { reference: 1 }, unique: true, name: "donations_reference_unique" }, { key: { status: 1, donatedOn: -1, createdAt: -1, _id: -1 }, name: "donations_admin_list" }, { key: { status: 1, donatedOn: 1 }, name: "donations_confirmed_month" }, { key: { donorId: 1, donatedOn: -1, _id: -1 }, name: "donations_donor_history" }]);
  await db.collection("donor_audit_events").createIndexes([{ key: { donorId: 1, toVersionAt: 1 }, unique: true, name: "donor_audit_events_version_unique" }, { key: { donorId: 1, occurredAt: -1, _id: -1 }, name: "donor_audit_events_timeline" }]);
  await db.collection("donation_audit_events").createIndexes([{ key: { donationId: 1, toVersionAt: 1 }, unique: true, name: "donation_audit_events_version_unique" }, { key: { donationId: 1, occurredAt: -1, _id: -1 }, name: "donation_audit_events_timeline" }]);
} finally { await client.close(); }
