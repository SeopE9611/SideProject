"use client";
import { useWishlist } from "@/app/features/wishlist/useWishlist";
import type { User } from "@/app/store/authStore";
import { useBuyNowStore } from "@/app/store/buyNowStore";
import { type CartItem, useCartStore } from "@/app/store/cartStore";
import type { HItem } from "@/components/HorizontalProducts";
import SiteContainer from "@/components/layout/SiteContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { stringBrandLabel } from "@/lib/constants";
import { isMountableStringByFee } from "@/lib/orders/string-mounting-policy";
import { ENABLE_STRING_STANDALONE_ORDER } from "@/lib/orders/string-standalone-policy";
import { normalizeFeatureScoresTo100 } from "@/lib/product-feature-score";
import { addRecentViewedItem } from "@/lib/recent-viewed";
import { reviewInputMessage, validateReviewInput } from "@/lib/reviews/review-input-policy";
import { getReviewManagedVisibilityStatus } from "@/lib/reviews/review-managed-status";
import { normalizeReviewSummary } from "@/lib/reviews/review-summary";
import { useReviewPhotoUploadSession } from "@/lib/reviews/useReviewPhotoUploadSession";
import { normalizeItemShippingFee } from "@/lib/shipping-fee";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Clock,
  CreditCard,
  FileText,
  Heart,
  MessageSquare,
  Minus,
  Plus,
  Settings,
  ShoppingCart,
  Star,
  Wrench,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { buildProductDetailCartItem } from "./ProductDetailCartItem.utils";
import {
  getProductDetailBuyNowCheckoutTarget,
  getProductDetailBuyNowWithServiceCheckoutTarget,
} from "./ProductDetailCheckoutTarget.utils";
import { getProductDetailStockLimitErrorMessage } from "./ProductDetailCheckoutValidation.utils";
import type { DetailTab } from "./ProductDetailClient.types";
import {
  getColorLabel,
  getGuestOrderModeClient,
  getProductDetailBadges,
  isColorSoldOut,
  isTruthyBadgeField,
  normalizeGaugeDisplayLabel,
} from "./ProductDetailClient.utils";
import {
  buildProductDetailDisplaySpec,
  buildProductDetailHybridDisplay,
} from "./ProductDetailDisplaySpec.utils";
import { CatalogPrice, CatalogRating } from "@/components/commerce";
import {
  CommerceDetailTabs,
  CommerceDetailTopBar,
  CommercePurchaseActions,
  CommercePurchasePanel,
} from "@/components/commerce/detail";
import ProductDetailImageGallery from "./ProductDetailImageGallery";
import { getProductDetailLoginRedirectTarget } from "./ProductDetailLoginTarget.utils";
import {
  buildSelectedColorPayload,
  buildWishlistOptionPayload,
  getWishlistOptionState,
} from "./ProductDetailOptionPayload.utils";
import ProductDetailQnaTab from "./ProductDetailQnaTab";
import ProductDetailRecommendationSection from "./ProductDetailRecommendationSection";
import ProductDetailRelatedProductsSection from "./ProductDetailRelatedProductsSection";
import { isAdminUser } from "./ProductDetailReviewData.utils";
import ProductDetailReviewsTab from "./ProductDetailReviewsTab";
import ProductDetailSpecificationsTab from "./ProductDetailSpecificationsTab";
import { useProductDetailOptions } from "./useProductDetailOptions";
import { useProductDetailQna } from "./useProductDetailQna";
import { useProductDetailRelatedProducts } from "./useProductDetailRelatedProducts";
import { useProductDetailReviews } from "./useProductDetailReviews";

const HorizontalProducts = dynamic(() => import("@/components/HorizontalProducts"), {
  loading: () => null,
});

const RecentViewedItems = dynamic(() => import("@/components/recent-viewed/RecentViewedItems"), {
  ssr: false,
  loading: () => null,
});

const ReviewPhotoViewerDialog = dynamic(() => import("./ReviewPhotoViewerDialog"), {
  loading: () => null,
});
const ReviewEditDialog = dynamic(() => import("./ReviewEditDialog"), {
  loading: () => null,
});

const detailSurfaceSubtleInnerClass = "rounded-xl border border-border bg-muted/20";
const detailSurfaceInfoItemClass =
  "flex min-w-0 items-center gap-3 rounded-xl border border-border bg-muted/20 p-3";
export default function ProductDetailClient({ product }: { product: any }) {
  // 방어: 간헐적으로 images/reviews가 undefined인 데이터가 섞이면 상세페이지가 바로 크래시 나는 현상 대비
  const images: string[] = Array.isArray(product?.images) ? product.images : [];
  const reviews: any[] = Array.isArray(product?.reviews) ? product.reviews : [];
  const reviewSummary = normalizeReviewSummary(product?.reviewSummary);
  const averageRating = reviewSummary.average;
  const reviewCount = reviewSummary.count;
  const productShippingFee = normalizeItemShippingFee(product?.shippingFee);
  const productShippingLabel =
    productShippingFee > 0 ? `${productShippingFee.toLocaleString()}원 배송비` : "무료배송";

  const displayBrandLabel = (value?: string) => stringBrandLabel(value);
  // ====== 사양/브랜드/색상/굵기 매핑 ======
  // ====== 태그(추천) 매핑 ======
  const PLAYER_TYPE_MAP: Record<string, string> = {
    beginner: "초보자",
    intermediate: "중급자",
    advanced: "상급자",
  };
  const PLAY_STYLE_MAP: Record<string, string> = {
    baseline: "베이스라인 플레이어",
    serveVolley: "서브 앤 발리 플레이어",
    allCourt: "올코트 플레이어",
    power: "파워 히터", // 신형 필드
    powerHitter: "파워 히터", // 과거 호환
  };

  const normalizedFeatureScores = normalizeFeatureScoresTo100(product?.features);
  const regularPrice = Number(product?.price ?? 0);
  const salePrice = Number(product?.inventory?.salePrice ?? 0);
  const isSale =
    isTruthyBadgeField(product?.inventory?.isSale) && salePrice > 0 && salePrice < regularPrice;
  const displayPrice = isSale ? salePrice : regularPrice;

  const {
    hybridSpec,
    hMain,
    hCross,
    hMainBrand,
    hCrossBrand,
    hMainGauge,
    hCrossGauge,
    hMainColor,
    hCrossColor,
  } = buildProductDetailHybridDisplay(product);

  // ====== 추천 태그 추출 ======
  const selectedPlayerTypes = Object.entries(PLAYER_TYPE_MAP)
    .filter(([k]) => product?.tags?.[k])
    .map(([, label]) => label);

  const selectedPlayStyles = Object.entries(PLAY_STYLE_MAP)
    .filter(([k]) => product?.tags?.[k])
    .map(([, label]) => label);

  const additionalFeaturesText = (product?.additionalFeatures || "").trim();

  const {
    quantity,
    setQuantity,
    hasVariantInventories,
    isSellableVariant,
    getVariantsByColor,
    colorRows,
    visibleColorRows,
    selectedColor,
    setSelectedColor,
    selectedColorRow,
    selectedColorLabel,
    colorImage,
    hideGaugeStock,
    gaugeRows,
    gaugeOptions,
    isStringProduct,
    selectedGauge,
    setSelectedGauge,
    selectedVariant,
    selectedVariantSoldOut,
    variantHasNoSellableGauge,
    effectiveStock,
    variantPurchaseBlocked,
    canDec,
    canInc,
  } = useProductDetailOptions({ product });
  const displaySpec = buildProductDetailDisplaySpec({
    product,
    gaugeOptions,
  });
  // const [isWishlisted, setIsWishlisted] = useState(false);
  const { addItem } = useCartStore();
  const { setItem: setBuyNowItem } = useBuyNowStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL의 ?tab 값 -> 로컬 상태로 보존 (새로고침/앞뒤 이동에도 유지)
  const initialTab = (searchParams.get("tab") as DetailTab) ?? "description";
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [user, setUser] = useState<User | null>(null);
  const guestOrderMode = getGuestOrderModeClient();
  const allowGuestCheckout = guestOrderMode === "on";
  const [loading, setLoading] = useState(false);
  const [hasResolvedReviewUser, setHasResolvedReviewUser] = useState(false);
  const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then(async (r) => (r.status === 200 ? r.json() : null));
  const { relatedSectionRef, relatedFiltered, loadingRelated } = useProductDetailRelatedProducts({
    productId: String(product._id),
    brand: product.brand,
    material: product.material,
    fetcher,
  });

  const { qnas, qnaTotal, qnaLoading, qnaError } = useProductDetailQna({
    activeTab,
    productId: String(product._id),
    fetcher,
  });

  // 합계 계산
  const unitPrice = displayPrice;
  const qtyTotal = unitPrice * quantity;
  const mountingFee = Number(product?.mountingFee ?? 0);
  const serviceTotal = qtyTotal + mountingFee;
  const canCheckoutWithService = isMountableStringByFee(product?.mountingFee);
  const isApplyFlow = searchParams.get("from") === "apply";
  const careItemId =
    searchParams.get("source") === "racket-care" ? searchParams.get("careItemId") : null;
  const isStandalonePausedMountableString =
    canCheckoutWithService && !ENABLE_STRING_STANDALONE_ORDER;
  const cartCtaLabel = "장바구니 담기";
  const standalonePausedNotice = "현재 스트링은 교체서비스 신청과 함께 이용할 수 있어요.";
  const isProductSoldOut = hasVariantInventories
    ? selectedVariantSoldOut
    : Boolean(product.inventory?.manageStock && product.inventory.stock <= 0);
  const soldOutHelper = hasVariantInventories
    ? "선택한 색상과 게이지(굵기) 조합의 재고가 없습니다. 다른 옵션을 선택해주세요."
    : "현재 상품 구매 가능 재고가 없습니다.";

  // 브라우저 뒤/앞으로 가기 시에도 URL 변화에 맞춰 동기화
  useEffect(() => {
    const current = (searchParams.get("tab") as DetailTab) ?? "description";
    setActiveTab(current);
  }, [searchParams]);

  const updateTabInUrl = (tab: DetailTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    // 스크롤 점프 방지
    router.replace(`?${params.toString()}`, { scroll: false });
    setActiveTab(tab);
  };

  // 로그인 정보 로드가 끝난 후 계산
  const isAdmin = isAdminUser(user);

  const {
    mergedReviews,
    productReviewHref,
    productReviewCtaLabel,
    productReviewHelper,
    canWriteFromProductReviewTab,
    mutateMyReview,
    mutateAdminReviews,
    isMine,
  } = useProductDetailReviews({
    activeTab,
    productId: String(product._id),
    baseReviews: product.reviews,
    reviewsLen: reviews.length,
    user,
    isAdmin,
    fetcher,
  });

  const { has, findItem, updateOptions, toggle } = useWishlist();

  // 위시리스트 훅 내부의 id는 문자열 기준이므로,
  // product._id도 문자열로 변환해서 비교 기준을 통일
  const wishlistProductId = product._id.toString();

  const wishState = has(wishlistProductId);
  const isWishlisted = wishState === true;

  // 위시리스트 미확정(unknown) 상태를 false(찜 안 함)와 분리한다.
  const isWishlistUnknown = wishState === null;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hasResolvedReviewUser) return;

    setLoading(true);
    fetch("/api/users/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if ("error" in data) {
          setUser(null);
        } else {
          setUser(data);
        }
      })
      .catch(() => {
        // console.log('요청 실패');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
        setHasResolvedReviewUser(true);
        // console.log('로딩 완료');
      });
  }, [activeTab, hasResolvedReviewUser]);

  // 인라인 수정 다이얼로그 상태/핸들러
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{
    rating: number | "";
    content: string;
    photos: string[];
  }>({
    rating: "",
    content: "",
    photos: [],
  });
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [uploadingEditPhotos, setUploadingEditPhotos] = useState(false);
  const editPhotoSession = useReviewPhotoUploadSession();

  // 이미지 뷰어(확대) 전용 상태
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 썸네일 클릭 → 뷰어 열기
  const openViewer = (images: string[], index = 0) => {
    if (!Array.isArray(images) || images.length === 0) return;
    setViewerImages(images);
    setViewerIndex(index);
    setViewerOpen(true);
  };
  const closeViewer = () => setViewerOpen(false);
  const nextViewer = () => setViewerIndex((i) => (i + 1) % viewerImages.length);
  const prevViewer = () =>
    setViewerIndex((i) => (i - 1 + viewerImages.length) % viewerImages.length);

  const openEdit = (review: any) => {
    void editPhotoSession.cleanupUncommittedPhotos();
    editPhotoSession.resetSession();
    void editPhotoSession.startSession();
    setUploadingEditPhotos(false);
    setEditing(review);
    setEditForm({
      rating: typeof review.rating === "number" ? review.rating : "",
      content: review.content ?? "",
      photos: Array.isArray(review.photos) ? review.photos : [],
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    void editPhotoSession.cleanupUncommittedPhotos();
    editPhotoSession.resetSession();
    setUploadingEditPhotos(false);
    setEditOpen(false);
    setEditing(null);
  };

  const submitEdit = async () => {
    if (!editing?._id) return;
    if (uploadingEditPhotos) {
      showErrorToast("사진 업로드가 끝난 후 저장해 주세요.");
      return;
    }
    const inputValidation = validateReviewInput(editForm);
    if (!inputValidation.ok) {
      showErrorToast(reviewInputMessage(inputValidation.reason));
      return;
    }
    setBusyReviewId(String(editing._id));
    const { rating, content } = inputValidation.value;

    // 낙관적 업데이트 (내 후기 vs 관리자-타인 구분)
    if (isMine(editing)) {
      mutateMyReview((prev: any) => {
        if (!prev?._id || String(prev._id) !== String(editing._id)) return prev;
        return {
          ...prev,
          rating,
          content,
          ownedByMe: true,
          masked: false,
        };
      }, false);
    } else if (isAdmin) {
      mutateAdminReviews((prev: any[] | undefined) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((r) =>
          String(r._id) === String(editing._id)
            ? {
                ...r,
                rating,
                content,
                masked: false,
              }
            : r,
        );
      }, false);
    }

    try {
      editPhotoSession.markSaving();

      try {
        const patchBody = JSON.stringify({
          rating,
          content,
          photos: editForm.photos,
          uploadSessionId: editPhotoSession.uploadSessionId,
        });

        if (isAdmin && !isMine(editing)) {
          await adminMutator(`/api/admin/reviews/${editing._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: patchBody,
          });
        } else {
          const res = await fetch(`/api/reviews/${editing._id}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: patchBody,
          });

          if (!res.ok) {
            let err: any = null;

            try {
              err = await res.json();
            } catch {}

            throw new Error(err?.reason ? reviewInputMessage(err.reason) : "수정 실패");
          }
        }
      } catch (err: any) {
        editPhotoSession.markSaveFailed();

        try {
          if (isMine(editing)) {
            await mutateMyReview();
          } else if (isAdmin) {
            await mutateAdminReviews();
          }
        } catch (revalidateError) {
          console.error(
            "[reviews] failed to revalidate product review after save failure",
            revalidateError,
          );
        }

        showErrorToast(err?.message || "후기 수정에 실패했습니다.");

        return;
      }

      // 여기까지 왔으면 서버 PATCH는 성공한 상태입니다.
      editPhotoSession.markCommitted();

      // 저장 이후 화면 재검증 실패는 저장 실패로 취급하지 않습니다.
      try {
        if (isMine(editing)) {
          await mutateMyReview();
        } else if (isAdmin) {
          await mutateAdminReviews();
        }
      } catch (revalidateError) {
        console.error("[reviews] failed to revalidate product review after save", revalidateError);
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "reviews");

      router.replace(`?${params.toString()}`, {
        scroll: false,
      });
      router.refresh();

      showSuccessToast("후기를 수정했어요.");
      closeEdit();
    } finally {
      setBusyReviewId(null);
    }
  };

  const handleToggleReviewVisibility = async (review: any) => {
    const reviewOwnedByMe = isMine(review);

    const { isAdminModeration, nextStatus } = getReviewManagedVisibilityStatus(
      {
        ...review,
        ownedByMe: reviewOwnedByMe,
      },
      isAdmin,
    );

    let myReviewSnapshot: any = undefined;
    let adminReviewsSnapshot: any[] | undefined = undefined;

    setBusyReviewId(String(review._id));

    // 서버 요청 전에 현재 SWR 데이터를 저장하고
    // 화면에는 다음 상태를 낙관적으로 반영합니다.
    if (reviewOwnedByMe) {
      await mutateMyReview((prev: any) => {
        myReviewSnapshot = prev;

        if (!prev?._id || String(prev._id) !== String(review._id)) {
          return prev;
        }

        return {
          ...prev,
          status: nextStatus,
          ownedByMe: true,
          masked: false,
        };
      }, false);
    } else if (isAdminModeration) {
      await mutateAdminReviews((prev: any[] | undefined) => {
        adminReviewsSnapshot = prev;

        if (!Array.isArray(prev)) {
          return prev;
        }

        return prev.map((item) =>
          String(item._id) === String(review._id)
            ? {
                ...item,
                moderationStatus: nextStatus,
                effectiveStatus:
                  review.authorStatus === "visible" && nextStatus === "visible"
                    ? "visible"
                    : "hidden",
                masked: false,
              }
            : item,
        );
      }, false);
    }

    try {
      try {
        if (isAdminModeration) {
          await adminMutator(`/api/admin/reviews/${review._id}`, {
            method: "PATCH",
            body: JSON.stringify({
              moderationStatus: nextStatus,
            }),
          });
        } else {
          const response = await fetch(`/api/reviews/${review._id}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: nextStatus,
            }),
          });

          if (!response.ok) {
            throw new Error("상태 변경 실패");
          }
        }
      } catch (error: any) {
        // 서버 요청 자체가 실패하면 네트워크 재검증에
        // 의존하지 않고 저장해 둔 로컬 snapshot을 즉시 복원합니다.
        try {
          if (reviewOwnedByMe) {
            await mutateMyReview(myReviewSnapshot, false);
          } else if (isAdminModeration) {
            await mutateAdminReviews(adminReviewsSnapshot, false);
          }
        } catch (rollbackError) {
          console.error("[reviews] failed to restore product review snapshot", rollbackError);
        }

        showErrorToast(error?.message || "상태 변경 중 오류가 발생했습니다.");

        // 응답 유실 등으로 서버에는 반영됐을 가능성에 대비해
        // snapshot 복원 후 서버 상태 재검증을 best effort로 시도합니다.
        try {
          if (reviewOwnedByMe) {
            await mutateMyReview();
          } else if (isAdminModeration) {
            await mutateAdminReviews();
          }
        } catch (revalidateError) {
          console.error(
            "[reviews] failed to revalidate product review after failed mutation",
            revalidateError,
          );
        }

        return;
      }

      // 서버 변경 성공 후의 재검증 실패는 작업 실패가 아닙니다.
      try {
        if (reviewOwnedByMe) {
          await mutateMyReview();
        } else if (isAdminModeration) {
          await mutateAdminReviews();
        }
      } catch (revalidateError) {
        console.error("[reviews] failed to revalidate after successful mutation", revalidateError);
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "reviews");

      router.replace(`?${params.toString()}`, {
        scroll: false,
      });
      router.refresh();

      showSuccessToast(nextStatus === "hidden" ? "비공개로 전환했습니다." : "공개로 전환했습니다.");
    } finally {
      setBusyReviewId(null);
    }
  };

  const handleDeleteReview = async (review: any) => {
    if (!confirm("이 후기를 삭제하시겠습니까?")) return;

    setBusyReviewId(String(review._id));
    try {
      if (isAdmin && !isMine(review)) {
        await adminMutator(`/api/admin/reviews/${review._id}`, { method: "DELETE" });
      } else {
        const res = await fetch(`/api/reviews/${review._id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error("삭제 실패");
      }

      // 재검증은 삭제 성공과 분리합니다.
      try {
        if (isMine(review)) await mutateMyReview();
        else if (isAdmin) await mutateAdminReviews();
      } catch (revalidateError) {
        console.error("[reviews] failed to revalidate after successful mutation", revalidateError);
      }

      // 탭 유지 + 서버컴포넌트 리프레시
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "reviews");
      router.replace(`?${params.toString()}`, {
        scroll: false,
      });
      router.refresh();

      showSuccessToast("삭제했습니다.");
    } catch (err: any) {
      showErrorToast(err?.message || "삭제 중 오류");
    } finally {
      setBusyReviewId(null);
    }
  };

  const validateSelectedColorForCheckout = () => {
    if (colorRows.length === 0) return true;
    if (!selectedColor || !selectedColorRow) {
      showErrorToast("스트링 색상을 선택해주세요.");
      return false;
    }
    const colorSoldOut = hasVariantInventories
      ? !getVariantsByColor(selectedColorRow.value).some((v) => isSellableVariant(v))
      : isColorSoldOut(selectedColorRow);
    if (colorSoldOut) {
      showErrorToast("선택한 스트링 색상은 현재 품절입니다.");
      return false;
    }
    return true;
  };

  const selectedColorPayload = buildSelectedColorPayload({
    selectedColor,
    selectedColorRow,
    selectedVariant,
    colorImage,
    productImages: product.images,
    getColorLabel,
  });

  const wishlistOptionPayload = buildWishlistOptionPayload({
    selectedGauge,
    selectedColorPayload,
  });

  const currentWishlistItem = findItem(wishlistProductId);

  const { shouldUpdateWishlistOption, wishlistButtonLabel } = getWishlistOptionState({
    isWishlisted,
    currentWishlistItem,
    wishlistOptionPayload,
  });

  const requireGaugeSelection = () => {
    if (!isStringProduct || gaugeRows.length === 0) return true;
    if (selectedGauge) return true;
    showErrorToast("게이지(굵기)를 선택해주세요.");
    return false;
  };

  const handleAddToCart = () => {
    if (loading) return;
    if (!requireGaugeSelection()) return;
    if (!validateSelectedColorForCheckout()) return;
    // 재고 검증 (기존 장바구니에 담긴 수량 + 지금 선택 수량이 stock 초과인지)
    const stockLimitMessage = getProductDetailStockLimitErrorMessage({
      quantity,
      effectiveStock,
      hideGaugeStock,
    });

    if (stockLimitMessage) {
      showErrorToast(stockLimitMessage);
      return;
    }
    const result = addItem(
      buildProductDetailCartItem({
        product,
        displayPrice,
        quantity,
        effectiveStock,
        selectedGauge,
        selectedColorRow,
        selectedColorPayload,
      }),
    );

    if (!result.success) {
      showErrorToast(result.message ?? "오류");
      return;
    }

    if (isStandalonePausedMountableString) {
      toast("장착 신청용으로 담았습니다.", {
        description: "장바구니에서 교체서비스 신청을 이어갈 수 있어요.",
        ...(!user
          ? {
              action: {
                label: "로그인하기",
                onClick: () =>
                  router.push(
                    getProductDetailLoginRedirectTarget({
                      nextPath: `/products/${product._id}`,
                    }),
                  ),
              },
            }
          : {}),
      });
      return;
    }

    if (!user) {
      toast("장바구니에 담았습니다", {
        description: (
          <>
            {allowGuestCheckout ? (
              <>
                <p className="text-ui-body-sm">비회원이신 경우 로그인 또는</p>
                <p className="text-ui-body-sm">비회원 주문하기로 진행하세요.</p>
              </>
            ) : (
              <>
                <p className="text-ui-body-sm">로그인 후 주문을 진행해주세요.</p>
              </>
            )}
          </>
        ),
        action: {
          label: "로그인하기",
          // onClick: () => router.push('/login?from=cart'),
          onClick: () =>
            router.push(
              getProductDetailLoginRedirectTarget({
                nextPath: `/products/${product._id}`,
              }),
            ),
        },
      });
    } else {
      showSuccessToast("장바구니에 담았습니다.");
    }
  };
  // 즉시 구매용 핸들러 (장바구니와 완전히 분리)
  const handleBuyNow = () => {
    if (loading) return;
    if (!requireGaugeSelection()) return;
    if (!validateSelectedColorForCheckout()) return;

    // 재고 검증 (지금 선택 수량이 stock 초과인지)
    const stockLimitMessage = getProductDetailStockLimitErrorMessage({
      quantity,
      effectiveStock,
      hideGaugeStock,
    });

    if (stockLimitMessage) {
      showErrorToast(stockLimitMessage);
      return;
    }

    // Buy-Now 전용 상태에 현재 상품 1건만 저장
    const buyNowItem: CartItem = buildProductDetailCartItem({
      product,
      displayPrice,
      quantity,
      effectiveStock,
      selectedGauge,
      selectedColorRow,
      selectedColorPayload,
    });

    setBuyNowItem(buyNowItem);

    // 장바구니는 건드리지 않고, buy-now 모드로 checkout 진입
    // router.push('/checkout?mode=buynow');
    const target = getProductDetailBuyNowCheckoutTarget();
    if (!user && !allowGuestCheckout) {
      router.push(
        getProductDetailLoginRedirectTarget({
          nextPath: target,
        }),
      );
      return;
    }
    router.push(target);
  };

  // 즉시 구매 + 교체 서비스 포함 핸들러
  const handleBuyNowWithService = () => {
    if (loading) return;
    if (!canCheckoutWithService) return;
    if (!requireGaugeSelection()) return;
    if (!validateSelectedColorForCheckout()) return;

    // 재고 검증
    const stockLimitMessage = getProductDetailStockLimitErrorMessage({
      quantity,
      effectiveStock,
      hideGaugeStock,
    });

    if (stockLimitMessage) {
      showErrorToast(stockLimitMessage);
      return;
    }

    // Buy-Now 전용 상태에 현재 상품 1건만 저장
    const buyNowItem: CartItem = buildProductDetailCartItem({
      product,
      displayPrice, // 여기서는 "자재 가격"만
      quantity,
      effectiveStock,
      selectedGauge,
      selectedColorRow,
      selectedColorPayload,
    });

    setBuyNowItem(buyNowItem);

    // 장착비(서비스비) – 없으면 0
    const mountingFee = typeof product.mountingFee === "number" ? product.mountingFee : 0;

    if (careItemId) {
      sessionStorage.setItem(
        "racket-care-handoff",
        JSON.stringify({
          careItemId,
          productId: String(product._id),
          createdAt: new Date().toISOString(),
        }),
      );
    }

    const target = getProductDetailBuyNowWithServiceCheckoutTarget({
      mountingFee,
      careItemId: careItemId ?? undefined,
    });

    // Checkout으로 직접 진입 (장바구니는 건드리지 않음)
    // router.push(`/checkout?${search.toString()}`);
    if (!user && !allowGuestCheckout) {
      router.push(
        getProductDetailLoginRedirectTarget({
          nextPath: target,
        }),
      );
      return;
    }
    router.push(target);
  };

  const handleWishlist = async () => {
    if (busy || isWishlistUnknown) return;
    setBusy(true);
    try {
      if (shouldUpdateWishlistOption) {
        await updateOptions(wishlistProductId, wishlistOptionPayload);
        showSuccessToast("위시리스트 옵션을 업데이트했습니다.");
        return;
      }

      await toggle(wishlistProductId, wishlistOptionPayload);
      showSuccessToast(
        isWishlisted ? "위시리스트에서 제거했습니다." : "위시리스트에 추가했습니다.",
      );
    } catch (e: any) {
      if (e?.message === "unauthorized") {
        showErrorToast("로그인이 필요합니다.");
        const nextPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : `/products/${product._id}`;
        router.push(
          getProductDetailLoginRedirectTarget({
            nextPath,
          }),
        );
      } else {
        showErrorToast("처리 중 오류가 발생했습니다.");
      }
    } finally {
      setBusy(false);
    }
  };

  const renderWishlistButton = () => (
    <Button
      variant="outline"
      disabled={busy || isWishlistUnknown}
      onClick={handleWishlist}
      size="lg"
      className={cn(
        "h-auto min-h-12 w-full text-ui-body-sm sm:text-ui-body",
        isWishlisted
          ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15"
          : "bg-background",
        isWishlistUnknown && "cursor-not-allowed opacity-70",
      )}
      aria-disabled={busy || isWishlistUnknown}
      aria-label={isWishlistUnknown ? "위시리스트 상태 확인 중" : wishlistButtonLabel}
    >
      <Heart
        className={`mr-2 h-4 w-4 sm:h-5 sm:w-5 ${isWishlisted ? "text-destructive fill-current" : isWishlistUnknown ? "text-muted-foreground/70" : ""}`}
      />
      {wishlistButtonLabel}
    </Button>
  );

  const productId = String(product?._id ?? product?.id ?? "");
  const productBrandLabel = displayBrandLabel(product?.brand) || "스트링";

  useEffect(() => {
    if (!productId || !product?.name) return;
    addRecentViewedItem({
      type: "product",
      id: productId,
      name: product.name,
      subtitle: productBrandLabel || "스트링",
      image: images?.[0],
      href: `/products/${productId}`,
      price: Number.isFinite(Number(product?.price)) ? Number(product.price) : null,
    });
  }, [images, product?.name, product?.price, productBrandLabel, productId]);

  const merchandisingBadges = getProductDetailBadges(product);

  return (
    <div className="min-h-full bg-background pb-24 bp-md:pb-10">
      <CommerceDetailTopBar
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "상품", href: "/products" }]}
        currentLabel={product.name}
        onBack={() => router.back()}
        adminAction={isAdmin ? (
          <Button asChild variant="outline" size="sm" className="h-9 whitespace-nowrap rounded-xl px-2.5 sm:px-3">
            <Link href={`/admin/products/${productId}/edit`}>상품 수정</Link>
          </Button>
        ) : undefined}
      />

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-10">
        <div className="grid grid-cols-1 gap-6 bp-md:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] bp-lg:grid-cols-[minmax(0,1.25fr)_minmax(380px,440px)] bp-lg:gap-8">
          <ProductDetailImageGallery
            images={images}
            productName={product.name}
            currentImage={colorImage}
            merchandisingBadges={merchandisingBadges}
          />

          <div className="space-y-4 sm:space-y-5">
            <CommercePurchasePanel
              eyebrow={<span className="break-words">{productBrandLabel}</span>}
              title={
                <h1 className="min-w-0 text-balance break-words text-ui-section-title font-semibold leading-tight tracking-normal text-foreground sm:text-ui-page-title bp-lg:text-ui-page-title-lg">
                  {product.name}
                </h1>
              }
              rating={<CatalogRating average={averageRating} count={reviewCount} size="lg" />}
              price={<CatalogPrice regularPrice={regularPrice} salePrice={isSale ? salePrice : null} size="detail" />}
              summary={
                canCheckoutWithService ? (
                      <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 text-ui-body-sm sm:text-ui-body">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">상품가</span>
                          <span className="whitespace-nowrap tabular-nums font-semibold text-foreground">
                            {qtyTotal.toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                            <Wrench className="h-3.5 w-3.5 shrink-0" />
                            교체서비스 포함
                          </span>
                          <span className="whitespace-nowrap tabular-nums font-semibold text-primary">
                            {serviceTotal.toLocaleString()}원
                          </span>
                        </div>
                        <p className="break-keep text-ui-label text-muted-foreground">
                          상품가 {qtyTotal.toLocaleString()}원 + 장착비{" "}
                          {mountingFee.toLocaleString()}원
                        </p>
                      </div>
                ) : undefined
              }
              options={
                <div className="space-y-4 sm:space-y-5">
                    {visibleColorRows.length > 0 && (
                      <div className={cn("space-y-3 p-3.5", detailSurfaceSubtleInnerClass)}>
                        <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:gap-3 min-w-0">
                          <span className="text-ui-body-sm font-semibold text-foreground">
                            색상 선택
                          </span>
                          {selectedColorLabel && (
                            <span
                              className="min-w-0 break-words text-ui-label text-muted-foreground"
                              title={selectedColorLabel}
                            >
                              현재 색상: {selectedColorLabel}
                            </span>
                          )}
                        </div>
                        <div className="flex snap-x gap-2 overflow-x-auto pb-1">
                          {visibleColorRows.map((row) => {
                            const label = getColorLabel(row);
                            const soldOut = hasVariantInventories
                              ? !getVariantsByColor(row.value).some((v) => isSellableVariant(v))
                              : isColorSoldOut(row);
                            const isSelected = selectedColor === row.value;
                            const swatchImage =
                              row.image?.trim() ||
                              getVariantsByColor(row.value)
                                .find((v) => v.colorImage?.trim())
                                ?.colorImage?.trim();
                            const hasImage = !!swatchImage;
                            const hasSwatch =
                              typeof row.colorHex === "string" && row.colorHex.trim().length > 0;

                            return (
                              <button
                                key={row.value}
                                type="button"
                                aria-pressed={isSelected}
                                aria-label={`${label} 색상 선택`}
                                disabled={soldOut}
                                onClick={() => setSelectedColor(row.value)}
                                className={cn(
                                  "relative flex h-16 w-16 shrink-0 snap-start items-center justify-center overflow-hidden rounded-lg border bg-background text-ui-label text-foreground transition",
                                  isSelected ? "border-foreground" : "border-border/60",
                                  soldOut && "cursor-not-allowed opacity-45",
                                )}
                              >
                                {hasImage ? (
                                  <Image
                                    src={swatchImage}
                                    alt={label}
                                    fill
                                    className="object-cover"
                                  />
                                ) : hasSwatch ? (
                                  <span
                                    className="h-7 w-7 rounded-full border border-border/60"
                                    style={{
                                      backgroundColor: row.colorHex?.trim(),
                                    }}
                                  />
                                ) : (
                                  <span className="line-clamp-2 px-1 text-center leading-tight break-keep">
                                    {label}
                                  </span>
                                )}
                                {soldOut && (
                                  <span className="absolute bottom-0 left-0 right-0 bg-background/85 text-ui-micro font-medium">
                                    품절
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                      <span className="whitespace-nowrap text-ui-body-sm font-semibold text-foreground">
                        수량 선택
                      </span>

                      <div
                        className={cn(
                          "flex w-auto shrink-0 items-center p-1",
                          detailSurfaceSubtleInnerClass,
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg sm:h-10 sm:w-10"
                          aria-label="수량 감소"
                          disabled={!canDec}
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>

                        <span className="tabular-nums w-10 sm:w-12 select-none text-center font-semibold text-ui-card-title-lg sm:text-ui-section-title">
                          {quantity}
                        </span>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg sm:h-10 sm:w-10"
                          aria-label="수량 증가"
                          disabled={!canInc}
                          onClick={() => {
                            if (!canInc) {
                              showErrorToast(
                                hideGaugeStock
                                  ? "선택한 게이지(굵기)의 구매 가능 수량을 초과했습니다."
                                  : `더 이상 담을 수 없습니다. 재고: ${effectiveStock}개`,
                              );
                              return;
                            }
                            setQuantity((q) => q + 1);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {!hasVariantInventories &&
                      product.inventory?.manageStock &&
                      product.inventory.stock <= 5 &&
                      product.inventory.stock > 0 && (
                        <div
                          className={cn(
                            "flex items-start gap-2.5 p-3 sm:p-3.5",
                            detailSurfaceSubtleInnerClass,
                          )}
                        >
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="break-keep text-ui-body-sm leading-relaxed text-muted-foreground sm:text-ui-body">
                            현재 남은 수량이{" "}
                            <span className="font-semibold text-foreground">
                              {product.inventory.stock}개
                            </span>
                            입니다.
                          </span>
                        </div>
                      )}

                    {isStringProduct && gaugeRows.length > 0 && (
                      <div className={cn("space-y-3 p-3.5", detailSurfaceSubtleInnerClass)}>
                        <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:gap-3 min-w-0">
                          <span className="text-ui-body-sm font-semibold text-foreground">
                            게이지(굵기) 선택
                          </span>
                          {gaugeOptions.length === 1 && (
                            <span className="text-ui-label text-muted-foreground">자동 선택</span>
                          )}
                        </div>
                        <Select value={selectedGauge} onValueChange={setSelectedGauge}>
                          <SelectTrigger className="h-11 w-full min-w-0 bg-background">
                            <SelectValue placeholder="게이지(굵기)를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {gaugeRows.map((row) => {
                              const soldOut = row.isSoldOut || row.stock <= 0;
                              const displayLabel = normalizeGaugeDisplayLabel(row);
                              const stockLabel =
                                !hideGaugeStock && !soldOut
                                  ? ` · 재고 ${Math.max(0, Number(row.stock ?? 0))}개`
                                  : "";
                              const soldOutLabel = soldOut ? " · 품절" : "";
                              return (
                                <SelectItem key={row.value} value={row.value} disabled={soldOut}>
                                  {`${displayLabel}${stockLabel}${soldOutLabel}`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {hasVariantInventories && variantHasNoSellableGauge && (
                          <p className="text-ui-label text-destructive">
                            선택 가능한 게이지(굵기)가 없습니다.
                          </p>
                        )}
                      </div>
                    )}

                    {isStringProduct && (
                      <div className="rounded-xl border border-border bg-muted/20 p-3 text-ui-body-sm leading-relaxed text-muted-foreground">
                        <p className="font-semibold text-foreground">
                          교체서비스 신청용 스트링입니다.
                        </p>
                        <p className="mt-1 break-keep">
                          게이지(굵기)·색상·수량을 확인한 뒤 장착 신청으로 이동하세요.
                        </p>
                      </div>
                    )}

                </div>
              }
              actions={
                isProductSoldOut ? (
                  <CommercePurchaseActions
                    primary={
                      <Button
                        disabled
                        variant="secondary"
                        size="tall"
                        wrap="nowrap"
                        className="min-h-12 w-full sm:min-h-14"
                        aria-label={soldOutHelper}
                      >
                        <X className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
                        <span className="whitespace-nowrap">품절</span>
                      </Button>
                    }
                    helper={<p className="break-keep text-destructive">{soldOutHelper}</p>}
                  />
                ) : (
                  <CommercePurchaseActions
                            primary={
                              canCheckoutWithService ? (
                                <Button
                                  variant="highlight_soft"
                                  size="tall"
                                  className="min-h-12 w-full gap-2 whitespace-nowrap sm:min-h-14" wrap="nowrap" aria-label="교체서비스 신청하기"
                                  disabled={
                                    loading ||
                                    quantity > effectiveStock ||
                                    (isStringProduct && gaugeRows.length > 0 && !selectedGauge) ||
                                    variantPurchaseBlocked
                                  }
                                  onClick={handleBuyNowWithService}
                                >
                                  <Wrench className="mr-2 h-5 w-5 shrink-0" />
                                  <span className="whitespace-nowrap">교체서비스 신청</span>
                                </Button>
                              ) : ENABLE_STRING_STANDALONE_ORDER ? (
                                <Button
                                  variant="highlight_soft"
                                  size="tall"
                                  className="h-12 w-full whitespace-nowrap sm:h-14"
                                  onClick={handleBuyNow}
                                  disabled={
                                    loading ||
                                    effectiveStock <= 0 ||
                                    quantity > effectiveStock ||
                                    (isStringProduct && gaugeRows.length > 0 && !selectedGauge) ||
                                    variantPurchaseBlocked
                                  }
                                >
                                  <CreditCard className="mr-2 h-5 w-5" />
                                  스트링만 구매하기
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="h-auto min-h-12 w-full whitespace-nowrap text-ui-body-sm sm:text-ui-body"
                                  onClick={handleAddToCart}
                                  disabled={
                                    loading ||
                                    quantity > effectiveStock ||
                                    (isStringProduct && gaugeRows.length > 0 && !selectedGauge) ||
                                    variantPurchaseBlocked
                                  }
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                  {cartCtaLabel}
                                </Button>
                              )
                            }
                            secondary={
                              canCheckoutWithService && ENABLE_STRING_STANDALONE_ORDER ? (
                                <Button
                                  variant="secondary"
                                  size="tall"
                                  className="h-12 w-full whitespace-nowrap sm:h-14"
                                  onClick={handleBuyNow}
                                  disabled={
                                    loading ||
                                    effectiveStock <= 0 ||
                                    quantity > effectiveStock ||
                                    (isStringProduct && gaugeRows.length > 0 && !selectedGauge) ||
                                    variantPurchaseBlocked
                                  }
                                >
                                  <CreditCard className="mr-2 h-5 w-5" />
                                  스트링만 구매하기
                                </Button>
                              ) : undefined
                            }
                            tertiary={
                              canCheckoutWithService || ENABLE_STRING_STANDALONE_ORDER ? (
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="h-auto min-h-12 w-full whitespace-nowrap text-ui-body-sm sm:text-ui-body"
                                  onClick={handleAddToCart}
                                  disabled={
                                    loading ||
                                    quantity > effectiveStock ||
                                    (isStringProduct && gaugeRows.length > 0 && !selectedGauge) ||
                                    variantPurchaseBlocked
                                  }
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                  {cartCtaLabel}
                                </Button>
                              ) : undefined
                            }
                  />
                )
              }
              utilities={renderWishlistButton()}
            />
          </div>
        </div>

        <ProductDetailRecommendationSection
          selectedPlayerTypes={selectedPlayerTypes}
          selectedPlayStyles={selectedPlayStyles}
          additionalFeaturesText={additionalFeaturesText}
          normalizedFeatureScores={normalizedFeatureScores}
        />

        <Card className="mt-10 min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:mt-12 sm:rounded-3xl">
          <CardContent className="p-0">
            <CommerceDetailTabs
              value={activeTab}
              onValueChange={(v) => updateTabInUrl(v as any)}
              items={[
                { value: "description", label: "상품 설명", shortLabel: "설명", ariaLabel: "상품 설명", icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5" /> },
                { value: "specifications", label: "상세 스펙", shortLabel: "스펙", ariaLabel: "상세 스펙", icon: <Settings className="h-4 w-4 sm:h-5 sm:w-5" /> },
                { value: "reviews", label: "후기", shortLabel: "후기", ariaLabel: "상품 후기", icon: <Star className="h-4 w-4 sm:h-5 sm:w-5" />, count: reviewCount },
                { value: "qna", label: "문의", shortLabel: "문의", ariaLabel: "상품 문의", icon: <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />, count: qnaTotal },
              ]}
            >
              <TabsContent value="description" className="p-4 sm:p-6 bp-md:p-8">
                <div className="prose max-w-none">
                  <div className="flex min-w-0 items-center gap-3 mb-5 sm:mb-6">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 border border-border/60 bg-secondary text-foreground rounded-lg flex items-center justify-center">
                      <FileText className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="break-keep text-ui-section-title font-semibold leading-tight text-foreground sm:text-ui-page-title">
                      상품 설명
                    </h3>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 sm:rounded-2xl sm:p-6">
                    <p className="whitespace-pre-line break-words text-ui-body-sm leading-relaxed text-muted-foreground sm:text-ui-body">
                      {product.description ||
                        "이 제품은 최고급 소재로 제작된 프리미엄 테니스 스트링입니다. 뛰어난 반발력과 내구성을 자랑하며, 모든 레벨의 플레이어에게 적합합니다. 전문적인 장착 서비스와 함께 최상의 테니스 경험을 제공합니다."}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="p-4 sm:p-6 bp-md:p-8">
                <ProductDetailSpecificationsTab
                  displaySpec={displaySpec}
                  selectedColorLabel={selectedColorLabel}
                  isHybridMaterial={product?.material === "hybrid"}
                  hybridSpec={hybridSpec}
                  hMain={hMain}
                  hCross={hCross}
                  hMainBrand={hMainBrand}
                  hCrossBrand={hCrossBrand}
                  hMainGauge={hMainGauge}
                  hCrossGauge={hCrossGauge}
                  hMainColor={hMainColor}
                  hCrossColor={hCrossColor}
                />
              </TabsContent>

              <TabsContent value="reviews" className="p-4 sm:p-6 bp-md:p-8">
                <ProductDetailReviewsTab
                  mergedReviews={mergedReviews}
                  busyReviewId={busyReviewId}
                  isAdmin={isAdmin}
                  canWriteFromProductReviewTab={canWriteFromProductReviewTab}
                  productReviewHref={productReviewHref}
                  productReviewCtaLabel={productReviewCtaLabel}
                  productReviewHelper={productReviewHelper}
                  onToggleReviewVisibility={handleToggleReviewVisibility}
                  onDeleteReview={handleDeleteReview}
                  onEditReview={openEdit}
                  onOpenReviewPhoto={openViewer}
                />
              </TabsContent>

              <TabsContent value="qna" className="p-4 sm:p-6 bp-md:p-8">
                <ProductDetailQnaTab
                  productId={String(product._id)}
                  productName={product.name}
                  qnas={qnas}
                  qnaLoading={qnaLoading}
                  qnaError={qnaError}
                />
              </TabsContent>
            </CommerceDetailTabs>
          </CardContent>
        </Card>

        {/* 후기 전용 모달 UI는 필요 시점에만 로드 */}
        {viewerOpen && (
          <ReviewPhotoViewerDialog
            open={viewerOpen}
            images={viewerImages}
            index={viewerIndex}
            onClose={closeViewer}
            onPrev={prevViewer}
            onNext={nextViewer}
            onChangeIndex={setViewerIndex}
          />
        )}

        <ProductDetailRelatedProductsSection
          HorizontalProducts={HorizontalProducts}
          relatedSectionRef={relatedSectionRef}
          relatedProducts={relatedFiltered.map(
            (rp: any): HItem => ({
              _id: String(rp._id),
              name: rp.name,
              price: Number(rp.price ?? 0),
              images: rp.images ?? [],
              brand: displayBrandLabel(rp.brand) || rp.brand,
              href: `/products/${rp._id}`,
              merchandisingBadges: getProductDetailBadges(rp),
              inventory: rp.inventory,
            }),
          )}
          loadingRelated={loadingRelated}
        >
          <RecentViewedItems currentType="product" currentId={productId} />

          {/* 후기 수정 다이얼로그도 열릴 때만 로드 */}
          {editOpen && editing && (
            <ReviewEditDialog
              open={editOpen}
              editForm={editForm}
              hoverRating={hoverRating}
              onClose={closeEdit}
              onSubmit={submitEdit}
              busy={busyReviewId === String(editing?._id ?? "")}
              uploadingPhotos={uploadingEditPhotos}
              onUploadingPhotosChange={setUploadingEditPhotos}
              onChangeForm={setEditForm}
              onChangeHoverRating={setHoverRating}
              uploadSessionId={editPhotoSession.uploadSessionId}
              onUploaded={editPhotoSession.registerUploadedUrls}
              onRemove={editPhotoSession.removeUploadedUrl}
            />
          )}
        </ProductDetailRelatedProductsSection>
      </SiteContainer>
    </div>
  );
}
