import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

import { COMMUNITY_BOARD_TYPES, COMMUNITY_CATEGORIES, type CommunityBoardType } from '@/lib/types/community';

export const MAX_COMMUNITY_SEARCH_QUERY_LENGTH = 100;

export type CommunityListSort = 'latest' | 'views' | 'likes' | 'hot';
export type CommunityListSearchType = 'title' | 'author' | 'title_content';

export type CommunityListQuery = {
  typeParam: CommunityBoardType | null;
  brand: string | null;
  sort: CommunityListSort;
  page: number;
  limit: number;
  q: string;
  escapedQ: string;
  isQueryTooLong: boolean;
  authorId: string | null;
  authorObjectId: ObjectId | null;
  searchType: CommunityListSearchType;
  category: (typeof COMMUNITY_CATEGORIES)[number] | null;
};

type CommunityMongoFilter = {
  status: 'public';
  type?: CommunityBoardType;
  brand?: string;
  category?: (typeof COMMUNITY_CATEGORIES)[number];
  title?: { $regex: string; $options: 'i' };
  nickname?: { $regex: string; $options: 'i' };
  userId?: ObjectId;
  $or?: Array<{ title?: { $regex: string; $options: 'i' }; content?: { $regex: string; $options: 'i' } }>;
};

export function buildCommunityListMongoFilter(query: Pick<CommunityListQuery, 'typeParam' | 'brand' | 'q' | 'escapedQ' | 'authorObjectId' | 'searchType' | 'category'>): CommunityMongoFilter {
  const filter: CommunityMongoFilter = { status: 'public' };

  if (query.typeParam) {
    filter.type = query.typeParam;
  }

  if (query.brand) {
    filter.brand = query.brand;
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.q) {
    const regex = { $regex: query.escapedQ, $options: 'i' as const };

    if (query.searchType === 'title') {
      filter.title = regex;
    } else if (query.searchType === 'author') {
      filter.nickname = regex;
    } else {
      filter.$or = [{ title: regex }, { content: regex }];
    }
  }

  if (query.authorObjectId) {
    filter.userId = query.authorObjectId;
  }

  return filter;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getCommunitySortOption(sort: CommunityListSort): Record<string, 1 | -1> {
  switch (sort) {
    case 'views':
      return { views: -1, createdAt: -1 };
    case 'likes':
      return { likes: -1, createdAt: -1 };
    case 'hot':
      return {
        views: -1,
        likes: -1,
        commentsCount: -1,
        createdAt: -1,
      };
    case 'latest':
    default:
      return { createdAt: -1 };
  }
}

export function parseCommunityListQuery(req: NextRequest, options?: { queryKeys?: string[] }): CommunityListQuery {
  const url = new URL(req.url);
  const queryKeys = options?.queryKeys?.length ? options.queryKeys : ['q'];

  const rawType = url.searchParams.get('type');
  const typeParam = rawType && (COMMUNITY_BOARD_TYPES as readonly string[]).includes(rawType) ? (rawType as CommunityBoardType) : null;

  const brand = url.searchParams.get('brand');

  const rawSort = url.searchParams.get('sort');
  const sort: CommunityListSort = rawSort === 'latest' || rawSort === 'views' || rawSort === 'likes' || rawSort === 'hot' ? rawSort : 'latest';

  const pageRaw = parseInt(url.searchParams.get('page') || '1', 10);
  const limitRaw = parseInt(url.searchParams.get('limit') || '10', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, limitRaw)) : 10;

  const rawQuery = queryKeys.map((key) => url.searchParams.get(key)).find((value): value is string => typeof value === 'string') ?? '';
  const q = rawQuery.trim();
  const isQueryTooLong = q.length > MAX_COMMUNITY_SEARCH_QUERY_LENGTH;
  const escapedQ = escapeRegex(q);

  const authorId = url.searchParams.get('authorId');
  const authorObjectId = authorId && ObjectId.isValid(authorId) ? new ObjectId(authorId) : null;

  const rawSearchType = url.searchParams.get('searchType');
  const searchType: CommunityListSearchType =
    rawSearchType === 'title' || rawSearchType === 'author' || rawSearchType === 'title_content' ? rawSearchType : 'title_content';

  const rawCategory = url.searchParams.get('category');
  const category = rawCategory && (COMMUNITY_CATEGORIES as readonly string[]).includes(rawCategory) ? (rawCategory as (typeof COMMUNITY_CATEGORIES)[number]) : null;

  return {
    typeParam,
    brand,
    sort,
    page,
    limit,
    q,
    escapedQ,
    isQueryTooLong,
    authorId,
    authorObjectId,
    searchType,
    category,
  };
}
