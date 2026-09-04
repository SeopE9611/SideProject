import "server-only";
import { isVisualFixtureEnabled, visualDocumentFixtures } from "@/content/fixtures/visual.fixture";
import { MongoTransparencyRepository } from "./transparency.mongo-repository";
import type { TransparencyCategory } from "./transparency.types";

export type PublicTransparencyDocument = {
  slug: string;
  title: string;
  category: TransparencyCategory;
  periodLabel: string;
  summary: string;
  documentDate: string;
  publishedAt: string;
  fileType: "PDF";
  byteSize: number;
};
export type PublicTransparencyDocumentMedia = {
  bucket: string;
  objectPath: string;
  mimeType: "application/pdf";
  byteSize: number;
};
interface TransparencyRepository {
  listPublished(): Promise<readonly PublicTransparencyDocument[]>;
  findMediaBySlug(slug: string): Promise<PublicTransparencyDocumentMedia | null>;
}
const empty: TransparencyRepository = {
  async listPublished() {
    return [];
  },
  async findMediaBySlug() {
    return null;
  },
};
function getTransparencyRepository(): TransparencyRepository {
  if (isVisualFixtureEnabled())
    return {
      ...empty,
      async listPublished() {
        return visualDocumentFixtures;
      },
    };
  const configured = process.env.SHALOM_CONTENT_SOURCE;
  const source =
    configured ||
    (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview" ? "fixture" : "empty");
  if (source === "mongodb") return new MongoTransparencyRepository();
  if (source === "empty" || source === "fixture") return empty;
  throw new Error(`지원하지 않는 SHALOM_CONTENT_SOURCE 설정입니다: ${source}`);
}
export const findPublicTransparencyDocuments = () => getTransparencyRepository().listPublished();
export const findPublicTransparencyDocumentMediaBySlug = (slug: string) =>
  getTransparencyRepository().findMediaBySlug(slug);
