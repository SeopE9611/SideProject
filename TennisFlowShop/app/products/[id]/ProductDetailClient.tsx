"use client";
import { useWishlist } from "@/app/features/wishlist/useWishlist";
import type { User } from "@/app/store/authStore";
import { useBuyNowStore } from "@/app/store/buyNowStore";
import { type CartItem, useCartStore } from "@/app/store/cartStore";
import type { HItem } from "@/components/HorizontalProducts";
import SiteContainer from "@/components/layout/SiteContainer";
import { PrimaryCTAGroup } from "@/components/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { stringBrandLabel, stringColorLabel, stringMaterialLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { hasPaidMountingFee, isMountableStringByFee } from "@/lib/orders/string-mounting-policy";
import { ENABLE_STRING_STANDALONE_ORDER } from "@/lib/orders/string-standalone-policy";
import { normalizeFeatureScoresTo100 } from "@/lib/product-feature-score";
import { getProductPriceDisplayMeta } from "@/lib/product-pricing";
import { addRecentViewedItem } from "@/lib/recent-viewed";
import { normalizeItemShippingFee } from "@/lib/shipping-fee";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import ProductDetailImageGallery from "./ProductDetailImageGallery";
import ProductDetailRecommendationSection from "./ProductDetailRecommendationSection";
import type {
  ColorInventoryRow,
  DetailTab,
  GaugeInventoryRow,
  VariantInventoryRow,
} from "./ProductDetailClient.types";
import ProductDetailQnaTab from "./ProductDetailQnaTab";
import ProductDetailRelatedProductsSection from "./ProductDetailRelatedProductsSection";
import ProductDetailReviewsTab from "./ProductDetailReviewsTab";
import ProductDetailSpecificationsTab from "./ProductDetailSpecificationsTab";
import { isAdminUser } from "./ProductDetailReviewData.utils";
import { useProductDetailRelatedProducts } from "./useProductDetailRelatedProducts";
import { useProductDetailReviews } from "./useProductDetailReviews";
import {
  getColorLabel,
  getGuestOrderModeClient,
  getProductDetailBadges,
  isColorSoldOut,
  isTruthyBadgeField,
  normalizeColorRows,
  normalizeGaugeDisplayLabel,
} from "./ProductDetailClient.utils";

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
  const reviewsLen = reviews.length;
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
  const saleRate =
    isSale && regularPrice > 0 ? Math.round(((regularPrice - salePrice) / regularPrice) * 100) : 0;

  // ====== 스펙 표 렌더링용 변환 ======
  const toDisplaySpec = () => {
    const spec = product?.specifications || {};
    const origin = spec.origin ?? spec.madeIn ?? spec.제조국 ?? product?.origin ?? product?.madeIn;
    const brand = displayBrandLabel(product?.brand || spec.brand);
    const material =
      stringMaterialLabel(product?.material) || stringMaterialLabel(spec.material) || spec.소재;
    const gaugeRaw = product?.gauge ?? spec.gauge ?? spec.게이지;
    const gauge =
      gaugeOptions.length > 1
        ? gaugeOptions.map((v: string) => formatGaugeLabel(v)).join(" / ")
        : formatGaugeLabel(gaugeRaw);
    const color = stringColorLabel(product?.color) || stringColorLabel(spec.color) || spec.색상;
    const lengthRaw = product?.length ?? spec.length ?? spec.길이;
    const length =
      typeof lengthRaw === "string" && /^\d+(\.\d+)?$/.test(lengthRaw)
        ? `${lengthRaw}m`
        : lengthRaw;

    const display: Record<string, any> = {
      브랜드: brand,
      재질: material,
      "게이지(굵기)": gauge,
      색상: color,
      길이: length,
    };
    if (origin) display["제조국"] = origin;

    if (hasPaidMountingFee(product?.mountingFee)) {
      display["장착 서비스 비용"] = `${Number(product.mountingFee).toLocaleString()}원`;
    }

    return display;
  };

  // 하이브리드 스펙 참조 변수
  const hybridSpec = (product as any)?.specifications?.hybrid;

  // 하이브리드 표시용 로컬 변수
  const hMain = hybridSpec?.main ?? {};
  const hCross = hybridSpec?.cross ?? {};
  const hMainBrand = displayBrandLabel(hMain.brand);
  const hCrossBrand = displayBrandLabel(hCross.brand);
  const hMainGauge = formatGaugeLabel(hMain.gauge);
  const hCrossGauge = formatGaugeLabel(hCross.gauge);
  const hMainColor = stringColorLabel(hMain.color);
  const hCrossColor = stringColorLabel(hCross.color);

  // ====== 추천 태그 추출 ======
  const selectedPlayerTypes = Object.entries(PLAYER_TYPE_MAP)
    .filter(([k]) => product?.tags?.[k])
    .map(([, label]) => label);

  const selectedPlayStyles = Object.entries(PLAY_STYLE_MAP)
    .filter(([k]) => product?.tags?.[k])
    .map(([, label]) => label);

  const additionalFeaturesText = (product?.additionalFeatures || "").trim();

  const [quantity, setQuantity] = useState(1);
  const variantRows = useMemo<VariantInventoryRow[]>(() => {
    if (!Array.isArray(product?.variantInventories) || product.variantInventories.length === 0)
      return [];
    return product.variantInventories
      .map((row: any) => ({
        colorValue: String(row?.colorValue ?? "").trim(),
        gaugeValue: String(row?.gaugeValue ?? "").trim(),
        gaugeLabel: typeof row?.gaugeLabel === "string" ? row.gaugeLabel.trim() : undefined,
        colorImage: typeof row?.colorImage === "string" ? row.colorImage.trim() : undefined,
        stock: Math.max(0, Number(row?.stock ?? 0)),
        isSoldOut: row?.isSoldOut === true,
        showWhenSoldOut: row?.showWhenSoldOut === false ? false : true,
      }))
      .filter((row: VariantInventoryRow) => row.colorValue.length > 0 && row.gaugeValue.length > 0);
  }, [product]);
  const hasVariantInventories = variantRows.length > 0;
  const isSellableVariant = (row?: VariantInventoryRow) =>
    !!row && row.isSoldOut !== true && Number(row.stock) > 0;
  const isSoldOutVariant = (row: VariantInventoryRow) =>
    row.isSoldOut === true || Number(row.stock ?? 0) <= 0;
  const isVisibleVariant = (row: VariantInventoryRow) =>
    !(isSoldOutVariant(row) && row.showWhenSoldOut === false);
  const visibleVariantRows = useMemo(
    () => variantRows.filter((row) => isVisibleVariant(row)),
    [variantRows],
  );
  const getVariantsByColor = (colorValue: string) =>
    visibleVariantRows.filter((v) => v.colorValue === colorValue);
  const getVariantBySelection = (colorValue: string, gaugeValue: string) =>
    variantRows.find((v) => v.colorValue === colorValue && v.gaugeValue === gaugeValue);
  const getAvailableGaugesForColor = (colorValue: string) => getVariantsByColor(colorValue);
  const colorRows = useMemo(() => normalizeColorRows(product), [product]);
  const visibleColorRows = useMemo(() => {
    if (!hasVariantInventories) return colorRows;
    const visibleColorValues = new Set(
      visibleVariantRows.map((row) => row.colorValue).filter(Boolean),
    );
    const baseRows = colorRows.filter((row) => visibleColorValues.has(row.value));
    const known = new Set(baseRows.map((row) => row.value));
    visibleVariantRows.forEach((row) => {
      if (!row.colorValue || known.has(row.colorValue)) return;
      baseRows.push({
        value: row.colorValue,
        label: row.colorValue,
        image: row.colorImage,
        stock: Number(row.stock ?? 0),
        isSoldOut: row.isSoldOut === true,
        showWhenSoldOut: row.showWhenSoldOut,
      });
      known.add(row.colorValue);
    });
    return baseRows;
  }, [colorRows, hasVariantInventories, visibleVariantRows]);
  const firstAvailableColor = useMemo(
    () =>
      visibleColorRows.find((row) =>
        hasVariantInventories ? getVariantsByColor(row.value).length > 0 : !isColorSoldOut(row),
      ) ?? visibleColorRows[0],
    [visibleColorRows, hasVariantInventories],
  );
  const [selectedColor, setSelectedColor] = useState<string>("");
  useEffect(() => {
    if (!selectedColor && firstAvailableColor?.value) {
      setSelectedColor(firstAvailableColor.value);
    }
  }, [firstAvailableColor?.value, selectedColor]);
  const selectedColorRow = visibleColorRows.find((row) => row.value === selectedColor);
  const selectedColorLabel = selectedColorRow ? getColorLabel(selectedColorRow) : "";
  const selectedColorVariants = useMemo(
    () => (selectedColor ? getAvailableGaugesForColor(selectedColor) : []),
    [selectedColor, variantRows],
  );
  const colorImageFromVariant = selectedColorVariants.find((v) => v.colorImage)?.colorImage?.trim();
  const colorImage = selectedColorRow?.image?.trim() || colorImageFromVariant;
  const hideGaugeStock = product?.inventory?.hideGaugeStock === true;
  const gaugeRows = useMemo<GaugeInventoryRow[]>(() => {
    if (hasVariantInventories) {
      return selectedColorVariants.map((row) => ({
        value: row.gaugeValue,
        label: row.gaugeLabel,
        stock: Number(row.stock ?? 0),
        isSoldOut: row.isSoldOut === true,
      }));
    }
    if (Array.isArray(product?.gaugeInventories) && product.gaugeInventories.length > 0) {
      return product.gaugeInventories
        .map((row: any) => ({
          value: String(row?.value ?? "").trim(),
          label: typeof row?.label === "string" ? row.label : undefined,
          stock: Number(row?.stock ?? 0),
          isSoldOut: row?.isSoldOut === true,
          showWhenSoldOut: row?.showWhenSoldOut === false ? false : true,
        }))
        .filter((row: GaugeInventoryRow) => row.value.length > 0);
    }
    if (Array.isArray(product?.gaugeOptions) && product.gaugeOptions.length > 0) {
      return product.gaugeOptions
        .map((value: unknown) => String(value ?? "").trim())
        .filter(Boolean)
        .map((value: string) => ({
          value,
          stock: Number(product?.inventory?.stock ?? 0),
          isSoldOut: false,
        }));
    }
    return [];
  }, [hasVariantInventories, product, selectedColorVariants]);
  const gaugeOptions = useMemo(() => gaugeRows.map((row) => row.value), [gaugeRows]);
  const gaugeRowMap = useMemo(() => new Map(gaugeRows.map((row) => [row.value, row])), [gaugeRows]);
  const isMountableStringProduct = isMountableStringByFee(product?.mountingFee);
  const isStringProduct =
    product?.category === "string" ||
    product?.category === "strings" ||
    product?.kind === "string" ||
    product?.kind === "strings" ||
    isMountableStringProduct;
  const [selectedGauge, setSelectedGauge] = useState<string>("");
  useEffect(() => {
    if (!isStringProduct || gaugeOptions.length !== 1) return;
    setSelectedGauge(gaugeOptions[0]);
  }, [isStringProduct, gaugeOptions]);

  useEffect(() => {
    if (!isStringProduct || gaugeOptions.length === 0) return;
    const current = selectedGauge ? gaugeRowMap.get(selectedGauge) : undefined;
    const isCurrentSoldOut = !!current && (current.isSoldOut || current.stock <= 0);
    const isCurrentInvalid = !!selectedGauge && !current;
    if (!selectedGauge || isCurrentInvalid || isCurrentSoldOut) {
      const firstAvailable = gaugeRows.find((row) => !row.isSoldOut && row.stock > 0);
      setSelectedGauge(firstAvailable?.value ?? "");
      setQuantity(1);
    }
  }, [gaugeOptions, gaugeRowMap, gaugeRows, isStringProduct, selectedGauge]);
  useEffect(() => {
    if (!hasVariantInventories || !isStringProduct || !selectedColor) return;
    const current = selectedGauge ? getVariantBySelection(selectedColor, selectedGauge) : undefined;
    if (isSellableVariant(current)) return;
    const firstSellable = getAvailableGaugesForColor(selectedColor).find((v) =>
      isSellableVariant(v),
    );
    setSelectedGauge(firstSellable?.gaugeValue ?? "");
    setQuantity(1);
  }, [hasVariantInventories, isStringProduct, selectedColor, selectedGauge, visibleVariantRows]);
  // const [isWishlisted, setIsWishlisted] = useState(false);
  const { addItem } = useCartStore();
  const { setItem: setBuyNowItem } = useBuyNowStore();
  const stock = product.inventory?.stock ?? 0;
  const selectedGaugeRow = selectedGauge ? gaugeRowMap.get(selectedGauge) : undefined;
  const selectedVariant =
    hasVariantInventories && selectedColor && selectedGauge
      ? getVariantBySelection(selectedColor, selectedGauge)
      : undefined;
  const selectedVariantSoldOut = !isSellableVariant(selectedVariant);
  const variantHasNoSellableGauge =
    hasVariantInventories &&
    !!selectedColor &&
    getAvailableGaugesForColor(selectedColor).every((v) => !isSellableVariant(v));
  const effectiveStock = hasVariantInventories
    ? isSellableVariant(selectedVariant)
      ? Math.max(0, Number(selectedVariant?.stock ?? 0))
      : 0
    : isStringProduct && gaugeOptions.length > 0 && selectedGaugeRow
      ? Math.max(0, Number(selectedGaugeRow.stock ?? 0))
      : stock;
  useEffect(() => {
    if (quantity > effectiveStock && effectiveStock > 0) setQuantity(effectiveStock);
  }, [effectiveStock, quantity]);
  const variantPurchaseBlocked =
    hasVariantInventories &&
    (!selectedColor ||
      !selectedGauge ||
      !selectedVariant ||
      selectedVariantSoldOut ||
      quantity > effectiveStock ||
      variantHasNoSellableGauge);

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

  // 상품별 QnA 목록
  const {
    data: qnaData,
    error: qnaError,
    isLoading: qnaLoading,
  } = useSWR(
    activeTab === "qna" ? `/api/products/${product._id}/qna?page=1&limit=10` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const qnas = qnaData?.items ?? [];
  const qnaTotal = qnaData?.total ?? 0;

  // 합계 계산
  const unitPrice = displayPrice;
  const qtyTotal = unitPrice * quantity;
  const mountingFee = Number(product?.mountingFee ?? 0);
  const serviceTotal = qtyTotal + mountingFee;
  const canCheckoutWithService = isMountableStringByFee(product?.mountingFee);
  const isApplyFlow = searchParams.get("from") === "apply";
  const serviceCtaLabel = isApplyFlow ? "이 스트링 선택" : "교체서비스 신청하기";
  const shouldEmphasizeServiceCta = isApplyFlow || !ENABLE_STRING_STANDALONE_ORDER;
  const isStandalonePausedMountableString =
    canCheckoutWithService && !ENABLE_STRING_STANDALONE_ORDER;
  const cartCtaLabel = "장바구니 담기";
  const standalonePausedNotice = "현재 스트링은 교체서비스 신청과 함께 이용할 수 있어요.";

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
    reviewsLen,
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
    setEditing(review);
    setEditForm({
      rating: typeof review.rating === "number" ? review.rating : "",
      content: review.content ?? "",
      photos: Array.isArray(review.photos) ? review.photos : [],
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
  };

  const submitEdit = async () => {
    if (!editing?._id) return;
    setBusyReviewId(String(editing._id));
    const { rating, content } = editForm;

    // 낙관적 업데이트 (내 리뷰 vs 관리자-타인 구분)
    if (isMine(editing)) {
      mutateMyReview((prev: any) => {
        if (!prev?._id || String(prev._id) !== String(editing._id)) return prev;
        return {
          ...prev,
          rating: rating === "" ? prev.rating : Number(rating),
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
                rating: rating === "" ? r.rating : Number(rating),
                content,
                masked: false,
              }
            : r,
        );
      }, false);
    }

    try {
      const res = await fetch(`/api/reviews/${editing._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: rating === "" ? undefined : Number(rating),
          content,
          photos: editForm.photos,
        }),
      });
      if (!res.ok) throw new Error("수정 실패");

      // 서버 진실로 재검증
      if (isMine(editing)) await mutateMyReview();
      else if (isAdmin) await mutateAdminReviews();

      // 서버컴포넌트 리프레시 + 탭 유지
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "reviews");
      router.replace(`?${params.toString()}`, { scroll: false });
      router.refresh();

      showSuccessToast("리뷰를 수정했어요.");
      closeEdit();
    } catch (err: any) {
      // 실패 시 원복(간단히 재검증)
      if (isMine(editing)) await mutateMyReview();
      else if (isAdmin) await mutateAdminReviews();
      showErrorToast(err?.message || "리뷰 수정에 실패했습니다.");
    } finally {
      setBusyReviewId(null);
    }
  };

  const handleToggleReviewVisibility = async (review: any) => {
    setBusyReviewId(String(review._id));
    const next = review.status === "visible" ? "hidden" : "visible";

    // 낙관적 업데이트
    if (isMine(review)) {
      mutateMyReview((prev: any) => {
        if (!prev?._id || String(prev._id) !== String(review._id)) return prev;
        return {
          ...prev,
          status: next,
          ownedByMe: true,
          masked: false,
        };
      }, false);
    } else if (isAdmin) {
      mutateAdminReviews((prev: any[] | undefined) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((r) =>
          String(r._id) === String(review._id)
            ? {
                ...r,
                status: next,
                masked: false,
              }
            : r,
        );
      }, false);
    }

    // 서버 반영
    try {
      const res = await fetch(`/api/reviews/${review._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: next,
        }),
      });
      if (!res.ok) throw new Error("상태 변경 실패");

      // 재검증
      if (isMine(review)) await mutateMyReview();
      else if (isAdmin) await mutateAdminReviews();

      // 탭 유지 + 서버컴포넌트 리프레시
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "reviews");
      router.replace(`?${params.toString()}`, {
        scroll: false,
      });
      router.refresh();

      showSuccessToast(
        next === "hidden" ? "비공개로 전환했습니다." : "공개로 전환했습니다.",
      );
    } catch (err: any) {
      // 실패 시 되돌리기(재검증)
      if (isMine(review)) await mutateMyReview();
      else if (isAdmin) await mutateAdminReviews();
      showErrorToast(err?.message || "상태 변경 중 오류");
    } finally {
      setBusyReviewId(null);
    }
  };

  const handleDeleteReview = async (review: any) => {
    if (!confirm("이 리뷰를 삭제하시겠습니까?")) return;

    setBusyReviewId(String(review._id));
    try {
      const res = await fetch(`/api/reviews/${review._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("삭제 실패");

      // 재검증
      if (isMine(review)) await mutateMyReview();
      else if (isAdmin) await mutateAdminReviews();

      // 탭 유지 + 서버컴포넌트 리프레시
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "reviews");
      router.replace(`?${params.toString()}`, {
        scroll: false,
      });
      router.refresh();

      showSuccessToast("삭제했습니다.");
    } catch (err: any) {
      // 실패 시 복구(재검증으로 복원)
      if (isMine(review)) await mutateMyReview();
      else if (isAdmin) await mutateAdminReviews();
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

  const selectedColorPayload =
    selectedColorRow && selectedColor
      ? {
          selectedColor,
          selectedColorLabel: getColorLabel(selectedColorRow),
          selectedColorHex: selectedColorRow.colorHex,
          selectedColorImage:
            selectedVariant?.colorImage?.trim() ||
            selectedColorRow.image ||
            colorImage ||
            product.images?.[0] ||
            "/placeholder.svg",
        }
      : {};
  const wishlistOptionPayload = {
    selectedGauge: selectedGauge || undefined,
    ...selectedColorPayload,
  };
  const currentWishlistItem = findItem(wishlistProductId);
  const hasCurrentWishlistOption = Boolean(
    wishlistOptionPayload.selectedGauge || wishlistOptionPayload.selectedColor,
  );
  const isDifferentWishlistOption =
    currentWishlistItem?.selectedGauge !== wishlistOptionPayload.selectedGauge ||
    currentWishlistItem?.selectedColor !== wishlistOptionPayload.selectedColor;
  const shouldUpdateWishlistOption =
    isWishlisted &&
    hasCurrentWishlistOption &&
    (!currentWishlistItem?.hasSelectedOption || isDifferentWishlistOption);
  const wishlistButtonLabel = shouldUpdateWishlistOption ? "선택 옵션으로 업데이트" : "위시리스트";

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
    const wouldBe = quantity;
    if (wouldBe > effectiveStock) {
      showErrorToast(
        hideGaugeStock
          ? "선택한 게이지(굵기)의 구매 가능 수량을 초과했습니다."
          : `재고가 부족합니다. 현재 재고: ${effectiveStock}개`,
      );
      return;
    }
    const result = addItem({
      id: product._id.toString(),
      name: product.name,
      price: displayPrice,
      ...getProductPriceDisplayMeta(product),
      quantity,
      image: selectedColorRow?.image?.trim() || product.images?.[0] || "/placeholder.svg",
      stock: effectiveStock,
      selectedGauge: selectedGauge || undefined,
      ...selectedColorPayload,
    });

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
                  router.push(`/login?next=${encodeURIComponent(`/products/${product._id}`)}`),
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
            router.push(`/login?next=${encodeURIComponent(`/products/${product._id}`)}`),
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
    if (quantity > effectiveStock) {
      showErrorToast(
        hideGaugeStock
          ? "선택한 게이지(굵기)의 구매 가능 수량을 초과했습니다."
          : `재고가 부족합니다. 현재 재고: ${effectiveStock}개`,
      );
      return;
    }

    // Buy-Now 전용 상태에 현재 상품 1건만 저장
    const buyNowItem: CartItem = {
      id: product._id.toString(),
      name: product.name,
      price: displayPrice,
      ...getProductPriceDisplayMeta(product),
      quantity,
      image: selectedColorRow?.image?.trim() || product.images?.[0] || "/placeholder.svg",
      stock: effectiveStock,
      selectedGauge: selectedGauge || undefined,
      ...selectedColorPayload,
    };

    setBuyNowItem(buyNowItem);

    // 장바구니는 건드리지 않고, buy-now 모드로 checkout 진입
    // router.push('/checkout?mode=buynow');
    const target = "/checkout?mode=buynow";
    if (!user && !allowGuestCheckout) {
      router.push(`/login?next=${encodeURIComponent(target)}`);
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
    if (quantity > effectiveStock) {
      showErrorToast(
        hideGaugeStock
          ? "선택한 게이지(굵기)의 구매 가능 수량을 초과했습니다."
          : `재고가 부족합니다. 현재 재고: ${effectiveStock}개`,
      );
      return;
    }

    // Buy-Now 전용 상태에 현재 상품 1건만 저장
    const buyNowItem: CartItem = {
      id: product._id.toString(),
      name: product.name,
      price: displayPrice, // 여기서는 "자재 가격"만
      ...getProductPriceDisplayMeta(product),
      quantity,
      image: selectedColorRow?.image?.trim() || product.images?.[0] || "/placeholder.svg",
      stock: effectiveStock,
      selectedGauge: selectedGauge || undefined,
      ...selectedColorPayload,
    };

    setBuyNowItem(buyNowItem);

    // 장착비(서비스비) – 없으면 0
    const mountingFee = typeof product.mountingFee === "number" ? product.mountingFee : 0;

    const search = new URLSearchParams({
      mode: "buynow",
      withService: "1", // 서비스 ON
      mountingFee: String(mountingFee), // 1자루 기준 공임
    });

    // Checkout으로 직접 진입 (장바구니는 건드리지 않음)
    // router.push(`/checkout?${search.toString()}`);
    const target = `/checkout?${search.toString()}`;
    if (!user && !allowGuestCheckout) {
      router.push(`/login?next=${encodeURIComponent(target)}`);
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
        router.push(`/login?next=${encodeURIComponent(nextPath)}`);
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

  const averageRating =
    reviewsLen > 0
      ? reviews.reduce((sum: number, review: any) => sum + (Number(review?.rating) || 0), 0) /
        reviewsLen
      : 0;
  const merchandisingBadges = getProductDetailBadges(product);

  // 수량 버튼 상태
  const canDec = quantity > 1;
  const canInc = quantity < effectiveStock;

  return (
    <div className="min-h-full bg-background pb-24 bp-md:pb-10">
      {/* Hero Section with Breadcrumb */}
      <div className="relative border-b border-border/60 bg-card/70 py-4 text-foreground sm:py-5">
        <SiteContainer variant="wide" className="relative">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-ui-body-sm sm:gap-2.5 sm:text-ui-body">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                홈
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <Link
                href="/products"
                className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                상품
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {product.name}
              </span>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                className="h-9 whitespace-nowrap rounded-xl px-2.5 text-ui-body-sm text-muted-foreground transition-[background-color,color,border-color,box-shadow,opacity] duration-200 hover:bg-muted/50 hover:text-foreground sm:px-3"
                onClick={() => router.back()}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                뒤로
              </Button>
              {isAdmin && (
                <Link href={`/admin/products/${productId}/edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 whitespace-nowrap rounded-xl px-2.5 sm:px-3"
                  >
                    상품 수정
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-10">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 bp-lg:grid-cols-5">
          <ProductDetailImageGallery
            images={images}
            productName={product.name}
            currentImage={colorImage}
            merchandisingBadges={merchandisingBadges}
          />

          <div className="bp-lg:col-span-2 space-y-4 sm:space-y-5">
            <Card className="rounded-3xl border border-border bg-card shadow-sm">
              <CardContent className="p-5 sm:p-6 bp-md:p-7">
                <div className="space-y-5 sm:space-y-6">
                  {/* 브랜드와 제품명 */}
                  <div>
                    <span className="inline-block max-w-full truncate text-ui-body-sm sm:text-ui-body text-muted-foreground font-medium mb-2">
                      {productBrandLabel}
                    </span>
                    <h1 className="min-w-0 text-balance break-words text-ui-section-title font-semibold leading-tight tracking-normal text-foreground sm:text-ui-page-title bp-lg:text-ui-page-title-lg">
                      {product.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${i < Math.floor(averageRating) ? "text-foreground fill-current" : "text-muted-foreground/30 fill-current"}`}
                          />
                        ))}
                      </div>
                      <span className="whitespace-nowrap text-ui-body-sm text-muted-foreground sm:text-ui-body">
                        {averageRating.toFixed(1)} ({reviewsLen}개 리뷰)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="whitespace-nowrap tabular-nums text-ui-price-lg font-semibold text-foreground tracking-normal">
                        {displayPrice.toLocaleString()}
                        <span className="text-ui-section-title sm:text-ui-page-title font-medium ml-0.5">
                          원
                        </span>
                      </span>
                      {isSale && (
                        <>
                          <span className="whitespace-nowrap tabular-nums text-ui-card-title-lg sm:text-ui-section-title text-muted-foreground/60 line-through">
                            {regularPrice.toLocaleString()}원
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-ui-body-sm font-semibold text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg">
                            {saleRate}% OFF
                          </span>
                        </>
                      )}
                    </div>
                    {canCheckoutWithService && (
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
                    )}
                  </div>

                  <div className="space-y-4 sm:space-y-5 pt-5 sm:pt-6 border-t border-border/60">
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

                    <div className="flex flex-col gap-3 sm:gap-3.5">
                      {(
                        hasVariantInventories
                          ? selectedVariantSoldOut
                          : product.inventory?.manageStock && product.inventory.stock <= 0
                      ) ? (
                        <div className="space-y-3">
                          <Button
                            disabled
                            variant="secondary"
                            size="tall"
                            wrap="normal"
                            className="min-h-12 w-full sm:min-h-14"
                          >
                            <X className="mr-2 h-5 w-5" />
                            {hasVariantInventories
                              ? "선택한 색상/게이지(굵기) 조합이 품절되었습니다"
                              : "재고가 소진되었습니다"}
                          </Button>
                          {renderWishlistButton()}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <PrimaryCTAGroup
                            primary={
                              canCheckoutWithService ? (
                                <Button
                                  variant={shouldEmphasizeServiceCta ? "default" : "secondary"}
                                  size="tall"
                                  className="min-h-12 w-full gap-2 whitespace-normal break-keep sm:min-h-14"
                                  disabled={
                                    loading ||
                                    quantity > effectiveStock ||
                                    (isStringProduct && gaugeRows.length > 0 && !selectedGauge) ||
                                    variantPurchaseBlocked
                                  }
                                  onClick={handleBuyNowWithService}
                                >
                                  <Wrench className="mr-2 h-5 w-5" />
                                  {serviceCtaLabel}
                                </Button>
                              ) : ENABLE_STRING_STANDALONE_ORDER ? (
                                <Button
                                  variant="default"
                                  size="tall"
                                  className="h-12 w-full whitespace-normal break-keep sm:h-14"
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
                                  className="h-auto min-h-12 w-full whitespace-normal break-keep text-ui-body-sm sm:text-ui-body"
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
                                  className="h-12 w-full whitespace-normal break-keep sm:h-14"
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
                                  className="h-auto min-h-12 w-full whitespace-normal break-keep text-ui-body-sm sm:text-ui-body"
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
                            className="sm:w-full sm:flex-col sm:items-stretch sm:[&>div>*]:w-full"
                          />
                          {renderWishlistButton()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            <Tabs
              value={activeTab}
              onValueChange={(v) => updateTabInUrl(v as any)}
              className="w-full"
            >
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 border-b border-border bg-muted/30 p-1 sm:gap-1.5 sm:p-1.5 md:grid-cols-4">
                <TabsTrigger
                  value="description"
                  className="h-12 min-w-0 rounded-xl px-2 text-ui-body-sm font-medium leading-tight break-keep whitespace-normal transition-[background-color,color,border-color,box-shadow,opacity] duration-200 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:h-14 sm:px-3 sm:text-ui-body md:h-16 md:text-ui-card-title-lg"
                >
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">상품 설명</span>
                  <span className="sm:hidden">설명</span>
                </TabsTrigger>
                <TabsTrigger
                  value="specifications"
                  className="h-12 min-w-0 rounded-xl px-2 text-ui-body-sm font-medium leading-tight break-keep whitespace-normal transition-[background-color,color,border-color,box-shadow,opacity] duration-200 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:h-14 sm:px-3 sm:text-ui-body md:h-16 md:text-ui-card-title-lg"
                >
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">상세 스펙</span>
                  <span className="sm:hidden">스펙</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="h-12 min-w-0 rounded-xl px-2 text-ui-body-sm font-medium leading-tight break-keep whitespace-normal transition-[background-color,color,border-color,box-shadow,opacity] duration-200 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:h-14 sm:px-3 sm:text-ui-body md:h-16 md:text-ui-card-title-lg"
                >
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">리뷰</span>
                  <span className="sm:hidden">리뷰</span>
                  <span className="ml-1 sm:ml-1.5 text-muted-foreground">({reviewsLen})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="qna"
                  className="h-12 min-w-0 rounded-xl px-2 text-ui-body-sm font-medium leading-tight break-keep whitespace-normal transition-[background-color,color,border-color,box-shadow,opacity] duration-200 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:h-14 sm:px-3 sm:text-ui-body md:h-16 md:text-ui-card-title-lg"
                >
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">문의</span>
                  <span className="sm:hidden">문의</span>
                  <span className="ml-1 sm:ml-1.5 text-muted-foreground">({qnaTotal})</span>
                </TabsTrigger>
              </TabsList>

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
                  displaySpec={toDisplaySpec()}
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
            </Tabs>
          </CardContent>
        </Card>

        {/* 리뷰 전용 모달 UI는 필요 시점에만 로드 */}
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

          {/* 리뷰 수정 다이얼로그도 열릴 때만 로드 */}
          {editOpen && editing && (
            <ReviewEditDialog
              open={editOpen}
              editForm={editForm}
              hoverRating={hoverRating}
              onClose={closeEdit}
              onSubmit={submitEdit}
              onChangeForm={setEditForm}
              onChangeHoverRating={setHoverRating}
            />
          )}
        </ProductDetailRelatedProductsSection>
      </SiteContainer>
    </div>
  );
}
