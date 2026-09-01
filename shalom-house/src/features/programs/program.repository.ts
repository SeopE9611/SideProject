import { MongoProgramRepository } from "./program.mongo-repository";
import type { PublicProgram, PublicProgramSummary } from "./program.types";
import type { PublicSitemapEntry } from "@/features/seo/seo.types";
export const PUBLIC_PROGRAM_DEFAULT_LIMIT = 100;
export const PUBLIC_PROGRAM_MINIMUM_LIMIT = 1;
export const PUBLIC_PROGRAM_MAXIMUM_LIMIT = 200;
export function normalizePublicProgramLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return PUBLIC_PROGRAM_DEFAULT_LIMIT;
  return Math.min(PUBLIC_PROGRAM_MAXIMUM_LIMIT, Math.max(PUBLIC_PROGRAM_MINIMUM_LIMIT, Math.trunc(limit)));
}
export interface ProgramRepository {
  listPublishedSitemapEntries(options?: { limit?: number }): Promise<readonly PublicSitemapEntry[]>;
  listPublished(options?: { limit?: number }): Promise<readonly PublicProgramSummary[]>;
  findPublishedBySlug(slug: string): Promise<PublicProgram | null>;
}
const emptyProgramRepository: ProgramRepository = {
  async listPublishedSitemapEntries() { return []; },
  async listPublished() {
    return [];
  },
  async findPublishedBySlug() {
    return null;
  },
};
export function getProgramRepository(): ProgramRepository {
  const configuredSource = process.env.SHALOM_CONTENT_SOURCE;
  const source =
    configuredSource ||
    (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview" ? "fixture" : "empty");
  if (source === "mongodb") return new MongoProgramRepository();
  if (source === "empty" || source === "fixture") return emptyProgramRepository;
  throw new Error(`지원하지 않는 SHALOM_CONTENT_SOURCE 설정입니다: ${source}`);
}
