import { ObjectId } from "mongodb";
import { getMongoDatabase } from "@/lib/mongodb";
import { STAFF_COLLECTION_NAME, type MongoStaffProfileDocument } from "./staff.mongo-schema";
import { validateStaffProfileInput } from "./staff.validation";
import { isValidStaffDate } from "./staff.types";
export type PublicStaffProfile = {
  id: string;
  role: string;
  responsibility: string;
  name?: string;
};
export async function listPublicStaffProfiles(): Promise<readonly PublicStaffProfile[]> {
  const source = process.env.SHALOM_CONTENT_SOURCE || "fixture";
  if (source === "fixture" || source === "empty") return [];
  if (source !== "mongodb") throw new Error(`지원하지 않는 SHALOM_CONTENT_SOURCE입니다: ${source}`);
  const documents = await (
    await getMongoDatabase()
  )
    .collection<MongoStaffProfileDocument>(STAFF_COLLECTION_NAME)
    .find({ publicationStatus: "published" })
    .sort({ displayOrder: 1, publishedAt: 1, _id: 1 })
    .toArray();
  return documents.flatMap((document) => {
    const validation = validateStaffProfileInput({
      role: document.role,
      responsibility: document.responsibility,
      name: document.name,
      showName: document.showName,
      nameDisclosureConfirmed: document.nameDisclosureConfirmed,
      nameDisclosureReference: document.nameDisclosureReference,
      publicationStatus: document.publicationStatus,
      displayOrder: document.displayOrder,
    });
    const validDocument =
      document._id instanceof ObjectId &&
      isValidStaffDate(document.createdAt) &&
      isValidStaffDate(document.updatedAt) &&
      isValidStaffDate(document.publishedAt) &&
      document.archivedAt === null &&
      document.publicationStatus === "published";
    if (!validation.ok || !validDocument) {
      console.error("공개 직원 소개 문서 검증 실패", {
        staffProfileId: document._id instanceof ObjectId ? document._id.toHexString() : "unknown",
        errorName: "InvalidStaffProfile",
      });
      return [];
    }
    const profile: PublicStaffProfile = {
      id: document._id.toHexString(),
      role: validation.value.role,
      responsibility: validation.value.responsibility,
    };
    if (
      validation.value.showName &&
      validation.value.name &&
      validation.value.nameDisclosureConfirmed &&
      validation.value.nameDisclosureReference &&
      isValidStaffDate(document.nameDisclosureConfirmedAt)
    )
      profile.name = validation.value.name;
    return [profile];
  });
}
