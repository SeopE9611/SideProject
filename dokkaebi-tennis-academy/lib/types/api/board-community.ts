import type { ObjectId } from 'mongodb';
import type { BoardType, QnaCategory } from '@/lib/types/board';
import type { BoardListItem } from '@/lib/boards.queries';
import type { CommunityBoardType } from '@/lib/types/community';

export type AccessTokenPayload = {
  sub?: string;
  name?: string;
  nickname?: string;
  email?: string;
  role?: string;
};

export interface CommunityPostMongoDoc {
  _id: ObjectId;
  type: CommunityBoardType;
  title: string;
  content: string;
  category?: string | null;
  brand?: string | null;
  images?: string[];
  attachments?: Array<{ name?: string; url?: string; size?: number }>;
  postNo?: number;
  userId?: ObjectId | string | null;
  authorName?: string;
  authorEmail?: string;
  nickname?: string;
  status?: string;
  views?: number;
  likes?: number;
  commentsCount?: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface CommunityPostListItemDto {
  id: string;
  type: CommunityBoardType;
  title: string;
  content: string;
  category: string;
  userId: string | null;
  nickname: string;
  status: string;
  views: number;
  likes: number;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string;
  attachments: Array<{ name?: string; url?: string; size?: number }>;
  images: string[];
  brand: string | null;
  postNo?: number;
  authorName?: string;
  authorEmail?: string;
}

export interface CommunityListResponseDto {
  ok: true;
  version: string;
  items: CommunityPostListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface BoardListResponseDto {
  ok: true;
  version: string;
  items: BoardListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface BoardCreateResponseDto {
  ok: true;
  version: string;
  id: string;
}

export interface BoardCreateMongoDoc {
  type: BoardType;
  title: string;
  content: string;
  category?: QnaCategory | '일반' | undefined;
  productRef?: { productId: string; name?: string; image?: string | null };
  isSecret: boolean;
  isPinned: boolean;
  attachments: Array<{ url: string; name: string; size?: number; mime?: string; width?: number; height?: number }>;
  authorId: string;
  authorName?: string;
  status: 'published';
  viewCount: number;
  createdAt: Date;
}
