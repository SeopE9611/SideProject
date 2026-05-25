"use client";

import type React from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Upload, Info, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import ImageUploader from "@/components/admin/ImageUploader";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import {
  brands,
  colors,
  gauges,
  materials,
} from "@/app/admin/products/_lib/productFormOptions";
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { adminFormHintTooltipClass } from "@/lib/tooltip-style";
import type {
  ProductColorInventory,
  ProductGaugeInventory,
  ProductVariantInventory,
} from "@/types/admin/products";

const AdminConfirmDialog = dynamic(
  () => import("@/components/admin/AdminConfirmDialog"),
  { loading: () => null },
);

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
  const [colorInventories, setColorInventories] = useState<
    ProductColorInventory[]
  >([]);
  const [variantInventories, setVariantInventories] = useState<
    ProductVariantInventory[]
  >([]);
  const [gaugeInputsByColor, setGaugeInputsByColor] = useState<Record<string, string>>({});
  const [showGaugeStockToUser, setShowGaugeStockToUser] = useState(true);
  const getVariantKey = (colorValue: string, gaugeValue: string) =>
    `${colorValue}::${gaugeValue}`;
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
  const getVariantRow = (colorValue: string, gaugeValue: string) =>
    variantInventories.find(
      (row) => row.colorValue === colorValue && row.gaugeValue === gaugeValue,
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
      const found = gauges.find((g) => g.value === value);
      return { value, label: found?.name ?? `${value}mm` };
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
  const updateVariantShowWhenSoldOut = (colorValue: string, gaugeValue: string, showWhenSoldOut: boolean) => {
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
      if (prev.some((row) => row.colorValue === colorRow.value && row.gaugeValue === normalizedGauge.value)) {
        showErrorToast("이미 같은 색상에 추가된 게이지입니다.");
        return prev;
      }
      return [...prev, { colorValue: colorRow.value, colorLabel: colorRow.label, colorHex: colorRow.colorHex, colorImage: colorRow.image ?? "", gaugeValue: normalizedGauge.value, gaugeLabel: normalizedGauge.label, stock: 0, isSoldOut: false, showWhenSoldOut: true }];
    });
    setGaugeInputsByColor((prev) => ({ ...prev, [colorRow.value]: "" }));
  };
  const removeVariantForColor = (colorValue: string, gaugeValue: string) => {
    setVariantInventories((prev) =>
      prev.filter((row) => !(row.colorValue === colorValue && row.gaugeValue === gaugeValue)),
    );
  };

  // 추가 특성 정보
  const [additionalFeatures, setAdditionalFeatures] = useState("");

  // 탭 상태관리
  const [activeTab, setActiveTab] = useState("basic");

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
    const { error } = await supabase.storage
      .from("tennis-images")
      .upload(fileName, file);
    if (error) return null;
    const { data: publicData } = supabase.storage
      .from("tennis-images")
      .getPublicUrl(fileName);
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
        showErrorToast(
          "이미지 업로드에 실패했습니다. 잠시 후 다시 시도하세요.",
        );
        continue;
      }
      setImages((prev) => [...prev, imageUrl]);
    }

    setUploading(false);
    e.target.value = ""; // <- 동일 파일 다시 선택 가능하도록
  };

  // 대표 이미지 설정
  const [mainImageIndex, setMainImageIndex] = useState(0);

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
      length: prev.length || "12m",
    }));
  }, [
    basicInfo.material,
    hybridMain.brand,
    hybridMain.gauge,
    hybridMain.color,
  ]);

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
        searchKeywordsInput,
        additionalFeatures,
        images,
        hybridMain,
        hybridCross,
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
    ],
  );

  const baselineRef = useRef<string | null>(null);
  useEffect(() => {
    if (baselineRef.current === null) baselineRef.current = snapshot;
  }, [snapshot]);

  const isDirty =
    baselineRef.current !== null && baselineRef.current !== snapshot;
  useUnsavedChangesGuard(isDirty && !submitting && !uploading);

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const confirmLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (!isDirty || submitting || uploading) return;
    e.preventDefault();
    e.stopPropagation();
    setLeaveDialogOpen(true);
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      return;
    }

    if (basicInfo.price <= 0) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.BASIC} 미입력]</strong>
          <br /> '금액을 입력해주세요.'
        </>,
      );
      return;
    }

    if (!basicInfo.description.trim()) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.BASIC} 미입력]</strong>
          <br /> '상세 설명을 입력해주세요.'
        </>,
      );
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
      return;
    }

    if (images.length === 0) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.IMAGE}] 미입력</strong> <br />
          '최소 1장의 이미지를 업로드해야 합니다.'
        </>,
      );
      return;
    }

    if (inventory.isSale && inventory.salePrice >= basicInfo.price) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.INVENTORY}] 미입력</strong> <br />
          '할인가는 정가보다 낮아야 합니다.'
        </>,
      );
      return;
    }

    if (inventory.stock < 0) {
      showErrorToast(
        <>
          <strong>[{SECTIONS.INVENTORY}] 미입력</strong> <br />
          '재고 수량은 0 이상이어야 합니다.'
        </>,
      );
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
      return;
    }

    if (colorInventories.length === 0) {
      setActiveTab("options");
      showErrorToast("색상을 최소 1개 이상 선택해주세요.");
      return;
    }

    if (variantInventories.length === 0) {
      setActiveTab("options");
      showErrorToast("각 색상마다 최소 1개 이상의 게이지를 추가해주세요.");
      return;
    }
    const hasColorWithoutVariant = colorInventories.some(
      (colorRow) => !variantInventories.some((variant) => variant.colorValue === colorRow.value),
    );
    if (hasColorWithoutVariant) {
      setActiveTab("options");
      showErrorToast("각 색상마다 최소 1개 이상의 게이지를 추가해주세요.");
      return;
    }
    if (variantInventories.some((row) => !Number.isFinite(Number(row.stock)) || Number(row.stock) < 0)) {
      setActiveTab("options");
      showErrorToast("조합 재고 수량은 0 이상 숫자로 입력해주세요.");
      return;
    }
    if (variantInventories.some((row) => !row.isSoldOut && Number(row.stock) < 1)) {
      setActiveTab("options");
      showErrorToast("품절이 아닌 조합은 재고 수량을 1개 이상 입력해주세요.");
      return;
    }
    // specifications 영문 키로 미리 구성
    const specifications: any = {
      material: basicInfo.material,
      gauge: basicInfo.gauge,
      color: basicInfo.color,
      length: basicInfo.length,
    };

    if (basicInfo.material === "hybrid") {
      const hasMain =
        hybridMain.brand ||
        hybridMain.name ||
        hybridMain.gauge ||
        hybridMain.color;
      const hasCross =
        hybridCross.brand ||
        hybridCross.name ||
        hybridCross.gauge ||
        hybridCross.color;
      if (hasMain || hasCross) {
        specifications.hybrid = {
          main: { ...hybridMain },
          cross: { ...hybridCross },
        };
      }
    }

    const searchKeywords = searchKeywordsInput.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
    const normalizedVariants = variantInventories.map((row) => ({ ...row, stock: Math.max(0, Number(row.stock) || 0), colorImage: row.colorImage ?? colorInventories.find((c) => c.value===row.colorValue)?.image, showWhenSoldOut: row.showWhenSoldOut !== false }));
    const colorOptions = colorInventories.map((row) => row.value);
    const gaugeOptions = Array.from(new Set(normalizedVariants.map((row) => row.gaugeValue)));
    const normalizedGauge = gaugeOptions[0] ?? basicInfo.gauge ?? "";
    const normalizedColor = colorOptions[0] ?? basicInfo.color ?? "";
    const normalizedColorInventories = colorInventories.map((colorRow) => {
      const rows = normalizedVariants.filter((row) => row.colorValue === colorRow.value);
      const stock = rows.filter((row) => !row.isSoldOut).reduce((sum, row) => sum + row.stock, 0);
      return { ...colorRow, image: colorRow.image ?? rows[0]?.colorImage ?? "", stock, isSoldOut: rows.every((row) => row.isSoldOut) || stock === 0 };
    });
    const normalizedGaugeInventories = gaugeSummaryRows.map((gaugeRow) => {
      const rows = normalizedVariants.filter((row) => row.gaugeValue === gaugeRow.value);
      const stock = rows.filter((row) => !row.isSoldOut).reduce((sum, row) => sum + row.stock, 0);
      return { ...gaugeRow, stock, isSoldOut: rows.every((row) => row.isSoldOut) || stock === 0 };
    });
    const normalizedGaugeStockTotal = normalizedVariants.filter((row) => !row.isSoldOut).reduce((sum,row)=>sum+row.stock,0);

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
      features: { ...features },
      tags: { ...tags },
      specifications: { ...specifications, gauge: normalizedGauge },
      additionalFeatures,
      images,
      inventory: { ...inventory, stock: normalizedGaugeStockTotal, hideGaugeStock: !showGaugeStockToUser },
    };
    // console.log(' 등록된 상품 데이터:', product);

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

      // router.push('/admin/products'); // 상품 목록 페이지로 즉시 이동
      router.push(`/products/${data.id}`); // 등록된 상품 상세 페이지로 즉시 이동
    } catch (error) {
      // 상품 등록 중 에러 발생시
      showErrorToast(
        getAdminErrorMessage(error) ||
          "서버 오류가 발생했습니다. 잠시 후에 다시 시도하세요.",
      );
    } finally {
      setSubmitting(false);
      submitRef.current = false;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container py-8 px-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl p-8 border border-border bg-card shadow-lg">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="bg-card rounded-full p-3 shadow-md">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold tracking-normal">
                      스트링 등록
                    </h2>
                    <p className="text-muted-foreground">
                      새로운 테니스 스트링 정보를 입력하고 등록하세요.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    type="button"
                    asChild
                    className="bg-muted/40 hover:bg-muted border-border"
                  >
                    <Link
                      href="/admin/products"
                      data-no-unsaved-guard
                      onClick={confirmLeave}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      취소
                    </Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || uploading}
                    variant="default"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {submitting ? "등록 중..." : "저장"}
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-muted border border-border">
                <TabsTrigger
                  value="basic"
                  className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  기본 정보
                </TabsTrigger>
                <TabsTrigger
                  value="options"
                  className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  구매 옵션
                </TabsTrigger>
                <TabsTrigger
                  value="features"
                  className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  성능 및 특성
                </TabsTrigger>
                <TabsTrigger
                  value="inventory"
                  className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  재고 관리
                </TabsTrigger>
                <TabsTrigger
                  value="images"
                  className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  이미지
                </TabsTrigger>
              </TabsList>

              {/* 기본 정보 탭 */}
              <TabsContent value="basic" className="space-y-4">
                <Card
                  variant="ghost"
                  className="shadow-xl bg-muted/30 border border-border"
                >
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="text-primary">기본 정보</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      스트링의 기본 정보를 입력하세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="string-name">
                          스트링명 <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="string-name"
                          placeholder="스트링명을 입력하세요"
                          value={basicInfo.name}
                          onChange={(e) =>
                            setBasicInfo({ ...basicInfo, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="string-sku">SKU (재고 관리 코드)</Label>
                        <Input
                          id="string-sku"
                          placeholder="예: STR-LUX-001"
                          value={basicInfo.sku}
                          onChange={(e) =>
                            setBasicInfo({ ...basicInfo, sku: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    {/* 검색 키워드 입력 */}
                    <div className="space-y-2">
                      <Label htmlFor="string-search-keywords">
                        검색 키워드 (쉼표로 구분)
                      </Label>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <Input
                          id="string-search-keywords"
                          placeholder="예: 챔피언, 챔피언스 초이스, 듀오, ALU, 내추럴 거트"
                          value={searchKeywordsInput}
                          onChange={(e) =>
                            setSearchKeywordsInput(e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="md:ml-2 shrink-0"
                          onClick={handleGenerateKeywords}
                        >
                          상품명 기준 자동 생성
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        검색창에서 이 키워드들로도 상품을 찾을 수 있게
                        설정합니다. 쉼표(,)로 구분해서 입력하거나 자동 생성
                        버튼을 사용하세요.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="string-short-description">
                        짧은 설명
                      </Label>
                      <Textarea
                        id="string-short-description"
                        placeholder="스트링에 대한 짧은 설명을 입력하세요"
                        className="min-h-[80px]"
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
                      <Label htmlFor="string-description">상세 설명</Label>
                      <Textarea
                        id="string-description"
                        placeholder="스트링에 대한 상세 설명을 입력하세요"
                        className="min-h-[200px]"
                        value={basicInfo.description}
                        onChange={(e) =>
                          setBasicInfo({
                            ...basicInfo,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="string-brand">브랜드</Label>
                        <Select
                          value={basicInfo.brand}
                          onValueChange={(value) =>
                            setBasicInfo({ ...basicInfo, brand: value })
                          }
                        >
                          <SelectTrigger id="string-brand">
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
                        <Label htmlFor="string-material">재질</Label>
                        <Select
                          value={basicInfo.material}
                          onValueChange={(value) =>
                            setBasicInfo({ ...basicInfo, material: value })
                          }
                        >
                          <SelectTrigger id="string-material">
                            <SelectValue placeholder="재질 선택" />
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
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="string-color">대표 색상(목록/필터용)</Label>
                        <Select
                          value={basicInfo.color}
                          onValueChange={(value) =>
                            setBasicInfo({ ...basicInfo, color: value })
                          }
                        >
                          <SelectTrigger id="string-color">
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
                        <p className="text-xs text-muted-foreground">실제 구매 색상은 구매 옵션 탭에서 색상별로 관리됩니다.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="string-length">길이 (m)</Label>
                        <Select
                          value={basicInfo.length}
                          onValueChange={(value) =>
                            setBasicInfo({ ...basicInfo, length: value })
                          }
                        >
                          <SelectTrigger id="string-length">
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
                    </div>

                  </CardContent>
                </Card>

                {basicInfo.material === "hybrid" && (
                  <Card
                    variant="ghost"
                    className="mt-6 shadow-xl bg-muted/30 border border-border"
                  >
                    <CardHeader className="bg-muted/30 border-b border-border">
                      <CardTitle className="text-primary">
                        하이브리드 구성
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        메인/크로스 스트링 정보를 입력하세요.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* MAIN */}
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-muted-foreground">
                          메인 (Mains)
                        </div>

                        {/* 브랜드 */}
                        <div className="space-y-1.5">
                          <Label>브랜드</Label>
                          <Select
                            value={hybridMain.brand}
                            onValueChange={(v) =>
                              setHybridMain((s) => ({ ...s, brand: v }))
                            }
                          >
                            <SelectTrigger>
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

                        {/* 제품명(자유입력 유지: 같은 브랜드라도 모델명이 매우 다양) */}
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
                          />
                        </div>

                        {/* 게이지 */}
                        <div className="space-y-1.5">
                          <Label>게이지</Label>
                          <Select
                            value={hybridMain.gauge}
                            onValueChange={(v) =>
                              setHybridMain((s) => ({ ...s, gauge: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="게이지 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {gauges.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.name /* 예: 17 (1.25mm) */}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 색상 */}
                        <div className="space-y-1.5">
                          <Label>색상</Label>
                          <Select
                            value={hybridMain.color}
                            onValueChange={(v) =>
                              setHybridMain((s) => ({ ...s, color: v }))
                            }
                          >
                            <SelectTrigger>
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

                      {/* CROSS */}
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-muted-foreground">
                          크로스 (Crosses)
                        </div>

                        {/* 브랜드 */}
                        <div className="space-y-1.5">
                          <Label>브랜드</Label>
                          <Select
                            value={hybridCross.brand}
                            onValueChange={(v) =>
                              setHybridCross((s) => ({ ...s, brand: v }))
                            }
                          >
                            <SelectTrigger>
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

                        {/* 제품명(자유입력) */}
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
                          />
                        </div>

                        {/* 게이지 */}
                        <div className="space-y-1.5">
                          <Label>게이지</Label>
                          <Select
                            value={hybridCross.gauge}
                            onValueChange={(v) =>
                              setHybridCross((s) => ({ ...s, gauge: v }))
                            }
                          >
                            <SelectTrigger>
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

                        {/* 색상 */}
                        <div className="space-y-1.5">
                          <Label>색상</Label>
                          <Select
                            value={hybridCross.color}
                            onValueChange={(v) =>
                              setHybridCross((s) => ({ ...s, color: v }))
                            }
                          >
                            <SelectTrigger>
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
                    </CardContent>
                  </Card>
                )}

                {/* 가격 정보 카드 */}
                <Card
                  variant="ghost"
                  className="shadow-xl bg-muted/30 border border-border"
                >
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="text-primary">가격 정보</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      소비자 가격과 장착 서비스 비용을 함께 설정해주세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* 장착 서비스 비용 */}
                      <div className="space-y-2">
                        <Label htmlFor="string-stringing-fee">
                          장착 서비스 비용
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline ml-1 h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                align="center"
                                sideOffset={4}
                                className={adminFormHintTooltipClass}
                              >
                                <p>
                                  해당 스트링을 이용한 장착 서비스 비용을
                                  입력하세요.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <div className="flex">
                          <Input
                            id="string-stringing-fee"
                            type="text"
                            placeholder="0"
                            value={basicInfo.mountingFee.toLocaleString()}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/,/g, "");
                              const numeric = Number(raw);
                              if (!isNaN(numeric)) {
                                setBasicInfo({
                                  ...basicInfo,
                                  mountingFee: numeric,
                                });
                              }
                            }}
                          />
                          <span className="ml-2 flex items-center text-sm">
                            원
                          </span>
                        </div>
                      </div>



                      {/* 배송비 */}
                      <div className="space-y-2">
                        <Label htmlFor="string-shipping-fee">배송비</Label>
                        <div className="flex">
                          <Input
                            id="string-shipping-fee"
                            type="number"
                            min={0}
                            step={1}
                            placeholder="3000"
                            value={basicInfo.shippingFee}
                            onChange={(e) => {
                              const numeric = Number(e.target.value);
                              if (!isNaN(numeric)) {
                                setBasicInfo({
                                  ...basicInfo,
                                  shippingFee: Math.max(0, numeric),
                                });
                              }
                            }}
                          />
                          <span className="ml-2 flex items-center text-sm">
                            원
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          0 입력 시 무료배송
                        </p>
                      </div>

                      {/* 가격 */}
                      <div className="space-y-2">
                        <Label htmlFor="string-regular-price">
                          가격 <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex">
                          <Input
                            id="string-regular-price"
                            type="text"
                            placeholder="0"
                            value={basicInfo.price.toLocaleString()}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/,/g, "");
                              const numeric = Number(raw);
                              if (!isNaN(numeric)) {
                                setBasicInfo({ ...basicInfo, price: numeric });
                              }
                            }}
                          />
                          <span className="ml-2 flex items-center text-sm">
                            원
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="options" className="space-y-4">
                <Card
                  variant="ghost"
                  className="shadow-xl bg-muted/30 border border-border"
                >
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="text-primary">구매 옵션</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      색상/게이지 옵션별 재고 및 품절 상태를 관리하세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <div className="space-y-3">
                      <Label>색상 옵션</Label>
                      <p className="text-sm text-muted-foreground">색상을 선택한 뒤, 각 색상 카드 안에서 사용 가능한 게이지와 재고를 개별로 관리하세요.</p>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((color) => {
                          const selected = colorInventories.some((row) => row.value === color.id);
                          return (
                            <Button
                              key={color.id}
                              type="button"
                              size="sm"
                              variant={selected ? "default" : "outline"}
                              onClick={() => {
                                if (selected) {
                                  setColorInventories((prev) => prev.filter((row) => row.value !== color.id));
                                  setVariantInventories((prev) => prev.filter((row) => row.colorValue !== color.id));
                                  return;
                                }
                                setColorInventories((prev) => [...prev,{ value: color.id, label: color.name, colorHex: color.hex, image: "", stock: 0, isSoldOut: false }]);
                              }}
                            >
                              {color.name}
                            </Button>
                          );
                        })}
                      </div>
                      {colorInventories.length === 0 && (
                        <p className="text-sm text-muted-foreground">선택된 색상이 없습니다. 위 색상 목록에서 사용할 색상을 선택하세요.</p>
                      )}
                      <div className="space-y-3">
                        {colorInventories.map((row) => {
                          const colorMeta = colors.find((c) => c.id === row.value);
                          const resolvedHex = colorMeta?.hex ?? row.colorHex ?? "";
                          return (
                            <div key={row.value} className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-4">
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <span className="h-3 w-3 rounded-full border border-border bg-muted" style={resolvedHex ? { backgroundColor: resolvedHex } : undefined} />
                                <span>{colorMeta?.name ?? row.label ?? row.value}</span>
                              </div>
                              <div className="space-y-2">
                                <Label>색상 이미지</Label>
                                {row.image ? (
                                  <img src={row.image} alt={`${row.label ?? row.value} 색상 이미지`} className="h-24 w-24 rounded-md border border-border object-cover" />
                                ) : (
                                  <p className="text-xs text-muted-foreground">등록된 색상 이미지가 없습니다.</p>
                                )}
                                <p className="text-xs text-muted-foreground">색상 이미지를 등록하면 상품 상세에서 해당 색상 선택 시 이미지가 전환됩니다.</p>
                                <div className="flex gap-2">
                                  <Input type="file" accept="image/*" className="hidden" id={`new-color-image-${row.value}`} onChange={(e) => void handleUploadColorImage(row.value, e)} />
                                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`new-color-image-${row.value}`)?.click()}>
                                    이미지 업로드
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setColorInventories((prev) =>
                                        prev.map((item) =>
                                          item.value === row.value ? { ...item, image: "" } : item,
                                        ),
                                      );
                                      setVariantInventories((prev) =>
                                        prev.map((variant) =>
                                          variant.colorValue === row.value
                                            ? { ...variant, colorImage: "" }
                                            : variant,
                                        ),
                                      );
                                    }}
                                  >
                                    이미지 제거
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>게이지 직접 입력</Label>
                                <p className="text-xs text-muted-foreground">mm는 자동으로 붙습니다.</p>
                                <div className="flex flex-col gap-2 md:flex-row">
                                  <Input
                                    placeholder="예: 1.25"
                                    value={gaugeInputsByColor[row.value] ?? ""}
                                    onChange={(e) =>
                                      setGaugeInputsByColor((prev) => ({
                                        ...prev,
                                        [row.value]: e.target.value,
                                      }))
                                    }
                                  />
                                  <Button type="button" size="sm" onClick={() => addVariantForColor(row)}>
                                    게이지 추가
                                  </Button>
                                </div>
                                {variantInventories.filter((variant) => variant.colorValue === row.value).length === 0 ? (
                                  <p className="text-xs text-muted-foreground">아직 추가된 게이지가 없습니다.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {variantInventories.filter((variant) => variant.colorValue === row.value).map((variantRow) => {
                                      return (
                                        <div key={`${row.value}-${variantRow.gaugeValue}`} className="flex flex-col gap-3 rounded-md border border-border/60 bg-background/60 p-3 md:flex-row md:items-center md:justify-between">
                                          <div className="text-sm font-medium">{variantRow.gaugeLabel ?? variantRow.gaugeValue}</div>
                                          <div className="flex items-center gap-2">
                                            <Label>재고 수량</Label>
                                            <Input
                                              type="number"
                                              min={0}
                                              className="w-24"
                                              value={variantRow.stock ?? 0}
                                              onChange={(e) => updateVariantStock(row.value, variantRow.gaugeValue, Number(e.target.value))}
                                            />
                                            <span className="text-sm text-muted-foreground">개</span>
                                            <label className="ml-2 flex items-center gap-2 text-sm">
                                              <Checkbox
                                                checked={variantRow.isSoldOut ?? true}
                                                onCheckedChange={(checked) => updateVariantSoldOut(row.value, variantRow.gaugeValue, Boolean(checked))}
                                              />
                                              품절
                                            </label>
                                            <label className="ml-2 flex items-center gap-2 text-sm">
                                              <Checkbox
                                                checked={variantRow.showWhenSoldOut !== false}
                                                onCheckedChange={(checked) => updateVariantShowWhenSoldOut(row.value, variantRow.gaugeValue, Boolean(checked))}
                                              />
                                              품절 시에도 노출
                                            </label>
                                            <p className="text-xs text-muted-foreground">꺼두면 재고가 0이거나 품절 처리된 경우 사용자 선택 화면에서 숨겨집니다.</p>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeVariantForColor(row.value, variantRow.gaugeValue)}>삭제</Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <p className="text-sm font-medium text-muted-foreground">
                                  {colorMeta?.name ?? row.label ?? row.value} 총 재고: {getColorTotalStock(row.value)}개
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>전체 사용 게이지 요약</Label>
                      <p className="text-sm text-muted-foreground">실제 추가/삭제는 각 색상 카드 안에서 관리됩니다.</p>
                      <div className="space-y-3">
                        {gaugeSummaryRows.map((row) => (
                          <div key={row.value} className="rounded-lg border border-border/70 bg-muted/10 p-4">
                            <div className="text-sm font-semibold">{row.label ?? row.value} · 총 재고 {getGaugeTotalStock(row.value)}개</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 성능 및 특성 탭 */}
              <TabsContent value="features" className="space-y-4">
                <Card
                  variant="ghost"
                  className="shadow-xl bg-muted/30 border border-border"
                >
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="text-primary">성능 및 특성</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      스트링의 성능과 특성을 설정하세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="power-rating">반발력</Label>
                        <span className="font-medium">{features.power}/100</span>
                      </div>
                      <Slider
                        id="power-rating"
                        min={1}
                        max={100}
                        step={1}
                        value={[features.power]}
                        onValueChange={(value) =>
                          setFeatures({ ...features, power: value[0] })
                        }
                        className="w-full h-4 data-[orientation=horizontal]:bg-muted/1000 [&>[data-slider-track]]:bg-muted [&>[data-slider-range]]:bg-primary"
                      />

                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>낮음</span>
                        <span>높음</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="control-rating">컨트롤</Label>
                        <span className="font-medium">
                          {features.control}/100
                        </span>
                      </div>
                      <Slider
                        id="control-rating"
                        min={1}
                        max={100}
                        step={1}
                        value={[features.control]}
                        onValueChange={(value) =>
                          setFeatures({ ...features, control: value[0] })
                        }
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>낮음</span>
                        <span>높음</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="spin-rating">스핀</Label>
                        <span className="font-medium">{features.spin}/100</span>
                      </div>
                      <Slider
                        id="spin-rating"
                        min={1}
                        max={100}
                        step={1}
                        value={[features.spin]}
                        onValueChange={(value) =>
                          setFeatures({ ...features, spin: value[0] })
                        }
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>낮음</span>
                        <span>높음</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="durability-rating">내구성</Label>
                        <span className="font-medium">
                          {features.durability}/100
                        </span>
                      </div>
                      <Slider
                        id="durability-rating"
                        min={1}
                        max={100}
                        step={1}
                        value={[features.durability]}
                        onValueChange={(value) =>
                          setFeatures({ ...features, durability: value[0] })
                        }
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>낮음</span>
                        <span>높음</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="comfort-rating">편안함</Label>
                        <span className="font-medium">
                          {features.comfort}/100
                        </span>
                      </div>
                      <Slider
                        id="comfort-rating"
                        min={1}
                        max={100}
                        step={1}
                        value={[features.comfort]}
                        onValueChange={(value) =>
                          setFeatures({ ...features, comfort: value[0] })
                        }
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>낮음</span>
                        <span>높음</span>
                      </div>
                    </div>

                    <Separator className="bg-border" />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-primary">
                        추천 플레이어 타입
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="player-beginner"
                            checked={tags.beginner}
                            onCheckedChange={(checked) =>
                              setTags({ ...tags, beginner: checked })
                            }
                          />
                          <Label htmlFor="player-beginner">초보자</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="player-intermediate"
                            checked={tags.intermediate}
                            onCheckedChange={(checked) =>
                              setTags({ ...tags, intermediate: checked })
                            }
                          />
                          <Label htmlFor="player-intermediate">중급자</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="player-advanced"
                            checked={tags.advanced}
                            onCheckedChange={(checked) =>
                              setTags({ ...tags, advanced: checked })
                            }
                          />
                          <Label htmlFor="player-advanced">상급자</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-primary">
                        추천 플레이 스타일
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="style-baseline"
                            checked={tags.baseline}
                            onCheckedChange={(checked) =>
                              setTags({ ...tags, baseline: checked })
                            }
                          />
                          <Label htmlFor="style-baseline">
                            베이스라인 플레이어
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="style-serve-volley"
                            checked={tags.serveVolley}
                            onCheckedChange={(checked) =>
                              setTags({ ...tags, serveVolley: checked })
                            }
                          />
                          <Label htmlFor="style-serve-volley">
                            서브 앤 발리 플레이어
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="style-all-court"
                            checked={tags.allCourt}
                            onCheckedChange={(checked) =>
                              setTags({ ...tags, allCourt: checked })
                            }
                          />
                          <Label htmlFor="style-all-court">
                            올코트 플레이어
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="style-power"
                            checked={tags.power}
                            onCheckedChange={(checked) =>
                              setTags({ ...tags, power: checked })
                            }
                          />
                          <Label htmlFor="style-power">파워 히터</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="string-features">추가 특성</Label>
                      <Textarea
                        id="string-features"
                        placeholder="스트링의 추가 특성이나 장점을 입력하세요"
                        className="min-h-[100px]"
                        value={additionalFeatures}
                        onChange={(e) => setAdditionalFeatures(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 재고 관리 탭 */}
              <TabsContent value="inventory" className="space-y-4">
                <Card
                  variant="ghost"
                  className="shadow-xl bg-muted/30 border border-border"
                >
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="text-primary">재고 관리</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      스트링의 재고 관련 정보를 설정하세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-gauge-stock"
                          checked={showGaugeStockToUser}
                          onCheckedChange={setShowGaugeStockToUser}
                        />
                        <Label htmlFor="show-gauge-stock">
                          사용자에게 게이지별 재고 수량 노출
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="string-stock">재고 수량</Label>
                        <Input
                          id="string-stock"
                          type="text"
                          value={totalGaugeStock.toLocaleString()}
                          readOnly
                          disabled
                        />
                        <p className="text-xs text-muted-foreground">
                          게이지별 재고 수량의 합계로 자동 계산됩니다.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="string-low-stock">
                          재고 부족 알림 기준
                        </Label>
                        <Input
                          id="string-low-stock"
                          type="text"
                          placeholder="0"
                          value={inventory.lowStock.toLocaleString()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/,/g, "");
                            const numeric = Number(raw);
                            if (!isNaN(numeric)) {
                              setInventory({ ...inventory, lowStock: numeric });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>재고 상태</Label>
                      <RadioGroup
                        value={inventory.status}
                        onValueChange={(value) =>
                          setInventory({ ...inventory, status: value })
                        }
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="instock" id="instock" />
                          <Label htmlFor="instock">재고 있음</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="outofstock" id="outofstock" />
                          <Label htmlFor="outofstock">품절</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="backorder" id="backorder" />
                          <Label htmlFor="backorder">입고 예정</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="string-manage-stock"
                          checked={inventory.manageStock}
                          onCheckedChange={(checked) =>
                            setInventory({ ...inventory, manageStock: checked })
                          }
                        />
                        <Label htmlFor="string-manage-stock">
                          재고 관리 사용
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        재고 관리를 사용하면 판매될 때마다 재고가 자동으로
                        감소합니다.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
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
                        <Label htmlFor="string-backorders">
                          품절 시 주문 허용
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        재고가 없을 때도 고객이 주문할 수 있도록 허용합니다.
                      </p>
                    </div>

                    <Separator className="bg-border" />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-primary">
                        판매 옵션
                      </h3>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
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
                          <Label htmlFor="string-featured">
                            추천 상품으로 표시
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="string-new"
                            checked={inventory.isNew}
                            onCheckedChange={(checked) =>
                              setInventory({ ...inventory, isNew: checked })
                            }
                          />
                          <Label htmlFor="string-new">신상품으로 표시</Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="string-sale"
                            checked={inventory.isSale}
                            onCheckedChange={(checked) =>
                              setInventory({ ...inventory, isSale: checked })
                            }
                          />
                          <Label htmlFor="string-sale">
                            할인 상품으로 표시
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="string-sale-price">할인가</Label>
                        <div className="flex">
                          <Input
                            id="string-sale-price"
                            type="text"
                            value={inventory.salePrice.toLocaleString()} // 보기에는 콤마 포함
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/,/g, ""); // 콤마 제거
                              const numeric = Number(rawValue);

                              if (!isNaN(numeric)) {
                                setInventory({
                                  ...inventory,
                                  salePrice: numeric,
                                });
                              }
                            }}
                            placeholder="0"
                          />
                          <span className="ml-2 flex items-center text-sm">
                            원
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 이미지 탭 */}
              <TabsContent value="images" className="space-y-4">
                <Card
                  variant="ghost"
                  className="shadow-xl bg-muted/30 border border-border"
                >
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="text-primary">
                      스트링 이미지
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      상품 대표 이미지와 공통 상세 이미지를 관리합니다. 색상별 이미지는 구매 옵션 탭의 각 색상에서 등록하세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <ImageUploader
                      value={images}
                      onChange={setImages}
                      max={4}
                      variant="string" // 저장 경로: products/strings/...
                      enablePrimary // 배열 0번 = 대표, "대표로" 버튼 제공
                    />
                    <div className="text-sm text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center">
                            <Info className="mr-1 h-4 w-4" />
                            최대 4장까지 업로드 가능합니다.
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              최적의 표시를 위해 1000x1000 픽셀 이상의 정사각형
                              이미지를 사용하세요.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                type="button"
                asChild
                className="bg-muted/40 hover:bg-muted border-border"
              >
                <Link
                  href="/admin/products"
                  data-no-unsaved-guard
                  onClick={confirmLeave}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  취소
                </Link>
              </Button>
              <Button type="submit" variant="default" disabled={submitting || uploading}>
                <Save className="mr-2 h-4 w-4" />
                {submitting ? "등록 중..." : "저장"}
              </Button>
            </div>
          </form>
        </div>
      </div>
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
