"use client";

import CartOptionChangeOverlay from "@/app/cart/_components/CartOptionChangeOverlay";
import WishlistSidebar from "@/app/cart/_components/WishlistSidebar";
import { useAuthStore, type User } from "@/app/store/authStore";
import { useCartStore, type CartItem } from "@/app/store/cartStore";
import SiteContainer from "@/components/layout/SiteContainer";
import { EmptyState, PriceSummary, PublicSurface, type PriceSummaryRow } from "@/components/public";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyInfo } from "@/lib/auth.client";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { ENABLE_STRING_STANDALONE_ORDER } from "@/lib/orders/string-standalone-policy";
import { calcOrderShippingFeeWithBundlePolicy, normalizeItemShippingFee } from "@/lib/shipping-fee";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  ArrowRight,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  ShoppingBag,
  Star,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// 통화 포맷 유틸 (일관성)
const formatKRW = (n: number) => n.toLocaleString("ko-KR");

// 장바구니 아이템에 저장된 재고(가용 수량) 값을 안전하게 해석
const getMaxStock = (stock?: number) =>
  typeof stock === "number" && Number.isFinite(stock) ? stock : Number.POSITIVE_INFINITY;

const CART_CHECKOUT_SELECTION_KEY = "cart.checkout.selectedLineKeys.v1";

const getCartLineKey = (item: { id: string; selectedGauge?: string; selectedColor?: string }) =>
  `${item.id}::${item.selectedGauge ?? ""}::${item.selectedColor ?? ""}`;

type ProductVariantInventoryRow = {
  colorValue?: string | null;
  gaugeValue?: string | null;
  stock?: number | null;
  isSoldOut?: boolean | null;
};

type ProductForCartValidation = {
  _id?: string;
  variantInventories?: ProductVariantInventoryRow[];
};

export default function CartPageClient() {
  const { logout } = useAuthStore(); // 사용 여부와 관계없이 훅 순서 안정
  const { items: cartItems, addItem, removeItem, updateQuantity, clearCart } = useCartStore();

  // 인증
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 선택 상태
  const [selectedLineKeys, setSelectedLineKeys] = useState<string[]>([]);

  // 장착 대상 스트링 "이 스트링만 남기기" 확인 다이얼로그 상태
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupKeepLineKey, setCleanupKeepLineKey] = useState<string | null>(null);
  const [cleanupRemoveLineKeys, setCleanupRemoveLineKeys] = useState<string[]>([]);
  const [isCheckingCheckoutStock, setIsCheckingCheckoutStock] = useState(false);
  const [optionChangeItem, setOptionChangeItem] = useState<CartItem | null>(null);

  // [장착 대상 스트링 정리 다이얼로그] 남길/삭제될 대상 텍스트 생성
  const keepStringItem = cleanupKeepLineKey
    ? cartItems.find((i) => getCartLineKey(i) === cleanupKeepLineKey)
    : undefined;
  const keepStringLabel = keepStringItem
    ? `${keepStringItem.name} (수량 ${keepStringItem.quantity}개)`
    : "선택한 스트링";

  const removeStringItems = cartItems.filter((i) =>
    cleanupRemoveLineKeys.includes(getCartLineKey(i)),
  );
  const removeCount = removeStringItems.length;
  const removePreview =
    removeCount === 0
      ? ""
      : removeCount <= 2
        ? removeStringItems.map((i) => i.name).join(", ")
        : `${removeStringItems
            .slice(0, 2)
            .map((i) => i.name)
            .join(", ")} 외 ${removeCount - 2}개`;

  // "장착 대상 스트링" 판별을 위해 /api/products/mini-batch 결과의 mountingFee를 캐시
  const [mountingFeeByProductId, setMountingFeeByProductId] = useState<Record<string, number>>({});
  const [shippingFeeByProductId, setShippingFeeByProductId] = useState<Record<string, number>>({});
  const [mountableStringByProductId, setMountableStringByProductId] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    let cancelled = false;
    getMyInfo({ quiet: true })
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCartItems = useMemo(
    () => cartItems.filter((item) => selectedLineKeys.includes(getCartLineKey(item))),
    [cartItems, selectedLineKeys],
  );
  const selectedLineKeySet = useMemo(() => new Set(selectedLineKeys), [selectedLineKeys]);
  const hasSelectedItems = selectedCartItems.length > 0;

  const subtotal = useMemo(
    () => selectedCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedCartItems],
  );
  const regularSubtotal = useMemo(
    () =>
      selectedCartItems.reduce((sum, item) => {
        const regularPrice =
          typeof item.regularPrice === "number" &&
          Number.isFinite(item.regularPrice) &&
          item.regularPrice > item.price
            ? item.regularPrice
            : item.price;
        return sum + regularPrice * item.quantity;
      }, 0),
    [selectedCartItems],
  );
  const productDiscount = regularSubtotal - subtotal;

  const productIds = useMemo(
    () =>
      Array.from(
        new Set(
          cartItems.filter((it) => (it.kind ?? "product") === "product").map((it) => String(it.id)),
        ),
      ),
    [cartItems],
  );

  const shippingFeeIdsToResolve = useMemo(
    () => Array.from(new Set(cartItems.map((it) => String(it.id)))),
    [cartItems],
  );

  const productIdsKey = useMemo(() => [...productIds].sort().join("|"), [productIds]);

  const isShippingFeeReady = useMemo(() => {
    if (shippingFeeIdsToResolve.length === 0) return true;
    return shippingFeeIdsToResolve.every((id) =>
      Object.prototype.hasOwnProperty.call(shippingFeeByProductId, id),
    );
  }, [shippingFeeIdsToResolve, shippingFeeByProductId]);

  const isServiceMetaReady = useMemo(() => {
    if (productIds.length === 0) return true;
    return productIds.every(
      (id) =>
        Object.prototype.hasOwnProperty.call(mountingFeeByProductId, id) &&
        Object.prototype.hasOwnProperty.call(mountableStringByProductId, id),
    );
  }, [productIds, mountingFeeByProductId, mountableStringByProductId]);

  const isCartPriceReady = isShippingFeeReady && isServiceMetaReady;

  const shippingFee = useMemo(() => {
    if (!isShippingFeeReady) return 0;
    if (!hasSelectedItems) return 0;
    const hasRacket = selectedCartItems.some((it) => (it.kind ?? "product") === "racket");
    const hasMountableString = selectedCartItems.some(
      (it) =>
        (it.kind ?? "product") === "product" && mountableStringByProductId[String(it.id)] === true,
    );
    return calcOrderShippingFeeWithBundlePolicy({
      items: selectedCartItems.map((it) => ({
        kind: (it.kind ?? "product") as "product" | "racket",
        shippingFee: shippingFeeByProductId[String(it.id)],
        mountingFee: mountingFeeByProductId[String(it.id)] ?? 0,
        isMountableString: mountableStringByProductId[String(it.id)] === true,
      })),
      withStringService: hasRacket && hasMountableString,
    });
  }, [
    selectedCartItems,
    mountingFeeByProductId,
    mountableStringByProductId,
    shippingFeeByProductId,
    hasSelectedItems,
    isShippingFeeReady,
  ]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (shippingFeeIdsToResolve.length === 0) {
        if (!cancelled) {
          setMountingFeeByProductId({});
          setShippingFeeByProductId({});
          setMountableStringByProductId({});
        }
        return;
      }

      try {
        const [mountingResult, shippingPairsResult] = await Promise.all([
          (async () => {
            if (productIds.length === 0)
              return {
                fees: {} as Record<string, number>,
                mountable: {} as Record<string, boolean>,
              };
            const res = await fetch("/api/products/mini-batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              cache: "no-store",
              body: JSON.stringify({ ids: productIds }),
            });
            if (!res.ok) throw new Error("mini-batch request failed");
            const json = await res.json();
            const rows = Array.isArray(json?.items) ? json.items : [];
            const miniMap = new Map<string, { mountingFee: number; isMountableString: boolean }>(
              rows.map(
                (entry: { id?: string; mountingFee?: number; isMountableString?: boolean }) => [
                  String(entry?.id ?? ""),
                  {
                    mountingFee: Number(entry?.mountingFee ?? 0),
                    isMountableString: entry?.isMountableString === true,
                  },
                ],
              ),
            );
            const feePairs = productIds.map((id) => {
              const mf = Number(miniMap.get(id)?.mountingFee ?? 0);
              return [id, Number.isFinite(mf) && mf > 0 ? mf : 0] as const;
            });
            const mountablePairs = productIds.map(
              (id) => [id, miniMap.get(id)?.isMountableString === true] as const,
            );
            return {
              fees: Object.fromEntries(feePairs),
              mountable: Object.fromEntries(mountablePairs),
            };
          })(),
          Promise.all(
            shippingFeeIdsToResolve.map(async (id) => {
              try {
                const res = await fetch(`/api/products/${id}/mini`, {
                  cache: "no-store",
                });
                const json = await res.json();
                return [id, normalizeItemShippingFee(json?.shippingFee)] as const;
              } catch {
                return [id, 3000] as const;
              }
            }),
          ),
        ]);

        if (!cancelled) {
          setMountingFeeByProductId(mountingResult.fees);
          setMountableStringByProductId(mountingResult.mountable);
          setShippingFeeByProductId(Object.fromEntries(shippingPairsResult));
        }
      } catch {
        if (!cancelled) {
          setMountingFeeByProductId(Object.fromEntries(productIds.map((id) => [id, 0] as const)));
          setMountableStringByProductId(
            Object.fromEntries(productIds.map((id) => [id, false] as const)),
          );
          setShippingFeeByProductId(
            Object.fromEntries(shippingFeeIdsToResolve.map((id) => [id, 3000] as const)),
          );
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [productIdsKey, shippingFeeIdsToResolve]);

  // 교체/장착 서비스 신청(체크아웃 withService=1)에서는
  // 라켓(또는 중고라켓) 수량과 "장착 가능한 스트링" 수량이 반드시 일치해야함.
  // (서버에서도 검증하지만, 장바구니에서 먼저 막아주면 사용자가 덜 헷갈림.)
  const totalRacketQty = useMemo(
    () =>
      selectedCartItems
        .filter((it) => it.kind === "racket")
        .reduce((acc, it) => acc + Number(it.quantity ?? 0), 0),
    [selectedCartItems],
  );

  const totalMountableStringQty = useMemo(
    () =>
      selectedCartItems
        .filter(
          (it) =>
            (it.kind ?? "product") === "product" &&
            mountableStringByProductId[String(it.id)] === true,
        )
        .reduce((acc, it) => acc + Number(it.quantity ?? 0), 0),
    [selectedCartItems, mountableStringByProductId],
  );

  // "종류(라인) 개수" 체크: 서버 INVALID_COMPOSITION 규칙과 동일한 기준
  const racketLineCount = useMemo(
    () => selectedCartItems.filter((it) => (it.kind ?? "product") === "racket").length,
    [selectedCartItems],
  );

  const mountableStringLineCount = useMemo(
    () =>
      selectedCartItems.filter(
        (it) =>
          (it.kind ?? "product") === "product" &&
          mountableStringByProductId[String(it.id)] === true,
      ).length,
    [selectedCartItems, mountableStringByProductId],
  );

  // 장착 대상 스트링이 2종 이상이면, 어떤 라인을 정리해야 하는지 표시하기 위한 id 목록
  const mountableStringIds = useMemo(() => {
    return cartItems
      .filter(
        (it) =>
          (it.kind ?? "product") === "product" &&
          mountableStringByProductId[String(it.id)] === true,
      )
      .map((it) => String(it.id));
  }, [cartItems, mountableStringByProductId]);

  const blockServiceCheckoutByComposition =
    totalRacketQty > 0 && (racketLineCount !== 1 || mountableStringLineCount !== 1);

  const blockServiceCheckoutByQty =
    totalRacketQty > 0 && totalRacketQty !== totalMountableStringQty;

  const blockServiceCheckout = blockServiceCheckoutByComposition || blockServiceCheckoutByQty;

  // CTA/토스트 문구를 한 곳에서 관리 (서버 INVALID_COMPOSITION 기준과 동일)
  const serviceBlockToastMessage = blockServiceCheckoutByComposition
    ? "교체서비스 신청은 라켓 1종과 장착 스트링 1종 조합으로 진행돼요. 장바구니에서 구성을 정리한 뒤 다시 진행해주세요."
    : `라켓 1개당 장착 스트링 1개가 필요해요. 현재 라켓 ${totalRacketQty}개 / 장착 스트링 ${totalMountableStringQty}개입니다.`;

  // 번들(라켓 + 장착 가능 스트링)인 경우: 장바구니에서는 "수량 스테퍼"를 잠그고
  // 스트링 선택 화면에서만 수량/스트링을 함께 바꾸도록 UX를 고정한다.
  const bundleRacketItem = useMemo(
    () => cartItems.find((it) => (it.kind ?? "product") === "racket"),
    [cartItems],
  );

  const bundleStringItem = useMemo(
    () =>
      cartItems.find(
        (it) =>
          (it.kind ?? "product") === "product" &&
          mountableStringByProductId[String(it.id)] === true,
      ),
    [cartItems, mountableStringByProductId],
  );

  const bundleQty = useMemo(() => {
    const rq = Number(bundleRacketItem?.quantity ?? 0);
    const sq = Number(bundleStringItem?.quantity ?? 0);
    const max = Math.max(rq, sq);
    return Number.isFinite(max) && max > 0 ? max : 1;
  }, [bundleRacketItem?.quantity, bundleStringItem?.quantity]);

  const bundleEditHref = useMemo(() => {
    // 라켓/스트링 종류가 여러 개면(select-string 링크를 어떤 라켓 기준으로 만들지 불명확)
    // 서버에서도 INVALID_COMPOSITION으로 막고 있으므로, 장바구니에서도 번들 편집 링크를 비활성화한다.
    if (blockServiceCheckoutByComposition) return null;
    if (!bundleRacketItem || !bundleStringItem) return null;

    const params = new URLSearchParams({
      from: "cart",
      qty: String(bundleQty),
      stringId: String(bundleStringItem.id),
      returnTo: "/cart",
    });
    if (bundleStringItem.selectedGauge) {
      params.set("selectedGauge", bundleStringItem.selectedGauge);
    }
    if (bundleStringItem.selectedColor) {
      params.set("selectedColor", bundleStringItem.selectedColor);
    }

    return `/rackets/${bundleRacketItem.id}/select-string?${params.toString()}`;
  }, [bundleRacketItem, bundleStringItem, bundleQty, blockServiceCheckoutByComposition]);

  const isBundleLocked = Boolean(bundleEditHref);

  const handleOptionChangeApply = (
    item: CartItem,
    nextOption: Pick<
      CartItem,
      | "selectedGauge"
      | "selectedColor"
      | "selectedColorLabel"
      | "selectedColorHex"
      | "selectedColorImage"
      | "image"
      | "stock"
    >,
  ) => {
    const oldLineKey = getCartLineKey(item);
    const nextItem: CartItem = {
      ...item,
      ...nextOption,
      quantity: item.quantity,
    };
    const newLineKey = getCartLineKey(nextItem);
    const nextStock = getMaxStock(nextItem.stock);

    if (oldLineKey === newLineKey) {
      showSuccessToast("변경된 옵션이 없습니다.");
      setOptionChangeItem(null);
      return;
    }

    if (Number.isFinite(nextStock) && item.quantity > nextStock) {
      showErrorToast(`선택한 옵션의 재고가 부족합니다. 현재 재고: ${nextStock}개`);
      return;
    }

    const existingSameOption = cartItems.find(
      (candidate) => getCartLineKey(candidate) === newLineKey,
    );
    if (
      existingSameOption &&
      Number.isFinite(nextStock) &&
      existingSameOption.quantity + item.quantity > nextStock
    ) {
      showErrorToast("이미 담긴 동일 옵션 수량을 포함하면 재고를 초과합니다.");
      return;
    }

    const addResult = addItem(nextItem);
    if (!addResult.success) {
      showErrorToast(addResult.message ?? "선택한 옵션의 재고가 부족합니다.");
      return;
    }

    removeItem(item.id, item.selectedGauge, item.selectedColor);
    setSelectedLineKeys((prev) => {
      const wasSelected = prev.includes(oldLineKey);
      const withoutOld = prev.filter((lineKey) => lineKey !== oldLineKey);
      if (!wasSelected || withoutOld.includes(newLineKey)) return withoutOld;
      return [...withoutOld, newLineKey];
    });
    setOptionChangeItem(null);
    showSuccessToast("옵션을 변경했어요.");
  };

  const getRacketOptionChangeHref = (item: CartItem) => {
    if (bundleEditHref) return bundleEditHref;
    const params = new URLSearchParams({
      from: "cart",
      qty: String(item.quantity),
      returnTo: "/cart",
    });
    return `/rackets/${item.id}/select-string?${params.toString()}`;
  };

  const hasMountableStringOnlyFlow =
    !ENABLE_STRING_STANDALONE_ORDER &&
    hasSelectedItems &&
    selectedCartItems.every(
      (it) =>
        (it.kind ?? "product") === "product" && mountableStringByProductId[String(it.id)] === true,
    );

  // 체크아웃 진입 URL을 "번들 완성" 또는 "스트링-only 장착 대상"일 때 withService=1로
  // - isBundleLocked: 라켓 1종 + 장착 스트링 1종이 동시에 존재하고, 편집 링크까지 만들어질 정도로 번들이 성립한 상태
  // - blockServiceCheckout: 구성/수량 불일치면 장바구니에서 이미 막히는 상태
  const shouldEnterCheckoutWithService =
    hasSelectedItems && ((!blockServiceCheckout && isBundleLocked) || hasMountableStringOnlyFlow);
  const shouldIncludeServiceFee = shouldEnterCheckoutWithService;
  const serviceFee = useMemo(() => {
    if (!shouldIncludeServiceFee) return 0;

    return selectedCartItems.reduce((sum, item) => {
      if ((item.kind ?? "product") !== "product") return sum;
      if (mountableStringByProductId[String(item.id)] !== true) return sum;

      const fee = Number(mountingFeeByProductId[String(item.id)] ?? 0);
      if (!Number.isFinite(fee) || fee <= 0) return sum;

      return sum + fee * item.quantity;
    }, 0);
  }, [
    selectedCartItems,
    shouldIncludeServiceFee,
    mountingFeeByProductId,
    mountableStringByProductId,
  ]);
  const total = subtotal + serviceFee + shippingFee;

  const priceSummaryRows = useMemo<PriceSummaryRow[]>(() => {
    const rows: PriceSummaryRow[] = [];

    if (productDiscount > 0) {
      rows.push(
        {
          id: "regular-subtotal",
          label: "정가",
          value: `${formatKRW(regularSubtotal)}원`,
        },
        {
          id: "product-discount",
          label: "상품 할인",
          value: `-${formatKRW(productDiscount)}원`,
        },
      );
    }

    rows.push({
      id: "subtotal",
      label: "상품금액",
      value: `${formatKRW(subtotal)}원`,
    });

    if (serviceFee > 0) {
      rows.push({
        id: "service-fee",
        label: "교체서비스",
        value: `${formatKRW(serviceFee)}원`,
        description: "선택한 스트링 장착비",
      });
    }

    rows.push(
      {
        id: "shipping-fee",
        label: "배송비",
        value: !hasSelectedItems ? (
          "계산 전"
        ) : !isCartPriceReady ? (
          <Skeleton className="h-6 w-20 rounded-md" />
        ) : shippingFee > 0 ? (
          `${formatKRW(shippingFee)}원`
        ) : (
          <span className="text-primary">무료</span>
        ),
      },
      {
        id: "total",
        label: "결제예정금액",
        value: !isCartPriceReady ? (
          <Skeleton className="h-7 w-28 rounded-md" />
        ) : (
          <span className="text-primary">{formatKRW(total)}원</span>
        ),
        emphasis: true,
      },
    );

    return rows;
  }, [
    hasSelectedItems,
    isCartPriceReady,
    productDiscount,
    regularSubtotal,
    serviceFee,
    shippingFee,
    subtotal,
    total,
  ]);
  const stringStandalonePausedNoticeLines = [
    "스트링 단품 구매는 현재 운영하지 않습니다.",
    "선택한 스트링은 교체서비스 신청용으로 사용됩니다.",
  ];
  const checkoutBasePath = shouldEnterCheckoutWithService
    ? "/checkout?withService=1&source=cart-selection"
    : "/checkout?source=cart-selection";
  const checkoutHref = user
    ? checkoutBasePath
    : `/login?next=${encodeURIComponent(checkoutBasePath)}`;

  // 번들(라켓 + 장착 스트링) 구성품 id를 "원자적(묶음) 삭제" 단위로 묶는다.
  // - 번들이 완성된 상태(isBundleLocked=true)에서만 2개 id가 채워짐
  const bundleLockedIds = useMemo(() => {
    if (!isBundleLocked || !bundleRacketItem || !bundleStringItem) return [] as string[];
    return [bundleRacketItem.id, bundleStringItem.id];
  }, [isBundleLocked, bundleRacketItem?.id, bundleStringItem?.id]);

  // 선택/일괄
  const toggleSelect = (lineKey: string) => {
    const item = cartItems.find((it) => getCartLineKey(it) === lineKey);
    const bundleLineKeys =
      bundleLockedIds.length === 2 && item && bundleLockedIds.includes(item.id)
        ? cartItems.filter((it) => bundleLockedIds.includes(it.id)).map((it) => getCartLineKey(it))
        : [lineKey];

    setSelectedLineKeys((prev) => {
      const next = new Set(prev);
      const shouldSelect = bundleLineKeys.some((key) => !next.has(key));
      bundleLineKeys.forEach((key) => {
        if (shouldSelect) next.add(key);
        else next.delete(key);
      });
      return Array.from(next);
    });
  };
  const toggleAll = () => {
    if (selectedLineKeys.length === cartItems.length) setSelectedLineKeys([]);
    else setSelectedLineKeys(cartItems.map((i) => getCartLineKey(i)));
  };
  const removeSelected = () => {
    if (selectedLineKeys.length === 0) return;

    // 선택 삭제 우회 방지:
    // 번들 구성품(라켓/장착 스트링) 중 하나라도 선택되면,
    // 불일치가 생기지 않도록 번들 2개를 "같이" 삭제한다.
    const lineKeysToRemove = new Set(selectedLineKeys);

    if (
      bundleLockedIds.length === 2 &&
      cartItems.some(
        (it) => lineKeysToRemove.has(getCartLineKey(it)) && bundleLockedIds.includes(it.id),
      )
    ) {
      cartItems.forEach((it) => {
        if (bundleLockedIds.includes(it.id)) lineKeysToRemove.add(getCartLineKey(it));
      });
    }

    const finalItems = cartItems.filter((it) => lineKeysToRemove.has(getCartLineKey(it)));
    const bundleHint =
      bundleLockedIds.length === 2 && finalItems.some((it) => bundleLockedIds.includes(it.id))
        ? "\n(번들 구성품은 함께 삭제됩니다.)"
        : "";

    if (!confirm(`선택한 ${finalItems.length}개 상품을 장바구니에서 삭제할까요?${bundleHint}`))
      return;

    finalItems.forEach((it) => removeItem(it.id, it.selectedGauge, it.selectedColor));
    setSelectedLineKeys([]);
    showSuccessToast?.("선택한 상품을 삭제했어요.");
  };

  // "장착 대상 스트링"이 2종 이상 섞였을 때,
  // 사용자가 남길 스트링 1종을 직접 선택해서 나머지를 빠르게 정리하는 유틸(선제 차단 UX 강화)
  const keepOnlyThisMountableString = (keepLineKey: string) => {
    const lineKeysToRemove = cartItems
      .filter(
        (it) =>
          (it.kind ?? "product") === "product" &&
          mountableStringByProductId[String(it.id)] === true &&
          getCartLineKey(it) !== keepLineKey,
      )
      .map((it) => getCartLineKey(it));
    if (lineKeysToRemove.length === 0) return;

    // confirm() 대신 AlertDialog로 확인 UX 통일
    setCleanupKeepLineKey(keepLineKey);
    setCleanupRemoveLineKeys(lineKeysToRemove);
    setCleanupDialogOpen(true);
  };

  const confirmCleanupMountableStrings = () => {
    if (cleanupRemoveLineKeys.length === 0) {
      setCleanupDialogOpen(false);
      setCleanupKeepLineKey(null);
      setCleanupRemoveLineKeys([]);
      return;
    }

    // 나머지 장착 스트링 삭제
    const cleanupTargets = cartItems.filter((it) =>
      cleanupRemoveLineKeys.includes(getCartLineKey(it)),
    );
    cleanupTargets.forEach((it) => removeItem(it.id, it.selectedGauge, it.selectedColor));

    // 선택 상태에서도 제거(선택삭제/전체선택 UX 꼬임 방지)
    setSelectedLineKeys((prev) =>
      prev.filter((lineKey) => !cleanupRemoveLineKeys.includes(lineKey)),
    );

    showSuccessToast?.("교체서비스에 사용할 스트링을 1종으로 정리했어요.");

    // 상태 정리 + 닫기
    setCleanupDialogOpen(false);
    setCleanupKeepLineKey(null);
    setCleanupRemoveLineKeys([]);
  };

  const validateLatestStockBeforeCheckout = async () => {
    const cartProductItems = selectedCartItems.filter(
      (item) => (item.kind ?? "product") === "product",
    );
    if (cartProductItems.length === 0) return true;

    setIsCheckingCheckoutStock(true);
    try {
      const results = await Promise.all(
        cartProductItems.map(async (item) => {
          const response = await fetch(`/api/products/${item.id}`, {
            cache: "no-store",
          });
          if (!response.ok) return { item, product: null as ProductForCartValidation | null };
          const json = await response.json();
          return {
            item,
            product: (json?.product ?? null) as ProductForCartValidation | null,
          };
        }),
      );

      for (const { item, product } of results) {
        if (!product) {
          showErrorToast("일부 상품의 최신 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요.");
          return false;
        }

        const variants = Array.isArray(product.variantInventories)
          ? product.variantInventories
          : [];
        if (variants.length > 0) {
          if (!item.selectedColor || !item.selectedGauge) {
            showErrorToast(
              "옵션 정보를 확인할 수 없습니다. 색상과 게이지(굵기)를 다시 선택해주세요.",
            );
            return false;
          }
          const selectedVariant = variants.find(
            (variant) =>
              (variant.colorValue ?? "") === item.selectedColor &&
              (variant.gaugeValue ?? "") === item.selectedGauge,
          );
          if (!selectedVariant) {
            showErrorToast(
              "선택한 색상과 게이지(굵기) 조합의 재고 정보를 찾지 못했어요. 옵션을 다시 확인해주세요.",
            );
            return false;
          }
          if (
            selectedVariant.isSoldOut === true ||
            Number(selectedVariant.stock ?? 0) < item.quantity
          ) {
            showErrorToast(
              "선택한 색상과 게이지(굵기) 조합의 재고가 부족합니다. 수량을 다시 확인해주세요.",
            );
            return false;
          }
          continue;
        }

        const maxStock = getMaxStock(item.stock);
        if (Number.isFinite(maxStock) && item.quantity > maxStock) {
          showErrorToast("일부 상품의 재고가 변경되었습니다. 수량을 다시 확인해주세요.");
          return false;
        }
      }

      return true;
    } catch {
      showErrorToast("재고 확인 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
      return false;
    } finally {
      setIsCheckingCheckoutStock(false);
    }
  };

  const handleCheckoutClick = async () => {
    if (!hasSelectedItems) {
      showErrorToast("주문할 상품을 선택해주세요.");
      return;
    }
    if (!isCartPriceReady) {
      showErrorToast("금액을 계산 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    if (blockServiceCheckout) {
      showErrorToast(serviceBlockToastMessage);
      return;
    }

    const checkoutLineKeys = selectedCartItems.map((item) => getCartLineKey(item));
    sessionStorage.setItem(CART_CHECKOUT_SELECTION_KEY, JSON.stringify(checkoutLineKeys));

    if (!user) {
      window.location.href = checkoutHref;
      return;
    }

    const isValid = await validateLatestStockBeforeCheckout();
    if (isValid) {
      window.location.href = checkoutHref;
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* 교체서비스 스트링 정리 확인 다이얼로그 */}
      <AlertDialog
        open={cleanupDialogOpen}
        onOpenChange={(open) => {
          setCleanupDialogOpen(open);
          if (!open) {
            setCleanupKeepLineKey(null);
            setCleanupRemoveLineKeys([]);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ui-card-title-lg font-semibold">
              교체서비스 스트링 정리
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-ui-body-sm text-muted-foreground">
                <p>
                  교체서비스에 사용할 스트링은 <span className="font-medium">1종만</span> 선택할 수
                  있어요.
                </p>
                <p>
                  남길 스트링(선택):{" "}
                  <span className="font-medium text-foreground">{keepStringLabel}</span>
                </p>
                <p>
                  삭제될 스트링(정리 대상):{" "}
                  <span className="font-medium text-foreground">{removeCount}개</span>
                  {removePreview ? (
                    <span className="text-muted-foreground"> ({removePreview})</span>
                  ) : null}
                </p>
                <p className="text-muted-foreground">
                  “정리하기”를 누르면 <b>선택한 스트링 1종만 유지</b>되고, 나머지 스트링은
                  장바구니에서 삭제됩니다. (취소 시 변경 없음)
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCleanupMountableStrings}>정리하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* 헤더 */}
      <div className="border-b border-border bg-muted/25 text-foreground">
        <SiteContainer className="max-w-[1240px] py-5 bp-sm:py-6">
          <div className="flex flex-col gap-4 bp-md:flex-row bp-md:items-end bp-md:justify-between">
            <div className="min-w-0">
              <p className="mb-2 text-ui-label font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                CART
              </p>
              <h1 className="mb-2 text-ui-page-title font-semibold bp-sm:text-ui-page-title-lg">
                장바구니
              </h1>
              <p className="max-w-2xl break-keep text-ui-body-sm leading-relaxed text-muted-foreground bp-sm:text-ui-body">
                담은 상품과 옵션, 수량을 확인한 뒤 주문을 진행하세요. 선택한 상품만 주문 단계로 이동합니다.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-ui-label text-muted-foreground shadow-soft">
              <span>담긴 상품 {cartItems.length}개</span>
              <span aria-hidden="true" className="text-border">/</span>
              <span>선택 {selectedCartItems.length}개</span>
            </div>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer
        className={
          cartItems.length > 0
            ? "max-w-[1240px] pb-[calc(96px+env(safe-area-inset-bottom))] pt-4 bp-sm:pt-5 bp-lg:pb-12"
            : "max-w-[1240px] pt-6 pb-12 bp-sm:pt-8 bp-sm:pb-16 bp-md:py-8"
        }
      >
        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 bp-lg:grid-cols-[minmax(0,1fr)_360px] bp-xl:grid-cols-[minmax(0,1fr)_380px] bp-xl:gap-6">
            {/* 목록 */}
            <div className="min-w-0 space-y-5">
              <PublicSurface variant="feature" padding="none" className="overflow-hidden">
                <CardHeader variant="section" className="rounded-t-2xl px-4 py-4 bp-sm:px-5">
                  <CardTitle className="text-ui-card-title-lg bp-sm:text-ui-section-title">
                    장바구니 상품
                  </CardTitle>
                </CardHeader>

                <div className="flex h-12 items-center justify-between border-b border-border px-4 bp-sm:px-5">
                  <div className="inline-flex items-center gap-2">
                    <Checkbox
                      checked={selectedLineKeys.length === cartItems.length}
                      onCheckedChange={toggleAll}
                      aria-label={
                        selectedLineKeys.length === cartItems.length ? "전체 해제" : "전체 선택"
                      }
                    />
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-ui-body-sm font-semibold text-foreground"
                    >
                      {selectedLineKeys.length === cartItems.length ? "전체 해제" : "전체 선택"}
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeSelected}
                    disabled={!hasSelectedItems}
                    className="h-9 px-2 text-ui-body-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 dark:hover:bg-destructive/10"
                  >
                    선택 삭제
                  </Button>
                </div>

                <CardContent className="p-0">
                  {cartItems.map((item) => {
                    const lineKey = getCartLineKey(item);
                    // 버튼 비활성 판단
                    const isRacket = (item.kind ?? "product") === "racket";
                    // 라켓은 /rackets/[id], 일반 상품은 /products/[id]
                    const itemHref = isRacket ? `/rackets/${item.id}` : `/products/${item.id}`;
                    const canDec = item.quantity > 1;
                    const maxStock = getMaxStock(item.stock);
                    const canInc = item.quantity < maxStock;
                    const isLowStock = Number.isFinite(maxStock) && maxStock <= 3;
                    const isStockLimitReached =
                      Number.isFinite(maxStock) && item.quantity >= maxStock;
                    const shouldEmphasizeStock = isLowStock || isStockLimitReached;
                    const hasDiscount =
                      typeof item.regularPrice === "number" &&
                      Number.isFinite(item.regularPrice) &&
                      item.regularPrice > item.price;
                    const itemMountingFee = Number(mountingFeeByProductId[String(item.id)] ?? 0);
                    const isMountableStringLine =
                      (item.kind ?? "product") === "product" &&
                      mountableStringByProductId[String(item.id)] === true;
                    const shouldShowItemServiceFee =
                      shouldIncludeServiceFee &&
                      isMountableStringLine &&
                      Number.isFinite(itemMountingFee) &&
                      itemMountingFee > 0;
                    const itemProductTotal = item.price * item.quantity;
                    const itemServiceFeeTotal = shouldShowItemServiceFee
                      ? itemMountingFee * item.quantity
                      : 0;
                    const itemLineTotal = itemProductTotal + itemServiceFeeTotal;

                    const isBundleRacket =
                      isBundleLocked &&
                      !!bundleRacketItem &&
                      item.id === bundleRacketItem.id &&
                      (item.kind ?? "product") === "racket";

                    const isBundleString =
                      isBundleLocked &&
                      !!bundleStringItem &&
                      item.id === bundleStringItem.id &&
                      (item.kind ?? "product") === "product" &&
                      mountableStringByProductId[String(item.id)] === true;

                    const lockStepper = isBundleRacket || isBundleString;
                    const canOpenOptionOverlay =
                      (item.kind ?? "product") === "product" &&
                      !lockStepper &&
                      (isMountableStringLine ||
                        Boolean(
                          item.selectedGauge || item.selectedColor || item.selectedColorLabel,
                        ));
                    const optionChangeHref =
                      (item.kind ?? "product") === "racket" || lockStepper
                        ? getRacketOptionChangeHref(item)
                        : null;

                    //- "구성 정리 필요" 상태에서 어떤 라인을 정리해야 하는지(장착 대상 스트링)를 시각적으로 강조
                    // - 장착 대상 스트링: isMountableString=true 인 스트링 상품
                    const isMountableString = isMountableStringLine;

                    // - 구성 정리 필요 상태: 라켓이 있고 + (라켓 1종 / 장착 스트링 1종 규칙 위반) + 특히 장착 스트링이 2종 이상인 경우
                    const needsCompositionCleanup =
                      blockServiceCheckoutByComposition &&
                      totalRacketQty > 0 &&
                      mountableStringLineCount > 1;

                    // - 정리 대상 하이라이트: 구성 정리 상태에서 "장착 대상 스트링" 라인들을 강조 표시
                    const highlightCleanupTarget = needsCompositionCleanup && isMountableString;

                    return (
                      <div
                        key={`${item.id}:${item.selectedGauge ?? ""}:${item.selectedColor ?? ""}`}
                        className={`border-b border-border px-4 py-4 transition last:border-b-0 bp-sm:px-5 ${highlightCleanupTarget ? "bg-warning/10 ring-1 ring-warning/30" : ""}`}
                      >
                        <div className="space-y-3">
                          {/* 상품 기본 정보: 체크박스, 이미지, 상품명/가격/옵션 요약 */}
                          <div className="grid min-w-0 grid-cols-[32px_minmax(72px,88px)_minmax(0,1fr)] items-start gap-3 bp-md:grid-cols-[32px_96px_minmax(0,1fr)]">
                            <Checkbox
                              checked={selectedLineKeySet.has(lineKey)}
                              onCheckedChange={() => toggleSelect(lineKey)}
                              aria-label={`${item.name} 선택`}
                            />
                            <Link href={itemHref} className="shrink-0">
                              <Image
                                src={item.image || "/placeholder.svg?height=72&width=72"}
                                alt={item.name}
                                width={88}
                                height={88}
                                loading="lazy"
                                className="h-[88px] w-[88px] rounded-control border border-border object-cover bp-md:h-24 bp-md:w-24"
                              />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link
                                href={itemHref}
                                className="block min-w-0 line-clamp-2 break-keep break-words font-medium leading-relaxed text-foreground transition-colors hover:text-primary dark:text-foreground dark:hover:text-primary"
                              >
                                {item.name}
                              </Link>
                              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-ui-body-sm">
                                <span className="text-muted-foreground">
                                  {hasDiscount ? "할인가" : "판매가"}
                                </span>
                                <span className="whitespace-nowrap tabular-nums font-semibold text-foreground">
                                  {formatKRW(item.price)}원
                                </span>
                              </div>
                              {shouldShowItemServiceFee && (
                                <div className="mt-1 text-ui-label text-muted-foreground">
                                  교체서비스{" "}
                                  <span className="font-medium text-foreground">
                                    {formatKRW(itemMountingFee)}원
                                  </span>{" "}
                                  / 개
                                </div>
                              )}
                              {hasDiscount && (
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-label tabular-nums">
                                  <span className="text-muted-foreground">
                                    정가{" "}
                                    <span className="line-through">
                                      {formatKRW(item.regularPrice!)}원
                                    </span>
                                  </span>
                                  <Badge variant="destructive" className="text-ui-micro">
                                    {item.discountRate ??
                                      Math.round(
                                        ((item.regularPrice! - item.price) / item.regularPrice!) *
                                          100,
                                      )}
                                    % OFF
                                  </Badge>
                                </div>
                              )}
                              {highlightCleanupTarget && (
                                <>
                                  <Badge
                                    variant="warning"
                                    wrap="normal"
                                    className="mt-1 max-w-full px-2 py-0.5 text-ui-label font-medium"
                                  >
                                    교체서비스에 사용할 스트링
                                  </Badge>
                                  <div className="mt-2 space-y-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-ui-label leading-snug text-foreground dark:text-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                                      교체서비스에 사용할 스트링은 <b>1종만</b> 선택할 수 있어요.
                                    </span>
                                    <button
                                      type="button"
                                      className="inline-flex font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        keepOnlyThisMountableString(lineKey);
                                      }}
                                    >
                                      이 스트링만 남기기
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 옵션/수량 박스: 카드 전체 폭으로 분리 */}
                          <div className="mt-3 min-w-0 rounded-panel border border-border bg-muted/25 p-3">
                            <div className="grid min-w-0 gap-3 bp-md:grid-cols-[minmax(0,1fr)_auto]">
                              <p className="flex min-w-0 flex-wrap items-center gap-1.5 pr-2 text-ui-label leading-relaxed text-muted-foreground">
                                <span className="font-medium text-foreground">옵션:</span>
                                {item.selectedGauge ? (
                                  <span className="whitespace-nowrap">
                                    게이지(굵기) {formatGaugeLabel(item.selectedGauge)}
                                  </span>
                                ) : null}
                                {item.selectedColorLabel || item.selectedColor ? (
                                  <span className="inline-flex max-w-full items-center gap-1 whitespace-nowrap">
                                    <span className="text-border">·</span>
                                    <span>색상</span>
                                    {item.selectedColorHex && (
                                      <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/60"
                                        style={{
                                          backgroundColor: item.selectedColorHex,
                                        }}
                                      />
                                    )}
                                    <span className="min-w-0 truncate">
                                      {item.selectedColorLabel || item.selectedColor}
                                    </span>
                                  </span>
                                ) : null}
                                {!item.selectedGauge &&
                                  !item.selectedColorLabel &&
                                  !item.selectedColor && <span>기본 옵션</span>}
                              </p>

                              <div className="-mr-1 -mt-1 flex shrink-0 items-center gap-1">
                                {(canOpenOptionOverlay || optionChangeHref) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 whitespace-nowrap px-2.5 text-ui-label"
                                    onClick={() => {
                                      if (optionChangeHref) {
                                        window.location.href = optionChangeHref;
                                        return;
                                      }
                                      setOptionChangeItem(item);
                                    }}
                                  >
                                    {(item.kind ?? "product") === "racket"
                                      ? "스트링 변경"
                                      : "옵션 변경"}
                                  </Button>
                                )}

                                {/* 삭제 버튼 (컨펌) */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={
                                    lockStepper ? `번들(라켓+스트링) 삭제` : `${item.name} 삭제`
                                  }
                                  title={
                                    lockStepper
                                      ? "라켓과 장착 스트링이 함께 담긴 구성이라 둘 중 하나만 삭제할 수 없어요."
                                      : undefined
                                  }
                                  onClick={() => {
                                    // 번들(라켓/장착 스트링) 라인에서 삭제를 누르면
                                    // "불일치"가 생기지 않도록 번들 2개를 같이 삭제한다.
                                    if (lockStepper && bundleLockedIds.length === 2) {
                                      if (
                                        confirm(
                                          "번들(라켓 + 장착 스트링)을 통째로 장바구니에서 삭제할까요?",
                                        )
                                      ) {
                                        cartItems
                                          .filter((it) => bundleLockedIds.includes(it.id))
                                          .forEach((it) =>
                                            removeItem(it.id, it.selectedGauge, it.selectedColor),
                                          );
                                        setSelectedLineKeys((prev) =>
                                          prev.filter((selectedLineKey) => {
                                            const selectedItem = cartItems.find(
                                              (it) => getCartLineKey(it) === selectedLineKey,
                                            );
                                            return selectedItem
                                              ? !bundleLockedIds.includes(selectedItem.id)
                                              : true;
                                          }),
                                        );
                                      }
                                      return;
                                    }

                                    // 일반 상품은 기존처럼 개별 삭제
                                    if (confirm(`"${item.name}"을(를) 장바구니에서 삭제할까요?`)) {
                                      removeItem(item.id, item.selectedGauge, item.selectedColor);
                                    }
                                  }}
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="mt-3 grid min-w-0 gap-3 bp-sm:grid-cols-[minmax(0,1fr)_auto] bp-sm:items-end">
                              {/* 수량 스테퍼 (번들이면 잠금 + 링크로만 변경) */}
                              <div className="min-w-0 text-left">
                                {lockStepper ? (
                                  <>
                                    {/* 숫자만 표시(± 없음) */}
                                    <div className="inline-flex items-center gap-2">
                                      <div className="inline-flex h-8 items-center rounded-full bg-muted px-3 dark:bg-muted">
                                        <span className="w-8 select-none text-center font-medium tabular-nums">
                                          {item.quantity}
                                        </span>
                                      </div>

                                      {Number.isFinite(maxStock) && (
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-ui-micro font-medium leading-none ${shouldEmphasizeStock ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
                                        >
                                          재고 {maxStock}개
                                        </span>
                                      )}
                                    </div>

                                    <p className="mt-1 max-w-[220px] text-ui-micro leading-snug text-muted-foreground">
                                      옵션 panel 우상단에서 수량과 스트링을 함께 변경할 수 있어요.
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <div className="inline-flex items-center gap-2">
                                      <div className="inline-flex items-center rounded-full bg-muted px-1 dark:bg-muted">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 disabled:opacity-40"
                                          aria-label={`${item.name} 수량 감소`}
                                          disabled={lockStepper ? true : !canDec}
                                          onClick={() =>
                                            updateQuantity(
                                              item.id,
                                              item.quantity - 1,
                                              item.selectedGauge,
                                              item.selectedColor,
                                            )
                                          }
                                          title={
                                            lockStepper
                                              ? "번들 품목은 스트링 선택 화면에서만 수량을 변경할 수 있어요."
                                              : undefined
                                          }
                                        >
                                          <Minus className="h-4 w-4" />
                                        </Button>

                                        <span
                                          className={`w-8 select-none text-center font-medium tabular-nums ${lockStepper ? "opacity-60" : ""}`}
                                        >
                                          {item.quantity}
                                        </span>

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 disabled:opacity-40"
                                          aria-label={`${item.name} 수량 증가`}
                                          disabled={lockStepper ? true : !canInc}
                                          title={
                                            lockStepper
                                              ? "번들 품목은 스트링 선택 화면에서만 수량을 변경할 수 있어요."
                                              : undefined
                                          }
                                          onClick={() => {
                                            if (!canInc) {
                                              showErrorToast(
                                                <>
                                                  <p>
                                                    <strong>{item.name}</strong>의 최대 주문 수량은{" "}
                                                    {maxStock}
                                                    개입니다.
                                                  </p>
                                                  <p>더 이상 수량을 늘릴 수 없습니다.</p>
                                                </>,
                                              );
                                              return;
                                            }
                                            updateQuantity(
                                              item.id,
                                              item.quantity + 1,
                                              item.selectedGauge,
                                              item.selectedColor,
                                            );
                                          }}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>

                                      {Number.isFinite(maxStock) && (
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-ui-micro font-medium leading-none ${shouldEmphasizeStock ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
                                        >
                                          재고 {maxStock}개
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="whitespace-nowrap text-left bp-sm:text-right">
                                <div className="text-ui-label text-muted-foreground">합계</div>
                                <div className="whitespace-nowrap tabular-nums text-ui-card-title-lg font-semibold text-foreground">
                                  {formatKRW(itemLineTotal)}원
                                </div>
                                {itemServiceFeeTotal > 0 && (
                                  <div className="mt-0.5 text-ui-micro text-muted-foreground">
                                    교체 +{formatKRW(itemServiceFeeTotal)}원 포함
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>

                <CardFooter className="border-t border-border bg-background px-4 py-3 bp-sm:px-5">
                  <div className="flex w-full items-center justify-end gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-ui-body-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm("장바구니의 모든 상품을 비울까요?")) clearCart();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      장바구니 비우기
                    </Button>
                  </div>
                </CardFooter>
              </PublicSurface>

              <div className="hidden bp-lg:block">
                <WishlistSidebar variant="inline" />
              </div>
            </div>

            {/* 요약 */}
            <div className="min-w-0">
              <div className="bp-lg:sticky bp-lg:top-[calc(var(--header-h)+16px)]">
                <Card className="overflow-hidden rounded-panel border border-border bg-card shadow-soft">
                  <CardHeader className="space-y-1 px-4 py-4 bp-sm:px-5">
                    <CardTitle className="text-ui-card-title-lg">주문 요약</CardTitle>
                    <p className="text-ui-body-sm text-muted-foreground">선택 상품 기준</p>
                  </CardHeader>
                  <CardContent className="space-y-4 px-4 pb-4 bp-sm:px-5">
                    <div className="space-y-3">
                      <PriceSummary rows={priceSummaryRows} />

                      <div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2">
                        <div className="mb-1 flex items-center gap-1.5 text-ui-label text-primary">
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="font-semibold">배송비/교체서비스</span>
                        </div>
                        <p className="text-ui-label leading-relaxed text-muted-foreground">
                          상품별 배송비와 선택한 스트링의 교체서비스 비용이 주문 요약에 반영됩니다.
                          <span className="mt-1 block">
                            무료배송 상품은 배송비가 0원으로 표시됩니다.
                          </span>
                        </p>
                      </div>
                      {!hasSelectedItems && (
                        <p className="text-ui-label text-muted-foreground">
                          상품 선택 후 배송비가 계산됩니다.
                        </p>
                      )}
                    </div>
                    <div className="hidden flex-col items-stretch gap-3 rounded-panel border border-surface-inverse-foreground/15 bg-surface-inverse p-4 text-surface-inverse-foreground shadow-soft bp-lg:flex">
                      <div className="space-y-1 rounded-lg border border-surface-inverse-foreground/15 bg-surface-inverse-foreground/5 px-3 py-2">
                        <p className="text-ui-label text-surface-inverse-muted">결제예정금액</p>
                        <p className="text-ui-card-title-lg font-semibold tabular-nums text-surface-inverse-foreground">
                          {!isCartPriceReady ? "계산 중" : `${formatKRW(total)}원`}
                        </p>
                      </div>
                      {blockServiceCheckout ? (
                        <>
                          {blockServiceCheckoutByComposition && (
                            <div className="w-full space-y-1 rounded-lg border border-surface-inverse-foreground/15 bg-surface-inverse-foreground/5 px-3 py-2 text-ui-label leading-relaxed text-surface-inverse-muted">
                              <p className="font-semibold">교체서비스 구성을 정리해야 해요</p>
                              <p>라켓 1종에는 장착할 스트링 1종이 필요해요.</p>
                              <p>
                                현재 라켓 <span className="font-semibold">{racketLineCount}종</span>{" "}
                                / 장착 스트링{" "}
                                <span className="font-semibold">{mountableStringLineCount}종</span>
                              </p>
                              {mountableStringLineCount > 1 && (
                                <p>해야 할 일: 장착할 스트링 1종만 남겨주세요.</p>
                              )}
                              {mountableStringLineCount === 0 && (
                                <p>라켓에 장착할 스트링을 먼저 선택해주세요.</p>
                              )}
                              {racketLineCount !== 1 && (
                                <p>
                                  교체서비스 신청은 한{"\u00A0"}번에 라켓 1종 기준으로 진행됩니다.
                                </p>
                              )}
                            </div>
                          )}
                          {blockServiceCheckoutByQty && (
                            <div className="w-full rounded-lg border border-surface-inverse-foreground/15 bg-surface-inverse-foreground/5 px-3 py-2 text-ui-label leading-relaxed text-surface-inverse-muted">
                              라켓 1개에는 장착할 스트링 1개가 필요해요.
                              <br />
                              현재 라켓 <span className="font-semibold">{totalRacketQty}개</span> /
                              장착 스트링{" "}
                              <span className="font-semibold">{totalMountableStringQty}개</span>
                              입니다.
                              <span className="mt-1 inline-flex items-center gap-1.5">
                                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                                {bundleEditHref
                                  ? "아래 ‘번들 변경’에서 수량을 함께 맞춰주세요."
                                  : "먼저 교체서비스 신청 구성을 정리한 뒤 수량을 다시 확인해주세요."}
                              </span>
                            </div>
                          )}
                          {bundleEditHref ? (
                            <Button
                              asChild
                              variant="highlight"
                              className="flex h-12 w-full items-center justify-center gap-2 px-3 font-semibold"
                            >
                              <Link href={bundleEditHref}>
                                <ShoppingBag className="h-5 w-5" />
                                번들 변경
                                <ArrowRight className="h-5 w-5" />
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              variant="highlight"
                              className="flex h-12 w-full items-center justify-center gap-2 px-3 font-semibold"
                              size="lg"
                              onClick={() => showErrorToast(serviceBlockToastMessage)}
                            >
                              <ShoppingBag className="h-5 w-5" />
                              {blockServiceCheckoutByComposition
                                ? "구성 정리 후 결제하기"
                                : "수량 맞춘 뒤 주문하기"}
                              <ArrowRight className="h-5 w-5" />
                            </Button>
                          )}
                        </>
                      ) : loading ? (
                        <Button variant="inverse" className="h-12 w-full font-semibold opacity-70" disabled>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          로그인 확인 중...
                        </Button>
                      ) : !isCartPriceReady ? (
                        <Button variant="inverse" className="h-12 w-full font-semibold opacity-70" disabled>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          금액 계산 중...
                        </Button>
                      ) : (
                        <>
                          {hasMountableStringOnlyFlow && (
                            <div className="space-y-1 rounded-lg border border-surface-inverse-foreground/15 bg-surface-inverse-foreground/5 px-3 py-2 text-ui-label leading-relaxed text-surface-inverse-muted break-keep">
                              {stringStandalonePausedNoticeLines.map((line) => (
                                <p key={line}>{line}</p>
                              ))}
                            </div>
                          )}
                          <p className="text-ui-label text-surface-inverse-muted">
                            최신 재고와 배송비는 주문 단계에서 다시 확인됩니다.
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            <Button
                              variant="highlight"
                              className="h-12 w-full px-2 font-semibold"
                              disabled={
                                !hasSelectedItems || !isCartPriceReady || isCheckingCheckoutStock
                              }
                              onClick={handleCheckoutClick}
                            >
                              {isCheckingCheckoutStock ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShoppingBag className="h-4 w-4" />
                              )}
                              <span className="truncate">
                                {isCheckingCheckoutStock
                                  ? "재고 확인 중"
                                  : !hasSelectedItems
                                    ? "상품 선택"
                                    : user
                                      ? `주문하기 ${selectedCartItems.length}`
                                      : "로그인 주문"}
                              </span>
                            </Button>
                            <Button
                              variant="inverse"
                              className="h-12 w-full px-2 font-semibold"
                              asChild
                            >
                              <Link href="/products">쇼핑 계속하기</Link>
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="space-y-2 border-t border-border pt-4 bp-lg:hidden">
                      {blockServiceCheckoutByComposition && (
                        <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-ui-label leading-relaxed text-muted-foreground">
                          교체서비스 신청은 라켓 1종과 장착 스트링 1종 기준으로 진행됩니다. 구성을
                          정리한 뒤 주문해주세요.
                        </p>
                      )}
                      {blockServiceCheckoutByQty && (
                        <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-ui-label leading-relaxed text-muted-foreground">
                          라켓 1개에는 장착 스트링 1개가 필요해요. 수량을 맞춘 뒤 주문해주세요.
                        </p>
                      )}
                      {hasMountableStringOnlyFlow && (
                        <div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-ui-label leading-relaxed text-foreground break-keep">
                          {stringStandalonePausedNoticeLines.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      )}
                      <p className="text-ui-label text-muted-foreground">
                        최신 재고와 배송비는 주문 단계에서 다시 확인됩니다.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <div className="mt-4 bp-lg:hidden">
                  <WishlistSidebar variant="inline" className="mt-0 shadow-none" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <EmptyState
              className="rounded-2xl bg-card py-12 shadow-sm"
              icon={
                <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-border bg-muted text-foreground shadow-sm bp-sm:h-24 bp-sm:w-24">
                  <PackageOpen className="h-10 w-10 bp-sm:h-12 bp-sm:w-12" />
                </span>
              }
              title="장바구니가 비어있습니다"
              description="담아둔 상품이 없어요. 상품을 둘러보거나 라켓 교체서비스 흐름을 확인해보세요."
              action={
                <div className="flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row">
                  <Button
                    className="w-full px-6 py-3 font-semibold bp-sm:w-auto md:px-8"
                    size="lg"
                    asChild
                  >
                    <Link href="/products" className="flex items-center justify-center gap-3">
                      <ShoppingBag className="h-5 w-5" />
                      상품 보러가기
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              }
            />
            <div className="mx-auto mt-8 max-w-2xl">
              <WishlistSidebar variant="inline" />
            </div>
          </div>
        )}
      </SiteContainer>

      {cartItems.length > 0 && (
        <div
          data-bottom-sticky="1"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 shadow-float bp-lg:hidden"
        >
          <div className="mx-auto flex max-w-[1240px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-ui-label text-muted-foreground">선택 {selectedCartItems.length}개 · 주문 예상 금액</p>
              <p className="truncate text-ui-card-title-lg font-semibold tabular-nums text-foreground">
                {!isCartPriceReady ? "계산 중" : `${formatKRW(total)}원`}
              </p>
            </div>
            <Button
              variant="highlight"
              className="h-11 min-w-[140px] font-semibold"
              disabled={!hasSelectedItems || loading || !isCartPriceReady || isCheckingCheckoutStock}
              onClick={handleCheckoutClick}
            >
              {isCheckingCheckoutStock ? "재고 확인 중" : loading ? "로그인 확인 중" : !isCartPriceReady ? "금액 계산 중" : !hasSelectedItems ? "상품 선택" : `주문하기 ${selectedCartItems.length}`}
            </Button>
          </div>
        </div>
      )}

      <CartOptionChangeOverlay
        open={Boolean(optionChangeItem)}
        item={optionChangeItem}
        mountingFee={
          optionChangeItem ? Number(mountingFeeByProductId[String(optionChangeItem.id)] ?? 0) : 0
        }
        onOpenChange={(open) => {
          if (!open) setOptionChangeItem(null);
        }}
        onApply={handleOptionChangeApply}
      />
    </div>
  );
}
