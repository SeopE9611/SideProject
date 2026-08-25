import { type Document, type Filter, type WithId } from "mongodb";

import { getMongoDatabase } from "@/lib/mongodb";

import type { NewsRepository } from "./news.repository";
import {
  NEWS_COLLECTION_NAME,
  type MongoNewsPostDocument,
} from "./news.mongo-schema";
import { normalizePublicNewsLimit } from "./news.pagination";
import {
  isNewsCategory,
  isValidNewsSlug,
  type PublicNewsPost,
  type PublicNewsPostSummary,
} from "./news.types";

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toPublicSummary(document: WithId<Document>): PublicNewsPostSummary | null {
  if (
    !isValidNewsSlug(document.slug) ||
    !isNewsCategory(document.category) ||
    !isNonEmptyString(document.title) ||
    !isNonEmptyString(document.summary) ||
    !isValidDate(document.publishedAt) ||
    !isValidDate(document.updatedAt)
  ) {
    return null;
  }

  return {
    id: document._id.toString(),
    slug: document.slug,
    category: document.category,
    title: document.title,
    summary: document.summary,
    publishedAt: document.publishedAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    isDemo: false,
  };
}

function toPublicPost(document: WithId<Document>): PublicNewsPost | null {
  const summary = toPublicSummary(document);
  if (
    !summary ||
    !Array.isArray(document.body) ||
    !document.body.every(isNonEmptyString)
  ) {
    return null;
  }

  return { ...summary, body: document.body };
}

function createPublicFilter(now: Date): Filter<MongoNewsPostDocument> {
  return {
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: { $ne: null, $lte: now },
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  };
}

export class MongoNewsRepository implements NewsRepository {
  async listPublished(options?: {
    limit?: number;
  }): Promise<readonly PublicNewsPostSummary[]> {
    const database = await getMongoDatabase();
    const documents = await database
      .collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME)
      .find(createPublicFilter(new Date()), {
        projection: {
          slug: 1,
          category: 1,
          title: 1,
          summary: 1,
          publishedAt: 1,
          updatedAt: 1,
        },
      })
      .sort({ publishedAt: -1, _id: -1 })
      .limit(normalizePublicNewsLimit(options?.limit))
      .toArray();

    return documents.flatMap((document) => {
      const post = toPublicSummary(document);
      if (!post) {
        console.error("공개 뉴스 문서 검증에 실패했습니다.", {
          documentId: document._id.toString(),
        });
        return [];
      }
      return [post];
    });
  }

  async findPublishedBySlug(slug: string): Promise<PublicNewsPost | null> {
    if (!isValidNewsSlug(slug)) {
      return null;
    }

    const database = await getMongoDatabase();
    const document = await database
      .collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME)
      .findOne(
        { ...createPublicFilter(new Date()), slug },
        {
          projection: {
            slug: 1,
            category: 1,
            title: 1,
            summary: 1,
            body: 1,
            publishedAt: 1,
            updatedAt: 1,
          },
        },
      );

    return document ? toPublicPost(document) : null;
  }
}
