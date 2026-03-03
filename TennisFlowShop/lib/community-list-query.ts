import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

import { COMMUNITY_BOARD_TYPES, COMMUNITY_CATEGORIES, type CommunityBoardType } from '@/lib/types/community';

export const MAX_COMMUNITY_SEARCH_QUERY_LENGTH = 100;

export type CommunityListSort = 'latest' | 'views' | 'likes' | 'hot';
export type CommunityListSearchType = 'title' | 'author' | 'title_content';

type MarketFilterQuery = {
  saleStatus: string | null;
  conditionGrade: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  modelKeyword: string | null;
  gripSize: string | null;
  pattern: string | null;
  material: string | null;
  gauge: string | null;
  color: string | null;
  length: string | null;
  minWeight: number | null;
  maxWeight: number | null;
  minBalance: number | null;
  maxBalance: number | null;
  minHeadSize: number | null;
  maxHeadSize: number | null;
  minSwingWeight: number | null;
  maxSwingWeight: number | null;
  minStiffnessRa: number | null;
  maxStiffnessRa: number | null;
};

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
  marketFilters: MarketFilterQuery;
};

export function buildCommunityListMongoFilter(query: Pick<CommunityListQuery, 'typeParam' | 'brand' | 'q' | 'escapedQ' | 'authorObjectId' | 'searchType' | 'category' | 'marketFilters'>): Record<string, any> {
  const filter: Record<string, any> = { status: 'public' };

  if (query.typeParam) filter.type = query.typeParam;
  if (query.brand) filter.brand = query.brand;
  if (query.category) filter.category = query.category;

  if (query.q) {
    const regex = { $regex: query.escapedQ, $options: 'i' as const };
    if (query.searchType === 'title') filter.title = regex;
    else if (query.searchType === 'author') filter.nickname = regex;
    else filter.$or = [{ title: regex }, { content: regex }];
  }

  if (query.authorObjectId) filter.userId = query.authorObjectId;

  // market 게시판일 때만 전용 필터 반영 (다른 게시판 영향 방지)
  if (query.typeParam === 'market') {
    const f = query.marketFilters;
    if (f.saleStatus) filter['marketMeta.saleStatus'] = f.saleStatus;
    if (f.conditionGrade) filter['marketMeta.conditionGrade'] = f.conditionGrade;

    if (f.minPrice != null || f.maxPrice != null) {
      filter['marketMeta.price'] = {
        ...(f.minPrice != null ? { $gte: f.minPrice } : {}),
        ...(f.maxPrice != null ? { $lte: f.maxPrice } : {}),
      };
    }

    if (query.category === 'racket') {
      if (f.modelKeyword) filter['marketMeta.racketSpec.modelName'] = { $regex: escapeRegex(f.modelKeyword), $options: 'i' };
      if (f.gripSize) filter['marketMeta.racketSpec.gripSize'] = f.gripSize;
      if (f.pattern) filter['marketMeta.racketSpec.pattern'] = f.pattern;
      ranged(filter, 'marketMeta.racketSpec.weight', f.minWeight, f.maxWeight);
      ranged(filter, 'marketMeta.racketSpec.balance', f.minBalance, f.maxBalance);
      ranged(filter, 'marketMeta.racketSpec.headSize', f.minHeadSize, f.maxHeadSize);
      ranged(filter, 'marketMeta.racketSpec.swingWeight', f.minSwingWeight, f.maxSwingWeight);
      ranged(filter, 'marketMeta.racketSpec.stiffnessRa', f.minStiffnessRa, f.maxStiffnessRa);
    }

    if (query.category === 'string') {
      if (f.modelKeyword) filter['marketMeta.stringSpec.modelName'] = { $regex: escapeRegex(f.modelKeyword), $options: 'i' };
      if (f.material) filter['marketMeta.stringSpec.material'] = f.material;
      if (f.gauge) filter['marketMeta.stringSpec.gauge'] = f.gauge;
      if (f.color) filter['marketMeta.stringSpec.color'] = f.color;
      if (f.length) filter['marketMeta.stringSpec.length'] = f.length;
    }
  }

  return filter;
}

const ranged = (filter: Record<string, any>, key: string, min: number | null, max: number | null) => {
  if (min == null && max == null) return;
  filter[key] = {
    ...(min != null ? { $gte: min } : {}),
    ...(max != null ? { $lte: max } : {}),
  };
};

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const parseNum = (v: string | null) => {
  if (!v) return null;
  const normalized = v.replace(/,/g, '').trim();
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};

export function getCommunitySortOption(sort: CommunityListSort): Record<string, 1 | -1> {
  switch (sort) {
    case 'views':
      return { views: -1, createdAt: -1 };
    case 'likes':
      return { likes: -1, createdAt: -1 };
    case 'hot':
      return { views: -1, likes: -1, commentsCount: -1, createdAt: -1 };
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
  const searchType: CommunityListSearchType = rawSearchType === 'title' || rawSearchType === 'author' || rawSearchType === 'title_content' ? rawSearchType : 'title_content';

  const rawCategory = url.searchParams.get('category');
  const category = rawCategory && (COMMUNITY_CATEGORIES as readonly string[]).includes(rawCategory) ? (rawCategory as (typeof COMMUNITY_CATEGORIES)[number]) : null;

  const marketFilters: MarketFilterQuery = {
    saleStatus: url.searchParams.get('saleStatus'),
    conditionGrade: url.searchParams.get('conditionGrade'),
    minPrice: parseNum(url.searchParams.get('minPrice')),
    maxPrice: parseNum(url.searchParams.get('maxPrice')),
    modelKeyword: url.searchParams.get('modelKeyword'),
    gripSize: url.searchParams.get('gripSize'),
    pattern: url.searchParams.get('pattern'),
    material: url.searchParams.get('material'),
    gauge: url.searchParams.get('gauge'),
    color: url.searchParams.get('color'),
    length: url.searchParams.get('length'),
    minWeight: parseNum(url.searchParams.get('minWeight')),
    maxWeight: parseNum(url.searchParams.get('maxWeight')),
    minBalance: parseNum(url.searchParams.get('minBalance')),
    maxBalance: parseNum(url.searchParams.get('maxBalance')),
    minHeadSize: parseNum(url.searchParams.get('minHeadSize')),
    maxHeadSize: parseNum(url.searchParams.get('maxHeadSize')),
    minSwingWeight: parseNum(url.searchParams.get('minSwingWeight')),
    maxSwingWeight: parseNum(url.searchParams.get('maxSwingWeight')),
    minStiffnessRa: parseNum(url.searchParams.get('minStiffnessRa')),
    maxStiffnessRa: parseNum(url.searchParams.get('maxStiffnessRa')),
  };

  return { typeParam, brand, sort, page, limit, q, escapedQ, isQueryTooLong, authorId, authorObjectId, searchType, category, marketFilters };
}
