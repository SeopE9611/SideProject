import { MongoClient } from "mongodb";
const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";
const programCollectionName = "program_posts";
const auditCollectionName = "program_audit_events";
if (!uri) { console.error("SHALOM_MONGODB_URI가 설정되지 않았습니다."); process.exitCode = 1; } else {
 const client = new MongoClient(uri);
 try { const database=client.db(databaseName); const programs=database.collection(programCollectionName); const audits=database.collection(auditCollectionName);
 const programIndexNames=await Promise.all([
 programs.createIndex({slug:1},{unique:true,name:"program_posts_slug_unique"}),
 programs.createIndex({publicationStatus:1,approvalStatus:1,sortOrder:1,publishedAt:-1,_id:-1},{name:"program_posts_public_list"}),
 programs.createIndex({deletedAt:1,updatedAt:-1,_id:-1},{name:"program_posts_admin_updated"})]);
 const auditIndexNames=await Promise.all([
 audits.createIndex({programId:1,toVersionAt:1},{unique:true,name:"program_audit_events_program_version_unique"}),
 audits.createIndex({programId:1,occurredAt:-1,_id:-1},{name:"program_audit_events_program_timeline"}),
 audits.createIndex({occurredAt:-1,_id:-1},{name:"program_audit_events_recent"}),
 audits.createIndex({"actor.adminId":1,occurredAt:-1,_id:-1},{name:"program_audit_events_actor_timeline"})]);
 console.log("프로그램 인덱스를 확인했습니다.",{databaseName,programCollectionName,programIndexNames,auditCollectionName,auditIndexNames});
 } finally { await client.close(); }
}
