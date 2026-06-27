"use client";

import ImageUploader from "@/components/admin/ImageUploader";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import {
  FormField,
  FormFieldGroup,
  FormSection,
  StepIndicator,
  StepNavigation,
  StepProgress,
  type Step,
} from "@/components/admin/product-form";
import { Badge } from "@/components/ui/badge";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { asRecord, safeNumber } from "@/lib/admin/parsers";
import {
  GRIP_SIZE_OPTIONS,
  RACKET_BRANDS,
  STRING_PATTERN_OPTIONS,
  normalizeAndValidateGripSize,
  normalizeAndValidateStringPattern,
  racketBrandLabel,
  racketStatusLabel,
  type RacketBrand,
} from "@/lib/constants";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Boxes, DollarSign, FileText, ImageIcon, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type BrandState = RacketBrand | "";
const MODEL_MIN = 2;
const MODEL_MAX = 80;
const PRICE_MIN = 1;
const isFiniteNumber = (v: unknown) => Number.isFinite(safeNumber(v, Number.NaN));
const nonNegative = (v: unknown) => isFiniteNumber(v) && safeNumber(v) >= 0;
const positiveOrNull = (v: unknown) =>
  v == null || v === "" ? true : isFiniteNumber(v) && safeNumber(v) >= 1;

const STEPS: Step[] = [
  { id: "basic", label: "기본 정보", icon: <FileText className="h-4 w-4" /> },
  { id: "specs", label: "상세 스펙", icon: <Settings className="h-4 w-4" /> },
  {
    id: "rental",
    label: "판매/대여/재고",
    icon: <DollarSign className="h-4 w-4" />,
  },
  { id: "images", label: "이미지", icon: <ImageIcon className="h-4 w-4" /> },
];

const RACKET_FORM_WORKFLOW_GUIDES = [
  {
    icon: FileText,
    title: "1. 기본 정보",
    description: "브랜드, 모델명, 연식, 등급을 먼저 확인합니다.",
  },
  {
    icon: Settings,
    title: "2. 상세 스펙",
    description: "무게, 밸런스, 헤드 사이즈, 패턴, 그립 정보를 정리합니다.",
  },
  {
    icon: DollarSign,
    title: "3. 판매/대여 설정",
    description: "가격, 배송비, 재고, 대여 가능 여부와 노출 옵션을 설정합니다.",
  },
  {
    icon: ImageIcon,
    title: "4. 이미지 확인",
    description: "대표 이미지와 상세 이미지를 확인한 뒤 저장합니다.",
  },
];

export type RacketForm = {
  brand: BrandState;
  model: string;
  year: number | null;
  price: number;
  shippingFee: number;
  condition: "A" | "B" | "C";
  status: "available" | "rented" | "sold" | "inactive";
  isVisible: boolean;
  spec: {
    weight: number | null;
    balance: number | null;
    headSize: number | null;
    lengthIn: number | null;
    swingWeight: number | null;
    stiffnessRa: number | null;
    pattern: string;
    gripSize: string;
  };
  rental: {
    enabled: boolean;
    deposit: number;
    fee: { d7: number; d15: number; d30: number };
    disabledReason?: string;
  };
  marketing: {
    isFeatured: boolean;
    isNew: boolean;
    isSale: boolean;
    salePrice: number;
  };
  images: string[];
  quantity: number;
  searchKeywords?: string[];
};
type RacketCondition = RacketForm["condition"];
type RacketStatus = RacketForm["status"];
const RACKET_CONDITIONS: readonly RacketCondition[] = ["A", "B", "C"];
const RACKET_STATUSES: readonly RacketStatus[] = ["available", "rented", "sold", "inactive"];
const toCondition = (v: unknown): RacketCondition =>
  RACKET_CONDITIONS.includes(v as RacketCondition) ? (v as RacketCondition) : "B";
const toStatus = (v: unknown): RacketStatus =>
  RACKET_STATUSES.includes(v as RacketStatus) ? (v as RacketStatus) : "available";
const toNullableNumber = (v: unknown): number | null => {
  const n = safeNumber(v, Number.NaN);
  return Number.isFinite(n) ? n : null;
};
const getInitialPattern = (v: unknown) => normalizeAndValidateStringPattern(String(v ?? ""));
const getInitialGripSize = (v: unknown) => normalizeAndValidateGripSize(String(v ?? ""));

export default function AdminRacketForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<RacketForm>;
  submitLabel: string;
  onSubmit: (data: RacketForm) => Promise<void>;
}) {
  const [form, setForm] = useState<RacketForm>({
    brand: (initial?.brand as BrandState) ?? "",
    model: initial?.model ?? "",
    year: initial?.year ?? null,
    price: initial?.price ?? 0,
    shippingFee: initial?.shippingFee ?? 3000,
    quantity: initial?.quantity ?? 1,
    condition: toCondition(initial?.condition),
    status: toStatus(initial?.status),
    isVisible: initial?.isVisible !== false,
    spec: {
      weight: initial?.spec?.weight ?? null,
      balance: initial?.spec?.balance ?? null,
      headSize: initial?.spec?.headSize ?? null,
      lengthIn: toNullableNumber(asRecord(initial?.spec).lengthIn),
      swingWeight: toNullableNumber(asRecord(initial?.spec).swingWeight),
      stiffnessRa: toNullableNumber(asRecord(initial?.spec).stiffnessRa),
      pattern: getInitialPattern(initial?.spec?.pattern),
      gripSize: getInitialGripSize(initial?.spec?.gripSize),
    },
    rental: {
      enabled: initial?.rental?.enabled ?? false,
      deposit: initial?.rental?.deposit ?? 0,
      fee: {
        d7: initial?.rental?.fee?.d7 ?? 0,
        d15: initial?.rental?.fee?.d15 ?? 0,
        d30: initial?.rental?.fee?.d30 ?? 0,
      },
      disabledReason: initial?.rental?.disabledReason ?? "",
    },
    marketing: {
      isFeatured: initial?.marketing?.isFeatured ?? false,
      isNew: initial?.marketing?.isNew ?? false,
      isSale: initial?.marketing?.isSale ?? false,
      salePrice: initial?.marketing?.salePrice ?? 0,
    },
    images: Array.isArray(initial?.images) ? initial.images : [],
  });
  const [searchKeywordsText, setSearchKeywordsText] = useState(
    Array.isArray(initial?.searchKeywords) ? initial.searchKeywords.join(", ") : "",
  );
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const currentStep = STEPS[currentStepIndex];
  const submitRef = useRef(false);
  const stepContentRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollAfterStepChangeRef = useRef(false);
  const baselineRef = useRef<string | null>(null);
  const snapshot = useMemo(
    () => JSON.stringify({ form, searchKeywordsText }),
    [form, searchKeywordsText],
  );
  useEffect(() => {
    if (baselineRef.current === null) baselineRef.current = snapshot;
  }, [snapshot]);
  useUnsavedChangesGuard(
    baselineRef.current !== null && baselineRef.current !== snapshot && !loading,
  );

  const hasBasicInfo =
    Boolean(form.brand) &&
    form.model.trim().length >= MODEL_MIN &&
    form.model.trim().length <= MODEL_MAX;

  const hasValidSpecs =
    Boolean(form.spec.pattern.trim()) &&
    Boolean(form.spec.gripSize.trim()) &&
    positiveOrNull(form.spec.weight) &&
    positiveOrNull(form.spec.balance) &&
    positiveOrNull(form.spec.headSize) &&
    positiveOrNull(form.spec.lengthIn) &&
    positiveOrNull(form.spec.swingWeight) &&
    positiveOrNull(form.spec.stiffnessRa);

  const hasValidSalesInfo =
    isFiniteNumber(form.price) &&
    Number(form.price) >= PRICE_MIN &&
    nonNegative(form.shippingFee) &&
    isFiniteNumber(form.quantity) &&
    Number(form.quantity) >= 1 &&
    (!form.marketing.isSale ||
      (isFiniteNumber(form.marketing.salePrice) &&
        Number(form.marketing.salePrice) >= 1 &&
        Number(form.marketing.salePrice) < Number(form.price)));

  const hasValidRentalInfo = form.rental.enabled
    ? nonNegative(form.rental.deposit) &&
      nonNegative(form.rental.fee.d7) &&
      nonNegative(form.rental.fee.d15) &&
      nonNegative(form.rental.fee.d30)
    : Boolean(form.rental.disabledReason?.trim());

  const hasImages = form.images.length > 0;

  const formReadinessChecks = [
    {
      label: "기본 정보",
      done: hasBasicInfo,
      description: "브랜드, 모델명, 등급",
    },
    {
      label: "상세 스펙",
      done: hasValidSpecs,
      description: "패턴, 그립, 주요 수치",
    },
    {
      label: "판매/재고",
      done: hasValidSalesInfo,
      description: "가격, 배송비, 재고, 할인",
    },
    {
      label: "대여 설정",
      done: hasValidRentalInfo,
      description: "대여 가능 여부와 요금",
    },
    {
      label: "이미지",
      done: hasImages,
      description: "최소 1장 이상",
    },
  ];

  const readyToSubmit = formReadinessChecks.every((item) => item.done);

  useEffect(() => {
    if (!shouldScrollAfterStepChangeRef.current || !stepContentRef.current) return;
    shouldScrollAfterStepChangeRef.current = false;
    requestAnimationFrame(() => {
      stepContentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      const f = stepContentRef.current?.querySelector<HTMLElement>(
        "input:not([type='hidden']):not([type='file']):not([disabled]), textarea:not([disabled]), button[role='combobox']:not([disabled]), [data-radix-select-trigger]:not([disabled])",
      );
      f?.focus?.({ preventScroll: true });
    });
  }, [currentStepIndex]);
  const go = (i: number) => {
    if (i < 0 || i >= STEPS.length) return;
    shouldScrollAfterStepChangeRef.current = true;
    setCurrentStepIndex(i);
  };

  const validateAndBuild = () => {
    const modelTrim = form.model.trim();
    const patternTrim = form.spec.pattern.trim();
    const gripTrim = form.spec.gripSize.trim();
    if (!form.brand) return [0, "브랜드를 선택하세요."] as const;
    if (!modelTrim || modelTrim.length < MODEL_MIN || modelTrim.length > MODEL_MAX)
      return [0, `모델명은 ${MODEL_MIN}~${MODEL_MAX}자입니다.`] as const;
    if (!isFiniteNumber(form.price) || Number(form.price) < PRICE_MIN)
      return [2, `가격은 ${PRICE_MIN}원 이상 입력하세요.`] as const;
    if (!nonNegative(form.shippingFee)) return [2, "배송비는 0 이상 숫자만 입력하세요."] as const;
    if (!isFiniteNumber(form.quantity) || Number(form.quantity) < 1)
      return [2, "보유 수량은 1 이상이어야 합니다."] as const;
    if (form.year != null) {
      const y = Number(form.year);
      const now = new Date().getFullYear();
      if (!Number.isFinite(y) || y < 1900 || y > now + 1)
        return [0, "연식(year)이 유효하지 않습니다."] as const;
    }
    if (
      !positiveOrNull(form.spec.weight) ||
      !positiveOrNull(form.spec.balance) ||
      !positiveOrNull(form.spec.headSize) ||
      !positiveOrNull(form.spec.lengthIn) ||
      !positiveOrNull(form.spec.swingWeight) ||
      !positiveOrNull(form.spec.stiffnessRa)
    )
      return [1, "스펙 수치는 1 이상 숫자만 입력하세요."] as const;
    const normalizedPattern = normalizeAndValidateStringPattern(patternTrim);
    const normalizedGripSize = normalizeAndValidateGripSize(gripTrim);
    if (!normalizedPattern || !normalizedGripSize)
      return [1, "스트링 패턴/그립 사이즈를 선택하세요."] as const;
    if (!form.rental.enabled && !form.rental.disabledReason?.trim())
      return [2, "대여 불가 사유를 입력하세요."] as const;
    if (
      form.rental.enabled &&
      (!nonNegative(form.rental.deposit) ||
        !nonNegative(form.rental.fee.d7) ||
        !nonNegative(form.rental.fee.d15) ||
        !nonNegative(form.rental.fee.d30))
    )
      return [2, "보증금/대여료는 0 이상 숫자만 입력하세요."] as const;
    if (
      form.marketing.isSale &&
      (!isFiniteNumber(form.marketing.salePrice) || Number(form.marketing.salePrice) < 1)
    )
      return [2, "할인 상품은 할인가를 1원 이상 입력하세요."] as const;
    if (form.marketing.isSale && Number(form.marketing.salePrice) >= Number(form.price))
      return [2, "할인가는 정가보다 낮아야 합니다."] as const;
    return [
      null,
      {
        ...form,
        model: modelTrim,
        year: form.year != null ? Number(form.year) : null,
        price: Number(form.price || 0),
        shippingFee: Math.max(0, Number(form.shippingFee || 0)),
        quantity: Math.max(1, Number(form.quantity || 1)),
        spec: {
          ...form.spec,
          weight: form.spec.weight != null ? Number(form.spec.weight) : null,
          balance: form.spec.balance != null ? Number(form.spec.balance) : null,
          headSize: form.spec.headSize != null ? Number(form.spec.headSize) : null,
          lengthIn: form.spec.lengthIn != null ? Number(form.spec.lengthIn) : null,
          swingWeight: form.spec.swingWeight != null ? Number(form.spec.swingWeight) : null,
          stiffnessRa: form.spec.stiffnessRa != null ? Number(form.spec.stiffnessRa) : null,
          pattern: normalizedPattern,
          gripSize: normalizedGripSize,
        },
        rental: {
          enabled: !!form.rental.enabled,
          deposit: Number(form.rental.deposit || 0),
          fee: {
            d7: Number(form.rental.fee.d7 || 0),
            d15: Number(form.rental.fee.d15 || 0),
            d30: Number(form.rental.fee.d30 || 0),
          },
          disabledReason: form.rental.enabled ? "" : form.rental.disabledReason?.trim() || "",
        },
        images: form.images || [],
        searchKeywords: searchKeywordsText
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      },
    ] as const;
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (currentStep.id !== "images") return;
        if (loading || submitRef.current) return;
        const [step, payloadOrMessage] = validateAndBuild();
        if (typeof step === "number") {
          go(step);
          showErrorToast(payloadOrMessage as string);
          return;
        }
        setLoading(true);
        submitRef.current = true;
        try {
          await onSubmit(payloadOrMessage as RacketForm);
          baselineRef.current = JSON.stringify({
            form: payloadOrMessage,
            searchKeywordsText,
          });
          showSuccessToast("저장되었습니다.");
        } catch {
          showErrorToast("저장 중 오류가 발생했습니다.");
        } finally {
          setLoading(false);
          submitRef.current = false;
        }
      }}
      className="space-y-4"
    >
      <div className={cn(adminSurface.stickyToolbar, "p-4")}>
        <div className="flex items-center justify-between">
          <h3 className={adminTypography.sectionTitle}>{initial ? "라켓 수정" : "라켓 등록"}</h3>
          <StepIndicator current={currentStepIndex + 1} total={STEPS.length} />
        </div>
        <p className={cn("mt-1", adminTypography.metaMuted)}>
          {initial ? "라켓 정보를 수정해주세요." : "새 라켓 정보를 입력해주세요."}
        </p>
        <div className="mt-3">
          <StepProgress
            steps={STEPS}
            currentStep={currentStep.id}
            completedSteps={completedSteps}
            onStepClick={(id) => {
              const idx = STEPS.findIndex((s) => s.id === id);
              if (idx >= 0) go(idx);
            }}
          />
        </div>
      </div>
      <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {RACKET_FORM_WORKFLOW_GUIDES.map(({ icon: Icon, title, description }) => (
          <div key={title} className={cn(adminSurface.cardMuted, "p-3")}>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <p className={adminTypography.bodyStrong}>{title}</p>
            </div>
            <p className={cn("mt-2", adminTypography.caption)}>{description}</p>
          </div>
        ))}
      </section>
      <div className="grid gap-2 lg:grid-cols-[1.2fr_1fr]">
        <div className={cn(adminSurface.cardMuted, "p-3")}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={adminTypography.bodyStrong}>현재 단계: {currentStep.label}</p>
              <p className={cn("mt-1", adminTypography.caption)}>
                라켓 정보는 단계 이동 중에도 유지됩니다. 저장 전 기본 정보, 스펙, 판매/대여 설정,
                이미지를 함께 확인하세요.
              </p>
            </div>
            <Badge variant={readyToSubmit ? "success" : "outline"} className="w-fit">
              {readyToSubmit ? "저장 준비 완료" : "작성 중"}
            </Badge>
          </div>
        </div>

        <div className={cn(adminSurface.cardMuted, "p-4")}>
          <p className={adminTypography.bodyStrong}>현재 입력 요약</p>
          <div className={cn("mt-2 grid gap-1", adminTypography.caption)}>
            <p>브랜드: {form.brand ? racketBrandLabel(form.brand) : "미선택"}</p>
            <p>모델명: {form.model.trim() || "미입력"}</p>
            <p>판매가: {Number(form.price || 0).toLocaleString("ko-KR")}원</p>
            <p>이미지: {form.images.length}장</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div ref={stepContentRef}>
          {currentStep.id === "basic" && (
            <FormSection
              title="기본 정보"
              description="라켓의 기본 정보를 입력하세요"
              icon={<FileText className="h-4 w-4" />}
            >
              <div
                className={cn("mb-4 border-primary/20 bg-primary/5 p-4", adminSurface.cardMuted)}
              >
                <p className={adminTypography.bodyStrong}>기본 정보 입력 순서</p>
                <p className={cn("mt-1", adminTypography.caption)}>
                  브랜드와 모델명은 고객 목록과 검색 결과에 바로 노출됩니다. 모델명은 2~80자 범위로
                  입력하세요.
                </p>
              </div>
              <FormFieldGroup columns={2}>
                <FormField label="브랜드" required>
                  <Select
                    value={form.brand}
                    onValueChange={(v: RacketBrand) => setForm({ ...form, brand: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="브랜드 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {RACKET_BRANDS.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="모델" required>
                  <Input
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                  />
                </FormField>
                <FormField label="연식">
                  <Input
                    type="number"
                    value={form.year ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        year: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </FormField>
                <FormField label="상태 등급">
                  <Select
                    value={form.condition}
                    onValueChange={(value: RacketCondition) =>
                      setForm({ ...form, condition: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A급</SelectItem>
                      <SelectItem value="B">B급</SelectItem>
                      <SelectItem value="C">C급</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </FormFieldGroup>
              <FormField label="검색 키워드" className="mt-6">
                <Input
                  value={searchKeywordsText}
                  onChange={(e) => setSearchKeywordsText(e.target.value)}
                />
              </FormField>
            </FormSection>
          )}
          {currentStep.id === "specs" && (
            <FormSection
              title="상세 스펙"
              description="라켓 상세 스펙"
              icon={<Settings className="h-4 w-4" />}
            >
              <div
                className={cn("mb-4 border-primary/20 bg-primary/5 p-4", adminSurface.cardMuted)}
              >
                <p className={adminTypography.bodyStrong}>스펙 입력 안내</p>
                <p className={cn("mt-1", adminTypography.caption)}>
                  무게, 밸런스, 헤드 사이즈 같은 수치는 선택 필드지만, 입력 시 1 이상의 숫자만
                  허용됩니다. 스트링 패턴과 그립 사이즈는 반드시 선택해야 합니다.
                </p>
              </div>
              <FormFieldGroup columns={2}>
                <FormField label="무게(g)">
                  <Input
                    type="number"
                    value={form.spec.weight ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: {
                          ...form.spec,
                          weight: e.target.value ? Number(e.target.value) : null,
                        },
                      })
                    }
                  />
                </FormField>
                <FormField label="밸런스(mm)">
                  <Input
                    type="number"
                    value={form.spec.balance ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: {
                          ...form.spec,
                          balance: e.target.value ? Number(e.target.value) : null,
                        },
                      })
                    }
                  />
                </FormField>
                <FormField label="헤드 사이즈(in²)">
                  <Input
                    type="number"
                    value={form.spec.headSize ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: {
                          ...form.spec,
                          headSize: e.target.value ? Number(e.target.value) : null,
                        },
                      })
                    }
                  />
                </FormField>
                <FormField label="길이(in)">
                  <Input
                    type="number"
                    value={form.spec.lengthIn ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: {
                          ...form.spec,
                          lengthIn: e.target.value ? Number(e.target.value) : null,
                        },
                      })
                    }
                  />
                </FormField>
                <FormField label="스윙웨이트">
                  <Input
                    type="number"
                    value={form.spec.swingWeight ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: {
                          ...form.spec,
                          swingWeight: e.target.value ? Number(e.target.value) : null,
                        },
                      })
                    }
                  />
                </FormField>
                <FormField label="강성(RA)">
                  <Input
                    type="number"
                    value={form.spec.stiffnessRa ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: {
                          ...form.spec,
                          stiffnessRa: e.target.value ? Number(e.target.value) : null,
                        },
                      })
                    }
                  />
                </FormField>
                <FormField label="스트링 패턴">
                  <Select
                    value={form.spec.pattern || undefined}
                    onValueChange={(v) => setForm({ ...form, spec: { ...form.spec, pattern: v } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {STRING_PATTERN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="그립 사이즈">
                  <Select
                    value={form.spec.gripSize || undefined}
                    onValueChange={(v) => setForm({ ...form, spec: { ...form.spec, gripSize: v } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRIP_SIZE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </FormFieldGroup>
            </FormSection>
          )}
          {currentStep.id === "rental" && (
            <div className="space-y-6">
              <FormSection
                title="판매/재고 설정"
                description="가격, 배송비, 판매 상태, 보유 수량"
                icon={<DollarSign className="h-4 w-4" />}
              >
                <div
                  className={cn("mb-4 border-warning/30 bg-warning/10 p-4", adminSurface.cardMuted)}
                >
                  <p className={adminTypography.bodyStrong}>판매/대여 설정 안내</p>
                  <p className={cn("mt-1", adminTypography.caption)}>
                    가격, 배송비, 보유 수량은 주문과 대여 가능 여부에 직접 영향을 줍니다. 대여
                    불가인 경우 고객에게 보일 사유를 반드시 입력하세요.
                  </p>
                </div>
                <FormFieldGroup columns={2}>
                  <FormField label="가격" required>
                    <FormattedNumberInput
                      value={form.price}
                      onValueChange={(price) =>
                        setForm({
                          ...form,
                          price,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="배송비">
                    <FormattedNumberInput
                      value={form.shippingFee}
                      onValueChange={(shippingFee) =>
                        setForm({
                          ...form,
                          shippingFee,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="판매 상태">
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v as RacketStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">판매가능</SelectItem>
                        <SelectItem value="rented">대여중</SelectItem>
                        <SelectItem value="sold">판매완료</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="일반 사용자에게 상품 노출">
                    <div className="flex min-h-10 items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                      <div className="space-y-1">
                        <p className={adminTypography.bodyStrong}>
                          {form.isVisible ? "노출" : "숨김"}
                        </p>
                        <p className={adminTypography.caption}>
                          숨김이어도 관리자는 사용자 화면에서 미리보기와 결제 테스트를 할 수
                          있습니다.
                        </p>
                      </div>
                      <Switch
                        checked={form.isVisible}
                        onCheckedChange={(checked) =>
                          setForm({
                            ...form,
                            isVisible: checked,
                          })
                        }
                      />
                    </div>
                  </FormField>
                  <FormField label="보유 수량" required>
                    <Input
                      type="number"
                      value={form.quantity}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          quantity: Number(e.target.value || 1),
                        })
                      }
                    />
                  </FormField>
                </FormFieldGroup>
              </FormSection>
              <FormSection
                title="대여 설정"
                description="대여 가능 여부 및 기간별 요금"
                icon={<Boxes className="h-4 w-4" />}
              >
                <div className="flex items-center justify-between mb-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <Label>대여 가능</Label>
                  <Switch
                    checked={form.rental.enabled}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        rental: { ...form.rental, enabled: checked },
                      })
                    }
                  />
                </div>
                {!form.rental.enabled ? (
                  <FormField label="대여 불가 사유">
                    <Textarea
                      value={form.rental.disabledReason}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          rental: {
                            ...form.rental,
                            disabledReason: e.target.value,
                          },
                        })
                      }
                    />
                  </FormField>
                ) : (
                  <FormFieldGroup columns={2}>
                    <FormField label="보증금">
                      <FormattedNumberInput
                        value={form.rental.deposit}
                        onValueChange={(deposit) =>
                          setForm({
                            ...form,
                            rental: {
                              ...form.rental,
                              deposit,
                            },
                          })
                        }
                      />
                    </FormField>
                    <FormField label="7일 대여료">
                      <FormattedNumberInput
                        value={form.rental.fee.d7}
                        onValueChange={(d7) =>
                          setForm({
                            ...form,
                            rental: {
                              ...form.rental,
                              fee: {
                                ...form.rental.fee,
                                d7,
                              },
                            },
                          })
                        }
                      />
                    </FormField>
                    <FormField label="15일 대여료">
                      <FormattedNumberInput
                        value={form.rental.fee.d15}
                        onValueChange={(d15) =>
                          setForm({
                            ...form,
                            rental: {
                              ...form.rental,
                              fee: {
                                ...form.rental.fee,
                                d15,
                              },
                            },
                          })
                        }
                      />
                    </FormField>
                    <FormField label="30일 대여료">
                      <FormattedNumberInput
                        value={form.rental.fee.d30}
                        onValueChange={(d30) =>
                          setForm({
                            ...form,
                            rental: {
                              ...form.rental,
                              fee: {
                                ...form.rental.fee,
                                d30,
                              },
                            },
                          })
                        }
                      />
                    </FormField>
                  </FormFieldGroup>
                )}
              </FormSection>
              <FormSection
                title="노출 옵션"
                description="추천, 신상품, 할인 배지를 설정합니다."
                icon={<DollarSign className="h-4 w-4" />}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4">
                    <Label>추천 상품</Label>
                    <Switch
                      checked={form.marketing.isFeatured}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          marketing: { ...form.marketing, isFeatured: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4">
                    <Label>신상품</Label>
                    <Switch
                      checked={form.marketing.isNew}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          marketing: { ...form.marketing, isNew: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4">
                    <Label>할인 상품</Label>
                    <Switch
                      checked={form.marketing.isSale}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          marketing: { ...form.marketing, isSale: checked },
                        })
                      }
                    />
                  </div>
                </div>
                {form.marketing.isSale && (
                  <FormField label="할인가">
                    <FormattedNumberInput
                      value={form.marketing.salePrice}
                      onValueChange={(salePrice) =>
                        setForm({
                          ...form,
                          marketing: {
                            ...form.marketing,
                            salePrice,
                          },
                        })
                      }
                    />
                  </FormField>
                )}
              </FormSection>
            </div>
          )}
          {currentStep.id === "images" && (
            <FormSection
              title="이미지"
              description="이미지 업로드/대표 설정"
              icon={<ImageIcon className="h-4 w-4" />}
            >
              <div
                className={cn("mb-4 border-primary/20 bg-primary/5 p-4", adminSurface.cardMuted)}
              >
                <p className={adminTypography.bodyStrong}>이미지 등록 안내</p>
                <p className={cn("mt-1", adminTypography.caption)}>
                  대표 이미지는 목록과 상세 페이지에서 가장 먼저 보입니다. 최소 1장 이상 등록한 뒤
                  저장하세요.
                </p>
              </div>
              <ImageUploader
                value={form.images}
                onChange={(next) => setForm({ ...form, images: next })}
                max={10}
                variant="racket"
                enablePrimary
              />
            </FormSection>
          )}
          <div className={cn("mt-4 p-4", adminSurface.card)}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={adminTypography.panelTitle}>저장 전 체크리스트</p>
                <p className={cn("mt-1", adminTypography.metaMuted)}>
                  아래 항목을 확인한 뒤 라켓 정보를 저장하세요.
                </p>
              </div>
              <Badge variant={readyToSubmit ? "success" : "outline"}>
                {readyToSubmit ? "저장 가능" : "확인 필요"}
              </Badge>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {formReadinessChecks.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-lg border px-3 py-2",
                    item.done
                      ? "border-primary/30 bg-primary/5"
                      : "border-warning/30 bg-warning/10",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={adminTypography.bodyStrong}>{item.label}</p>
                    <Badge variant={item.done ? "success" : "outline"} className="shrink-0">
                      {item.done ? "완료" : "확인필요"}
                    </Badge>
                  </div>
                  <p className={cn("mt-1", adminTypography.caption)}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="hidden lg:block">
          <aside className={cn("sticky top-20 p-4 backdrop-blur-sm", adminSurface.card)}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className={adminTypography.caption}>라켓 미리보기</p>
                <h4 className={cn("mt-0.5", adminTypography.panelTitle)}>입력 요약</h4>
              </div>

              <Badge variant={readyToSubmit ? "success" : "outline"} className="text-xs">
                {readyToSubmit ? "저장 준비" : "작성 중"}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className={cn("p-3", adminSurface.cardMuted)}>
                <p className="line-clamp-2 text-base font-bold tracking-tight text-foreground">
                  {form.model.trim() || "모델명 미입력"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.brand ? racketBrandLabel(form.brand) : "브랜드 미선택"}
                  {form.year ? ` · ${form.year}년식` : ""}
                </p>

                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    {racketStatusLabel(form.status)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {form.condition}급
                  </Badge>
                  {form.marketing.isNew && (
                    <Badge variant="secondary" className="text-xs">
                      NEW
                    </Badge>
                  )}
                  {form.marketing.isFeatured && (
                    <Badge variant="secondary" className="text-xs">
                      추천
                    </Badge>
                  )}
                  {form.marketing.isSale &&
                    form.marketing.salePrice > 0 &&
                    form.marketing.salePrice < form.price && (
                      <Badge variant="destructive" className="text-xs">
                        SALE
                      </Badge>
                    )}
                </div>
              </div>

              <div className={cn("p-3", adminSurface.card)}>
                <p className="text-xs font-medium text-muted-foreground">판매가</p>

                {form.marketing.isSale &&
                form.marketing.salePrice > 0 &&
                form.marketing.salePrice < form.price ? (
                  <div className="mt-1">
                    <p className={cn(adminTypography.kpiValueCompact, "text-primary")}>
                      {Number(form.marketing.salePrice).toLocaleString("ko-KR")}원
                    </p>
                    <p className="text-xs text-muted-foreground line-through">
                      {Number(form.price || 0).toLocaleString("ko-KR")}원
                    </p>
                  </div>
                ) : (
                  <p className={cn("mt-1", adminTypography.kpiValueCompact)}>
                    {Number(form.price || 0).toLocaleString("ko-KR")}원
                  </p>
                )}

                <p className="mt-1 text-xs text-muted-foreground">
                  배송비 {Number(form.shippingFee || 0).toLocaleString("ko-KR")}원
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-center">
                  <p className={adminTypography.caption}>재고</p>
                  <p className={cn("mt-0.5", adminTypography.bodyStrong)}>
                    {Number(form.quantity || 0).toLocaleString("ko-KR")}
                  </p>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-center">
                  <p className={adminTypography.caption}>대여</p>
                  <p className={cn("mt-0.5", adminTypography.bodyStrong)}>
                    {form.rental.enabled ? "가능" : "불가"}
                  </p>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-center">
                  <p className={adminTypography.caption}>이미지</p>
                  <p className={cn("mt-0.5", adminTypography.bodyStrong)}>
                    {form.images.length}
                  </p>
                </div>
              </div>

              <div className={cn("p-3", adminSurface.card)}>
                <p className={adminTypography.bodyStrong}>핵심 스펙</p>

                <div className={cn("mt-2 grid gap-1.5", adminTypography.caption)}>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">무게</span>
                    <span className="font-medium text-foreground">{form.spec.weight ?? "-"}g</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">밸런스</span>
                    <span className="font-medium text-foreground">
                      {form.spec.balance ?? "-"}mm
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">패턴</span>
                    <span className="font-medium text-foreground">{form.spec.pattern || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">그립</span>
                    <span className="font-medium text-foreground">{form.spec.gripSize || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <StepNavigation
        currentStepIndex={currentStepIndex}
        totalSteps={STEPS.length}
        isSubmitting={loading}
        submitLabel={submitLabel}
        backHref="/admin/rackets"
        onPrevious={() => {
          setCompletedSteps((prev) => prev.filter((id) => id !== currentStep.id));
          go(currentStepIndex - 1);
        }}
        onNext={() => {
          setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep.id])));
          go(currentStepIndex + 1);
        }}
        onSubmit={() => undefined}
      />
    </form>
  );
}
