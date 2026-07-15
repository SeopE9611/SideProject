"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Plus, Ticket, Trash2 } from "lucide-react";
import React from "react";

import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import StringCheckboxes from "@/app/services/_components/StringCheckboxes";
import TimeSlotSelector from "@/app/services/_components/TimeSlotSelector";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import { SummaryCard } from "@/components/public/SummaryCard";
import { Button } from "@/components/ui/button";
import { isMountableStringItem } from "@/lib/orders/string-mounting-policy";
import { CUSTOM_STRING_MOUNTING_FEE } from "@/lib/stringing-pricing-policy";

export type MountingInfoSectionProps = {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleInputChange: (e: any) => void;

  fromPDP: boolean;
  orderId: string | null | undefined;
  rentalId?: string | null | undefined;
  rentalRacketId?: string | null;
  rentalDays?: number | null;
  pdpProductId: string | null | undefined;
  isLoadingPdpProduct: boolean;
  pdpProduct: any;

  orderRemainingSlots?: number | null;
  orderStringService: any;
  isOrderSlotBlocked: boolean;
  order: any;

  lineCount: number;
  price: number;
  priceView: any;

  handleStringTypesChange: (next: any) => void;
  handleCustomInputChange: (next: any) => void;
  handleUseQtyChange: (stringTypeId: string, qty: number) => void;

  lockedStringStock?: number | null;
  lockedRacketQuantity?: number | null;
  maxNonOrderQty?: number | null;

  selectedOrderItem: any;
  isCombinedPdpMode: boolean;
  pdpStringPrice: number;
  racketPrice: number | null;
  won: (n: number) => string;

  packagePreview: any;
  canApplyPackage: boolean;
  packageInsufficient: boolean;
  packageRemaining: number;
  requiredPassCount: number;

  linesForSubmit: any[];
  handleLineFieldChange: (idx: number, field: any, value: any) => void;

  timeSlots: any[];
  disabledTimes: any[];
  reservedTimes?: any[];
  slotsLoading: boolean;
  hasCacheForDate: boolean;
  slotsError: string | null | undefined;
  visitSlotCountUi: number;
  visitDurationMinutesUi: number | null;
  visitTimeRange: any;
  isSingleApplyMode?: boolean;
};

export default function MountingInfoSection(props: MountingInfoSectionProps) {
  const {
    formData,
    setFormData,
    handleInputChange,
    fromPDP,
    orderId,
    rentalId,
    rentalRacketId,
    rentalDays,
    pdpProductId,
    isLoadingPdpProduct,
    pdpProduct,
    orderRemainingSlots,
    orderStringService,
    isOrderSlotBlocked,
    order,
    lineCount,
    price,
    priceView,
    handleStringTypesChange,
    handleCustomInputChange,
    handleUseQtyChange,
    lockedStringStock,
    lockedRacketQuantity,
    maxNonOrderQty,
    selectedOrderItem,
    isCombinedPdpMode,
    pdpStringPrice,
    racketPrice,
    won,
    packagePreview,
    canApplyPackage,
    packageInsufficient,
    packageRemaining,
    requiredPassCount,
    linesForSubmit,
    handleLineFieldChange,
    timeSlots,
    disabledTimes,
    reservedTimes,
    slotsLoading,
    hasCacheForDate,
    slotsError,
    visitSlotCountUi,
    visitDurationMinutesUi,
    visitTimeRange,
    isSingleApplyMode = false,
  } = props;

  const canEditStandaloneWorkLines = isSingleApplyMode && !orderId && !rentalId && !fromPDP;

  React.useEffect(() => {
    if (!canEditStandaloneWorkLines) return;
    if (Array.isArray(formData.lines) && formData.lines.length > 0) {
      if (
        formData.stringTypes?.length === 1 &&
        formData.stringTypes[0] === "custom" &&
        formData.stringUseCounts?.custom === formData.lines.length &&
        formData.customStringType
      ) {
        return;
      }
    }

    setFormData((prev: any) => {
      const prevLines = Array.isArray(prev.lines) ? prev.lines : [];
      const lines =
        prevLines.length > 0
          ? prevLines
          : [
              {
                id: `standalone-${Date.now()}-0`,
                racketType: "",
                stringProductId: "custom",
                stringName: prev.customStringType || "보유 스트링",
                tensionMain: prev.defaultMainTension ?? "",
                tensionCross: prev.defaultCrossTension ?? "",
                note: "",
                mountingFee: CUSTOM_STRING_MOUNTING_FEE,
              },
            ];
      return {
        ...prev,
        lines,
        stringTypes: ["custom"],
        customStringType: lines[0]?.stringName?.trim() || "보유 스트링",
        stringUseCounts: {
          ...(prev.stringUseCounts ?? {}),
          custom: lines.length,
        },
      };
    });
  }, [
    canEditStandaloneWorkLines,
    formData.lines,
    formData.stringTypes,
    formData.stringUseCounts,
    formData.customStringType,
    setFormData,
  ]);

  const addStandaloneWorkLine = React.useCallback(() => {
    if (!canEditStandaloneWorkLines) return;
    setFormData((prev: any) => {
      const current = Array.isArray(prev.lines) ? prev.lines : [];
      if (current.length >= 10) return prev;
      const nextIndex = current.length;
      const nextLines = [
        ...current,
        {
          id: `standalone-${Date.now()}-${nextIndex}`,
          racketType: "",
          stringProductId: "custom",
          stringName: "",
          tensionMain: prev.defaultMainTension ?? "",
          tensionCross: prev.defaultCrossTension ?? "",
          note: "",
          mountingFee: CUSTOM_STRING_MOUNTING_FEE,
        },
      ];
      return {
        ...prev,
        lines: nextLines,
        stringTypes: ["custom"],
        customStringType: nextLines[0]?.stringName?.trim() || "보유 스트링",
        stringUseCounts: {
          ...(prev.stringUseCounts ?? {}),
          custom: nextLines.length,
        },
      };
    });
  }, [canEditStandaloneWorkLines, setFormData]);

  const removeStandaloneWorkLine = React.useCallback(
    (index: number) => {
      if (!canEditStandaloneWorkLines) return;
      setFormData((prev: any) => {
        const current = Array.isArray(prev.lines) ? prev.lines : [];
        if (current.length <= 1) return prev;
        const nextLines = current.filter((_: any, i: number) => i !== index);
        return {
          ...prev,
          lines: nextLines,
          stringTypes: ["custom"],
          customStringType: nextLines[0]?.stringName?.trim() || "보유 스트링",
          stringUseCounts: {
            ...(prev.stringUseCounts ?? {}),
            custom: nextLines.length,
          },
        };
      });
    },
    [canEditStandaloneWorkLines, setFormData],
  );

  // ---- 라켓별 라인 입력: "공통 값"을 한 번에 적용하기 위한 보조 상태 ----
  // - 단체 주문/다자루 작업에서 같은 텐션/요청사항을 반복 입력하는 피로를 줄이기 위함
  const [bulkTensionMain, setBulkTensionMain] = React.useState<string>(() =>
    String(formData?.defaultMainTension ?? ""),
  );
  const [bulkTensionCross, setBulkTensionCross] = React.useState<string>(() =>
    String(formData?.defaultCrossTension ?? ""),
  );
  const [bulkLineNote, setBulkLineNote] = React.useState<string>("");

  const applyBulkToAllLines = React.useCallback(
    (opts?: { main?: string; cross?: string; note?: string }) => {
      const main = (opts?.main ?? bulkTensionMain ?? "").trim();
      const cross = (opts?.cross ?? bulkTensionCross ?? "").trim();
      const note = (opts?.note ?? bulkLineNote ?? "").trim();

      // 전부 빈 값이면 아무 것도 하지 않음(실수로 전체 초기화 방지)
      if (!main && !cross && !note) return;

      setFormData((prev: any) => {
        const baseLines =
          Array.isArray(prev?.lines) && prev.lines.length > 0 ? prev.lines : (linesForSubmit ?? []);
        if (!Array.isArray(baseLines) || baseLines.length === 0) return prev;

        const nextLines = baseLines.map((line: any) => ({
          ...line,
          tensionMain: main ? main : (line?.tensionMain ?? ""),
          tensionCross: cross ? cross : (line?.tensionCross ?? ""),
          note: note ? note : (line?.note ?? ""),
        }));

        // page.tsx의 handleLineFieldChange와 동일하게 "기본 텐션"도 함께 갱신
        return {
          ...prev,
          lines: nextLines,
          ...(main ? { defaultMainTension: main } : {}),
          ...(cross ? { defaultCrossTension: cross } : {}),
        };
      });
    },
    [bulkTensionMain, bulkTensionCross, bulkLineNote, setFormData, linesForSubmit],
  );

  const applyFirstLineTensionToAll = React.useCallback(() => {
    const first = (linesForSubmit ?? [])[0];
    if (!first) return;

    const main = String(first?.tensionMain ?? "").trim();
    const cross = String(first?.tensionCross ?? "").trim();

    // 1번 라인에 텐션이 비어있으면 버튼을 눌러도 변화가 없도록 가드
    if (!main && !cross) return;

    // UI 입력칸도 같이 채워서, 이후 "입력값 → 전체" 버튼을 눌러도 일관되게 동작
    if (main) setBulkTensionMain(main);
    if (cross) setBulkTensionCross(cross);

    applyBulkToAllLines({ main, cross });
  }, [linesForSubmit, applyBulkToAllLines]);

  // 주문(orderId)이 아닌데도 스트링이 이미 확정된 흐름(PDP/대여)에서는
  // - (PDP) 체크박스/직접입력 UI를 잠그고(보기 전용)
  // - (대여) 체크박스 토글은 가능(다자루/다품목 대비), 다만 stringTypes가 비면 다음 단계로 진행 불가
  // - 선택된(혹은 직전에 선택했던) 스트링 1개를 대표 아이템으로 노출
  const isPdpLockedNonOrder = !orderId && Boolean(fromPDP);
  const isRentalNonOrder = !orderId && Boolean(rentalId);

  // 대여/비-주문 흐름에서 사용자가 체크 해제해도(= stringTypes가 빈 배열) 체크박스 리스트가 사라지지 않도록,
  // 마지막으로 선택된 스트링 id를 ref에 보관
  const nonOrderPrimaryStringIdRef = React.useRef<string | null>(null);
  const selectedFirstId = Array.isArray(formData.stringTypes) ? formData.stringTypes[0] : null;
  if (
    (isRentalNonOrder || isPdpLockedNonOrder) &&
    selectedFirstId &&
    selectedFirstId !== "custom"
  ) {
    nonOrderPrimaryStringIdRef.current = selectedFirstId;
  }

  // 체크 해제 시에도 ref 값을 사용해서 UI(아이템/수량 카드)를 유지할 수 있게 합니다.
  const lockedStringId = selectedFirstId ?? nonOrderPrimaryStringIdRef.current;
  const lockedMountingFee =
    typeof priceView?.base === "number"
      ? priceView.base
      : lineCount > 0
        ? Math.round(price / lineCount)
        : 0;

  // PDP에서 이어졌을 때만 체크박스/직접입력을 잠금 처리(대여는 토글 가능해야 다자루 확장에 유리)
  const isLockedNonOrder = isPdpLockedNonOrder;

  // (대여/PDP) 단일 대표 스트링 기준 수량 입력 카드
  const lockedId = lockedStringId;
  const isLockedIdSelected = Boolean(
    lockedId && Array.isArray(formData.stringTypes) && formData.stringTypes.includes(lockedId),
  );
  const canShowQty = Boolean(
    (isRentalNonOrder || isPdpLockedNonOrder) &&
    lockedId &&
    lockedId !== "custom" &&
    isLockedIdSelected,
  );

  const currentQty = lockedId ? (formData.stringUseCounts?.[lockedId] ?? 1) : 1;

  // 번들(라켓+스트링) 주문 수량 잠금 여부
  // - remainingSlots 정보가 없으면(구버전/예외) 기존처럼 잠금
  // - remainingSlots가 주문 수량과 동일할 때만 잠금 (부분 사용/재신청 등 remainingSlots < 주문수량이면 잠금 해제)
  const lockOrderUseQty = React.useMemo(() => {
    if (!orderId || !isCombinedPdpMode) return false;

    // 슬롯 정보가 없으면(구버전/예외) 기존 정책 유지: 잠금
    if (typeof orderRemainingSlots !== "number") return true;

    const ids = (formData.stringTypes ?? []).filter((id: any) => id && id !== "custom");
    if (ids.length === 0) return true;

    const items = Array.isArray(order?.items) ? order.items : [];
    const sumOrderQty = ids.reduce((sum: number, id: any) => {
      const item = (items as any[]).find((it: any) => it.id === id);
      const q = Number(item?.quantity ?? 0);
      return sum + (Number.isFinite(q) ? q : 0);
    }, 0);

    // 주문 수량을 못 구하면 안전하게 잠금
    if (!Number.isFinite(sumOrderQty) || sumOrderQty <= 0) return true;

    return orderRemainingSlots === sumOrderQty;
  }, [orderId, isCombinedPdpMode, orderRemainingSlots, order, formData.stringTypes]);

  // PDP 통합(번들) 주문에서는 수량 정합성(라켓=스트링=라인)을 깨면 안되므로
  // 주문 수량을 기준으로 stringUseCounts를 강제로 동기화한다.
  React.useEffect(() => {
    if (!lockOrderUseQty) return;
    if (!order?.items?.length) return;

    setFormData((prev: any) => {
      const ids = (prev.stringTypes ?? []).filter((id: any) => id && id !== "custom");
      if (ids.length === 0) return prev;

      const nextCounts = { ...(prev.stringUseCounts ?? {}) };
      let changed = false;

      for (const id of ids) {
        const item = (order.items as any[]).find((it: any) => it.id === id);
        const orderQty = Number(item?.quantity ?? 0);
        if (!Number.isFinite(orderQty) || orderQty <= 0) continue;
        if (nextCounts[id] !== orderQty) {
          nextCounts[id] = orderQty;
          changed = true;
        }
      }
      if (!changed) return prev;
      return { ...prev, stringUseCounts: nextCounts };
    });
  }, [lockOrderUseQty, order, setFormData]);

  // (대여) 체크박스를 숨기지 않는다. 체크 해제는 가능하되, stringTypes가 비면 다음 단계로 진행이 막히는 것이 정상.
  const shouldHideStringSelection = false;

  const rentalSelectStringHref =
    rentalId && rentalRacketId
      ? `/rentals/${encodeURIComponent(String(rentalRacketId))}/select-string?period=${encodeURIComponent(String(rentalDays ?? 7))}`
      : null;

  const limitReasons: string[] = [];
  if (typeof lockedStringStock === "number")
    limitReasons.push(`스트링 재고 ${lockedStringStock}개`);
  if (typeof lockedRacketQuantity === "number")
    limitReasons.push(`라켓 수량 ${lockedRacketQuantity}자루`);

  const [openLineId, setOpenLineId] = React.useState<string | null>(null);

  return (
    <div className="space-y-6">
      <SectionHeader
        align="center"
        title="라켓·스트링 정보"
        description="장착할 라켓과 스트링 정보를 입력해주세요"
        className="mb-8 break-keep [&_div]:leading-relaxed"
      />

      <div className="space-y-6">
        {/* <div className="space-y-2">
          <Label htmlFor="racketType" className="text-ui-body-sm font-medium">
            라켓 종류 <span className="text-destructive">*</span>
          </Label>
          <Input id="racketType" name="racketType" value={formData.racketType} onChange={handleInputChange} placeholder="예: 윌슨 프로 스태프 97" className="focus:ring-2 focus:ring-ring transition-all duration-200" />
        </div> */}

        <div className="space-y-4">
          {!canEditStandaloneWorkLines && (
            <div>
              <Label className="text-ui-body-sm font-medium">
                스트링 종류 <span className="text-destructive">*</span>
              </Label>
              <div className="mt-2 space-y-2">
                <PublicSurface
                  padding="sm"
                  className="border-warning/30 bg-warning/10 dark:bg-warning/15"
                ></PublicSurface>
              </div>
            </div>
          )}
          {/* PDP에서 이어졌을 때 노출되는 스트링 정보 카드 */}
          {(isLockedNonOrder || isRentalNonOrder) &&
            lockedStringId &&
            lockedStringId !== "custom" && (
              <PublicSurface variant="muted" padding="sm" className="mb-4 bg-muted/50">
                {isLoadingPdpProduct ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-wrap items-center gap-3 sm:flex-nowrap">
                      {pdpProduct?.image && (
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-card">
                          <img
                            src={pdpProduct.image}
                            alt={pdpProduct.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 flex flex-col">
                        {/* 상단 라벨 + 포함/미포함 배지(대여 비-주문에서만) */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-ui-label font-semibold text-primary">
                            {rentalId
                              ? "대여 신청에서 선택한 스트링"
                              : "상품 상세에서 선택한 스트링"}
                          </span>

                          {isRentalNonOrder && (
                            <Badge
                              variant={isLockedIdSelected ? "secondary" : "destructive"}
                              className="h-5 px-2 text-ui-micro"
                            >
                              {isLockedIdSelected ? "포함됨" : "미포함"}
                            </Badge>
                          )}
                        </div>

                        <span className="text-ui-body-sm font-medium leading-relaxed text-foreground break-words">
                          {pdpProduct?.name ?? "선택한 스트링으로 신청 중입니다."}
                        </span>
                        <span className="mt-1 text-ui-label leading-relaxed text-muted-foreground break-keep">
                          {rentalId
                            ? "대여 신청 시 선택한 스트링 기준으로 진행됩니다."
                            : "이 신청서는 위 스트링을 기준으로 장착 서비스가 진행됩니다."}
                        </span>
                      </div>
                    </div>

                    {/* (대여) 체크 해제 상태를 “체감”으로 확실히 보이게: 경고 + 즉시 복구 CTA */}
                    {isRentalNonOrder && !isLockedIdSelected && (
                      <PublicSurface
                        padding="sm"
                        className="mt-3 rounded-md border-destructive/30 bg-destructive/15 p-3 text-ui-label text-destructive dark:bg-destructive/20"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="leading-relaxed">
                            <p className="font-medium">
                              현재 이 스트링이 체크 해제되어 신청서에 포함되지 않았습니다.
                            </p>
                            <p className="mt-1">
                              아래 체크박스에서 다시 선택하거나, 오른쪽 버튼으로 다시 포함하세요.
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0 px-3 text-ui-label whitespace-nowrap"
                            onClick={() =>
                              handleStringTypesChange(
                                Array.from(
                                  new Set([...(formData.stringTypes ?? []), lockedStringId]),
                                ),
                              )
                            }
                          >
                            다시 포함하기
                          </Button>
                        </div>
                      </PublicSurface>
                    )}
                  </>
                )}
              </PublicSurface>
            )}

          {/* 주문 기반 진입 시 안내 문구 */}
          {orderId && typeof orderRemainingSlots === "number" && (
            <PublicSurface
              variant="muted"
              padding="sm"
              className="mb-3 py-3 text-ui-body-sm text-foreground dark:bg-card/40 dark:text-foreground"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">이 주문에서 남은 교체 가능 횟수</span>
                <span className="font-semibold">{orderRemainingSlots}회</span>
                {typeof orderStringService?.totalSlots === "number" &&
                  typeof orderStringService?.usedSlots === "number" && (
                    <span className="text-ui-label text-muted-foreground">
                      (총 {orderStringService.totalSlots} / 사용 {orderStringService.usedSlots})
                    </span>
                  )}
              </div>

              {isOrderSlotBlocked && (
                <p className="mt-1 text-ui-label text-destructive">
                  이 주문은 더 이상 교체 신청을 진행할 수 없습니다. 추가 스트링 구매 후 다시 시도해
                  주세요.
                </p>
              )}

              {(isOrderSlotBlocked || lineCount >= orderRemainingSlots) && (
                <p className="mt-2 text-ui-body-sm text-foreground/75">
                  * 이 신청서는 <span className="font-medium">현재 주문 기준</span>으로만
                  진행됩니다. 추가 구매는 새 주문으로 진행되며, 이 신청서에는 자동으로 반영되지
                  않습니다.
                </p>
              )}
            </PublicSurface>
          )}
          {orderId && (
            <p className="mb-2 text-ui-label leading-relaxed text-muted-foreground break-keep">
              이번 신청서는 <span className="font-semibold">보유 라켓</span>도 포함해{" "}
              <span className="font-semibold">여러{"\u00A0"}자루</span>를 한{"\u00A0"}번에 접수할 수
              있습니다. 아래에서 사용할 스트링을 선택해 주세요.
              <span className="font-semibold">(스트링 1개 = 교체 1회 = 라켓 1자루)</span>
              {typeof orderRemainingSlots === "number" ? (
                <>
                  이 주문에서 남은 교체 가능 횟수는{" "}
                  <span className="font-semibold">{orderRemainingSlots}회</span>
                  입니다.
                </>
              ) : null}
              <br />
              교체비는 <span className="font-semibold">1자루 기준 금액 × 신청 자루 수</span>로
              계산됩니다.
            </p>
          )}

          {!canEditStandaloneWorkLines && !shouldHideStringSelection && (
            <div className={isLockedNonOrder ? "pointer-events-none opacity-60" : ""}>
              <StringCheckboxes
                items={
                  orderId && order
                    ? (order?.items ?? [])
                        // 장착 가능한 스트링만 노출하되, 무료 장착(mountingFee=0)도 포함
                        .filter((i: any) => isMountableStringItem(i))
                        .map((i: any) => ({
                          id: i.id,
                          name: i.name,
                          mountingFee: i.mountingFee,
                        }))
                    : // 주문이 없더라도(PDP/대여) 이미 확정된 스트링은 1개 아이템으로 노출
                      (isLockedNonOrder || isRentalNonOrder) &&
                        lockedStringId &&
                        lockedStringId !== "custom"
                      ? [
                          {
                            id: lockedStringId,
                            name: pdpProduct?.name ?? "선택된 스트링",
                            mountingFee: lockedMountingFee,
                          },
                        ]
                      : [] // 단독 신청(직접 입력) 등은 빈 배열
                }
                stringTypes={formData.stringTypes}
                customInput={formData.customStringType}
                hideCustom={Boolean(orderId) || isLockedNonOrder || isRentalNonOrder}
                disabled={isLockedNonOrder}
                onChange={handleStringTypesChange}
                onCustomInputChange={handleCustomInputChange}
              />
            </div>
          )}

          {canEditStandaloneWorkLines && (
            <PublicSurface variant="muted" padding="sm" className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-ui-body-sm font-semibold text-foreground">작업 항목</p>
                  <p className="mt-1 text-ui-label leading-relaxed text-muted-foreground break-keep">
                    라켓 1자루당 작업 항목 1개를 작성합니다. 스트링이 다르면 항목별로 스트링명을
                    다르게 입력하세요.
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit shrink-0">
                  총 {lineCount}자루
                </Badge>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full gap-1.5 whitespace-nowrap sm:w-auto"
                  onClick={addStandaloneWorkLine}
                  disabled={lineCount >= 10}
                >
                  <Plus className="h-4 w-4" />
                  작업 항목 추가
                </Button>
              </div>
              {lineCount >= 10 && (
                <p className="text-ui-label text-muted-foreground">
                  작업 항목은 최대 10개까지 추가할 수 있습니다.
                </p>
              )}
            </PublicSurface>
          )}

          <SummaryCard
            title={
              <span className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-primary" />
                예상 장착 비용
              </span>
            }
            contentClassName="space-y-3 p-4 sm:p-5"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 p-3 dark:border-border">
                <span className="text-ui-body-sm text-muted-foreground">기본 장착비</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formData.stringTypes.includes("custom")
                    ? price.toLocaleString("ko-KR") + "원"
                    : order && lineCount > 0
                      ? price.toLocaleString("ko-KR") + "원"
                      : (priceView.base * Math.max(lineCount, 1)).toLocaleString("ko-KR") + "원"}
                </span>
              </div>

              {/* 주문 기반 진입 + 스트링 선택 완료 시 상세 안내 */}
              {orderId && order && lineCount > 0 && (
                <div className="mt-3 space-y-2 text-ui-label text-muted-foreground">
                  <p>
                    이번 신청에서 장착할 라켓 수:{" "}
                    <span className="font-semibold">{lineCount}자루</span>
                  </p>

                  {/* 선택된 각 스트링별로 "구매 수량 vs 이번 신청 수량" 노출 + 수정 */}
                  <div className="space-y-1">
                    {formData.stringTypes.map((id: string) => {
                      if (id === "custom") {
                        const useQty = formData.stringUseCounts["custom"] ?? 1;
                        return (
                          <div
                            key={id}
                            className="flex min-w-0 flex-wrap items-center justify-between gap-2"
                          >
                            <span className="truncate">• 직접 입력 스트링</span>
                            <div className="flex items-center gap-1">
                              <Label htmlFor="useQty-custom" className="sr-only">
                                사용할 개수
                              </Label>
                              <Input
                                id="useQty-custom"
                                type="number"
                                className="h-7 w-16 px-2 py-1 text-right text-ui-label border-border rounded-md focus:ring-ring"
                                min={0}
                                max={99}
                                value={useQty}
                                onChange={(e) =>
                                  handleUseQtyChange("custom", Number(e.target.value) || 0)
                                }
                              />
                            </div>
                          </div>
                        );
                      }

                      const item = order.items.find((it: any) => it.id === id);
                      if (!item) return null;

                      const orderQty = item.quantity ?? 1;
                      const useQty = lockOrderUseQty
                        ? orderQty
                        : (formData.stringUseCounts[id] ?? orderQty);

                      let maxAllowed = orderQty;
                      let isLimitedByRemaining = false;
                      if (!lockOrderUseQty && typeof orderRemainingSlots === "number") {
                        const otherTotal = Object.entries(formData?.stringUseCounts ?? {})
                          .filter(([key]) => key !== id)
                          .reduce((sum, [, v]) => sum + (typeof v === "number" ? v : 0), 0);
                        const remainForThis = Math.max(orderRemainingSlots - otherTotal, 0);
                        maxAllowed = Math.min(orderQty, remainForThis);
                        isLimitedByRemaining = maxAllowed < orderQty;
                      }

                      return (
                        <div
                          key={id}
                          className="flex min-w-0 flex-wrap items-center justify-between gap-2"
                        >
                          <span className="truncate">
                            • {item.name}{" "}
                            <span className="text-ui-micro text-primary/80 dark:text-primary/80">
                              (구매 {orderQty}개 중)
                            </span>
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <Label htmlFor={`useQty-${id}`} className="sr-only">
                              사용할 개수
                            </Label>
                            <Input
                              id={`useQty-${id}`}
                              type="number"
                              className={`h-7 w-16 px-2 py-1 text-right text-ui-label border-border rounded-md focus:ring-ring ${lockOrderUseQty ? "cursor-not-allowed bg-muted text-muted-foreground dark:bg-card/40 dark:text-muted-foreground" : ""}`}
                              min={0}
                              max={
                                typeof orderRemainingSlots === "number" && !lockOrderUseQty
                                  ? maxAllowed
                                  : orderQty
                              }
                              value={useQty}
                              disabled={lockOrderUseQty}
                              readOnly={lockOrderUseQty}
                              title={
                                lockOrderUseQty
                                  ? "번들(라켓+스트링) 주문은 주문 수량과 자동 동기화됩니다."
                                  : undefined
                              }
                              onChange={
                                lockOrderUseQty
                                  ? undefined
                                  : (e) => handleUseQtyChange(id, Number(e.target.value) || 0)
                              }
                            />
                            {typeof orderRemainingSlots === "number" && !lockOrderUseQty && (
                              <Badge
                                variant="outline"
                                className="h-7 px-2 text-ui-label leading-none"
                                title={
                                  isLimitedByRemaining
                                    ? "남은 교체 가능 횟수 기준으로 제한됩니다."
                                    : "주문 수량 기준입니다."
                                }
                              >
                                최대 {maxAllowed}개
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {lockOrderUseQty && (
                    <p className="text-ui-body-sm text-foreground/75">
                      * 번들(라켓+스트링) 주문은 주문 수량과 자동 동기화되며, 여기서 변경할 수
                      없습니다.
                    </p>
                  )}

                  <p>
                    이번 신청 교체비 합계:{" "}
                    <span className="font-semibold text-foreground">
                      {price.toLocaleString("ko-KR")}원
                    </span>
                  </p>
                </div>
              )}
              {/* 주문 기반 진입: 입금 안내*/}
              {orderId && order && lineCount > 0 && (
                <PublicSurface
                  variant="muted"
                  padding="sm"
                  className="mt-3 rounded-md bg-muted/40 p-3 text-ui-body-sm text-foreground/75"
                >
                  <p>
                    최종 결제 금액은 우측 요금 요약의{" "}
                    <span className="font-semibold">“이번 주문 총 결제 금액”</span>을 기준으로
                    합니다.
                  </p>
                </PublicSurface>
              )}

              {/* (대여/PDP) 비-주문 기반 진입 시 스트링 사용 개수 입력(구매 UX와 동일한 리스트 형태) */}
              {canShowQty && lineCount > 0 && (
                <div className="mt-3 space-y-2 text-ui-label text-muted-foreground">
                  <p>
                    이번 신청에서 장착할 라켓 수:{" "}
                    <span className="font-semibold text-foreground">{lineCount}자루</span>
                  </p>

                  <div className="space-y-1">
                    {formData.stringTypes
                      ?.filter((id: string) => id !== "custom")
                      .map((id: string) => {
                        const useQty =
                          id === lockedId ? currentQty : (formData.stringUseCounts?.[id] ?? 1);
                        const maxQty = typeof maxNonOrderQty === "number" ? maxNonOrderQty : 99;
                        const name =
                          pdpProduct?.name ??
                          (id === lockedId ? "선택한 스트링" : `스트링 (${id})`);

                        return (
                          <div
                            key={id}
                            className="flex min-w-0 flex-wrap items-center justify-between gap-2"
                          >
                            <span className="truncate">
                              • {name}{" "}
                              {typeof maxNonOrderQty === "number" ? (
                                <span className="text-ui-micro text-primary/80 dark:text-primary/80">
                                  (가용 {maxNonOrderQty}개 중)
                                </span>
                              ) : null}
                            </span>
                            <div className="flex items-center gap-1">
                              <Label htmlFor={`useQty-${id}`} className="sr-only">
                                사용할 개수
                              </Label>
                              <Input
                                id={`useQty-${id}`}
                                type="number"
                                className="h-7 w-16 px-2 py-1 text-right text-ui-label border-border rounded-md focus:ring-ring"
                                min={0}
                                max={maxQty}
                                value={useQty}
                                onChange={(e) =>
                                  handleUseQtyChange(id, Number(e.target.value) || 0)
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {typeof maxNonOrderQty === "number" && (
                    <p className="text-ui-body-sm text-foreground/75">
                      사용 개수는 <span className="font-semibold">{maxNonOrderQty}개</span>를 초과할
                      수 없습니다
                      {limitReasons.length ? ` (기준: ${limitReasons.join(", ")})` : ""}.
                    </p>
                  )}
                </div>
              )}

              {/* 주문 기반 진입 + 스트링 1개만 선택 시 상세 안내 */}
              {orderId && selectedOrderItem && lineCount === 1 && (
                <div className="mt-1 text-ui-body-sm text-foreground/75 space-y-1">
                  {(() => {
                    // 스트링 금액: PDP 통합모드면 pdpStringPrice 우선, 아니면 주문 item 가격 사용
                    const stringPrice = isCombinedPdpMode
                      ? Number.isFinite(pdpStringPrice) && pdpStringPrice > 0
                        ? pdpStringPrice
                        : Number(selectedOrderItem.price ?? 0)
                      : Number(selectedOrderItem.price ?? 0);

                    // 합계: 통합모드면 라켓 포함
                    const racket = isCombinedPdpMode ? Number(racketPrice ?? 0) : 0;
                    const service = Number(priceView.base ?? 0);
                    const total = racket + stringPrice + service;
                    return (
                      <p>
                        {isCombinedPdpMode ? <>라켓 {won(racket)} + </> : null}
                        스트링 {won(stringPrice)} + 교체비 {won(service)} = 총 {won(total)}{" "}
                        <span className="text-muted-foreground">(참고용)</span>
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          </SummaryCard>
        </div>

        {/* 패키지 요약 - 장착 정보 단계 */}
        {!rentalId && (
          <div className="mt-4">
            <PublicSurface
              padding="sm"
              className={
                packagePreview?.has ? (canApplyPackage ? "bg-muted/50" : "bg-muted/40") : "bg-card"
              }
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Ticket className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1 text-ui-label leading-relaxed break-keep">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-ui-body font-semibold tracking-normal text-foreground">
                      패키지 사용 가능 여부
                    </span>

                    {packagePreview?.has ? (
                      canApplyPackage ? (
                        <Badge variant="success" className="h-5 text-ui-label font-medium">
                          자동 적용 대상
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="h-5 text-ui-label font-medium">
                          이번 구성에는 적용 불가
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="h-5 text-ui-label font-medium">
                        보유 패키지 없음
                      </Badge>
                    )}
                  </div>

                  {packagePreview?.has ? (
                    packageInsufficient ? (
                      <p className="text-ui-body-sm text-foreground">
                        현재 남은 횟수는 <span className="font-semibold">{packageRemaining}회</span>
                        이고, 이번 신청에는{" "}
                        <span className="font-semibold">{requiredPassCount}회</span>가 필요하여
                        패키지가 자동 적용되지 않습니다.
                      </p>
                    ) : (
                      <p className="text-ui-body-sm text-foreground">
                        이번 신청에는 패키지로{" "}
                        <span className="font-semibold">{requiredPassCount}회</span>가 필요합니다.
                        현재 남은 횟수는 <span className="font-semibold">{packageRemaining}회</span>
                        이며, 결제 단계에서 사용 여부를 선택할 수 있습니다.
                      </p>
                    )
                  ) : (
                    <p className="text-ui-body-sm text-muted-foreground">
                      현재 보유 중인 패키지가 없어 이번 신청은 일반 교체비 기준으로 결제됩니다.
                    </p>
                  )}

                  {packagePreview?.has && (
                    <div className="mt-1 flex flex-wrap gap-2 text-ui-label text-muted-foreground">
                      <span>필요 {requiredPassCount}회</span>
                      <span className="h-3 w-px bg-muted/80" />
                      <span>잔여 {packageRemaining}회</span>
                      {packagePreview.expiresAt && (
                        <>
                          <span className="h-3 w-px bg-muted/80" />
                          <span>
                            만료일 {new Date(packagePreview.expiresAt).toLocaleDateString("ko-KR")}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </PublicSurface>
          </div>
        )}
        {/* 라켓/라인 세부 입력 (선택 사항) */}
        {lineCount > 0 && (
          <SummaryCard
            title={
              <span className="text-ui-body font-semibold text-foreground">
                라켓·스트링별 작업 정보
              </span>
            }
            description={
              canEditStandaloneWorkLines ? (
                <span>
                  작업 항목 수에 맞춰 입력 항목이 생성됩니다. 각 항목마다 라켓 이름, 스트링명, 텐션,
                  메모를 입력하면 신청서에 함께 저장됩니다.
                </span>
              ) : orderId ? (
                <span>
                  주문에서 선택한 사용 개수 기준으로 입력 항목이 생성됩니다. 각 라켓의 이름/별칭과
                  텐션, 메모를 입력하면 신청서에 함께 저장됩니다.
                </span>
              ) : (
                <span>
                  선택한 수량 기준으로 입력 항목이 생성됩니다. 각 라켓의 이름/별칭과 텐션, 메모를
                  입력하면 신청서에 함께 저장됩니다.
                </span>
              )
            }
            className="shadow-none"
            contentClassName="space-y-4"
          >
            {lineCount >= 2 && (
              <PublicSurface variant="muted" padding="sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 sm:min-w-[220px]">
                    <p className="text-ui-body-sm font-semibold text-foreground">일괄 입력</p>
                    <p className="mt-0.5 text-ui-label text-muted-foreground">
                      같은 텐션/요청사항이면 한{"\u00A0"}번에 적용할 수 있어요.
                    </p>
                  </div>

                  <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-full px-3 text-ui-label whitespace-nowrap"
                      onClick={applyFirstLineTensionToAll}
                      disabled={lineCount < 2}
                    >
                      1번 텐션 → 전체
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 w-full px-3 text-ui-label whitespace-nowrap"
                      onClick={() => applyBulkToAllLines()}
                      disabled={lineCount < 1}
                    >
                      입력값 → 전체
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-ui-label font-medium text-foreground">
                      공통 메인 텐션(LB)
                    </Label>
                    <Input
                      value={bulkTensionMain}
                      onChange={(e) => setBulkTensionMain(e.target.value)}
                      placeholder="예: 53"
                      className="h-9 text-ui-body-sm border-border focus-visible:ring-ring dark:focus-visible:ring-ring"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-ui-label font-medium text-foreground">
                      공통 크로스 텐션(LB)
                    </Label>
                    <Input
                      value={bulkTensionCross}
                      onChange={(e) => setBulkTensionCross(e.target.value)}
                      placeholder="예: 51"
                      className="h-9 text-ui-body-sm border-border focus-visible:ring-ring dark:focus-visible:ring-ring"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <Label className="text-ui-label font-medium text-foreground">
                      공통 메모 (선택)
                    </Label>
                    <Textarea
                      value={bulkLineNote}
                      onChange={(e) => setBulkLineNote(e.target.value)}
                      rows={2}
                      className="text-ui-body-sm resize-none border-border focus-visible:ring-ring dark:focus-visible:ring-ring"
                      placeholder="예: 전부 동일 텐션으로 부탁드립니다. / 오버그립 제거하지 말아주세요 등"
                    />
                    <p className="text-ui-body-sm text-foreground/75">
                      ※ 공통 메모를 비워두면 기존 라켓별 메모는 유지됩니다.
                    </p>
                  </div>
                </div>
              </PublicSurface>
            )}
            {linesForSubmit.map((line, index) => {
              const lineKey = String(line.id ?? `line-${index}`);
              const isLineOpen = openLineId ? openLineId === lineKey : index === 0;
              const lineComplete = Boolean(
                line.racketType?.trim() &&
                  line.tensionMain?.trim() &&
                  line.tensionCross?.trim() &&
                  (!canEditStandaloneWorkLines || line.stringName?.trim()),
              );
              const lineSummary = [
                line.racketType?.trim() || `라켓 ${index + 1}`,
                line.tensionMain && line.tensionCross ? `${line.tensionMain}/${line.tensionCross}LB` : "텐션 미입력",
              ]
                .filter(Boolean)
                .join(" · ");

              return (
              <PublicSurface
                key={line.id ?? index}
                padding="none"
                className="group relative overflow-hidden"
              >
                {/* 헤더 영역: 라켓 N, 스트링 이름 */}
                <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary shadow-sm">
                      <span className="text-ui-body-sm font-semibold text-primary">
                        {index + 1}
                      </span>
                    </div>
                    <span className="min-w-0 truncate text-ui-body-sm font-medium text-foreground">
                      {line.racketType?.trim() || `라켓 ${index + 1}`}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!canEditStandaloneWorkLines && (
                      <Badge
                        variant="brand"
                        className="flex max-w-[120px] items-center gap-1.5 px-2.5 py-1 sm:max-w-[200px]"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        <span className="truncate text-ui-label font-medium">
                          {line.stringName}
                        </span>
                      </Badge>
                    )}
                    {canEditStandaloneWorkLines && lineCount > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 px-2 text-ui-label text-destructive hover:text-destructive"
                        onClick={() => {
                          removeStandaloneWorkLine(index);
                          setOpenLineId((current) => (current === lineKey ? null : current));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-ui-label bp-md:hidden"
                      onClick={() => setOpenLineId(isLineOpen ? null : lineKey)}
                      aria-expanded={isLineOpen}
                      aria-controls={`work-line-${lineKey}`}
                    >
                      {isLineOpen ? "접기" : "편집"}
                    </Button>
                  </div>
                </div>
                <div className="border-b border-border px-4 py-2 text-ui-label text-muted-foreground bp-md:hidden">
                  {lineSummary} · {lineComplete ? "입력 완료" : "입력 필요"}
                </div>

                {/* 라켓 이름 + 텐션 */}
                <div id={`work-line-${lineKey}`} className={`${isLineOpen ? "block" : "hidden"} space-y-4 p-4 bp-md:block`}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-ui-label font-medium text-foreground">
                        라켓 이름/별칭
                      </Label>
                      <Input
                        value={line.racketType ?? ""}
                        onChange={(e) => handleLineFieldChange(index, "racketType", e.target.value)}
                        placeholder={
                          canEditStandaloneWorkLines
                            ? "예: 윌슨 블레이드 98, 첫 번째 라켓 등"
                            : "예: 라켓1"
                        }
                        className="h-9 text-ui-body-sm border-border focus-visible:ring-ring dark:focus-visible:ring-ring"
                      />
                    </div>

                    {canEditStandaloneWorkLines && (
                      <div className="space-y-1.5">
                        <Label className="text-ui-label font-medium text-foreground">
                          스트링명
                        </Label>
                        <Input
                          value={line.stringName ?? ""}
                          onChange={(e) =>
                            handleLineFieldChange(index, "stringName", e.target.value)
                          }
                          placeholder="예: 알루파워 러프, RPM Blast, 보유 스트링 등"
                          className="h-9 text-ui-body-sm border-border focus-visible:ring-ring dark:focus-visible:ring-ring"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-ui-label font-medium text-foreground">
                        메인 텐션(LB)
                      </Label>
                      <Input
                        value={line.tensionMain ?? ""}
                        onChange={(e) =>
                          handleLineFieldChange(index, "tensionMain", e.target.value)
                        }
                        placeholder="예: 53"
                        className="h-9 text-ui-body-sm border-border focus-visible:ring-ring dark:focus-visible:ring-ring"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-ui-label font-medium text-foreground">
                        크로스 텐션(LB)
                      </Label>
                      <Input
                        value={line.tensionCross ?? ""}
                        onChange={(e) =>
                          handleLineFieldChange(index, "tensionCross", e.target.value)
                        }
                        placeholder="예: 51"
                        className="h-9 text-ui-body-sm border-border focus-visible:ring-ring dark:focus-visible:ring-ring"
                      />
                    </div>
                  </div>

                  {/* 라켓별 메모 */}
                  <div className="space-y-1.5">
                    <Label className="text-ui-label font-medium text-foreground">
                      작업 메모 (선택)
                    </Label>
                    <Textarea
                      value={line.note ?? ""}
                      onChange={(e) => handleLineFieldChange(index, "note", e.target.value)}
                      rows={2}
                      className="text-ui-body-sm resize-none border-border focus-visible:ring-ring dark:focus-visible:ring-ring"
                      placeholder="요청사항을 적어 두셔도 좋습니다."
                    />
                  </div>
                </div>
              </PublicSurface>
              );
            })}
          </SummaryCard>
        )}

        {normalizeCollection(formData.collectionMethod) === "visit" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preferredDate" className="text-ui-body-sm font-medium">
                장착 희망일 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="preferredDate"
                name="preferredDate"
                type="date"
                value={formData.preferredDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split("T")[0]}
                className="focus:ring-2 focus:ring-ring transition-all duration-200"
              />
              {formData.preferredDate &&
                formData.preferredTime &&
                visitSlotCountUi > 0 &&
                visitDurationMinutesUi && (
                  <PublicSurface
                    variant="muted"
                    padding="sm"
                    className="mt-3 rounded-lg px-3 py-2 text-ui-label leading-relaxed text-foreground md:text-ui-label"
                  >
                    <p className="font-medium">
                      이번 방문 예상 소요 시간:{" "}
                      {visitTimeRange
                        ? `${visitTimeRange.start} ~ ${visitTimeRange.end}`
                        : `약 ${visitDurationMinutesUi}분`}{" "}
                      ({visitSlotCountUi}슬롯)
                    </p>
                    <p className="mt-0.5 text-ui-body-sm text-foreground/75 leading-relaxed">
                      선택하신 시간부터 연속으로 작업이 진행되며,&nbsp; 해당 시간대에는 다른 예약이
                      불가능합니다.
                    </p>
                  </PublicSurface>
                )}
            </div>

            <div className="space-y-2">
              <Label className="text-ui-body-sm font-medium">
                희망 시간대<span className="text-destructive">*</span>
              </Label>
              <TimeSlotSelector
                selected={formData.preferredTime}
                selectedDate={formData.preferredDate}
                onSelect={(value) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    preferredTime: prev.preferredTime === value ? "" : value,
                  }))
                }
                times={timeSlots}
                disabledTimes={disabledTimes}
                reservedTimes={reservedTimes}
                isLoading={slotsLoading && !hasCacheForDate}
                errorMessage={slotsError}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
