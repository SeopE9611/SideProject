export type AdminReviewStatus = 'visible' | 'hidden';
export type AdminReviewType = 'product' | 'service';

export interface AdminReviewsListRequestDto {
  page: number;
  limit: number;
  status: 'all' | AdminReviewStatus;
  type: 'all' | AdminReviewType;
  q: string;
  withDeleted: boolean;
}

export interface AdminReviewListItemDto {
  _id: string;
  type: AdminReviewType;
  subject: string;
  rating: number;
  status: AdminReviewStatus;
  content: string;
  createdAt: string;
  userEmail?: string;
  userName?: string;
  helpfulCount: number;
  photos: string[];
  isDeleted: boolean;
}

export interface AdminReviewsListResponseDto {
  items: AdminReviewListItemDto[];
  total: number;
}
