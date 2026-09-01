import { ObjectId, type Document, type Filter, type WithId } from "mongodb";
import { getMongoDatabase } from "@/lib/mongodb";
import { findPublicGalleryCoverById, findPublicGalleryCoversByIds, type PublicGalleryCoverReference } from "@/features/gallery/gallery.repository";
import { isValidStoredProgramAttachment } from "./program.media-validation";
import { PROGRAM_COLLECTION_NAME, type MongoProgramDocument } from "./program.mongo-schema";
import { normalizePublicProgramLimit, type ProgramRepository } from "./program.repository";
import { isValidProgramSlug, type PublicProgram, type PublicProgramSummary } from "./program.types";
const validDate = (v: unknown): v is Date => v instanceof Date && !Number.isNaN(v.getTime());
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
function validAttachment(d: WithId<Document>) { const a=d.attachment; if(a==null) return a===null||a===undefined?null:false; return isValidStoredProgramAttachment(a,d.updatedAt,d._id.toHexString())?a:false; }
const attachment=(d:WithId<Document>)=>{const a=validAttachment(d); return a?{href:`/api/programs/${encodeURIComponent(d.slug)}/attachment`,label:a.label,originalFileName:a.originalFileName,byteSize:a.byteSize}:null;};
const image=(c?:PublicGalleryCoverReference|null)=>c?{src:c.mediaUrl,altText:c.altText,width:c.width,height:c.height}:null;
function summary(d: WithId<Document>, cover?:PublicGalleryCoverReference|null): PublicProgramSummary | null {
  if (!d._id || !isValidProgramSlug(d.slug) || !text(d.category) || !text(d.title) || !text(d.summary) || !text(d.purpose) ||
    !(d.operationStatusLabel === null || text(d.operationStatusLabel)) || !Number.isInteger(d.sortOrder) || d.sortOrder < 0 || d.sortOrder > 9999 ||
    !validDate(d.publishedAt) || !validDate(d.updatedAt) || (d.coverGalleryItemId!=null && !(d.coverGalleryItemId instanceof ObjectId)) || validAttachment(d)===false) return null;
  return { id:d._id.toString(),slug:d.slug,category:d.category,title:d.title,summary:d.summary,purpose:d.purpose,operationStatusLabel:d.operationStatusLabel,
    sortOrder:d.sortOrder,publishedAt:d.publishedAt.toISOString(),updatedAt:d.updatedAt.toISOString(),coverImage:image(cover),attachment:attachment(d) };
}
function detail(d:WithId<Document>,cover?:PublicGalleryCoverReference|null):PublicProgram|null { const v=summary(d,cover); return v&&Array.isArray(d.body)&&d.body.length>0&&d.body.every(text)?{...v,body:d.body}:null; }
function publicFilter(now:Date):Filter<MongoProgramDocument>{return{publicationStatus:"published",approvalStatus:"approved",publishedAt:{$ne:null,$lte:now},$or:[{deletedAt:{$exists:false}},{deletedAt:null}]};}
const projection={slug:1,category:1,title:1,summary:1,purpose:1,operationStatusLabel:1,sortOrder:1,publishedAt:1,updatedAt:1,coverGalleryItemId:1,attachment:1} as const;
export class MongoProgramRepository implements ProgramRepository {
 async listPublished(options?:{limit?:number}):Promise<readonly PublicProgramSummary[]>{const docs=await(await getMongoDatabase()).collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME).find(publicFilter(new Date()),{projection}).sort({sortOrder:1,publishedAt:-1,_id:-1}).limit(normalizePublicProgramLimit(options?.limit)).toArray();
  const ids=docs.flatMap(d=>d.coverGalleryItemId instanceof ObjectId?[d.coverGalleryItemId]:[]); const covers=await findPublicGalleryCoversByIds(ids);
  return docs.flatMap(d=>{const p=summary(d,d.coverGalleryItemId instanceof ObjectId?covers.get(d.coverGalleryItemId.toHexString()):null);if(!p)console.error("공개 프로그램 문서 검증에 실패했습니다.",{documentId:d._id.toString()});return p?[p]:[];});}
 async findPublishedBySlug(slug:string):Promise<PublicProgram|null>{if(!isValidProgramSlug(slug))return null;const d=await(await getMongoDatabase()).collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME).findOne({...publicFilter(new Date()),slug},{projection:{...projection,body:1}});if(!d)return null;const cover=d.coverGalleryItemId instanceof ObjectId?await findPublicGalleryCoverById(d.coverGalleryItemId):null;return detail(d,cover);}
}
export async function findPublishedProgramAttachmentBySlug(slug:string){if(!isValidProgramSlug(slug))return null;const d=await(await getMongoDatabase()).collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME).findOne({...publicFilter(new Date()),slug},{projection:{_id:1,slug:1,updatedAt:1,attachment:1}});if(!d||validAttachment(d)===false)return null;return d.attachment?{programId:d._id.toHexString(),bucket:d.attachment.bucket,objectPath:d.attachment.objectPath,originalFileName:d.attachment.originalFileName}:null;}
