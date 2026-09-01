import { getPublishedFixtureNewsPosts } from "@/content/fixtures/news.fixture";
import { MongoNewsRepository } from "./news.mongo-repository";
import {
  normalizePublicNewsLimit,
  normalizePublicNewsPage,
  normalizePublicNewsPageSize,
  normalizePublicNewsSearchQuery,
  resolvePublicNewsPage,
} from "./news.pagination";
import type {
  PublicNewsPost,
  PublicNewsPostSummary,
  PublicNewsSearchOptions,
  PublicNewsSearchResult,
} from "./news.types";

export interface NewsRepository {
  listPublished(options?: { limit?: number }): Promise<readonly PublicNewsPostSummary[]>;

  searchPublished(options?: PublicNewsSearchOptions): Promise<PublicNewsSearchResult>;

  findPublishedBySlug(slug: string): Promise<PublicNewsPost | null>;
}

const emptyNewsRepository: NewsRepository = {
  async listPublished() {
    return [];
  },
  async searchPublished(options) {
    return {
      items: [],
      total: 0,
      page: normalizePublicNewsPage(options?.page),
      pageSize: normalizePublicNewsPageSize(options?.pageSize),
      totalPages: 0,
    };
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
  async searchPublished(options) {
    const q = normalizePublicNewsSearchQuery(options?.q);
    const normalizedQuery = q.toLocaleLowerCase("ko-KR");
    const pageSize = normalizePublicNewsPageSize(options?.pageSize);
    const filtered = getPublishedFixtureNewsPosts().filter(
      (post) =>
        (!options?.category || post.category === options.category) &&
        (!normalizedQuery || `${post.title} ${post.summary}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery)),
    );
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const page = resolvePublicNewsPage(normalizePublicNewsPage(options?.page), totalPages);
    const items = filtered.slice((page - 1) * pageSize, page * pageSize).map(({ body: _body, ...summary }) => summary);

    return { items, total, page, pageSize, totalPages };
  },
  async findPublishedBySlug(slug) {
    return getPublishedFixtureNewsPosts().find((post) => post.slug === slug) ?? null;
  },
};

export function getNewsRepository(): NewsRepository {
  const configuredSource = process.env.SHALOM_CONTENT_SOURCE;
  const source =
    configuredSource ||
    (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview" ? "fixture" : "empty");

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
