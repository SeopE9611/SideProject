import type { ObjectId } from "mongodb";

import type {
  NewsApprovalStatus,
  NewsCategory,
  NewsPublicationStatus,
} from "./news.types";

export const NEWS_COLLECTION_NAME = "news_posts";

export type MongoNewsPostDocument = {
  _id: ObjectId;
  slug: string;
  category: NewsCategory;
  title: string;
  summary: string;
  body: string[];
  publicationStatus: NewsPublicationStatus;
  approvalStatus: NewsApprovalStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};
