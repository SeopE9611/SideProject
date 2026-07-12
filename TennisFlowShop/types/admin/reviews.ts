import type { ReviewContext, ReviewManagementCategory } from "@/lib/reviews/review-target";

export type AdminReviewStatus = "visible" | "hidden";
export type AdminReviewContextFilter = "all" | ReviewContext;

export interface AdminReviewsListRequestDto {
  page: number;
  limit: number;
  status: "all" | AdminReviewStatus;
  context: AdminReviewContextFilter;
  q: string;
  withDeleted: boolean;
}

export interface AdminReviewListItemDto {
  _id: string;
  reviewContext: ReviewContext;
  contextLabel: string;
  category: ReviewManagementCategory;
  subject: string;
  rating: number;
  status: AdminReviewStatus;
  authorStatus: AdminReviewStatus;
  moderationStatus: AdminReviewStatus;
  effectiveStatus: AdminReviewStatus;
  content: string;
  createdAt: string;
  userEmail?: string;
  userName?: string;
  helpfulCount: number;
  photos: string[];
  isDeleted: boolean;
  productId?: string | null;
  racketId?: string | null;
  orderId?: string | null;
  rentalId?: string | null;
  serviceApplicationId?: string | null;
  relatedProductIds: string[];
  relatedRacketIds: string[];
  reviewType?: string | null;
  service?: string | null;
}

export interface AdminReviewsListResponseDto {
  items: AdminReviewListItemDto[];
  total: number;
}
