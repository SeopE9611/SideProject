"use client";

/** Responsibility: 새 스트링 등록 화면 표현 + 상호작용 오케스트레이션 뷰. */

import { brands, colors, gauges, materials } from "@/app/admin/products/_lib/productFormOptions";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { supabase } from "@/lib/supabase";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { adminFormHintTooltipClass } from "@/lib/tooltip-style";
import { cn } from "@/lib/utils";
import type {
  HybridSpecUnit,
  ProductColorInventory,
  ProductVariantInventory,
} from "@/types/admin/products";
import {
  Activity,
  Boxes,
  FileText,
  ImageIcon,
  Info,
  Loader2,
  Package,
  Palette,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Step } from "@/components/admin/product-form";
import {
  FormFieldGroup,
  FormSection,
  PRODUCT_FORM_STEPS,
  PerformanceSlider,
  PerformanceSummary,
  ProductPreviewCard,
  StepIndicator,
  StepNavigation,
  StepProgress,
} from "@/components/admin/product-form";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";

const AdminConfirmDialog = dynamic(() => import("@/components/admin/AdminConfirmDialog"), {
  loading: () => null,
});

const STEPS: Step[] = PRODUCT_FORM_STEPS;

// 신규 상품 등록 흐름 안내용 데이터입니다.
// 실제 저장 로직에는 영향을 주지 않는 표시 전용 UI 데이터입니다.
const PRODUCT_NEW_WORKFLOW_GUIDES = [
  {
    icon: FileText,
    title: "1. 기본 정보",
    description: "상품명, 브랜드, 재질, 가격, 상세 설명을 먼저 입력합니다.",
  },
  {
    icon: Palette,
    title: "2. 구매 옵션",
    description: "색상별 게이지 조합과 옵션별 재고를 설정합니다.",
  },
  {
    icon: Activity,
    title: "3. 성능/재고",
    description: "성능 점수, 노출 상태, 할인 여부, 재고 기준을 확인합니다.",
  },
  {
    icon: ImageIcon,
    title: "4. 이미지 저장",
    description: "대표 이미지와 상세 이미지를 등록한 뒤 최종 저장합니다.",
  },
];

export default function NewStringPage() {
  // 기본 정보
  const [basicInfo, setBasicInfo] = useState({
    name: "",
    sku: "",
    shortDescription: "",
    description: "",
    brand: "",
    material: "",
    gauge: "",
    color: "",
    length: "",
    price: 0,
    mountingFee: 0,
    shippingFee: 3000,
  });

  // 성능 및 특성 정보
  const [features, setFeatures] = useState({
    power: 60,
    control: 60,
    spin: 60,
    durability: 60,
    comfort: 60,
  });

  // 태그 정보
  const [tags, setTags] = useState({
    beginner: false,
    intermediate: false,
    advanced: false,
    baseline: false,
    serveVolley: false,
    allCourt: false,
    power: false,
  });

  // 재고 관리 정보
  const [inventory, setInventory] = useState({
    stock: 0,
    lowStock: 5,
    status: "instock", // 'instock' | 'outofstock' | 'backorder'
    manageStock: false,
    allowBackorder: false,
    isFeatured: false,
    isNew: false,
    isSale: false,
    salePrice: 0,
  });

  // 검색 키워드 입력값 (쉼표로 구분)
  const [searchKeywordsInput, setSearchKeywordsInput] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [colorInventories, setColorInventories] = useState<ProductColorInventory[]>([]);
  const [variantInventories, setVariantInventories] = useState<ProductVariantInventory[]>([]);
  const [gaugeInputsByColor, setGaugeInputsByColor] = useState<Record<string, string>>({});
  const defaultColorPickerValue = `${String.fromCharCode(35)}000000`;
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState(defaultColorPickerValue);
  const [customColorHexTouched, setCustomColorHexTouched] = useState(false);
  const [showGaugeStockToUser, setShowGaugeStockToUser] = useState(true);
  const formatPlainGaugeLabel = (value?: string | null) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";

    const normalized = raw.toLowerCase().replace(/mm/g, "").replace(/\s+/g, "").replace(",", ".");

    if (!/^\d+\.\d+$/.test(normalized)) return raw;
    return `${normalized}mm`;
  };
  const normalizeGaugeInput = (input: string) => {
    const normalized = input
      .trim()
      .toLowerCase()
      .replace(/mm/g, "")
      .replace(/\s+/g, "")
      .replace(",", ".");
    if (!/^\d+\.\d+$/.test(normalized)) return null;
    const numericValue = Number(normalized);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
    return { value: normalized, label: `${normalized}mm` };
  };
  const totalGaugeStock = useMemo(
    () =>
      variantInventories
        .filter((row) => !row.isSoldOut)
        .reduce((sum, row) => sum + (Number.isFinite(row.stock) ? row.stock : 0), 0),
    [variantInventories],
  );
  const getColorTotalStock = (colorValue: string) =>
    variantInventories
      .filter((row) => row.colorValue === colorValue && !row.isSoldOut)
      .reduce((sum, row) => sum + (Number.isFinite(row.stock) ? row.stock : 0), 0);
  const getGaugeTotalStock = (gaugeValue: string) =>
    variantInventories
      .filter((row) => row.gaugeValue === gaugeValue && !row.isSoldOut)
      .reduce((sum, row) => sum + (Number.isFinite(row.stock) ? row.stock : 0), 0);
  const gaugeSummaryRows = useMemo(() => {
    const values = Array.from(new Set(variantInventories.map((row) => row.gaugeValue)));
    return values.map((value) => {
      const variantGaugeLabel = variantInventories.find(
        (variant) => variant.gaugeValue === value,
      )?.gaugeLabel;
      return {
        value,
        label: formatPlainGaugeLabel(value) || variantGaugeLabel || `${value}mm`,
      };
    });
  }, [variantInventories]);
  const updateVariantStock = (colorValue: string, gaugeValue: string, stock: number) => {
    setVariantInventories((prev) =>
      prev.map((row) =>
        row.colorValue === colorValue && row.gaugeValue === gaugeValue
          ? { ...row, stock: Math.max(0, Number.isFinite(stock) ? stock : 0) }
          : row,
      ),
    );
  };
  const updateVariantSoldOut = (colorValue: string, gaugeValue: string, isSoldOut: boolean) => {
    setVariantInventories((prev) =>
      prev.map((row) =>
        row.colorValue === colorValue && row.gaugeValue === gaugeValue
          ? { ...row, isSoldOut }
          : row,
      ),
    );
  };
  const updateVariantShowWhenSoldOut = (
    colorValue: string,
    gaugeValue: string,
    showWhenSoldOut: boolean,
  ) => {
    setVariantInventories((prev) =>
      prev.map((row) =>
        row.colorValue === colorValue && row.gaugeValue === gaugeValue
          ? { ...row, showWhenSoldOut }
          : row,
      ),
    );
  };
  const addVariantForColor = (colorRow: ProductColorInventory) => {
    const rawInput = gaugeInputsByColor[colorRow.value] ?? "";
    const normalizedGauge = normalizeGaugeInput(rawInput);
    if (!normalizedGauge) {
      showErrorToast("게이지는 1.25처럼 숫자로 입력해주세요.");
      return;
    }
    setVariantInventories((prev) => {
      if (
        prev.some(
          (row) => row.colorValue === colorRow.value && row.gaugeValue === normalizedGauge.value,
        )
      ) {
        showErrorToast("이미 같은 색상에 추가된 게이지입니다.");
        return prev;
      }
      return [
        ...prev,
        {
          colorValue: colorRow.value,
          colorLabel: colorRow.label,
          colorHex: colorRow.colorHex,
          colorImage: colorRow.image ?? "",
          gaugeValue: normalizedGauge.value,
          gaugeLabel: normalizedGauge.label,
          stock: 0,
          isSoldOut: false,
          showWhenSoldOut: true,
        },
      ];
    });
    setGaugeInputsByColor((prev) => ({ ...prev, [colorRow.value]: "" }));
  };
  const removeVariantForColor = (colorValue: string, gaugeValue: string) => {
    setVariantInventories((prev) =>
      prev.filter((row) => !(row.colorValue === colorValue && row.gaugeValue === gaugeValue)),
    );
  };
  const removeColorOption = (colorValue: string) => {
    setColorInventories((prev) => prev.filter((row) => row.value !== colorValue));
    setVariantInventories((prev) => prev.filter((row) => row.colorValue !== colorValue));
    setGaugeInputsByColor((prev) => {
      const next = { ...prev };
      delete next[colorValue];
      return next;
    });
  };
  const normalizeCustomColorInput = (name: string, hex: string) => {
    const label = name.trim();
    if (!label) return null;
    const value = label.toLowerCase().replace(/\s+/g, "-");
    const normalizedHex = hex.trim();
    const colorHex =
      normalizedHex.length === 0
        ? ""
        : /^#?[0-9a-fA-F]{6}$/.test(normalizedHex)
          ? normalizedHex.startsWith("#")
            ? normalizedHex
            : `#${normalizedHex}`
          : null;
    return { value, label, colorHex };
  };
  const handleAddCustomColor = () => {
    const normalized = normalizeCustomColorInput(
      customColorName,
      customColorHexTouched ? customColorHex : "",
    );
    if (!normalized) return showErrorToast("색상명을 입력해주세요.");
    if (normalized.colorHex === null)
      return showErrorToast("색상 미리보기 값이 올바르지 않습니다.");
    const labelLower = normalized.label.trim().toLowerCase();
    const duplicated = colorInventories.some(
      (row) =>
        row.value === normalized.value ||
        String(row.label ?? "")
          .trim()
          .toLowerCase() === labelLower,
    );
    if (duplicated) return showErrorToast("이미 추가된 색상입니다.");
    setColorInventories((prev) => [
      ...prev,
      {
        value: normalized.value,
        label: normalized.label,
        colorHex: normalized.colorHex ?? "",
        image: "",
        stock: 0,
        isSoldOut: false,
      },
    ]);
    setCustomColorName("");
    setCustomColorHex(defaultColorPickerValue);
    setCustomColorHexTouched(false);
  };

  // 추가 특성 정보
  const [additionalFeatures, setAdditionalFeatures] = useState("");

  // Step wizard state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = STEPS[currentStepIndex];
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const stepContentRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollAfterStepChangeRef = useRef(false);

  const [images, setImages] = useState<string[]>([]);

  // 이미지 업로드 상태
  const [uploading, setUploading] = useState(false);

  // 제출(저장) 상태: 더블클릭/연타 레이스 방지
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef(false);

  useEffect(() => {
    setInventory((prev) => ({ ...prev, stock: totalGaugeStock }));
  }, [totalGaugeStock]);

  // 이미지 추가 핸들러
  const sanitizeFileName = (file: File) => {
    const timestamp = Date.now();
    const extension = file.name.split(".").pop();
    const base = file.name
      .replace(/\.[^/.]+$/, "") // 확장자 제거
      .replace(/[^a-zA-Z0-9_-]/g, ""); // 특수문자 제거

    return `${timestamp}-${base}.${extension}`;
  };

  const MAX_IMAGE_COUNT = 4; // 최대 업로드 가능한 이미지 수 제한
  const isMaxReached = images.length >= MAX_IMAGE_COUNT; // 최대 이미지 수 도달 여부

  const uploadProductImageFile = async (file: File): Promise<string | null> => {
    const fileName = sanitizeFileName(file);
    const { error } = await supabase.storage.from("tennis-images").upload(fileName, file);
    if (error) return null;
    const { data: publicData } = supabase.storage.from("tennis-images").getPublicUrl(fileName);
    return publicData?.publicUrl ?? null;
  };

  // 이미지 업로드 핸들러
  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const totalSelected = files.length;
    const availableSlots = MAX_IMAGE_COUNT - images.length;

    if (totalSelected > availableSlots) {
      e.target.value = "";
      showErrorToast(
        `최대 ${MAX_IMAGE_COUNT}장까지만 업로드할 수 있습니다. (${availableSlots}장만 추가 가능)`,
      );
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);
    setUploading(true);

    for (const file of filesToUpload) {
      const imageUrl = await uploadProductImageFile(file);
      if (!imageUrl) {
        // 업로드 실패: 다음 파일은 계속 진행하되, 실패 사실은 알려줌
        showErrorToast("이미지 업로드에 실패했습니다. 잠시 후 다시 시도하세요.");
        continue;
      }
      setImages((prev) => [...prev, imageUrl]);
    }

    setUploading(false);
    e.target.value = ""; // <- 동일 파일 다시 선택 가능하도록
  };

  // 하이브리드 구성(메인/크로스) 입력값 — material==='hybrid'일 때만 사용
  const [hybridMain, setHybridMain] = useState({
    brand: "",
    name: "",
    gauge: "",
    color: "",
    role: "mains" as const,
  });
  const [hybridCross, setHybridCross] = useState({
    brand: "",
    name: "",
    gauge: "",
    color: "",
    role: "cross" as const,
  });

  useEffect(() => {
    // 하이브리드일 때만 동기화
    if (basicInfo.material !== "hybrid") return;

    setBasicInfo((prev) => ({
      ...prev,
      brand: prev.brand || hybridMain.brand || prev.brand,
      gauge: prev.gauge || hybridMain.gauge || prev.gauge,
      color: prev.color || hybridMain.color || prev.color,
      length: prev.length || "12",
    }));
  }, [basicInfo.material, hybridMain.brand, hybridMain.gauge, hybridMain.color]);

  // 대표이미지 설정 핸들러
  const handleSetMainImage = (index: number) => {
    if (index === 0) return; // 이미 대표면 무시

    const selected = images[index];
    const remaining = images.filter((_, i) => i !== index);

    setImages([selected, ...remaining]);
  };

  // 이미지 삭제 핸들러
  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleUploadColorImage = async (
    colorValue: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const imageUrl = await uploadProductImageFile(file);
    setUploading(false);
    e.target.value = "";
    if (!imageUrl) {
      showErrorToast("색상 이미지 업로드에 실패했습니다. 잠시 후 다시 시도하세요.");
      return;
    }
    setColorInventories((prev) => {
      const next = prev.map((row) =>
        row.value === colorValue ? { ...row, image: imageUrl } : row,
      );
      setVariantInventories((variantPrev) =>
        variantPrev.map((row) =>
          row.colorValue === colorValue ? { ...row, colorImage: imageUrl } : row,
        ),
      );
      return next;
    });
  };

  // 상품명 + 브랜드 기준으로 간단한 검색 키워드 자동 생성
  const handleGenerateKeywords = () => {
    const base = `${basicInfo.name ?? ""} ${basicInfo.brand ?? ""}`.trim();
    if (!base) {
      showErrorToast("먼저 스트링명과 브랜드를 입력해 주세요.");
      return;
    }

    // 공백 / 괄호 / 슬래시 / + 기준으로 토큰 분리
    const tokens = base
      .split(/[\s,()/+]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

    // 중복 제거 + 소문자 통일
    const unique = Array.from(new Set(tokens.map((t) => t.toLowerCase())));

    setSearchKeywordsInput(unique.join(", "));
  };

  const router = useRouter(); // 페이지 이동을 위한 라우터

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        basicInfo,
        features,
        tags,
        inventory,
        isVisible,
        searchKeywordsInput,
        additionalFeatures,
        images,
        hybridMain,
        hybridCross,

        // 구매 옵션/재고 관련 상태도 이탈 경고 기준에 포함합니다.
        colorInventories,
        variantInventories,
        gaugeInputsByColor,
        customColorName,
        customColorHex,
        customColorHexTouched,
        showGaugeStockToUser,

        // 현재 작성 단계도 변경 상태에 포함합니다.
        currentStepIndex,
        completedSteps,
      }),
    [
      basicInfo,
      features,
      tags,
      inventory,
      searchKeywordsInput,
      additionalFeatures,
      images,
      hybridMain,
      hybridCross,
      colorInventories,
      variantInventories,
      gaugeInputsByColor,
      customColorName,
      customColorHex,
      customColorHexTouched,
      showGaugeStockToUser,
      currentStepIndex,
      completedSteps,
    ],
  );

  const baselineRef = useRef<string | null>(null);
  useEffect(() => {
    if (baselineRef.current === null) baselineRef.current = snapshot;
  }, [snapshot]);

  const isDirty = baselineRef.current !== null && baselineRef.current !== snapshot;
  useUnsavedChangesGuard(isDirty && !submitting && !uploading);

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const confirmLeave = (e: React.MouseEvent) => {
    if (!isDirty || submitting || uploading) return;
    e.preventDefault();
    e.stopPropagation();
    setLeaveDialogOpen(true);
  };

  // Step navigation
  const goToNextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      if (!completedSteps.includes(currentStep.id)) {
        setCompletedSteps((prev) => [...prev, currentStep.id]);
      }
      shouldScrollAfterStepChangeRef.current = true;
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      shouldScrollAfterStepChangeRef.current = true;
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const goToStep = (stepId: string) => {
    const index = STEPS.findIndex((s) => s.id === stepId);
    if (index !== -1) {
      shouldScrollAfterStepChangeRef.current = true;
      setCurrentStepIndex(index);
    }
  };

  useEffect(() => {
    if (!shouldScrollAfterStepChangeRef.current) return;
    shouldScrollAfterStepChangeRef.current = false;

    requestAnimationFrame(() => {
      const container = stepContentRef.current;
      if (!container) return;

      container.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstFocusable = container.querySelector<HTMLElement>(
        "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), button[role=combobox]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      firstFocusable?.focus({ preventScroll: true });
    });
  }, [currentStepIndex]);

  // 신규 등록 성공 후 폼 초기화
  const resetNewProductForm = () => {
    setBasicInfo({
      name: "",
      sku: "",
      shortDescription: "",
      description: "",
      brand: "",
      material: "",
      gauge: "",
      color: "",
      length: "",
      price: 0,
      mountingFee: 0,
      shippingFee: 3000,
    });

    setFeatures({
      power: 60,
      control: 60,
      spin: 60,
      durability: 60,
      comfort: 60,
    });

    setTags({
      beginner: false,
      intermediate: false,
      advanced: false,
      baseline: false,
      serveVolley: false,
      allCourt: false,
      power: false,
    });

    setInventory({
      stock: 0,
      lowStock: 5,
      status: "instock",
      manageStock: false,
      allowBackorder: false,
      isFeatured: false,
      isNew: false,
      isSale: false,
      salePrice: 0,
    });

    setSearchKeywordsInput("");
    setColorInventories([]);
    setVariantInventories([]);
    setGaugeInputsByColor({});
    setCustomColorName("");
    setCustomColorHex(defaultColorPickerValue);
    setCustomColorHexTouched(false);
    setShowGaugeStockToUser(true);
    setAdditionalFeatures("");
    setImages([]);
    setHybridMain({
      brand: "",
      name: "",
      gauge: "",
      color: "",
      role: "mains",
    });
    setHybridCross({
      brand: "",
      name: "",
      gauge: "",
      color: "",
      role: "cross",
    });
    setCurrentStepIndex(0);
    setCompletedSteps([]);
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep.id !== "images") return;

    // 중복 제출/업로드 중 제출 방지
    if (submitting || submitRef.current) return;
    if (uploading) {
      showErrorToast("이미지 업로드 중입니다. 업로드가 끝난 뒤 저장해 주세요.");
      return;
    }

    // 색션명 상수
    const SECTIONS = {
      BASIC: "기본정보",
      PERFORMANCE: "성능 및 특성",
      INVENTORY: "재고관리",
      IMAGE: "이미지",
    };

    // 기본 유효성 검사
    if (!basicInfo.name.trim()) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.BASIC} 미입력]</strong>
          <br />
          '상품명을 입력해주세요.'
        </>,
      );
      goToStep("basic");
      return;
    }

    if (basicInfo.price <= 0) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.BASIC} 미입력]</strong>
          <br /> '금액을 입력해주세요.'
        </>,
      );
      goToStep("basic");
      return;
    }

    if (!basicInfo.description.trim()) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.BASIC} 미입력]</strong>
          <br /> '상세 설명을 입력해주세요.'
        </>,
      );
      goToStep("basic");
      return;
    }

    // 이미 기본값으로 3이 설정되어있어서 오류가 생기지는 않겠지만 예방차원에 로직 추가
    const featureValues = Object.values(features);
    if (featureValues.some((value) => value < 1 || value > 100)) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.PERFORMANCE}] 미입력</strong> <br />
          '모든 성능 항목은 1~100 사이 값으로 설정되어야 합니다.'
        </>,
      );
      goToStep("features");
      return;
    }

    if (images.length === 0) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.IMAGE}] 미입력</strong> <br />
          '최소 1장의 이미지를 업로드해야 합니다.'
        </>,
      );
      goToStep("images");
      return;
    }

    if (inventory.isSale && inventory.salePrice >= basicInfo.price) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.INVENTORY}] 미입력</strong> <br />
          '할인가는 정가보다 낮아야 합니다.'
        </>,
      );
      goToStep("inventory");
      return;
    }

    if (inventory.stock < 0) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.INVENTORY}] 미입력</strong> <br />
          '재고 수량은 0 이상이어야 합니다.'
        </>,
      );
      goToStep("inventory");
      return;
    }

    const resolvedStock = totalGaugeStock;
    if (inventory.lowStock < 0 || inventory.lowStock > resolvedStock) {
      showErrorToast(
        <>
          <strong>[재고관리 오류]</strong> <br />
          '재고 부족 기준은 0 이상이며 재고 수량보다 많을 수 없습니다.'
        </>,
      );
      goToStep("inventory");
      return;
    }

    if (colorInventories.length === 0) {
      goToStep("options");
      showErrorToast("색상을 최소 1개 이상 선택해주세요.");
      return;
    }

    if (variantInventories.length === 0) {
      goToStep("options");
      showErrorToast("각 색상마다 최소 1개 이상의 게이지를 추가해주세요.");
      return;
    }
    const hasColorWithoutVariant = colorInventories.some(
      (colorRow) => !variantInventories.some((variant) => variant.colorValue === colorRow.value),
    );
    if (hasColorWithoutVariant) {
      goToStep("options");
      showErrorToast("각 색상마다 최소 1개 이상의 게이지를 추가해주세요.");
      return;
    }
    if (
      variantInventories.some((row) => !Number.isFinite(Number(row.stock)) || Number(row.stock) < 0)
    ) {
      goToStep("options");
      showErrorToast("조합 재고 수량은 0 이상 숫자로 입력해주세요.");
      return;
    }
    if (variantInventories.some((row) => !row.isSoldOut && Number(row.stock) < 1)) {
      goToStep("options");
      showErrorToast("품절이 아닌 조합은 재고 수량을 1개 이상 입력해주세요.");
      return;
    }
    // specifications 영문 키로 미리 구성
    const specifications: {
      material: string;
      gauge: string;
      color: string;
      length: string;
      hybrid?: { main: HybridSpecUnit; cross: HybridSpecUnit };
    } = {
      material: basicInfo.material,
      gauge: basicInfo.gauge,
      color: basicInfo.color,
      length: basicInfo.length,
    };

    if (basicInfo.material === "hybrid") {
      const hasMain = hybridMain.brand || hybridMain.name || hybridMain.gauge || hybridMain.color;
      const hasCross =
        hybridCross.brand || hybridCross.name || hybridCross.gauge || hybridCross.color;
      if (hasMain || hasCross) {
        specifications.hybrid = {
          main: { ...hybridMain },
          cross: { ...hybridCross },
        };
      }
    }

    const searchKeywords = searchKeywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    const normalizedVariants = variantInventories.map((row) => ({
      ...row,
      stock: Math.max(0, Number(row.stock) || 0),
      colorImage: row.colorImage ?? colorInventories.find((c) => c.value === row.colorValue)?.image,
      showWhenSoldOut: row.showWhenSoldOut !== false,
    }));
    const colorOptions = colorInventories.map((row) => row.value);
    const gaugeOptions = Array.from(new Set(normalizedVariants.map((row) => row.gaugeValue)));
    const normalizedGauge = gaugeOptions[0] ?? basicInfo.gauge ?? "";
    const normalizedColor = colorOptions[0] ?? basicInfo.color ?? "";
    const normalizedColorInventories = colorInventories.map((colorRow) => {
      const rows = normalizedVariants.filter((row) => row.colorValue === colorRow.value);
      const stock = rows.filter((row) => !row.isSoldOut).reduce((sum, row) => sum + row.stock, 0);
      return {
        ...colorRow,
        image: colorRow.image ?? rows[0]?.colorImage ?? "",
        stock,
        isSoldOut: rows.every((row) => row.isSoldOut) || stock === 0,
      };
    });
    const normalizedGaugeInventories = gaugeSummaryRows.map((gaugeRow) => {
      const rows = normalizedVariants.filter((row) => row.gaugeValue === gaugeRow.value);
      const stock = rows.filter((row) => !row.isSoldOut).reduce((sum, row) => sum + row.stock, 0);
      const variantGaugeLabel = normalizedVariants.find(
        (variant) => variant.gaugeValue === gaugeRow.value,
      )?.gaugeLabel;
      return {
        ...gaugeRow,
        label: formatPlainGaugeLabel(gaugeRow.value) || variantGaugeLabel || `${gaugeRow.value}mm`,
        stock,
        isSoldOut: rows.every((row) => row.isSoldOut) || stock === 0,
      };
    });
    const normalizedGaugeStockTotal = normalizedVariants
      .filter((row) => !row.isSoldOut)
      .reduce((sum, row) => sum + row.stock, 0);

    const product = {
      ...basicInfo,
      gauge: normalizedGauge,
      gaugeOptions,
      gaugeInventories: normalizedGaugeInventories,
      color: normalizedColor,
      colorOptions,
      colorInventories: normalizedColorInventories,
      variantInventories: normalizedVariants,
      searchKeywords,
      isVisible,
      features: { ...features },
      tags: { ...tags },
      specifications: { ...specifications, gauge: normalizedGauge },
      additionalFeatures,
      images,
      inventory: {
        ...inventory,
        stock: normalizedGaugeStockTotal,
        hideGaugeStock: !showGaugeStockToUser,
      },
    };
    // API 전송 로직 위치

    setSubmitting(true);
    submitRef.current = true;
    try {
      const data = await adminMutator<{ id: string }>("/api/admin/products", {
        // API 겨로
        method: "POST", // POST 요청
        headers: {
          // 헤더 설정
          "Content-Type": "application/json", // JSON 형식
        },
        body: JSON.stringify(product), // JSON 문자열로 변환
      });

      showSuccessToast("상품이 등록되었습니다.");

      // 등록 성공 후 새 상품 등록 화면에 입력값이 남지 않도록 즉시 초기화합니다.
      resetNewProductForm();

      // 브라우저 뒤로가기로 방금 작성한 dirty form에 다시 돌아오지 않도록 replace를 사용합니다.
      router.replace(`/admin/products/${data.id}/edit`);
    } catch (error) {
      // 상품 등록 중 에러 발생시
      showErrorToast(
        getAdminErrorMessage(error) || "서버 오류가 발생했습니다. 잠시 후에 다시 시도하세요.",
      );
    } finally {
      setSubmitting(false);
      submitRef.current = false;
    }
  };

  // Unique gauge count for preview
  const uniqueGaugeCount = useMemo(() => {
    return new Set(variantInventories.map((v) => v.gaugeValue)).size;
  }, [variantInventories]);
  // 저장 전 준비 상태를 화면에 보여주기 위한 표시용 계산입니다.
  // handleSubmit의 실제 검증/저장 로직은 그대로 유지합니다.
  const hasRequiredBasicInfo =
    basicInfo.name.trim().length > 0 &&
    basicInfo.price > 0 &&
    basicInfo.description.trim().length > 0;

  const hasColorOptions = colorInventories.length > 0;

  const hasColorWithoutVariant = colorInventories.some(
    (colorRow) => !variantInventories.some((variant) => variant.colorValue === colorRow.value),
  );

  const hasVariantOptions = variantInventories.length > 0 && !hasColorWithoutVariant;

  const hasValidVariantStocks =
    variantInventories.length > 0 &&
    variantInventories.every((row) => row.isSoldOut || Number(row.stock) >= 1);

  const hasValidPerformanceValues = Object.values(features).every(
    (value) => value >= 1 && value <= 100,
  );

  const hasValidInventorySettings =
    inventory.lowStock >= 0 &&
    inventory.lowStock <= totalGaugeStock &&
    (!inventory.isSale || inventory.salePrice < basicInfo.price);

  const hasProductImage = images.length > 0;

  const formReadinessChecks = [
    {
      label: "기본 정보",
      done: hasRequiredBasicInfo,
      description: "상품명, 가격, 상세 설명",
    },
    {
      label: "구매 옵션",
      done: hasColorOptions && hasVariantOptions && hasValidVariantStocks,
      description: "색상, 게이지, 조합 재고",
    },
    {
      label: "성능 특성",
      done: hasValidPerformanceValues,
      description: "성능 점수 1~100",
    },
    {
      label: "재고/노출",
      done: hasValidInventorySettings,
      description: "재고 부족 기준, 할인 설정",
    },
    {
      label: "이미지",
      done: hasProductImage,
      description: "최소 1장 이상",
    },
  ];

  const readyToSubmit = formReadinessChecks.every((item) => item.done);
  return (
    <>
      <AdminPageShell variant="wide">
        <form onSubmit={handleSubmit} className="space-y-6">
          <AdminPageHeader
            title="스트링 등록"
            description={basicInfo.name || "새로운 테니스 스트링 정보를 입력하고 등록하세요."}
            icon={Package}
            actions={<StepIndicator current={currentStepIndex + 1} total={STEPS.length} />}
          />
            {/* 등록 흐름 안내 */}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {PRODUCT_NEW_WORKFLOW_GUIDES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className={cn(adminSurface.cardMuted, "p-4")}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className={adminTypography.bodyStrong}>{title}</p>
                  </div>
                  <p className={cn("mt-2", adminTypography.caption)}>{description}</p>
                </div>
              ))}
            </div>
            <>
              {/* Step Progress */}
              <div className={cn(adminSurface.cardMuted, "p-6 backdrop-blur-sm")}>
                <StepProgress
                  steps={STEPS}
                  currentStep={currentStep.id}
                  completedSteps={completedSteps}
                  onStepClick={goToStep}
                />
              </div>
              {/* 현재 작성 상태 요약 */}
              <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
                <div className={cn(adminSurface.cardMuted, "p-4")}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={adminTypography.bodyStrong}>현재 단계: {currentStep.label}</p>
                      <p className={cn("mt-1", adminTypography.caption)}>
                        입력한 내용은 단계 이동 중에도 유지됩니다. 최종 저장은 이미지 단계에서
                        진행됩니다.
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
                    <p>색상 옵션: {colorInventories.length}개</p>
                    <p>게이지 조합: {variantInventories.length}개</p>
                    <p>총 재고: {totalGaugeStock.toLocaleString("ko-KR")}개</p>
                    <p>
                      이미지: {images.length} / {MAX_IMAGE_COUNT}장
                    </p>
                  </div>
                </div>
              </div>
              {/* Main Content - 2 Column Layout */}
              <div className="flex flex-col gap-6 lg:flex-row">
                {/* Left: Form Content */}
                <div ref={stepContentRef} className="flex-1 space-y-6 scroll-mt-24">
                  {/* Step 1: Basic Info */}
                  {currentStep.id === "basic" && (
                    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                      <FormSection
                        title="기본 정보"
                        description="스트링의 기본 정보를 입력하세요."
                        icon={<FileText className="h-5 w-5" />}
                      >
                        <div className="space-y-6">
                          <FormFieldGroup columns={2}>
                            <div className="space-y-2">
                              <Label htmlFor="string-name">
                                스트링명 <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="string-name"
                                placeholder="예: Luxilon ALU Power"
                                value={basicInfo.name}
                                onChange={(e) =>
                                  setBasicInfo({
                                    ...basicInfo,
                                    name: e.target.value,
                                  })
                                }
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="string-sku">SKU (재고 관리 코드)</Label>
                              <Input
                                id="string-sku"
                                placeholder="예: STR-LUX-001"
                                value={basicInfo.sku}
                                onChange={(e) =>
                                  setBasicInfo({
                                    ...basicInfo,
                                    sku: e.target.value,
                                  })
                                }
                                className="h-11"
                              />
                            </div>
                          </FormFieldGroup>

                          <div className="space-y-2">
                            <Label htmlFor="string-search-keywords">
                              검색 키워드 (쉼표로 구분)
                            </Label>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <Input
                                id="string-search-keywords"
                                placeholder="예: 챔피언, 챔피언스 초이스, 듀오, ALU"
                                value={searchKeywordsInput}
                                onChange={(e) => setSearchKeywordsInput(e.target.value)}
                                className="h-11"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="shrink-0"
                                onClick={handleGenerateKeywords}
                              >
                                <Sparkles className="mr-2 h-4 w-4" />
                                자동 생성
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              검색창에서 이 키워드들로도 상품을 찾을 수 있습니다
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="string-short-description">짧은 설명</Label>
                            <Textarea
                              id="string-short-description"
                              placeholder="스트링에 대한 짧은 설명을 입력하세요"
                              className="min-h-[100px] resize-none"
                              value={basicInfo.shortDescription}
                              onChange={(e) =>
                                setBasicInfo({
                                  ...basicInfo,
                                  shortDescription: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="string-description">
                              상세 설명 <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id="string-description"
                              placeholder="스트링에 대한 상세 설명을 입력하세요"
                              className="min-h-[180px] resize-none"
                              value={basicInfo.description}
                              onChange={(e) =>
                                setBasicInfo({
                                  ...basicInfo,
                                  description: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </FormSection>

                      <FormSection
                        title="상품 분류"
                        description="브랜드와 소재 정보를 선택하세요."
                        icon={<Target className="h-5 w-5" />}
                      >
                        <FormFieldGroup columns={2}>
                          <div className="space-y-2">
                            <Label htmlFor="string-brand">브랜드</Label>
                            <Select
                              value={basicInfo.brand}
                              onValueChange={(value) =>
                                setBasicInfo({ ...basicInfo, brand: value })
                              }
                            >
                              <SelectTrigger id="string-brand" className="h-11">
                                <SelectValue placeholder="브랜드 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {brands.map((brand) => (
                                  <SelectItem key={brand.id} value={brand.id}>
                                    {brand.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="string-material">소재</Label>
                            <Select
                              value={basicInfo.material}
                              onValueChange={(value) =>
                                setBasicInfo({ ...basicInfo, material: value })
                              }
                            >
                              <SelectTrigger id="string-material" className="h-11">
                                <SelectValue placeholder="소재 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {materials.map((material) => (
                                  <SelectItem key={material.id} value={material.id}>
                                    {material.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="string-color">대표 색상(목록/필터용)</Label>
                            <Select
                              value={basicInfo.color}
                              onValueChange={(value) =>
                                setBasicInfo({ ...basicInfo, color: value })
                              }
                            >
                              <SelectTrigger id="string-color" className="h-11">
                                <SelectValue placeholder="색상 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {colors.map((color) => (
                                  <SelectItem key={color.id} value={color.id}>
                                    {color.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              실제 구매 색상은 구매 옵션에서 색상별로 관리됩니다.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="string-length">길이 (m)</Label>
                            <Select
                              value={basicInfo.length}
                              onValueChange={(value) =>
                                setBasicInfo({ ...basicInfo, length: value })
                              }
                            >
                              <SelectTrigger id="string-length" className="h-11">
                                <SelectValue placeholder="길이 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="12.2">12.2m</SelectItem>
                                <SelectItem value="12">12m</SelectItem>
                                <SelectItem value="11.7">11.7m</SelectItem>
                                <SelectItem value="6.1">6.1m (하프셋)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </FormFieldGroup>
                      </FormSection>

                      {basicInfo.material === "hybrid" && (
                        <FormSection
                          title="하이브리드 구성"
                          description="메인/크로스 스트링 정보를 입력하세요."
                          icon={<Palette className="h-5 w-5" />}
                        >
                          <div className="grid gap-6 md:grid-cols-2">
                            {/* Main String */}
                            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                              <h4 className="font-semibold text-foreground">메인 (Mains)</h4>
                              <div className="space-y-3">
                                <div className="space-y-1.5">
                                  <Label>브랜드</Label>
                                  <Select
                                    value={hybridMain.brand}
                                    onValueChange={(v) =>
                                      setHybridMain((s) => ({ ...s, brand: v }))
                                    }
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="브랜드 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {brands.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                          {b.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label>제품명</Label>
                                  <Input
                                    placeholder="예: RPM Blast"
                                    value={hybridMain.name}
                                    onChange={(e) =>
                                      setHybridMain((s) => ({
                                        ...s,
                                        name: e.target.value,
                                      }))
                                    }
                                    className="h-10"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label>게이지</Label>
                                  <Select
                                    value={hybridMain.gauge}
                                    onValueChange={(v) =>
                                      setHybridMain((s) => ({ ...s, gauge: v }))
                                    }
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="게이지 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {gauges.map((g) => (
                                        <SelectItem key={g.id} value={g.id}>
                                          {g.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label>색상</Label>
                                  <Select
                                    value={hybridMain.color}
                                    onValueChange={(v) =>
                                      setHybridMain((s) => ({ ...s, color: v }))
                                    }
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="색상 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {colors.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                          {c.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* Cross String */}
                            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                              <h4 className="font-semibold text-foreground">크로스 (Crosses)</h4>
                              <div className="space-y-3">
                                <div className="space-y-1.5">
                                  <Label>브랜드</Label>
                                  <Select
                                    value={hybridCross.brand}
                                    onValueChange={(v) =>
                                      setHybridCross((s) => ({
                                        ...s,
                                        brand: v,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="브랜드 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {brands.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                          {b.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label>제품명</Label>
                                  <Input
                                    placeholder="예: Touch VS"
                                    value={hybridCross.name}
                                    onChange={(e) =>
                                      setHybridCross((s) => ({
                                        ...s,
                                        name: e.target.value,
                                      }))
                                    }
                                    className="h-10"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label>게이지</Label>
                                  <Select
                                    value={hybridCross.gauge}
                                    onValueChange={(v) =>
                                      setHybridCross((s) => ({
                                        ...s,
                                        gauge: v,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="게이지 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {gauges.map((g) => (
                                        <SelectItem key={g.id} value={g.id}>
                                          {g.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label>색상</Label>
                                  <Select
                                    value={hybridCross.color}
                                    onValueChange={(v) =>
                                      setHybridCross((s) => ({
                                        ...s,
                                        color: v,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="색상 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {colors.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                          {c.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>
                        </FormSection>
                      )}

                      <FormSection
                        title="가격 정보"
                        description="소비자 가격과 장착 서비스 비용을 설정해주세요."
                        icon={<Target className="h-5 w-5" />}
                      >
                        <FormFieldGroup columns={3}>
                          <div className="space-y-2">
                            <Label htmlFor="string-regular-price">
                              가격 <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <FormattedNumberInput
                                id="string-regular-price"
                                placeholder="0"
                                value={basicInfo.price}
                                onValueChange={(price) => {
                                  setBasicInfo({
                                    ...basicInfo,
                                    price,
                                  });
                                }}
                                className="h-11 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                원
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="string-stringing-fee">
                              장착 서비스 비용
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="ml-1 inline h-4 w-4 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    align="center"
                                    sideOffset={4}
                                    className={adminFormHintTooltipClass}
                                  >
                                    <p>해당 스트링을 이용한 장착 서비스 비용을 입력하세요.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </Label>
                            <div className="relative">
                              <FormattedNumberInput
                                id="string-stringing-fee"
                                placeholder="0"
                                value={basicInfo.mountingFee ?? 0}
                                onValueChange={(mountingFee) => {
                                  setBasicInfo({
                                    ...basicInfo,
                                    mountingFee,
                                  });
                                }}
                                className="h-11 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                원
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="string-shipping-fee">배송비</Label>
                            <div className="relative">
                              <FormattedNumberInput
                                id="string-shipping-fee"
                                placeholder="3000"
                                value={basicInfo.shippingFee}
                                onValueChange={(shippingFee) => {
                                  setBasicInfo({
                                    ...basicInfo,
                                    shippingFee: Math.max(0, shippingFee),
                                  });
                                }}
                                className="h-11 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                원
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">0 입력 시 무료배송</p>
                          </div>
                        </FormFieldGroup>
                      </FormSection>
                    </div>
                  )}

                  {/* Step 2: Purchase Options */}
                  {currentStep.id === "options" && (
                    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                      <FormSection
                        title="구매 옵션"
                        description="색상/게이지 옵션별 재고 및 품절 상태를 관리하세요."
                        icon={<Palette className="h-5 w-5" />}
                      >
                        <div className="space-y-6">
                          <div
                            className={cn(adminSurface.cardMuted, "border-primary/20 bg-primary/5 p-4")}
                          >
                            <p className={adminTypography.bodyStrong}>
                              구매 옵션 입력 순서
                            </p>
                            <p className={cn("mt-1", adminTypography.caption)}>
                              먼저 색상을 추가하고, 각 색상 카드 안에서 판매할 게이지와 재고를
                              입력하세요. 품절이 아닌 조합은 재고가 1개 이상이어야 저장할 수
                              있습니다.
                            </p>
                          </div>
                          {/* Color Selection */}
                          <div className="space-y-3">
                            <Label className={adminTypography.panelTitle}>색상 옵션</Label>
                            <p className={adminTypography.metaMuted}>
                              사용 가능한 색상을 선택하고 색상별 게이지 조합 재고를 설정하세요.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {colors.map((color) => {
                                const selected = colorInventories.some(
                                  (row) => row.value === color.id,
                                );
                                return (
                                  <Button
                                    key={color.id}
                                    type="button"
                                    size="sm"
                                    variant={selected ? "default" : "outline"}
                                    onClick={() => {
                                      if (selected) return;
                                      setColorInventories((prev) => [
                                        ...prev,
                                        {
                                          value: color.id,
                                          label: color.name,
                                          colorHex: color.hex,
                                          image: "",
                                          stock: 0,
                                          isSoldOut: false,
                                        },
                                      ]);
                                    }}
                                    className="gap-2"
                                  >
                                    {color.hex && (
                                      <span
                                        className="h-3 w-3 rounded-full border border-border/60"
                                        style={{ backgroundColor: color.hex }}
                                      />
                                    )}
                                    {selected ? `${color.name} (추가됨)` : color.name}
                                  </Button>
                                );
                              })}
                            </div>

                            {/* Custom Color Input */}
                            <div className={cn(adminSurface.cardMuted, "p-4")}>
                              <Label className={cn("mb-3 block", adminTypography.bodyStrong)}>
                                색상 직접 추가
                              </Label>
                              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                                <div className="flex-1">
                                  <Label className={cn("mb-1.5 block", adminTypography.caption)}>
                                    색상명
                                  </Label>
                                  <Input
                                    placeholder="예: 네온 옐로우"
                                    value={customColorName}
                                    onChange={(e) => setCustomColorName(e.target.value)}
                                    className="h-10"
                                  />
                                </div>
                                <div>
                                  <Label className={cn("mb-1.5 block", adminTypography.caption)}>
                                    색상 미리보기
                                  </Label>
                                  <Input
                                    type="color"
                                    value={customColorHex}
                                    onChange={(e) => {
                                      setCustomColorHex(e.target.value);
                                      setCustomColorHexTouched(true);
                                    }}
                                    className="h-10 w-14 cursor-pointer p-1"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  onClick={handleAddCustomColor}
                                  className="h-10"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  추가
                                </Button>
                              </div>
                            </div>

                            {colorInventories.length === 0 && (
                              <div
                                className={cn(adminSurface.cardMuted, "border-dashed p-6 text-center")}
                              >
                                <Palette className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                                <p className={adminTypography.metaMuted}>
                                  선택된 색상이 없습니다. 위 색상 목록에서 사용할 색상을 선택하세요.
                                </p>
                              </div>
                            )}

                            {/* Color Cards */}
                            <div className="space-y-4">
                              {colorInventories.map((row) => {
                                const colorMeta = colors.find((c) => c.id === row.value);
                                const resolvedHex = colorMeta?.hex ?? row.colorHex ?? "";
                                return (
                                  <div
                                    key={row.value}
                                    className="rounded-xl border border-border/60 bg-card p-4 shadow-sm md:p-5"
                                  >
                                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div className="flex items-center gap-3">
                                        <span
                                          className="h-5 w-5 rounded-full border border-border/60 shadow-sm"
                                          style={
                                            resolvedHex
                                              ? { backgroundColor: resolvedHex }
                                              : undefined
                                          }
                                        />
                                        <span className={adminTypography.panelTitle}>
                                          {colorMeta?.name ?? row.label ?? row.value}
                                        </span>
                                        <Badge variant="secondary" className="text-xs">
                                          재고 {getColorTotalStock(row.value)}개
                                        </Badge>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          if (
                                            !window.confirm(
                                              "이 색상을 삭제하면 해당 색상의 게이지/재고 옵션도 함께 삭제됩니다. 계속할까요?",
                                            )
                                          )
                                            return;
                                          removeColorOption(row.value);
                                        }}
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      >
                                        <Trash2 className="mr-1 h-4 w-4" />
                                        삭제
                                      </Button>
                                    </div>

                                    {/* Color Image */}
                                    <div
                                      className={cn(
                                        adminSurface.cardMuted,
                                        "mb-4 flex flex-col gap-4 p-4 sm:flex-row sm:items-center",
                                      )}
                                    >
                                      <div className="shrink-0">
                                        {row.image ? (
                                          <img
                                            src={row.image}
                                            alt={`${row.label ?? row.value} 색상 이미지`}
                                            className="h-20 w-20 rounded-lg border border-border/60 object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20">
                                            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <Label className={cn("mb-1 block", adminTypography.bodyStrong)}>
                                          색상 이미지
                                        </Label>
                                        <p className={cn("mb-2", adminTypography.caption)}>
                                          색상 이미지를 등록하면 상품 상세에서 해당 색상 선택 시
                                          이미지가 전환됩니다.
                                        </p>
                                        <div className="flex gap-2">
                                          <Input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id={`edit-color-image-${row.value}`}
                                            onChange={(e) =>
                                              void handleUploadColorImage(row.value, e)
                                            }
                                          />
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              document
                                                .getElementById(`edit-color-image-${row.value}`)
                                                ?.click()
                                            }
                                          >
                                            <Upload className="mr-1 h-4 w-4" />
                                            업로드
                                          </Button>
                                          {row.image && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setColorInventories((prev) =>
                                                  prev.map((item) =>
                                                    item.value === row.value
                                                      ? { ...item, image: "" }
                                                      : item,
                                                  ),
                                                );
                                                setVariantInventories((prev) =>
                                                  prev.map((variant) =>
                                                    variant.colorValue === row.value
                                                      ? {
                                                          ...variant,
                                                          colorImage: "",
                                                        }
                                                      : variant,
                                                  ),
                                                );
                                              }}
                                            >
                                              <X className="mr-1 h-4 w-4" />
                                              제거
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <Separator className="my-4" />

                                    {/* Gauge Input */}
                                    <div className="space-y-3">
                                      <div className="flex flex-col gap-2 md:flex-row">
                                        <div className="flex-1">
                                          <Label
                                            className={cn("mb-1 block", adminTypography.bodyStrong)}
                                          >
                                            게이지 추가
                                          </Label>
                                          <Input
                                            placeholder="예: 1.25 (mm는 자동으로 붙습니다)"
                                            value={gaugeInputsByColor[row.value] ?? ""}
                                            onChange={(e) =>
                                              setGaugeInputsByColor((prev) => ({
                                                ...prev,
                                                [row.value]: e.target.value,
                                              }))
                                            }
                                            className="h-10"
                                          />
                                        </div>
                                        <div className="flex items-end">
                                          <Button
                                            type="button"
                                            onClick={() => addVariantForColor(row)}
                                            className="h-10"
                                            variant="outline"
                                          >
                                            <Plus className="mr-1 h-4 w-4" />
                                            추가
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Variant List */}
                                      {variantInventories.filter(
                                        (variant) => variant.colorValue === row.value,
                                      ).length === 0 ? (
                                        <div
                                          className={cn(adminSurface.cardMuted, "border-dashed p-4")}
                                        >
                                          <p className={adminTypography.metaMuted}>
                                            아직 추가된 게이지가 없습니다.
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {variantInventories
                                            .filter((variant) => variant.colorValue === row.value)
                                            .map((variantRow) => (
                                              <div
                                                key={`${row.value}-${variantRow.gaugeValue}`}
                                                className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/10 p-3 md:flex-row md:items-center"
                                              >
                                                <Badge
                                                  variant="outline"
                                                  className="shrink-0 self-start md:self-center"
                                                >
                                                  {variantRow.gaugeLabel ?? variantRow.gaugeValue}
                                                </Badge>
                                                <div className="flex flex-1 flex-wrap items-center gap-3">
                                                  <div className="flex items-center gap-2">
                                                    <Label className={adminTypography.caption}>
                                                      재고
                                                    </Label>
                                                    <Input
                                                      type="number"
                                                      min={0}
                                                      className="h-8 w-20"
                                                      value={variantRow.stock ?? 0}
                                                      onChange={(e) =>
                                                        updateVariantStock(
                                                          row.value,
                                                          variantRow.gaugeValue,
                                                          Number(e.target.value),
                                                        )
                                                      }
                                                    />
                                                    <span className={adminTypography.caption}>
                                                      개
                                                    </span>
                                                  </div>
                                                  <label
                                                    className={cn(
                                                      "flex items-center gap-1.5",
                                                      adminTypography.body,
                                                    )}
                                                  >
                                                    <Checkbox
                                                      checked={variantRow.isSoldOut ?? true}
                                                      onCheckedChange={(checked) =>
                                                        updateVariantSoldOut(
                                                          row.value,
                                                          variantRow.gaugeValue,
                                                          Boolean(checked),
                                                        )
                                                      }
                                                    />
                                                    품절
                                                  </label>
                                                  <label
                                                    className={cn(
                                                      "flex items-center gap-1.5",
                                                      adminTypography.body,
                                                    )}
                                                  >
                                                    <Checkbox
                                                      checked={variantRow.showWhenSoldOut !== false}
                                                      onCheckedChange={(checked) =>
                                                        updateVariantShowWhenSoldOut(
                                                          row.value,
                                                          variantRow.gaugeValue,
                                                          Boolean(checked),
                                                        )
                                                      }
                                                    />
                                                    품절 시에도 노출
                                                  </label>
                                                </div>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    removeVariantForColor(
                                                      row.value,
                                                      variantRow.gaugeValue,
                                                    )
                                                  }
                                                  className="shrink-0 text-destructive hover:bg-destructive/10"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Gauge Summary */}
                          {gaugeSummaryRows.length > 0 && (
                            <div className="space-y-3">
                              <Label className="text-base font-semibold">
                                전체 사용 게이지 요약
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                실제 추가/삭제는 각 색상 카드 안에서 관리됩니다.
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {gaugeSummaryRows.map((gaugeRow) => (
                                  <div
                                    key={gaugeRow.value}
                                    className={cn(
                                      adminSurface.cardMuted,
                                      "flex items-center justify-between p-3",
                                    )}
                                  >
                                    <span className={adminTypography.bodyStrong}>
                                      {gaugeRow.label ?? gaugeRow.value}
                                    </span>
                                    <Badge variant="secondary">
                                      총 {getGaugeTotalStock(gaugeRow.value)}개
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </FormSection>
                    </div>
                  )}

                  {/* Step 3: Features */}
                  {currentStep.id === "features" && (
                    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                      <FormSection
                        title="성능 지표"
                        description="스트링의 성능을 1-100 사이로 설정하세요."
                        icon={<Activity className="h-5 w-5" />}
                      >
                        <div className="grid gap-6 lg:grid-cols-2">
                          <div className="space-y-6">
                            <PerformanceSlider
                              id="power-rating"
                              label="반발력"
                              value={features.power}
                              onChange={(v: number) => setFeatures({ ...features, power: v })}
                            />
                            <PerformanceSlider
                              id="control-rating"
                              label="컨트롤"
                              value={features.control}
                              onChange={(v: number) => setFeatures({ ...features, control: v })}
                            />
                            <PerformanceSlider
                              id="spin-rating"
                              label="스핀"
                              value={features.spin}
                              onChange={(v: number) => setFeatures({ ...features, spin: v })}
                            />
                            <PerformanceSlider
                              id="durability-rating"
                              label="내구성"
                              value={features.durability}
                              onChange={(v: number) => setFeatures({ ...features, durability: v })}
                            />
                            <PerformanceSlider
                              id="comfort-rating"
                              label="편안함"
                              value={features.comfort}
                              onChange={(v: number) => setFeatures({ ...features, comfort: v })}
                            />
                          </div>
                          <div className="lg:pl-4">
                            <PerformanceSummary features={features} />
                          </div>
                        </div>
                      </FormSection>

                      <FormSection
                        title="추천 대상"
                        description="이 스트링을 추천하는 플레이어 타입과 스타일을 선택하세요."
                        icon={<Users className="h-5 w-5" />}
                      >
                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-foreground">플레이어 레벨</h4>
                            <div className="space-y-3">
                              {[
                                {
                                  id: "beginner",
                                  label: "초보자",
                                  key: "beginner" as const,
                                },
                                {
                                  id: "intermediate",
                                  label: "중급자",
                                  key: "intermediate" as const,
                                },
                                {
                                  id: "advanced",
                                  label: "상급자",
                                  key: "advanced" as const,
                                },
                              ].map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-3 transition-colors hover:bg-muted/20"
                                >
                                  <Switch
                                    id={`player-${item.id}`}
                                    checked={tags[item.key]}
                                    onCheckedChange={(checked) =>
                                      setTags({ ...tags, [item.key]: checked })
                                    }
                                  />
                                  <Label
                                    htmlFor={`player-${item.id}`}
                                    className="flex-1 cursor-pointer"
                                  >
                                    {item.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-semibold text-foreground">플레이 스타일</h4>
                            <div className="space-y-3">
                              {[
                                {
                                  id: "baseline",
                                  label: "베이스라인 플레이어",
                                  key: "baseline" as const,
                                },
                                {
                                  id: "serve-volley",
                                  label: "서브 앤 발리 플레이어",
                                  key: "serveVolley" as const,
                                },
                                {
                                  id: "all-court",
                                  label: "올코트 플레이어",
                                  key: "allCourt" as const,
                                },
                                {
                                  id: "power",
                                  label: "파워 히터",
                                  key: "power" as const,
                                },
                              ].map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-3 transition-colors hover:bg-muted/20"
                                >
                                  <Switch
                                    id={`style-${item.id}`}
                                    checked={tags[item.key]}
                                    onCheckedChange={(checked) =>
                                      setTags({ ...tags, [item.key]: checked })
                                    }
                                  />
                                  <Label
                                    htmlFor={`style-${item.id}`}
                                    className="flex-1 cursor-pointer"
                                  >
                                    {item.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </FormSection>

                      <FormSection
                        title="추가 특성"
                        description="스트링의 추가 특성이나 장점을 입력하세요."
                        icon={<Sparkles className="h-5 w-5" />}
                      >
                        <Textarea
                          id="string-features"
                          placeholder="스트링의 추가 특성이나 장점을 입력하세요"
                          className="min-h-[120px] resize-none"
                          value={additionalFeatures}
                          onChange={(e) => setAdditionalFeatures(e.target.value)}
                        />
                      </FormSection>
                    </div>
                  )}

                  {/* Step 4: Inventory */}
                  {currentStep.id === "inventory" && (
                    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                      <FormSection
                        title="재고 설정"
                        description="재고 관리 방식과 알림 기준을 설정하세요."
                        icon={<Boxes className="h-5 w-5" />}
                      >
                        <div className="space-y-6">
                          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                            <p className="text-sm font-semibold text-foreground">
                              재고 수량은 구매 옵션에서 자동 합산됩니다
                            </p>
                            <p className={cn("mt-1", adminTypography.caption)}>
                              색상·게이지 조합별 재고가 전체 재고로 합산됩니다. 이 단계에서는 재고
                              부족 기준, 추천/신상품/할인 노출 여부를 확인하세요.
                            </p>
                          </div>
                          <FormFieldGroup columns={2}>
                            <div className="space-y-2">
                              <Label htmlFor="string-stock">총 재고 수량</Label>
                              <Input
                                id="string-stock"
                                type="text"
                                value={totalGaugeStock.toLocaleString()}
                                readOnly
                                disabled
                                className="h-11 bg-muted/50"
                              />
                              <p className="text-xs text-muted-foreground">
                                게이지별 재고 수량의 합계로 자동 계산됩니다.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="string-low-stock">재고 부족 알림 기준</Label>
                              <Input
                                id="string-low-stock"
                                type="text"
                                placeholder="0"
                                value={inventory.lowStock.toLocaleString()}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, "");
                                  const numeric = Number(raw);
                                  if (!isNaN(numeric)) {
                                    setInventory({
                                      ...inventory,
                                      lowStock: numeric,
                                    });
                                  }
                                }}
                                className="h-11"
                              />
                            </div>
                          </FormFieldGroup>

                          <div className="space-y-3">
                            <Label>재고 상태</Label>
                            <RadioGroup
                              value={inventory.status}
                              onValueChange={(value) =>
                                setInventory({ ...inventory, status: value })
                              }
                              className="flex flex-wrap gap-4"
                            >
                              {[
                                { value: "instock", label: "재고 있음" },
                                { value: "outofstock", label: "품절" },
                                { value: "backorder", label: "입고 예정" },
                              ].map((item) => (
                                <div key={item.value} className="flex items-center gap-2">
                                  <RadioGroupItem value={item.value} id={item.value} />
                                  <Label htmlFor={item.value} className="cursor-pointer">
                                    {item.label}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-4">
                              <Switch
                                id="show-gauge-stock"
                                checked={showGaugeStockToUser}
                                onCheckedChange={setShowGaugeStockToUser}
                              />
                              <div>
                                <Label htmlFor="show-gauge-stock" className="cursor-pointer">
                                  사용자에게 게이지별 재고 수량 노출
                                </Label>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-4">
                              <Switch
                                id="string-manage-stock"
                                checked={inventory.manageStock}
                                onCheckedChange={(checked) =>
                                  setInventory({
                                    ...inventory,
                                    manageStock: checked,
                                  })
                                }
                              />
                              <div>
                                <Label htmlFor="string-manage-stock" className="cursor-pointer">
                                  재고 관리 사용
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  판매 시 재고 자동 감소
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-4">
                              <Switch
                                id="string-backorders"
                                checked={inventory.allowBackorder}
                                onCheckedChange={(checked) =>
                                  setInventory({
                                    ...inventory,
                                    allowBackorder: checked,
                                  })
                                }
                              />
                              <div>
                                <Label htmlFor="string-backorders" className="cursor-pointer">
                                  품절 시 주문 허용
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  재고가 없어도 주문 가능
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </FormSection>

                      <FormSection
                        title="판매 옵션"
                        description="상품 배지와 할인 설정을 관리하세요."
                        icon={<Sparkles className="h-5 w-5" />}
                      >
                        <div className="space-y-6">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-4">
                              <Switch
                                id="string-featured"
                                checked={inventory.isFeatured}
                                onCheckedChange={(checked) =>
                                  setInventory({
                                    ...inventory,
                                    isFeatured: checked,
                                  })
                                }
                              />
                              <Label htmlFor="string-featured" className="cursor-pointer">
                                추천 상품
                              </Label>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-4">
                              <Switch
                                id="string-new"
                                checked={inventory.isNew}
                                onCheckedChange={(checked) =>
                                  setInventory({ ...inventory, isNew: checked })
                                }
                              />
                              <Label htmlFor="string-new" className="cursor-pointer">
                                신상품
                              </Label>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-4">
                              <Switch
                                id="string-sale"
                                checked={inventory.isSale}
                                onCheckedChange={(checked) =>
                                  setInventory({
                                    ...inventory,
                                    isSale: checked,
                                  })
                                }
                              />
                              <Label htmlFor="string-sale" className="cursor-pointer">
                                할인 상품
                              </Label>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-4 md:col-span-3">
                              <Switch
                                id="string-visible"
                                checked={isVisible}
                                onCheckedChange={setIsVisible}
                              />
                              <div className="space-y-1">
                                <Label htmlFor="string-visible" className="cursor-pointer">
                                  일반 사용자에게 상품 노출
                                </Label>
                                {!isVisible && (
                                  <p className="text-xs text-muted-foreground">
                                    끄면 관리자 화면에서만 보이며, 일반 회원의 목록/상세/추천/결제
                                    경로에서 차단됩니다.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {inventory.isSale && (
                            <div className="space-y-2">
                              <Label htmlFor="string-sale-price">할인가</Label>
                              <div className="relative max-w-xs">
                                <FormattedNumberInput
                                  id="string-sale-price"
                                  value={inventory.salePrice}
                                  onValueChange={(salePrice) => {
                                    setInventory({
                                      ...inventory,
                                      salePrice,
                                    });
                                  }}
                                  placeholder="0"
                                  className="h-11 pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  원
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormSection>
                    </div>
                  )}

                  {/* Step 5: Images */}
                  {currentStep.id === "images" && (
                    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                      <FormSection
                        title="스트링 이미지"
                        description="상품 대표 이미지와 공통 상세 이미지를 관리합니다. 색상별 이미지는 구매 옵션에서 등록하세요."
                        icon={<ImageIcon className="h-5 w-5" />}
                      >
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {images.map((image, index) => (
                              <div
                                key={index}
                                className={cn(
                                  "relative aspect-square overflow-hidden rounded-lg border",
                                  index === 0 ? "ring-2 ring-primary" : "bg-muted/40",
                                )}
                              >
                                <img
                                  src={image || "/placeholder.svg"}
                                  alt={`스트링 이미지 ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />

                                {/* Delete button */}
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute right-1 top-1 h-7 w-7"
                                  onClick={() => handleRemoveImage(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>

                                {/* Primary badge */}
                                {index === 0 && (
                                  <Badge className="absolute left-1 top-1">대표</Badge>
                                )}

                                {/* Set as primary button */}
                                {index !== 0 && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="absolute bottom-1 left-1 h-7 text-xs"
                                    onClick={() => handleSetMainImage(index)}
                                  >
                                    대표로 지정
                                  </Button>
                                )}
                              </div>
                            ))}

                            {/* Upload slot */}
                            <label
                              className={cn(
                                "flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 transition-colors hover:bg-muted/40",
                                isMaxReached && "pointer-events-none opacity-50",
                              )}
                            >
                              {uploading ? (
                                <Loader2 className="mb-2 h-6 w-6 animate-spin text-muted-foreground" />
                              ) : (
                                <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                              )}
                              <span className="text-sm text-muted-foreground">이미지 추가</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleAddImage}
                                className="hidden"
                                disabled={isMaxReached || uploading || submitting}
                              />
                            </label>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  <Info className="h-4 w-4" />
                                  최대 4장까지 업로드 가능합니다.
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    최적의 표시를 위해 1000x1000 픽셀 이상의 정사각형 이미지를
                                    사용하세요.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </FormSection>
                      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className={adminTypography.panelTitle}>저장 전 체크리스트</p>
                            <p className={cn("mt-1", adminTypography.metaMuted)}>
                              아래 항목이 모두 완료되어야 상품 등록이 안전하게 진행됩니다.
                            </p>
                          </div>
                          <Badge variant={readyToSubmit ? "success" : "outline"}>
                            {readyToSubmit ? "등록 가능" : "확인 필요"}
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
                                <Badge
                                  variant={item.done ? "success" : "outline"}
                                  className="shrink-0"
                                >
                                  {item.done ? "완료" : "확인필요"}
                                </Badge>
                              </div>
                              <p className={cn("mt-1", adminTypography.caption)}>
                                {item.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Preview Card (sticky on desktop) */}
                <div className="hidden lg:block lg:w-80">
                  <ProductPreviewCard
                    basicInfo={{
                      name: basicInfo.name,
                      brand: brands.find((b) => b.id === basicInfo.brand)?.name ?? basicInfo.brand,
                      material:
                        materials.find((m) => m.id === basicInfo.material)?.name ??
                        basicInfo.material,
                      price: basicInfo.price,
                      shortDescription: basicInfo.shortDescription,
                    }}
                    features={features}
                    inventory={inventory}
                    colorCount={colorInventories.length}
                    gaugeCount={uniqueGaugeCount}
                    imageCount={images.length}
                    className="top-24 max-h-[calc(100vh-7rem)] overflow-y-auto"
                  />
                </div>
              </div>

              {/* Step Navigation */}
              <div className={cn(adminSurface.stickyToolbar, "p-4")}>
                <StepNavigation
                  currentStepIndex={currentStepIndex}
                  totalSteps={STEPS.length}
                  onPrevious={goToPreviousStep}
                  onNext={goToNextStep}
                  isSubmitting={submitting}
                  isUploading={uploading}
                  backHref="/admin/products"
                  onBackClick={confirmLeave}
                  submitLabel="등록"
                />
              </div>
            </>
        </form>
      </AdminPageShell>
      <AdminConfirmDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        onConfirm={() => {
          setLeaveDialogOpen(false);
          router.push("/admin/products");
        }}
        title="작성 중인 내용이 있습니다"
        description={UNSAVED_CHANGES_MESSAGE}
        confirmText="이동"
        severity="default"
        eventKey="admin-products-new-leave"
      />
    </>
  );
}
