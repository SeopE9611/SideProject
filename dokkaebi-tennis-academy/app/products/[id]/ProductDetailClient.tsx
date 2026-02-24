'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingCart, Heart, ArrowLeft, Truck, Shield, Clock, ChevronLeft, ChevronRight, Zap, RotateCcw, Plus, Minus, Check, X, Loader2, Target, Activity, FileText, Settings, Pencil, MessageSquare, Lock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { type CartItem, useCartStore } from '@/app/store/cartStore';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@/app/store/authStore';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useWishlist } from '@/app/features/wishlist/useWishlist';
import MaskedBlock from '@/components/reviews/MaskedBlock';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, EyeOff, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PhotosUploader from '@/components/reviews/PhotosUploader';
import PhotosReorderGrid from '@/components/reviews/PhotosReorderGrid';
import { badgeBaseOutlined, badgeSizeSm, getQnaCategoryColor, getAnswerStatusColor } from '@/lib/badge-style';
import { useBuyNowStore } from '@/app/store/buyNowStore';
import SiteContainer from '@/components/layout/SiteContainer';

type GuestOrderMode = 'off' | 'legacy' | 'on';

function getGuestOrderModeClient(): GuestOrderMode {
  // 클라이언트에서는 NEXT_PUBLIC_만 접근 가능
  // 기본값은 legacy(= 비회원 주문 흐름 숨김)로 두어 실수 노출을 방지
  const raw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  return raw === 'off' || raw === 'legacy' || raw === 'on' ? raw : 'legacy';
}

export default function ProductDetailClient({ product }: { product: any }) {
  // 방어: 간헐적으로 images/reviews가 undefined인 데이터가 섞이면 상세페이지가 바로 크래시 나는 현상 대비
  const images: string[] = Array.isArray(product?.images) ? product.images : [];
  const reviews: any[] = Array.isArray(product?.reviews) ? product.reviews : [];
  const reviewsLen = reviews.length;
  // ====== 사양/브랜드/색상/게이지 매핑 ======
  const BRAND_MAP: Record<string, string> = {
    luxilon: '럭실론',
    tecnifibre: '테크니화이버',
    wilson: '윌슨',
    babolat: '바볼랏',
    head: '헤드',
    yonex: '요넥스',
    solinco: '솔린코',
    dunlop: '던롭',
  };

  const MATERIAL_MAP: Record<string, string> = {
    polyester: '폴리에스터',
    multifilament: '멀티필라멘트',
    natural_gut: '천연 거트',
    synthetic_gut: '합성 거트',
    hybrid: '하이브리드',
  };

  const COLOR_MAP: Record<string, string> = {
    black: '블랙',
    white: '화이트',
    red: '레드',
    blue: '블루',
    yellow: '옐로우',
    green: '그린',
    orange: '오렌지',
    silver: '실버',
    gold: '골드',
    transparent: '투명',
  };

  const GAUGE_MAP: Record<string, string> = {
    '15L': '1.35mm (15L)',
    '16': '1.30mm (16)',
    '16L': '1.28mm (16L)',
    '17': '1.25mm (17)',
    '17L': '1.20mm (17L)',
    '18': '1.15mm (18)',
  };

  // ====== 태그(추천) 매핑 ======
  const PLAYER_TYPE_MAP: Record<string, string> = {
    beginner: '초보자',
    intermediate: '중급자',
    advanced: '상급자',
  };
  const PLAY_STYLE_MAP: Record<string, string> = {
    baseline: '베이스라인 플레이어',
    serveVolley: '서브 앤 발리 플레이어',
    allCourt: '올코트 플레이어',
    power: '파워 히터', // 신형 필드
    powerHitter: '파워 히터', // 과거 호환
  };

  // ====== 성능(영문/한글) 혼용 저장 호환 헬퍼 ======
  const featureValue = (enKey: string, koKey: string, fallback = 3) => {
    const v = product?.features?.[enKey] ?? product?.features?.[koKey];
    const n = typeof v === 'number' ? v : Number(v);
    if (!n || Number.isNaN(n)) return fallback;
    return Math.min(5, Math.max(1, n));
  };

  // ====== 스펙 표 렌더링용 변환 ======
  const toDisplaySpec = () => {
    const spec = product?.specifications || {};
    const origin = spec.origin ?? spec.madeIn ?? spec.제조국 ?? product?.origin ?? product?.madeIn;
    const brand = BRAND_MAP[product?.brand] ?? BRAND_MAP[spec.brand] ?? product?.brand ?? spec.brand;
    const material = MATERIAL_MAP[product?.material] ?? MATERIAL_MAP[spec.material] ?? spec.소재 ?? product?.material ?? spec.material;
    const gaugeRaw = product?.gauge ?? spec.gauge ?? spec.게이지;
    const gauge = GAUGE_MAP[gaugeRaw] ?? gaugeRaw;
    const color = COLOR_MAP[product?.color] ?? COLOR_MAP[spec.color] ?? spec.색상 ?? product?.color ?? spec.color;
    const lengthRaw = product?.length ?? spec.length ?? spec.길이;
    const length = typeof lengthRaw === 'string' && /^\d+(\.\d+)?$/.test(lengthRaw) ? `${lengthRaw}m` : lengthRaw;

    const display: Record<string, any> = {
      브랜드: brand,
      재질: material,
      게이지: gauge,
      색상: color,
      길이: length,
    };
    if (origin) display['제조국'] = origin;

    if (product?.mountingFee && Number(product.mountingFee) > 0) {
      display['장착 서비스 비용'] = `${Number(product.mountingFee).toLocaleString()}원`;
    }

    return display;
  };

  // 하이브리드 스펙 참조 변수
  const hybridSpec = (product as any)?.specifications?.hybrid;

  // 하이브리드 표시용 로컬 변수
  const hMain = hybridSpec?.main ?? {};
  const hCross = hybridSpec?.cross ?? {};
  const hMainBrand = BRAND_MAP[hMain.brand] ?? hMain.brand;
  const hCrossBrand = BRAND_MAP[hCross.brand] ?? hCross.brand;
  const hMainGauge = GAUGE_MAP[hMain.gauge] ?? hMain.gauge;
  const hCrossGauge = GAUGE_MAP[hCross.gauge] ?? hCross.gauge;
  const hMainColor = COLOR_MAP[hMain.color] ?? hMain.color;
  const hCrossColor = COLOR_MAP[hCross.color] ?? hCross.color;

  // ====== 추천 태그 추출 ======
  const selectedPlayerTypes = Object.entries(PLAYER_TYPE_MAP)
    .filter(([k]) => product?.tags?.[k])
    .map(([, label]) => label);

  const selectedPlayStyles = Object.entries(PLAY_STYLE_MAP)
    .filter(([k]) => product?.tags?.[k])
    .map(([, label]) => label);

  const additionalFeaturesText = (product?.additionalFeatures || '').trim();

  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  // const [isWishlisted, setIsWishlisted] = useState(false);
  const { addItem } = useCartStore();
  const { setItem: setBuyNowItem } = useBuyNowStore();
  const stock = product.inventory?.stock ?? 0;

  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const guestOrderMode = getGuestOrderModeClient();
  const allowGuestCheckout = guestOrderMode === 'on';
  const [loading, setLoading] = useState(true);
  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(async (r) => (r.status === 200 ? r.json() : null));

  // 1) 브랜드 기준 1차
  const { data: byBrand } = useSWR(`/api/products?brand=${encodeURIComponent(product.brand ?? '')}&limit=16&exclude=${product._id}`, fetcher, { revalidateOnFocus: false });

  // 2) 재질 기준 2차 (1차가 빈 경우에만)
  const { data: byMaterial } = useSWR(!byBrand?.products?.length && product.material ? `/api/products?material=${encodeURIComponent(product.material)}&limit=16&exclude=${product._id}` : null, fetcher, { revalidateOnFocus: false });

  // 3) 전체 백업 3차 (1·2차 둘 다 빈 경우에만)
  const { data: anyPool } = useSWR(!byBrand?.products?.length && !byMaterial?.products?.length ? `/api/products?limit=16&exclude=${product._id}` : null, fetcher, { revalidateOnFocus: false });

  // 최종 풀 구성
  const pool = (byBrand?.products?.length ? byBrand.products : byMaterial?.products?.length ? byMaterial.products : anyPool?.products) ?? [];

  const relatedFiltered = useMemo(() => {
    const base = pool.filter((p: any) => String(p._id) !== String(product._id));
    const same = base.filter((p: any) => p.brand === product.brand || p.material === product.material);
    return (same.length ? same : base).slice(0, 4);
  }, [pool, product]);

  // 로딩 상태(세 요청 모두 아직 없음)
  const loadingRelated = !byBrand && !byMaterial && !anyPool;

  // 상품별 QnA 목록
  const { data: qnaData, error: qnaError, isLoading: qnaLoading } = useSWR(`/api/products/${product._id}/qna?page=1&limit=10`, fetcher, { revalidateOnFocus: false });

  const qnas = qnaData?.items ?? [];
  const qnaTotal = qnaData?.total ?? 0;

  const fmtDate = (v?: string | Date) => (v ? new Date(v).toLocaleDateString() : '');

  // 합계 계산
  const unitPrice = Number(product?.price ?? 0);
  const qtyTotal = unitPrice * quantity;
  const serviceTotal = qtyTotal + Number(product?.mountingFee ?? 0);

  // URL의 ?tab 값 -> 로컬 상태로 보존 (새로고침/앞뒤 이동에도 유지)
  type DetailTab = 'description' | 'specifications' | 'reviews' | 'qna';
  const initialTab = (searchParams.get('tab') as DetailTab) ?? 'description';
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [showSticky, setShowSticky] = useState(false);

  // 브라우저 뒤/앞으로 가기 시에도 URL 변화에 맞춰 동기화
  useEffect(() => {
    const current = (searchParams.get('tab') as DetailTab) ?? 'description';
    setActiveTab(current);
  }, [searchParams]);

  useEffect(() => {
    // 본문 CTA(구매 버튼 묶음)가 보이면 sticky는 숨기고,
    // CTA가 화면 밖으로 나가면 sticky 보여짐
    const el = document.getElementById('cta-anchor');

    // 렌더 타이밍상 아직 없으면(예외 케이스) sticky는 일단 보이게
    if (!el) {
      setShowSticky(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        // CTA가 보이면 sticky 숨김, 안 보이면 sticky 표시
        setShowSticky(!entry.isIntersecting);
      },
      {
        threshold: 0.1,
        // CTA가 sticky 뒤에 가려졌는데도 intersecting으로 잡히는 걸 방지
        rootMargin: '0px 0px -160px 0px',
      },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const updateTabInUrl = (tab: DetailTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    // 스크롤 점프 방지
    router.replace(`?${params.toString()}`, { scroll: false });
    setActiveTab(tab);
  };

  // 로그인 정보 로드가 끝난 후 계산
  const isAdmin = !!user && ((user as any).role === 'admin' || (user as any).role === 'ADMIN' || (user as any).isAdmin === true || (Array.isArray((user as any).roles) && (user as any).roles.includes('admin')));

  // 화면에 보이는 개수만큼만 가져와 병합(과한 트래픽 방지)
  const reviewsCount = reviewsLen || 10;

  const { data: adminReviews, mutate: mutateAdminReviews } = useSWR(isAdmin ? `/api/reviews/admin?productId=${product._id}&limit=${reviewsCount}` : null, fetcher, { revalidateOnFocus: false });

  const { has, toggle, isValidating } = useWishlist();
  const isWishlisted = has(product._id);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/users/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if ('error' in data) {
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
        // console.log('로딩 완료');
      });
  }, []);

  // 로그인한 경우에만 내 리뷰 원문을 추가 조회 (비공개라도 원문 반환)
  const { data: myReview, mutate: mutateMyReview } = useSWR(user ? `/api/reviews/self?productId=${product._id}` : null, fetcher, { revalidateOnFocus: false });

  // 내 리뷰 여부 판별(merged에서 ownedByMe 세팅 + id 비교)
  const isMine = (rv: any) => !!rv?.ownedByMe || (myReview && rv && String(myReview._id) === String(rv._id));

  // 서버가 내려준 product.reviews는 숨김 리뷰를 마스킹
  // myReview가 있으면 동일 _id 항목을 원문으로 덮어쓰기 + 마스킹 해제
  // isAdmin이면 adminReviews로 표시 범위 내 항목을 원문으로 덮어쓰기 + 마스킹 해제
  const mergedReviews = useMemo(() => {
    const base = Array.isArray(product.reviews) ? product.reviews : [];
    let next = base;

    // 내 리뷰 덮어쓰기 (있을 때만)
    if (myReview && myReview._id) {
      const i = next.findIndex((r: any) => String(r._id) === String(myReview._id));
      if (i !== -1) {
        next = [...next];
        next[i] = {
          ...next[i],
          user: myReview.userName ?? next[i].user, // UI에서 쓰는 user 필드 보강
          content: myReview.content,
          photos: myReview.photos ?? [],
          masked: false, // 본인 뷰는 언마스크
          ownedByMe: true,
          status: myReview.status, // hidden/visible 그대로 유지
        };
      }
    }

    // 관리자면 표시 중인 항목 범위에서 원문으로 덮어쓰기
    if (isAdmin && Array.isArray(adminReviews) && adminReviews.length > 0) {
      const map = new Map(adminReviews.map((r: any) => [String(r._id), r]));
      next = next.map((r: any) => {
        const raw = map.get(String(r._id));
        if (!raw) return r;
        return {
          ...r,
          // admin API의 필드를 화면 필드로 매핑
          user: raw.userName ?? r.user,
          content: raw.content,
          photos: raw.photos ?? [],
          status: raw.status,
          masked: false, // 관리자 뷰는 언마스크
          adminView: true,
        };
      });
    }

    return next;
  }, [product.reviews, myReview, isAdmin, adminReviews]);

  // 인라인 수정 다이얼로그 상태/핸들러
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ rating: number | ''; content: string; photos: string[] }>({
    rating: '',
    content: '',
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
  const prevViewer = () => setViewerIndex((i) => (i - 1 + viewerImages.length) % viewerImages.length);

  const openEdit = (review: any) => {
    setEditing(review);
    setEditForm({
      rating: typeof review.rating === 'number' ? review.rating : '',
      content: review.content ?? '',
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
          rating: rating === '' ? prev.rating : Number(rating),
          content,
          ownedByMe: true,
          masked: false,
        };
      }, false);
    } else if (isAdmin) {
      mutateAdminReviews((prev: any[] | undefined) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((r) => (String(r._id) === String(editing._id) ? { ...r, rating: rating === '' ? r.rating : Number(rating), content, masked: false } : r));
      }, false);
    }

    try {
      const res = await fetch(`/api/reviews/${editing._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: rating === '' ? undefined : Number(rating),
          content,
          photos: editForm.photos,
        }),
      });
      if (!res.ok) throw new Error('수정 실패');

      // 서버 진실로 재검증
      if (isMine(editing)) await mutateMyReview();
      else if (isAdmin) await mutateAdminReviews();

      // 서버컴포넌트 리프레시 + 탭 유지
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'reviews');
      router.replace(`?${params.toString()}`, { scroll: false });
      router.refresh();

      showSuccessToast('리뷰를 수정했어요.');
      closeEdit();
    } catch (err: any) {
      // 실패 시 원복(간단히 재검증)
      if (isMine(editing)) await mutateMyReview();
      else if (isAdmin) await mutateAdminReviews();
      showErrorToast(err?.message || '리뷰 수정에 실패했습니다.');
    } finally {
      setBusyReviewId(null);
    }
  };

  const handleAddToCart = () => {
    if (loading) return;
    // 재고 검증 (기존 장바구니에 담긴 수량 + 지금 선택 수량이 stock 초과인지)
    const wouldBe = quantity;
    if (wouldBe > stock) {
      showErrorToast(`재고가 부족합니다. 현재 재고: ${stock}개`);
      return;
    }
    const result = addItem({
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      quantity,
      image: product.images?.[0] || '/placeholder.svg',
      stock,
    });

    if (!result.success) {
      showErrorToast(result.message ?? '오류');
      return;
    }

    if (!user) {
      toast('장바구니에 담았습니다', {
        description: (
          <>
            {allowGuestCheckout ? (
              <>
                <p className="text-sm">비회원이신 경우 로그인 또는</p>
                <p className="text-sm">비회원 주문하기로 진행하세요.</p>
              </>
            ) : (
              <>
                <p className="text-sm">로그인 후 주문을 진행해주세요.</p>
              </>
            )}
          </>
        ),
        action: {
          label: '로그인하기',
          // onClick: () => router.push('/login?from=cart'),
          onClick: () => router.push(`/login?redirectTo=${encodeURIComponent(`/products/${product._id}`)}`),
        },
      });
    } else {
      showSuccessToast('장바구니에 담았습니다.');
    }
  };
  // 즉시 구매용 핸들러 (장바구니와 완전히 분리)
  const handleBuyNow = () => {
    if (loading) return;

    // 재고 검증 (지금 선택 수량이 stock 초과인지)
    if (quantity > stock) {
      showErrorToast(`재고가 부족합니다. 현재 재고: ${stock}개`);
      return;
    }

    // Buy-Now 전용 상태에 현재 상품 1건만 저장
    const buyNowItem: CartItem = {
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      quantity,
      image: product.images?.[0] || '/placeholder.svg',
      stock,
    };

    setBuyNowItem(buyNowItem);

    // 장바구니는 건드리지 않고, buy-now 모드로 checkout 진입
    // router.push('/checkout?mode=buynow');
    const target = '/checkout?mode=buynow';
    if (!user && !allowGuestCheckout) {
      router.push(`/login?redirectTo=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  // 즉시 구매 + 교체 서비스 포함 핸들러
  const handleBuyNowWithService = () => {
    if (loading) return;

    // 재고 검증
    if (quantity > stock) {
      showErrorToast(`재고가 부족합니다. 현재 재고: ${stock}개`);
      return;
    }

    // Buy-Now 전용 상태에 현재 상품 1건만 저장
    const buyNowItem: CartItem = {
      id: product._id.toString(),
      name: product.name,
      price: product.price, // 여기서는 "자재 가격"만
      quantity,
      image: product.images?.[0] || '/placeholder.svg',
      stock,
    };

    setBuyNowItem(buyNowItem);

    // 장착비(서비스비) – 없으면 0
    const mountingFee = typeof product.mountingFee === 'number' ? product.mountingFee : 0;

    const search = new URLSearchParams({
      mode: 'buynow',
      withService: '1', // 서비스 ON
      mountingFee: String(mountingFee), // 1자루 기준 공임
    });

    // Checkout으로 직접 진입 (장바구니는 건드리지 않음)
    // router.push(`/checkout?${search.toString()}`);
    const target = `/checkout?${search.toString()}`;
    if (!user && !allowGuestCheckout) {
      router.push(`/login?redirectTo=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  const handleWishlist = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await toggle(product._id); // 항상 서버에 요청
      showSuccessToast(isWishlisted ? '위시리스트에서 제거했습니다.' : '위시리스트에 추가했습니다.');
    } catch (e: any) {
      if (e?.message === 'unauthorized') {
        showErrorToast('로그인이 필요합니다.');
        const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : `/products/${product._id}`;
        router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
      } else {
        showErrorToast('처리 중 오류가 발생했습니다.');
      }
    } finally {
      setBusy(false);
    }
  };

  const nextImage = () => {
    if (images.length === 0) return;
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const averageRating = reviewsLen > 0 ? reviews.reduce((sum: number, review: any) => sum + (Number(review?.rating) || 0), 0) / reviewsLen : 0;

  // 수량 버튼 상태
  const canDec = quantity > 1;
  const canInc = quantity < stock;

  return (
    <div className="min-h-full bg-muted/30 pb-20 bp-md:pb-8">
      {/* Hero Section with Breadcrumb */}
      <div className="relative bg-muted/30 dark:bg-card/40 text-foreground py-6 sm:py-8 border-b border-border">
        <div className="absolute inset-0 bg-overlay/10"></div>
        {/* Tennis court line pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full text-primary" viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="detail-court-lines" patternUnits="userSpaceOnUse" width="100" height="50">
                <rect width="100" height="50" fill="transparent" />
                <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                <line x1="50" y1="0" x2="50" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="hsl(var(--primary) / 0.12)" />
          </svg>
        </div>
        <SiteContainer variant="wide" className="relative">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mb-3 sm:mb-4 opacity-90 overflow-x-auto scrollbar-hide">
            <Link href="/" className="hover:text-primary transition-colors whitespace-nowrap">
              홈
            </Link>
            <span>/</span>
            <Link href="/products" className="hover:text-primary transition-colors whitespace-nowrap">
              상품
            </Link>
            <span>/</span>
            <span className="text-primary truncate max-w-[120px] sm:max-w-none">{product.name}</span>
          </div>
          <Button variant="ghost" className="text-foreground hover:bg-card/10 p-0 h-auto text-sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            이전 페이지로
          </Button>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-4 bp-sm:py-6 bp-md:py-8">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 bp-lg:grid-cols-5">
          <div className="bp-lg:col-span-3 space-y-3 sm:space-y-4">
            <Card className="overflow-hidden border-0 shadow-xl sm:shadow-2xl bg-card/90 backdrop-blur-sm dark:bg-muted/90">
              <div className="relative aspect-square">
                <Image src={images[selectedImageIndex] || '/placeholder.svg'} alt={product.name} fill className="object-cover transition-transform duration-300 hover:scale-105" />
                {images.length > 1 && (
                  <>
                    <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 bg-background/80 text-foreground border border-border shadow-sm hover:bg-background dark:bg-background/30 dark:hover:bg-background/40" onClick={prevImage}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 bg-background/80 text-foreground border border-border shadow-sm hover:bg-background dark:bg-background/30 dark:hover:bg-background/40" onClick={nextImage}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <div className="absolute top-3 sm:top-4 left-3 sm:left-4 flex gap-1.5 sm:gap-2">
                  <Badge className="bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary text-xs">NEW</Badge>
                  <Badge className="bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary text-xs">정품</Badge>
                </div>
              </div>
            </Card>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {images.map((image: string, index: number) => (
                  <Card key={index} className={`overflow-hidden cursor-pointer transition-all duration-200 ${selectedImageIndex === index ? 'ring-2 ring-ring shadow-lg' : 'hover:shadow-md'}`} onClick={() => setSelectedImageIndex(index)}>
                    <div className="aspect-square relative">
                      <Image src={image || '/placeholder.svg?height=100&width=100&query=tennis string thumbnail'} alt={`${product.name} ${index + 1}`} fill className="object-cover" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="bp-lg:col-span-2 space-y-3 sm:space-y-4">
            <Card className="border-0 shadow-lg sm:shadow-xl bg-card/90 backdrop-blur-sm dark:bg-muted/90">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {/* 브랜드와 제품명 */}
                  <div>
                    <Badge variant="outline" className="mb-2 text-xs text-primary border-border dark:text-primary dark:border-border">
                      {BRAND_MAP[(product?.brand ?? '').toLowerCase()] ?? product.brand}
                    </Badge>
                    <h1 className="text-xl sm:text-2xl bp-lg:text-3xl font-bold bg-muted/30 text-primary leading-tight">{product.name}</h1>
                    <div className="mt-2 flex items-center gap-2 sm:gap-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-3 w-3 sm:h-4 sm:w-4 ${i < Math.floor(averageRating) ? 'text-warning fill-current' : 'fill-muted text-muted'}`} />
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {averageRating.toFixed(1)} ({reviewsLen})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-bold text-primary">{product.price.toLocaleString()}원</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <>
                          <span className="text-base sm:text-lg text-muted-foreground line-through">{product.originalPrice.toLocaleString()}원</span>
                          <Badge className="bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary text-xs">{Math.round((1 - product.price / product.originalPrice) * 100)}% 할인</Badge>
                        </>
                      )}
                    </div>
                    {typeof product?.mountingFee === 'number' && (
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        <span className="inline-flex items-center rounded-md bg-primary/10 dark:bg-primary/20 border border-border px-2 py-1 text-xs">
                          장착 서비스: {product.mountingFee > 0 ? `+${product.mountingFee.toLocaleString()}원` : '무료'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm sm:text-base">수량</span>

                      <div className="flex items-center rounded-full bg-muted px-1 dark:bg-muted">
                        <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 disabled:opacity-40" aria-label="수량 감소" disabled={!canDec} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                          <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>

                        <span className="tabular-nums w-8 sm:w-10 select-none text-center font-medium text-sm sm:text-base">{quantity}</span>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 sm:h-9 sm:w-9 disabled:opacity-40"
                          aria-label="수량 증가"
                          disabled={!canInc}
                          onClick={() => {
                            if (!canInc) {
                              showErrorToast(`더 이상 담을 수 없습니다. 재고: ${stock}개`);
                              return;
                            }
                            setQuantity((q) => q + 1);
                          }}
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                    {product.inventory?.manageStock && product.inventory.stock <= 5 && product.inventory.stock > 0 && (
                      <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-muted/50 border border-border rounded-lg dark:bg-muted/40 dark:border-border">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs sm:text-sm text-muted-foreground">현재 남은 수량이 {product.inventory.stock}개입니다.</span>
                      </div>
                    )}

                    <div id="cta-anchor" className="flex flex-col gap-2 sm:gap-3">
                      {product.inventory?.manageStock && product.inventory.stock <= 0 ? (
                        <Button disabled className="w-full h-10 sm:h-11 text-sm bg-destructive/15 text-destructive border border-border dark:bg-destructive/20 dark:text-destructive">
                          <X className="mr-2 h-4 w-4" />
                          재고가 소진되었습니다
                        </Button>
                      ) : (
                        <>
                          <Button
                            className="w-full h-10 sm:h-11 text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow"
                            onClick={handleBuyNow}
                            disabled={loading || stock <= 0 || quantity > stock}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            즉시 구매하기
                          </Button>

                          <Button
                            className="flex-1 h-12 rounded-lg border border-border bg-card dark:bg-muted hover:bg-muted/50 dark:hover:bg-muted active:bg-muted dark:active:bg-muted text-foreground font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                            disabled={loading || quantity > stock}
                            onClick={handleBuyNowWithService}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            교체 서비스 포함 즉시 결제
                          </Button>

                          <Button variant="outline" className="w-full h-10 sm:h-11 text-sm bg-transparent" onClick={handleAddToCart} disabled={loading || quantity > stock}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            장바구니에 담기
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={handleWishlist}
                        className={`w-full h-10 sm:h-11 text-sm ${isWishlisted ? 'bg-destructive/10 border-border text-destructive dark:bg-destructive/15 dark:border-border dark:text-destructive' : ''}`}
                      >
                        <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? 'text-destructive fill-current' : ''}`} />
                        위시리스트
                      </Button>
                    </div>
                  </div>

                  <div className="pt-3 sm:pt-4 border-t">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 flex items-center">
                      <Truck className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      배송 정보
                    </h3>
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0" />
                        <span>3,000원 (30,000원 이상 무료)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0" />
                        <span>오후 2시 이전 주문 시 당일 출고</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0" />
                        <span>장착 서비스 신청 시 1-2일 추가</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 bp-md:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
          <Card className="border-0 shadow-lg bg-card/90 backdrop-blur-sm dark:bg-muted/90">
            <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-semibold text-primary flex items-center gap-2">
                <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                추천 정보 & 특성
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
              <div>
                <h4 className="font-medium text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">추천 대상</h4>
                <div className="space-y-1.5 sm:space-y-2">
                  {selectedPlayerTypes.length > 0 && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full shrink-0"></div>
                      <span className="text-muted-foreground">플레이어:</span>
                      <span className="font-medium">{selectedPlayerTypes.join(', ')}</span>
                    </div>
                  )}
                  {selectedPlayStyles.length > 0 && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full shrink-0"></div>
                      <span className="text-muted-foreground">스타일:</span>
                      <span className="font-medium">{selectedPlayStyles.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">추가 특성</h4>
                {additionalFeaturesText ? (
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{additionalFeaturesText}</p>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground italic">추가 특성 정보가 없습니다.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-card/90 backdrop-blur-sm dark:bg-muted/90">
            <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-semibold text-primary flex items-center gap-2">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                성능 특성
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                {[
                  { name: '반발력', icon: Zap, key: 'power', koKey: '반발력' },
                  { name: '컨트롤', icon: Target, key: 'control', koKey: '컨트롤' },
                  { name: '스핀', icon: RotateCcw, key: 'spin', koKey: '스핀' },
                  { name: '내구성', icon: Shield, key: 'durability', koKey: '내구성' },
                  { name: '편안함', icon: Heart, key: 'comfort', koKey: '편안함' },
                ].map((spec, index) => (
                  <div key={index} className="p-2.5 sm:p-3 bg-primary/10 dark:bg-primary/20 rounded-lg">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                      <spec.icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground">{spec.name}</span>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${i < featureValue(spec.key, spec.koKey) ? 'bg-primary dark:bg-primary/70' : 'bg-muted'}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 sm:mt-12 border-0 shadow-lg sm:shadow-xl bg-card/90 backdrop-blur-sm dark:bg-muted/90">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={(v) => updateTabInUrl(v as any)} className="w-full">
              <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 h-auto gap-0.5 sm:gap-1 bg-muted/30 rounded-t-lg p-0.5 sm:p-1">
                <TabsTrigger
                  value="description"
                  className="min-w-0 h-11 sm:h-12 md:h-16 px-2 text-xs sm:text-sm md:text-base font-medium truncate data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary dark:data-[state=active]:bg-muted dark:data-[state=active]:text-primary"
                >
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">상품 설명</span>
                  <span className="sm:hidden">설명</span>
                </TabsTrigger>
                <TabsTrigger
                  value="specifications"
                  className="min-w-0 h-11 sm:h-12 md:h-16 px-2 text-xs sm:text-sm md:text-base font-medium truncate data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary dark:data-[state=active]:bg-muted dark:data-[state=active]:text-primary"
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">상세 스펙</span>
                  <span className="sm:hidden">스펙</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="min-w-0 h-11 sm:h-12 md:h-16 px-2 text-xs sm:text-sm md:text-base font-medium truncate data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary dark:data-[state=active]:bg-muted dark:data-[state=active]:text-primary"
                >
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">리뷰</span>
                  <span className="sm:hidden">리뷰</span>
                  <span className="ml-0.5 sm:ml-1">({reviewsLen})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="qna"
                  className="min-w-0 h-11 sm:h-12 md:h-16 px-2 text-xs sm:text-sm md:text-base font-medium truncate data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary dark:data-[state=active]:bg-muted dark:data-[state=active]:text-primary"
                >
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">문의</span>
                  <span className="sm:hidden">문의</span>
                  <span className="ml-0.5 sm:ml-1">({qnaTotal})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="p-4 sm:p-8">
                <div className="prose max-w-none">
                  <div className="flex items-center gap-3 mb-5 sm:mb-6">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-muted/30 text-primary rounded-lg flex items-center justify-center">
                      <FileText className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">상품 설명</h3>
                  </div>
                  <div className="bg-muted/30 p-4 sm:p-6 rounded-lg">
                    <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
                      {product.description || '이 제품은 최고급 소재로 제작된 프리미엄 테니스 스트링입니다. 뛰어난 반발력과 내구성을 자랑하며, 모든 레벨의 플레이어에게 적합합니다. 전문적인 장착 서비스와 함께 최상의 테니스 경험을 제공합니다.'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="p-4 sm:p-8">
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3 mb-5 sm:mb-6">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-muted/30 text-primary rounded-lg flex items-center justify-center">
                      <Settings className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">상세 스펙</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {Object.entries(toDisplaySpec())
                      .filter(([, value]) => value)
                      .map(([key, value]) => (
                        <div key={key} className="bg-muted/30 p-3 sm:p-4 rounded-lg border border-border">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-primary text-sm sm:text-base">{key}</span>
                            <span className="text-muted-foreground font-medium text-sm sm:text-base">{String(value)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                  {product?.material === 'hybrid' && hybridSpec && (
                    <Card className="mt-4 sm:mt-6 border-0 shadow-none bg-transparent">
                      <CardContent className="p-0">
                        {/* 상세 스펙 그리드(파란 그라데이션 카드)와 톤 통일 */}
                        <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-9 sm:w-10 h-9 sm:h-10 bg-muted/30 text-primary rounded-lg flex items-center justify-center">
                              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <h4 className="text-lg sm:text-xl font-bold text-foreground">하이브리드 구성</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            {/* 메인 */}
                            <div className="bg-muted/30 p-3 sm:p-4 rounded-lg border border-border">
                              <div className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">메인(Mains)</div>
                              <div className="font-medium text-sm sm:text-base">
                                {hMainBrand ?? ''} {hMain?.name ?? ''}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                {hMainGauge ? `게이지: ${hMainGauge}` : null}
                                {hMainColor ? ` · 색상: ${hMainColor}` : null}
                              </div>
                            </div>

                            {/* 크로스 */}
                            <div className="bg-muted/30 p-3 sm:p-4 rounded-lg border border-border">
                              <div className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">크로스(Crosses)</div>
                              <div className="font-medium text-sm sm:text-base">
                                {hCrossBrand ?? ''} {hCross?.name ?? ''}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                {hCrossGauge ? `게이지: ${hCrossGauge}` : null}
                                {hCrossColor ? ` · 색상: ${hCrossColor}` : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="p-4 sm:p-8">
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-10 sm:w-12 h-10 sm:h-12 bg-muted/30 rounded-lg flex items-center justify-center">
                        <Star className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground">고객 리뷰</h3>
                    </div>
                    <Button asChild variant="outline" className="bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary hover:bg-primary/15 dark:hover:bg-primary/25 shadow-lg text-xs sm:text-sm h-9 sm:h-10">
                      <Link href={`/reviews/write?productId=${product._id}`}>
                        <Pencil className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        리뷰 작성하기
                      </Link>
                    </Button>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {mergedReviews.length > 0 ? (
                      mergedReviews.map((review: any, index: number) => (
                        <Card key={index} className="border-0 shadow-lg bg-muted/30">
                          <CardContent className="p-4 sm:p-6 relative">
                            {busyReviewId === String(review._id) && (
                              <div className="absolute inset-0 bg-card/70 dark:bg-background/40 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="ml-2 text-sm">변경 중...</span>
                              </div>
                            )}

                            <div className="flex items-start justify-between mb-3 sm:mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg shadow-lg">{review.user?.charAt(0) || 'U'}</div>
                                <div>
                                  <div className="font-bold text-foreground text-sm sm:text-base">
                                    {review.status === 'hidden' ? (review.ownedByMe ? `${review.user ?? '내 리뷰'} (비공개)` : review.adminView ? `${review.user ?? '사용자'} (비공개)` : '비공개 리뷰') : (review.user ?? '익명')}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`h-3 w-3 sm:h-4 sm:w-4 ${i < (review.rating || 5) ? 'text-warning fill-current' : 'fill-muted text-muted'}`} />
                                      ))}
                                    </div>
                                    <span className="text-xs sm:text-sm text-muted-foreground">{review.date || '2099-01-01'}</span>
                                  </div>
                                </div>
                              </div>

                              {(review.ownedByMe || isAdmin) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-foreground transition-colors" aria-label="내 리뷰 관리">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    {/* 공개/비공개 토글 */}
                                    <DropdownMenuItem
                                      disabled={busyReviewId === String(review._id)}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setBusyReviewId(String(review._id));
                                        const next = review.status === 'visible' ? 'hidden' : 'visible';

                                        // 낙관적 업데이트
                                        if (isMine(review)) {
                                          mutateMyReview((prev: any) => {
                                            if (!prev?._id || String(prev._id) !== String(review._id)) return prev;
                                            return { ...prev, status: next, ownedByMe: true, masked: false };
                                          }, false);
                                        } else if (isAdmin) {
                                          mutateAdminReviews((prev: any[] | undefined) => {
                                            if (!Array.isArray(prev)) return prev;
                                            return prev.map((r) => (String(r._id) === String(review._id) ? { ...r, status: next, masked: false } : r));
                                          }, false);
                                        }

                                        // 서버 반영
                                        try {
                                          const res = await fetch(`/api/reviews/${review._id}`, {
                                            method: 'PATCH',
                                            credentials: 'include',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ status: next }),
                                          });
                                          if (!res.ok) throw new Error('상태 변경 실패');

                                          // 재검증
                                          if (isMine(review)) await mutateMyReview();
                                          else if (isAdmin) await mutateAdminReviews();

                                          // 탭 유지 + 서버컴포넌트 리프레시
                                          const params = new URLSearchParams(searchParams.toString());
                                          params.set('tab', 'reviews');
                                          router.replace(`?${params.toString()}`, { scroll: false });
                                          router.refresh();

                                          showSuccessToast(next === 'hidden' ? '비공개로 전환했습니다.' : '공개로 전환했습니다.');
                                        } catch (err: any) {
                                          // 실패 시 되돌리기(재검증)
                                          if (isMine(review)) await mutateMyReview();
                                          else if (isAdmin) await mutateAdminReviews();
                                          showErrorToast(err?.message || '상태 변경 중 오류');
                                        } finally {
                                          setBusyReviewId(null);
                                        }
                                      }}
                                      className="cursor-pointer"
                                    >
                                      {review.status === 'visible' ? (
                                        <>
                                          <EyeOff className="mr-2 h-4 w-4" />
                                          비공개로 전환
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="mr-2 h-4 w-4" />
                                          공개로 전환
                                        </>
                                      )}
                                    </DropdownMenuItem>

                                    {/* 수정 */}
                                    <DropdownMenuItem
                                      disabled={busyReviewId === String(review._id)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEdit(review);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      수정
                                    </DropdownMenuItem>

                                    {/* 삭제 */}
                                    <DropdownMenuItem
                                      disabled={busyReviewId === String(review._id)}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!confirm('이 리뷰를 삭제하시겠습니까?')) return;

                                        setBusyReviewId(String(review._id));
                                        try {
                                          const res = await fetch(`/api/reviews/${review._id}`, {
                                            method: 'DELETE',
                                            credentials: 'include',
                                          });
                                          if (!res.ok) throw new Error('삭제 실패');

                                          // 재검증
                                          if (isMine(review)) await mutateMyReview();
                                          else if (isAdmin) await mutateAdminReviews();

                                          // 탭 유지 + 서버컴포넌트 리프레시
                                          const params = new URLSearchParams(searchParams.toString());
                                          params.set('tab', 'reviews');
                                          router.replace(`?${params.toString()}`, { scroll: false });
                                          router.refresh();

                                          showSuccessToast('삭제했습니다.');
                                        } catch (err: any) {
                                          // 실패 시 복구(재검증으로 복원)
                                          if (isMine(review)) await mutateMyReview();
                                          else if (isAdmin) await mutateAdminReviews();
                                          showErrorToast(err?.message || '삭제 중 오류');
                                        } finally {
                                          setBusyReviewId(null);
                                        }
                                      }}
                                      className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      삭제
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>

                            {(() => {
                              const isMasked = review.masked ?? (review.status === 'hidden' && !review.ownedByMe && !review.adminView);
                              if (isMasked) return <MaskedBlock />;

                              return (
                                <div className="space-y-3 sm:space-y-4">
                                  <div className="bg-card dark:bg-muted/50 p-3 sm:p-4 rounded-lg border border-border">
                                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{review.content}</p>
                                  </div>

                                  {Array.isArray(review.photos) && review.photos.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                                      {review.photos.slice(0, 4).map((src: string, i: number) => (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => openViewer(review.photos, i)}
                                          className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 border-border hover:border-border dark:hover:border-border transition-colors shadow-md shrink-0"
                                          aria-label={`리뷰 사진 ${i + 1} 크게 보기`}
                                        >
                                          <Image src={src || '/placeholder.svg'} alt={`리뷰 사진 ${i + 1}`} fill className="object-cover" />
                                          {i === 3 && review.photos.length > 4 && <div className="absolute inset-0 bg-background/80 text-foreground border border-border text-xs font-bold flex items-center justify-center">+{review.photos.length - 3}</div>}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 sm:py-16">
                        <div className="w-16 sm:w-20 h-16 sm:h-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                          <Star className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">아직 리뷰가 없습니다</h3>
                        <p className="text-muted-foreground mb-6 text-base sm:text-lg">첫 번째 리뷰를 작성해보세요!</p>
                        <Button className="bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary hover:bg-primary/15 dark:hover:bg-primary/25 shadow-lg px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base">
                          <Pencil className="h-4 w-4 mr-2" />
                          리뷰 작성하기
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="qna" className="p-4 sm:p-8">
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-muted/30 text-primary rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">상품 문의</h3>
                  </div>
                  <Button asChild className="bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary hover:bg-primary/15 dark:hover:bg-primary/25 shadow-lg text-xs sm:text-sm h-9 sm:h-10">
                    <Link href={`/board/qna/write?productId=${product._id}&productName=${encodeURIComponent(product.name)}`}>문의하기</Link>
                  </Button>
                </div>

                {qnaLoading && <div className="text-sm text-muted-foreground">불러오는 중…</div>}
                {qnaError && <div className="text-sm text-destructive">문의 목록을 불러오지 못했습니다.</div>}

                {!qnaLoading && !qnaError && (
                  <>
                    {qnas.length === 0 ? (
                      <div className="text-center py-8 sm:py-16">
                        <div className="w-16 sm:w-20 h-16 sm:h-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                          <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                        </div>
                        <h4 className="text-lg sm:text-xl font-bold text-foreground mb-2">아직 문의가 없습니다</h4>
                        <p className="text-muted-foreground mb-6 text-base sm:text-lg">첫 번째 문의를 남겨보세요!</p>
                        <Button asChild className="bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary hover:bg-primary/15 dark:hover:bg-primary/25 shadow-lg px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base">
                          <Link href={`/board/qna/write?productId=${product._id}&productName=${encodeURIComponent(product.name)}`}>문의하기</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {qnas.map((q: any) => (
                          <Link key={q._id} href={`/board/qna/${q._id}`}>
                            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.01] border-border">
                              <CardContent className="p-4 sm:p-5">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                        <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getQnaCategoryColor(q.category)}`}>
                                          {q.category ?? '상품문의'}
                                        </Badge>
                                        {q.isSecret && (
                                          <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} bg-muted/50 text-muted-foreground border-border/40 dark:border-border shrink-0`}>
                                            <Lock className="h-3 w-3 mr-1" />
                                            비밀글
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getAnswerStatusColor(!!q.answer)} shrink-0`}>
                                          {q.answer ? '답변 완료' : '답변 대기'}
                                        </Badge>
                                      </div>
                                      <div className="font-semibold text-foreground truncate hover:text-primary dark:hover:text-primary text-sm sm:text-base">{q.title}</div>
                                      <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
                                        <span>{q.authorName ?? '익명'}</span>
                                        <span>{fmtDate(q.createdAt)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 리뷰 사진 확대 보기 */}
        <Dialog open={viewerOpen} onOpenChange={(v) => (v ? setViewerOpen(true) : closeViewer())}>
          <DialogContent className="sm:max-w-4xl p-0 bg-background/90 text-foreground border border-border">
            {/* 접근성용 제목(시각적으로 숨김) */}
            <DialogHeader className="sr-only">
              <DialogTitle>리뷰 사진 확대 보기</DialogTitle>
            </DialogHeader>
            <div className="relative w-full aspect-video">
              {viewerImages[viewerIndex] && <Image src={viewerImages[viewerIndex] || '/placeholder.svg'} alt={`리뷰 사진 확대 ${viewerIndex + 1}`} fill className="object-contain" priority />}

              {/* 좌우 이동 */}
              {viewerImages.length > 1 && (
                <>
                  <button type="button" onClick={prevViewer} className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-10 w-10 rounded-full bg-card/20 hover:bg-card/30" aria-label="이전 사진">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={nextViewer} className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-10 w-10 rounded-full bg-card/20 hover:bg-card/30" aria-label="다음 사진">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {/* 썸네일 네비게이션 */}
            {viewerImages.length > 1 && (
              <div className="p-3 flex flex-wrap gap-2 justify-center bg-foreground/70">
                {viewerImages.map((thumb, i) => (
                  <button key={i} type="button" onClick={() => setViewerIndex(i)} className={`relative w-16 h-16 rounded-md overflow-hidden border ${i === viewerIndex ? 'ring-2 ring-ring' : ''}`} aria-label={`썸네일 ${i + 1}`}>
                    <Image src={thumb || '/placeholder.svg'} alt={`썸네일 ${i + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="mt-8 sm:mt-12">
          <Card className="border-0 shadow-xl bg-card/90 backdrop-blur-sm dark:bg-muted/90">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-bold bg-muted/30 text-primary">관련 상품</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 4칸 고정: 상품이 부족하면 플레이스홀더로 채움 */}
              {loadingRelated ? (
                // 로딩 스켈레톤
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl p-3 sm:p-4 bg-card/80 dark:bg-muted/80 shadow-sm animate-pulse">
                      <div className="aspect-square rounded-lg bg-muted mb-2 sm:mb-3"></div>
                      <div className="h-4 rounded bg-muted mb-1.5 sm:mb-2"></div>
                      <div className="h-4 w-1/2 rounded bg-muted"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {/* 실제 관련 상품 */}
                  {relatedFiltered.map((rp: any) => (
                    <Link key={rp._id} href={`/products/${rp._id}`}>
                      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group border border-border">
                        <div className="relative aspect-square overflow-hidden bg-muted/30">
                          <img src={rp.images?.[0] || '/placeholder.svg'} alt={rp.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                        </div>
                        <CardContent className="p-3 sm:p-4">
                          <div className="text-xs text-muted-foreground mb-0.5 sm:mb-1">{BRAND_MAP[rp.brand] ?? rp.brand}</div>
                          <div className="font-medium line-clamp-2 mb-1.5 sm:mb-2 text-sm sm:text-base group-hover:text-primary dark:group-hover:text-primary transition-colors">{rp.name}</div>
                          <div className="font-bold text-primary text-sm sm:text-base">{Number(rp.price).toLocaleString()}원</div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}

                  {/* 플레이스홀더로 4칸 채우기 */}
                  {Array.from({ length: Math.max(0, 4 - relatedFiltered.length) }).map((_, i) => (
                    <div
                      key={`rel-ph-${i}`}
                      className="rounded-xl p-3 sm:p-4 border-2 border-dashed border-border/70 dark:border-border/70 bg-muted/30 text-center flex flex-col"
                    >
                      <div className="aspect-square rounded-lg bg-muted mb-2 sm:mb-3 flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">준비 중</span>
                      </div>
                      <div className="text-sm text-muted-foreground">곧 업데이트됩니다</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 리뷰 수정 다이얼로그 */}
          <Dialog open={editOpen} onOpenChange={(v) => (v ? setEditOpen(true) : closeEdit())}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>리뷰 수정</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>평점</Label>

                  <div
                    role="radiogroup"
                    aria-label="평점 선택"
                    className="flex items-center gap-1"
                    onKeyDown={(e) => {
                      // 키보드 접근성(←/→로 증감)
                      const curr = typeof editForm.rating === 'number' ? editForm.rating : 0;
                      if (e.key === 'ArrowRight') {
                        const next = Math.min(5, curr + 1 || 1);
                        setEditForm((s) => ({ ...s, rating: next }));
                        e.preventDefault();
                      }
                      if (e.key === 'ArrowLeft') {
                        const next = Math.max(1, (curr || 1) - 1);
                        setEditForm((s) => ({ ...s, rating: next }));
                        e.preventDefault();
                      }
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((i) => {
                      const current = typeof editForm.rating === 'number' ? editForm.rating : 0;
                      const filled = (hoverRating ?? current) >= i;
                      return (
                        <button
                          key={i}
                          type="button"
                          role="radio"
                          aria-checked={current === i}
                          aria-label={`${i}점`}
                          className="p-1"
                          onMouseEnter={() => setHoverRating(i)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => setEditForm((s) => ({ ...s, rating: i }))}
                        >
                          <Star className={`h-6 w-6 ${filled ? 'text-warning fill-current stroke-current' : 'stroke-muted-foreground'}`} />
                        </button>
                      );
                    })}
                    <span className="ml-2 text-sm text-muted-foreground">{typeof editForm.rating === 'number' ? editForm.rating : 0}/5</span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="content">내용</Label>
                  <Textarea id="content" rows={6} value={editForm.content} onChange={(e) => setEditForm((s) => ({ ...s, content: e.target.value }))} placeholder="리뷰 내용을 입력하세요." />
                  <div className="mt-3">
                    <Label>사진 (선택, 최대 5장)</Label>
                    <PhotosUploader value={editForm.photos} onChange={(arr) => setEditForm((s) => ({ ...s, photos: arr }))} max={5} />
                    <PhotosReorderGrid value={editForm.photos} onChange={(arr) => setEditForm((s) => ({ ...s, photos: arr }))} />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <button type="button" className="px-4 py-2 rounded-md border text-sm" onClick={closeEdit}>
                  취소
                </button>
                <button type="button" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm" onClick={submitEdit}>
                  저장
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SiteContainer>
      {/* ===== 모바일 전용 하단 Sticky ===== */}
      {showSticky && (
        <div data-bottom-sticky="1" className="fixed inset-x-0 bottom-0 z-50 bp-md:hidden border-t border-border">
          <div className="bg-card dark:bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
            <SiteContainer variant="wide" className="py-3">
              {/* 상품 정보 섹션 */}
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                {/* 썸네일 */}
                <div className="relative w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0 border border-border">
                  <img src={images[0] || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover" />
                </div>

                {/* 제품명 & 가격 */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate leading-tight">{product.name}</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-foreground">{qtyTotal.toLocaleString()}원</span>
                    {typeof product?.mountingFee === 'number' && product.mountingFee > 0 && <span className="text-xs text-muted-foreground">+서비스 {product.mountingFee.toLocaleString()}원</span>}
                  </div>
                </div>

                {/* 수량 조절 */}
                <div className="flex items-center gap-0 rounded-lg border border-border bg-muted/50 dark:bg-muted/50">
                  <button
                    type="button"
                    className="h-9 w-9 flex items-center justify-center text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed active:bg-muted dark:active:bg-muted transition-colors"
                    aria-label="수량 감소"
                    disabled={!canDec}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="w-10 text-center">
                    <span className="text-sm font-semibold text-foreground tabular-nums">{quantity}</span>
                  </div>
                  <button
                    type="button"
                    className="h-9 w-9 flex items-center justify-center text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed active:bg-muted dark:active:bg-muted transition-colors"
                    aria-label="수량 증가"
                    disabled={!canInc}
                    onClick={() => {
                      if (!canInc) {
                        showErrorToast(`더 이상 담을 수 없습니다. 재고: ${stock}개`);
                        return;
                      }
                      setQuantity((q) => q + 1);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 액션 버튼 섹션 */}
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={loading || stock <= 0 || quantity > stock}
                  className="flex-1 h-12 rounded-lg bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:bg-muted dark:disabled:bg-muted disabled:hover:bg-muted text-primary-foreground disabled:text-muted-foreground font-semibold text-sm transition-colors shadow-sm disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  즉시 구매하기
                </button>
                <button
                  type="button"
                  onClick={handleBuyNowWithService}
                  className="flex-1 h-12 rounded-lg border border-border bg-card dark:bg-muted hover:bg-muted/50 dark:hover:bg-muted active:bg-muted dark:active:bg-muted text-foreground font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  교체 포함 결제
                </button>
              </div>
            </SiteContainer>
          </div>
        </div>
      )}
    </div>
  );
}
