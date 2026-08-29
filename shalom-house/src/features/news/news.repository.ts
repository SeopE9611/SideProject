import { getPublishedFixtureNewsPosts } from "@/content/fixtures/news.fixture";
import { MongoNewsRepository } from "./news.mongo-repository";
import { normalizePublicNewsLimit } from "./news.pagination";
import type { PublicNewsPost, PublicNewsPostSummary } from "./news.types";

export interface NewsRepository {
  listPublished(options?: {
    limit?: number;
  }): Promise<readonly PublicNewsPostSummary[]>;

  findPublishedBySlug(slug: string): Promise<PublicNewsPost | null>;
}

const emptyNewsRepository: NewsRepository = {
  async listPublished() {
    return [];
  },
  async findPublishedBySlug() {
    return null;
  },
};

const fixtureNewsRepository: NewsRepository = {
  async listPublished(options) {
    const limit = normalizePublicNewsLimit(options?.limit);
    return getPublishedFixtureNewsPosts()
      .slice(0, limit)
      .map((post) => ({
        id: post.id,
        slug: post.slug,
        category: post.category,
        title: post.title,
        summary: post.summary,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        isDemo: post.isDemo,
      }));
  },
  async findPublishedBySlug(slug) {
    return getPublishedFixtureNewsPosts().find((post) => post.slug === slug) ?? null;
  },
};

export function getNewsRepository(): NewsRepository {
  const configuredSource = process.env.SHALOM_CONTENT_SOURCE;
  const source =
    configuredSource ||
    (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"
      ? "fixture"
      : "empty");

  switch (source) {
    case "empty":
      return emptyNewsRepository;
    case "fixture":
      return fixtureNewsRepository;
    case "mongodb":
      return new MongoNewsRepository();
    default:
      throw new Error(`지원하지 않는 SHALOM_CONTENT_SOURCE 설정입니다: ${source}`);
  }
}
