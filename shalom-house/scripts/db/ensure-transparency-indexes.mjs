import { MongoClient } from "mongodb";
const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
if (!uri) {
  console.error("SHALOM_MONGODB_URI가 설정되지 않았습니다.");
  process.exitCode = 1;
} else {
  const client = new MongoClient(uri);
  try {
    const database = client.db(databaseName);
    const documents = database.collection("transparency_documents");
    const audits = database.collection("transparency_audit_events");
    const active = { deletedAt: null };
    const indexNames = await Promise.all([
      documents.createIndex({ slug: 1 }, { unique: true, partialFilterExpression: active, name: "transparency_documents_slug_unique" }),
      documents.createIndex({ "file.sha256": 1 }, { unique: true, partialFilterExpression: active, name: "transparency_documents_file_sha256_unique" }),
      documents.createIndex({ updatedAt: -1, _id: -1 }, { name: "transparency_documents_updated" }),
      documents.createIndex({ category: 1, updatedAt: -1 }, { name: "transparency_documents_category_updated" }),
      documents.createIndex({ publicationStatus: 1, updatedAt: -1 }, { name: "transparency_documents_publication_updated" }),
      documents.createIndex({ privacyReviewStatus: 1, updatedAt: -1 }, { name: "transparency_documents_privacy_updated" }),
      documents.createIndex({ finalDocumentStatus: 1, updatedAt: -1 }, { name: "transparency_documents_final_updated" }),
      documents.createIndex({ publicationStatus: 1, approvalStatus: 1, privacyReviewStatus: 1, finalDocumentStatus: 1, publishedAt: -1, documentDate: -1, _id: -1 }, { name: "transparency_documents_public_visibility" }),
    ]);
    const auditIndexName = await audits.createIndex({ transparencyDocumentId: 1, occurredAt: -1, _id: -1 }, { name: "transparency_audit_events_content_occurred" });
    console.log("자료공개 인덱스를 확인했습니다.", { databaseName, indexNames, auditIndexName });
  } finally {
    await client.close();
  }
}
