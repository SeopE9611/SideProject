import type { ObjectId } from "mongodb";
import type { AdminRole } from "../admin-auth/admin-auth.types";
import type { MongoGalleryItemDocument } from "./gallery.mongo-schema";
export const galleryAuditActions=["draft_created","draft_updated","archived"] as const;
export type GalleryAuditAction=(typeof galleryAuditActions)[number];
export type GalleryAuditSnapshot=Omit<MongoGalleryItemDocument,"_id"|"createdAt"|"updatedAt"|"deletedAt"|"media"> & {media:Omit<MongoGalleryItemDocument["media"],"originalFileName">};
export type GalleryAuditActor={adminId:ObjectId;displayName:string;role:AdminRole};
export function createGalleryAuditSnapshot(d:MongoGalleryItemDocument):GalleryAuditSnapshot{return{slug:d.slug,title:d.title,category:d.category,description:d.description,altText:d.altText,activityDate:d.activityDate,subjectPresence:d.subjectPresence,consentStatus:d.consentStatus,consentCheckedOn:d.consentCheckedOn,consentReferenceCode:d.consentReferenceCode,displayStartOn:d.displayStartOn,displayEndOn:d.displayEndOn,media:{bucket:d.media.bucket,objectPath:d.media.objectPath,mimeType:d.media.mimeType,byteSize:d.media.byteSize,width:d.media.width,height:d.media.height,sha256:d.media.sha256},publicationStatus:d.publicationStatus,approvalStatus:d.approvalStatus,publishedAt:d.publishedAt,consentWithdrawnAt:d.consentWithdrawnAt,archivedAt:d.archivedAt};}
