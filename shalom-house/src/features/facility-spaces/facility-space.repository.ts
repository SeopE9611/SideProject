import { ObjectId } from "mongodb";
import { getVisualAboutFixtures, isVisualFixtureEnabled, visualSpaceFixtures } from "@/content/fixtures/visual.fixture";
import { getMongoDatabase } from "@/lib/mongodb";
import { FACILITY_SPACE_COLLECTION_NAME, type MongoFacilitySpaceDocument } from "./facility-space.mongo-schema";
import { validateFacilitySpaceInput } from "./facility-space.validation";
import { isValidFacilitySpaceDate } from "./facility-space.types";
export type PublicFacilitySpace = { id: string; title: string; description: string };
export async function listPublicFacilitySpaces(): Promise<readonly PublicFacilitySpace[]> {
  if (isVisualFixtureEnabled()) return getVisualAboutFixtures(visualSpaceFixtures);
  const source = process.env.SHALOM_CONTENT_SOURCE || "fixture";
  if (source === "fixture" || source === "empty") return [];
  if (source !== "mongodb") throw new Error(`지원하지 않는 SHALOM_CONTENT_SOURCE입니다: ${source}`);
  const documents = await (
    await getMongoDatabase()
  )
    .collection<MongoFacilitySpaceDocument>(FACILITY_SPACE_COLLECTION_NAME)
    .find({ publicationStatus: "published" })
    .sort({ displayOrder: 1, publishedAt: 1, _id: 1 })
    .toArray();
  return documents.flatMap((document) => {
    const validation = validateFacilitySpaceInput({
      title: document.title,
      description: document.description,
      publicationStatus: document.publicationStatus,
      displayOrder: document.displayOrder,
    });
    const valid =
      document._id instanceof ObjectId &&
      validation.ok &&
      document.publicationStatus === "published" &&
      isValidFacilitySpaceDate(document.createdAt) &&
      isValidFacilitySpaceDate(document.updatedAt) &&
      isValidFacilitySpaceDate(document.publishedAt) &&
      document.archivedAt === null;
    if (!valid || !validation.ok) {
      console.error("공개 생활공간 문서 검증 실패", {
        facilitySpaceId: document._id instanceof ObjectId ? document._id.toHexString() : "unknown",
        errorName: "InvalidFacilitySpace",
      });
      return [];
    }
    return [
      { id: document._id.toHexString(), title: validation.value.title, description: validation.value.description },
    ];
  });
}
