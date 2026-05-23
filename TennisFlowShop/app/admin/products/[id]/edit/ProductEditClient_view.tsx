"use client";

/** Responsibility: 상품 수정 화면 표현 + 상호작용 오케스트레이션 뷰. */

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Upload, Info, Delete, Package } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ProductEditDialogs from "./dialogs/ProductEditDialogs";
import useSWR from "swr";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { runAdminActionWithToast } from "@/lib/admin/adminActionHelpers";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import type {
  HybridSpecUnit,
  ProductColorInventory,
  ProductGaugeInventory,
  ProductDetailResponse,
  ProductVariantInventory,
} from "@/types/admin/products";
import {
  brands,
  colors,
  gauges,
  materials,
} from "@/app/admin/products/_lib/productFormOptions";
import { createSearchKeywords } from "./hooks/useKeywordGenerator";
import { adminFormHintTooltipClass } from "@/lib/tooltip-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { normalizeFeatureScoresTo100 } from "@/lib/product-feature-score";
import { parseSearchKeywordsInput } from "./table/productTableUtils";
import {
  MAX_PRODUCT_IMAGE_COUNT,
  buildProductEditInitialSnapshot,
  buildProductEditSnapshot,
  normalizeHybridState,
  removeImageByIndex,
  reorderMainImage,
  sanitizeUploadFileName,
} from "./utils/productEditTransforms";

function EditTabOverlaySkeleton({ tab }: { tab: string }) {
  if (tab === "basic") {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 rounded-md bg-background/70 p-6">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }
  if (tab === "features") {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 rounded-md bg-background/70 p-6">
        <div className="space-y-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }
  if (tab === "inventory") {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 rounded-md bg-background/70 p-6">
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 z-10 rounded-md bg-background/70 p-6">
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductEditClient({
  productId,
}: {
  productId: string;
}) {
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

  // 검색 키워드(쉼표 구분) 입력 상태
  const [searchKeywordsInput, setSearchKeywordsInput] = useState("");
  const [gaugeInventories, setGaugeInventories] = useState<
    ProductGaugeInventory[]
  >([]);
  const [colorInventories, setColorInventories] = useState<
    ProductColorInventory[]
  >([]);
  const [variantInventories, setVariantInventories] = useState<
    ProductVariantInventory[]
  >([]);
  const [shouldShowLegacyVariantGuide, setShouldShowLegacyVariantGuide] =
    useState(false);
  const [showGaugeStockToUser, setShowGaugeStockToUser] = useState(true);
  const getVariantKey = (colorValue: string, gaugeValue: string) =>
    `${colorValue}::${gaugeValue}`;
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
  const getColorTotalStock = (colorValue: string) =>
    variantInventories
      .filter((row) => row.colorValue === colorValue && !row.isSoldOut)
      .reduce((sum, row) => sum + (Number.isFinite(row.stock) ? row.stock : 0), 0);
  const getGaugeTotalStock = (gaugeValue: string) =>
    variantInventories
      .filter((row) => row.gaugeValue === gaugeValue && !row.isSoldOut)
      .reduce((sum, row) => sum + (Number.isFinite(row.stock) ? row.stock : 0), 0);
  const addVariantForColor = (colorRow: ProductColorInventory, gaugeValue: string) => {
    const gaugeMeta = gauges.find((g) => g.value === gaugeValue);
    setVariantInventories((prev) => {
      if (prev.some((row) => row.colorValue === colorRow.value && row.gaugeValue === gaugeValue)) return prev;
      return [...prev, { colorValue: colorRow.value, colorLabel: colorRow.label, colorHex: colorRow.colorHex, colorImage: colorRow.image ?? "", gaugeValue, gaugeLabel: gaugeMeta?.name ?? gaugeValue, stock: 0, isSoldOut: true }];
    });
  };
  const removeVariantForColor = (colorValue: string, gaugeValue: string) =>
    setVariantInventories((prev) =>
      prev.filter((row) => !(row.colorValue === colorValue && row.gaugeValue === gaugeValue)),
    );
  const handleGenerateKeywords = () => {
    const keywords = createSearchKeywords(basicInfo.name, basicInfo.brand);
    if (!keywords) {
      showErrorToast(<>먼저 스트링명과 브랜드를 입력해 주세요.</>);
      return;
    }
    setSearchKeywordsInput(keywords.join(", "));
  };


  const { data, error, isLoading } = useSWR<ProductDetailResponse>(
    `/api/admin/products/${productId}`,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // 추가 특성 정보
  const [additionalFeatures, setAdditionalFeatures] = useState("");

  // 탭 상태관리
  const [activeTab, setActiveTab] = useState("basic");

  const [images, setImages] = useState<string[]>([]);

  // 이미지 업로드 상태
  const [uploading, setUploading] = useState(false);

  // 더블클릭/연타 레이스 방지 (submit/delete)
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const deleteRef = useRef(false);
  const baselineRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data?.product) return;
    const p = data.product;
    setBasicInfo({
      name: p.name,
      sku: p.sku,
      shortDescription: p.shortDescription,
      description: p.description,
      brand: p.brand,
      material: p.material,
      gauge: p.gauge,
      color: p.color,
      length: p.length,
      price: p.price,
      mountingFee: p.mountingFee,
      shippingFee: p.shippingFee ?? 3000,
    });

    // 검색 키워드 초기값
    setSearchKeywordsInput(
      Array.isArray(p.searchKeywords) ? p.searchKeywords.join(", ") : "",
    );
    const gaugeInventoryRows =
      Array.isArray(p.gaugeInventories) && p.gaugeInventories.length > 0
        ? p.gaugeInventories
        : Array.isArray(p.gaugeOptions) && p.gaugeOptions.length > 0
          ? p.gaugeOptions.map((value: string) => {
              const found = gauges.find((g) => g.value === value);
              return { value, label: found?.name ?? value, stock: 0, isSoldOut: false };
            })
          : p.gauge
            ? [{ value: p.gauge, label: p.gauge, stock: 0, isSoldOut: false }]
            : [];
    setGaugeInventories(gaugeInventoryRows);
    const colorInventoryRows =
      Array.isArray(p.colorInventories) && p.colorInventories.length > 0
        ? p.colorInventories
        : Array.isArray(p.colorOptions) && p.colorOptions.length > 0
          ? p.colorOptions.map((value: string) => {
              const found = colors.find((c) => c.id === value);
              return { value, label: found?.name ?? value, colorHex: found?.hex, image: "", stock: 0, isSoldOut: false };
            })
          : p.color
            ? (() => {
                const found = colors.find((c) => c.id === p.color);
                return [{ value: p.color, label: found?.name ?? p.color, colorHex: found?.hex, image: "", stock: 0, isSoldOut: false }];
              })()
            : [];
    setColorInventories(colorInventoryRows);
    const hasExistingVariants =
      Array.isArray(p.variantInventories) && p.variantInventories.length > 0;
    if (hasExistingVariants) {
      const existingVariants = p.variantInventories ?? [];
      const colorMetaMap = new Map(
        colorInventoryRows.map((row) => [row.value, row]),
      );
      const gaugeMetaMap = new Map(
        gaugeInventoryRows.map((row) => [row.value, row]),
      );
      const normalizedVariantMap = new Map<string, ProductVariantInventory>();

      existingVariants.forEach((row) => {
        const colorMeta = colorMetaMap.get(row.colorValue);
        const gaugeMeta = gaugeMetaMap.get(row.gaugeValue);
        const key = getVariantKey(row.colorValue, row.gaugeValue);
        if (normalizedVariantMap.has(key)) return;
        normalizedVariantMap.set(key, {
          ...row,
          colorLabel: colorMeta?.label ?? row.colorLabel,
          colorHex: colorMeta?.colorHex ?? row.colorHex,
          colorImage: row.colorImage ?? colorMeta?.image ?? "",
          gaugeLabel: gaugeMeta?.label ?? row.gaugeLabel,
          stock:
            Number.isFinite(Number(row.stock)) && Number(row.stock) >= 0
              ? Number(row.stock)
              : 0,
          isSoldOut: Boolean(row.isSoldOut),
        });
      });

      setVariantInventories(Array.from(normalizedVariantMap.values()));
      setShouldShowLegacyVariantGuide(false);
    } else {
      setVariantInventories([]);
      setShouldShowLegacyVariantGuide(colorInventoryRows.length > 0);
    }

    const hybridState = normalizeHybridState(p);
    setHybridMain(hybridState.hybridMain);
    setHybridCross(hybridState.hybridCross);
    setFeatures(normalizeFeatureScoresTo100(p.features));
    setTags(p.tags);
    setInventory({
      stock: p.inventory.stock,
      lowStock: p.inventory.lowStock,
      status: p.inventory.status,
      manageStock: p.inventory.manageStock,
      allowBackorder: p.inventory.allowBackorder,
      isFeatured: p.inventory.isFeatured,
      isNew: p.inventory.isNew,
      isSale: p.inventory.isSale,
      salePrice: p.inventory.salePrice,
    });
    setShowGaugeStockToUser(!p.inventory.hideGaugeStock);
    setAdditionalFeatures(p.additionalFeatures);
    setImages(p.images);
    setMainImageIndex(0);
    if (baselineRef.current === null) {
      baselineRef.current = buildProductEditInitialSnapshot(p);
    }
  }, [data]);

  useEffect(() => {
    setInventory((prev) => ({ ...prev, stock: totalGaugeStock }));
  }, [totalGaugeStock]);

  const isMaxReached = images.length >= MAX_PRODUCT_IMAGE_COUNT; // 최대 이미지 수 도달 여부

  const uploadProductImageFile = async (file: File): Promise<string | null> => {
    const fileName = sanitizeUploadFileName(file.name);
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
    const availableSlots = MAX_PRODUCT_IMAGE_COUNT - images.length;

    if (totalSelected > availableSlots) {
      e.target.value = "";
      showErrorToast(
        `최대 ${MAX_PRODUCT_IMAGE_COUNT}장까지만 업로드할 수 있습니다. (${availableSlots}장만 추가 가능)`,
      );
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);
    setUploading(true);

    for (const file of filesToUpload) {
      const imageUrl = await uploadProductImageFile(file);
      if (!imageUrl) {
        // 업로드 실패 시에도 다음 파일은 계속 시도(일괄 업로드 UX)
        showErrorToast(
          "이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        );
        continue;
      }
      setImages((prev) => [...prev, imageUrl]);
    }

    setUploading(false);
    e.target.value = ""; // <- 동일 파일 다시 선택 가능하도록
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
      showErrorToast("색상 이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setColorInventories((prev) =>
      prev.map((row) =>
        row.value === colorValue ? { ...row, image: imageUrl } : row,
      ),
    );
    setVariantInventories((prev) =>
      prev.map((row) =>
        row.colorValue === colorValue ? { ...row, colorImage: imageUrl } : row,
      ),
    );
  };

  // 대표 이미지 설정
  const [mainImageIndex, setMainImageIndex] = useState(0);

  // 하이브리드 구성(메인/크로스)
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

  // 하이브리드일 때만 동기화
  useEffect(() => {
    if (basicInfo.material !== "hybrid") return;
    setBasicInfo((prev) => ({
      ...prev,
      brand: prev.brand || hybridMain.brand || prev.brand,
      gauge: prev.gauge || hybridMain.gauge || prev.gauge,
      color: prev.color || hybridMain.color || prev.color,
      length: prev.length || "12",
    }));
  }, [
    basicInfo.material,
    hybridMain.brand,
    hybridMain.gauge,
    hybridMain.color,
  ]);

  // 대표이미지 설정 핸들러
  const handleSetMainImage = (index: number) => {
    setImages((prev) => reorderMainImage(prev, index));
  };

  // 이미지 삭제 핸들러
  const handleRemoveImage = (index: number) => {
    setImages((prev) => removeImageByIndex(prev, index));
  };

  const router = useRouter(); // 페이지 이동을 위한 라우터

  const snapshot = useMemo(
    () =>
      buildProductEditSnapshot({
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

  const isDirty =
    baselineRef.current !== null && baselineRef.current !== snapshot;
  useUnsavedChangesGuard(isDirty && !submitting && !uploading && !deleting);

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isInitialClientLoading = isLoading && !data?.product;

  const confirmLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (!isDirty || submitting || uploading || deleting) return;
    e.preventDefault();
    e.stopPropagation();
    setLeaveDialogOpen(true);
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 이미 제출/삭제가 진행 중이면 연타 방지
    if (submitting || submitRef.current || deleting || deleteRef.current)
      return;

    // 제출 중에는 ref로 즉시 잠금(동기)
    submitRef.current = true;
    try {
      // 이미지 업로드 중에는 제출 금지(업로드 끝나기 전에 저장하면 images 누락될 수 있음)
      if (uploading) {
        showErrorToast(
          "이미지 업로드 중입니다. 업로드 완료 후 다시 시도해 주세요.",
        );
        return;
      }

      // 색션명 상수
      const SECTIONS = {
        BASIC: "기본정보",
        OPTIONS: "구매 옵션",
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

      const hasColorWithoutVariant = colorInventories.some((colorRow) => !variantInventories.some((variant) => variant.colorValue === colorRow.value));
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

      // 하이브리드면 조합 병합
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

      const searchKeywords = searchKeywordsInput
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      const normalizedVariants = variantInventories.map((row) => ({
        ...row,
        stock: Math.max(0, Number(row.stock) || 0),
        isSoldOut: Boolean(row.isSoldOut),
        colorImage:
          row.colorImage ??
          colorInventories.find((c) => c.value === row.colorValue)?.image ??
          "",
      }));
      const normalizedColorInventories = colorInventories.map((row) => {
        const colorMeta = colors.find((c) => c.id === row.value);
        const colorRows = normalizedVariants.filter((variant) => variant.colorValue === row.value);
        const sellableStock = colorRows
          .filter((variant) => !variant.isSoldOut && variant.stock > 0)
          .reduce((sum, variant) => sum + variant.stock, 0);
        const isSoldOut = colorRows.length === 0 || colorRows.every((variant) => variant.isSoldOut) || sellableStock === 0;
        return {
          value: colorMeta?.id ?? row.value,
          label: colorMeta?.name ?? row.label ?? row.value,
          colorHex: colorMeta?.hex ?? row.colorHex ?? "",
          image: row.image ?? "",
          stock: sellableStock,
          isSoldOut,
        };
      });
      const gaugeSummaryValues = Array.from(new Set(normalizedVariants.map((variant) => variant.gaugeValue)));
      const normalizedGaugeInventories = gaugeSummaryValues.map((value) => {
        const row = gaugeInventories.find((item) => item.value === value);
        const gaugeMeta = gauges.find((g) => g.value === value);
        const gaugeRows = normalizedVariants.filter((variant) => variant.gaugeValue === value);
        const sellableStock = gaugeRows
          .filter((variant) => !variant.isSoldOut && variant.stock > 0)
          .reduce((sum, variant) => sum + variant.stock, 0);
        const isSoldOut = gaugeRows.length === 0 || gaugeRows.every((variant) => variant.isSoldOut) || sellableStock === 0;
        return {
          value: gaugeMeta?.value ?? value,
          label: gaugeMeta?.name ?? row?.label ?? value,
          stock: sellableStock,
          isSoldOut,
        };
      });
      const gaugeOptions = Array.from(new Set(normalizedVariants.map((row) => row.gaugeValue)));
      const normalizedGauge = gaugeOptions[0] ?? basicInfo.gauge ?? "";
      const normalizedGaugeStockTotal = normalizedVariants
        .filter((variant) => !variant.isSoldOut && variant.stock > 0)
        .reduce((sum, variant) => sum + variant.stock, 0);
      const colorOptions = normalizedColorInventories.map((row) => row.value);
      const normalizedColor = colorOptions[0] ?? basicInfo.color ?? "";

      //  product 전체 구성
      const product = {
        ...basicInfo, // name, brand, price 등 기본 항목
        gauge: normalizedGauge,
        gaugeOptions,
        gaugeInventories: normalizedGaugeInventories,
        color: normalizedColor,
        colorOptions,
        colorInventories: normalizedColorInventories,
        variantInventories: normalizedVariants,

        searchKeywords,

        features: {
          ...features, // power, control, spin 등 성능 항목
        },

        tags: { ...tags }, // 추천 플레이어 & 스타일

        specifications: {
          ...specifications,
          gauge: normalizedGauge,
        }, // 영문 키로 통일된 사양 정보

        additionalFeatures, // 추가 설명

        images: [
          // 이미지 배열
          ...images.slice(mainImageIndex, mainImageIndex + 1), // 대표 이미지 먼저
          ...images.filter((_, i) => i !== mainImageIndex), // 나머지
        ],
        inventory: {
          ...inventory,
          stock: normalizedGaugeStockTotal,
          hideGaugeStock: !showGaugeStockToUser,
        }, // 재고 관리 정보
      };
      setShouldShowLegacyVariantGuide(false);

      // console.log(' 등록된 상품 데이터:', product);

      // API 전송 로직 위치

      // API 전송
      setSubmitting(true);

      try {
        const result = await runAdminActionWithToast({
          action: () =>
            adminMutator(`/api/admin/products/${productId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(product),
            }),
          successMessage: "상품이 수정되었습니다.",
          fallbackErrorMessage:
            "알 수 없는 오류가 발생했습니다. 관리자에게 문의하세요",
        });

        if (!result) return;
        router.push("/admin/products"); // 등록된 상품 상세 페이지로 즉시 이동
      } finally {
        setSubmitting(false);
      }
    } finally {
      // validations에서 return 되더라도 잠금은 반드시 풀려야 함
      submitRef.current = false;
    }
  };

  // 삭제 핸들러
  const handleDelete = () => {
    // 제출/삭제/업로드 중이면 삭제 금지
    if (
      uploading ||
      submitting ||
      submitRef.current ||
      deleting ||
      deleteRef.current
    )
      return;
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    deleteRef.current = true;
    setDeleting(true);
    try {
      const result = await runAdminActionWithToast({
        action: () =>
          adminMutator(`/api/admin/products/${productId}`, {
            method: "DELETE",
          }),
        successMessage: "상품이 삭제되었습니다.",
        fallbackErrorMessage: "삭제 중 오류가 발생했습니다.",
      });
      if (result) router.push("/admin/products");
    } finally {
      setDeleting(false);
      deleteRef.current = false;
    }
  };

  if (error) return <div className="p-6">상품 불러오기 실패</div>;
  if (!data?.product && !isLoading)
    return <div className="p-6">상품 정보를 찾을 수 없습니다.</div>;

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
                      스트링 수정
                    </h2>
                    <p className="text-muted-foreground">
                      테니스 스트링 정보를 수정하고 등록하세요.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" type="button" asChild>
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
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={
                      isInitialClientLoading || uploading || submitting || deleting
                    }
                  >
                    <Delete className="mr-2 h-4 w-4" />
                    삭제
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isInitialClientLoading || uploading || submitting || deleting
                    }
                    variant="default"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {submitting ? "수정 중..." : "수정완료"}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

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
              <TabsContent value="basic" className="relative space-y-4">
                {isInitialClientLoading ? <EditTabOverlaySkeleton tab="basic" /> : null}
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
                        설정합니다.
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
                        <p className="text-xs text-muted-foreground">실제 구매 색상은 구매 옵션 탭에서 색상별로 관리됩니다.</p>
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
                            value={
                              basicInfo.mountingFee != null
                                ? basicInfo.mountingFee.toLocaleString()
                                : ""
                            }
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
                <Card variant="ghost" className="shadow-xl bg-muted/30 border border-border">
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="text-primary">구매 옵션</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      색상/게이지 옵션별 재고 및 품절 상태를 관리하세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    {shouldShowLegacyVariantGuide ? (
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        기존 상품은 색상별 게이지 재고가 설정되어 있지 않습니다. 색상×게이지 조합별 재고를 다시 입력한 뒤 저장해 주세요.
                      </div>
                    ) : null}
                    <div className="space-y-3">
                      <Label>색상 옵션</Label>
                      <p className="text-sm text-muted-foreground">사용 가능한 색상을 선택하고 색상별 게이지 조합 재고를 설정하세요.</p>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((color) => {
                          const selected = colorInventories.some((row) => row.value === color.id);
                          return <Button key={color.id} type="button" size="sm" variant={selected ? "default" : "outline"} onClick={() => {
                            if (selected) {
                              setColorInventories((prev) => prev.filter((row) => row.value !== color.id));
                              setVariantInventories((prev) => prev.filter((row) => row.colorValue !== color.id));
                            } else {
                              setColorInventories((prev) => [...prev, { value: color.id, label: color.name, colorHex: color.hex, image: "", stock: 0, isSoldOut: false }]);
                            }
                          }}>{color.name}</Button>;
                        })}
                      </div>
                      {colorInventories.length === 0 && <p className="text-sm text-muted-foreground">선택된 색상이 없습니다. 위 색상 목록에서 사용할 색상을 선택하세요.</p>}
                      <div className="space-y-3">
                        {colorInventories.map((row) => {
                          const colorMeta = colors.find((c) => c.id === row.value);
                          const resolvedHex = colorMeta?.hex ?? row.colorHex ?? "";
                          return <div key={row.value} className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-4">
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
                                <Input type="file" accept="image/*" className="hidden" id={`edit-color-image-${row.value}`} onChange={(e) => void handleUploadColorImage(row.value, e)} />
                                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`edit-color-image-${row.value}`)?.click()}>
                                  이미지 업로드
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => {
                                  setColorInventories((prev) => prev.map((item) => item.value === row.value ? { ...item, image: "" } : item));
                                  setVariantInventories((prev) => prev.map((item) => item.colorValue === row.value ? { ...item, colorImage: "" } : item));
                                }}>
                                  이미지 제거
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="text-sm font-semibold">게이지별 재고</div>
                              <p className="text-xs text-muted-foreground">이 색상에서 판매할 게이지만 추가하세요.</p>
                              <div className="flex flex-wrap gap-2">
                                {gauges.map((gauge) => {
                                  const selected = variantInventories.some((variant) => variant.colorValue === row.value && variant.gaugeValue === gauge.value);
                                  return <Button key={`${row.value}-${gauge.value}`} type="button" size="sm" variant={selected ? "default" : "outline"} onClick={() => selected ? removeVariantForColor(row.value, gauge.value) : addVariantForColor(row, gauge.value)}>{gauge.name}</Button>;
                                })}
                              </div>
                              <div className="space-y-3">
                                {variantInventories.filter((variant) => variant.colorValue === row.value).map((variant) => (
                                  <div key={`${row.value}-${variant.gaugeValue}`} className="flex flex-col gap-2 rounded-md border border-border/60 p-3 md:flex-row md:items-center md:justify-between">
                                    <div className="text-sm font-medium">{variant.gaugeLabel ?? variant.gaugeValue}</div>
                                    <div className="flex items-center gap-2">
                                      <Label>재고 수량</Label>
                                      <Input type="number" min={0} className="w-28" value={variant.stock ?? 0} onChange={(e) => updateVariantStock(row.value, variant.gaugeValue, Number(e.target.value))} />
                                      <span className="text-sm text-muted-foreground">개</span>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm">
                                      <Checkbox checked={variant.isSoldOut ?? true} onCheckedChange={(checked) => updateVariantSoldOut(row.value, variant.gaugeValue, Boolean(checked))} />
                                      품절
                                    </label>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeVariantForColor(row.value, variant.gaugeValue)}>삭제</Button>
                                  </div>
                                ))}
                              </div>
                              <p className="text-sm text-muted-foreground">{colorMeta?.name ?? row.label ?? row.value} 총 재고: {getColorTotalStock(row.value)}개</p>
                            </div>
                          </div>;
                        })}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>전체 사용 게이지 요약</Label>
                      <p className="text-sm text-muted-foreground">실제 추가/삭제는 각 색상 카드 안에서 관리됩니다.</p>
                      <div className="space-y-3">
                        {Array.from(new Set(variantInventories.map((variant) => variant.gaugeValue))).map((gaugeValue) => <div key={gaugeValue} className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-4">
                          <div className="text-sm font-semibold">{gauges.find((g) => g.value === gaugeValue)?.name ?? gaugeValue} · 총 재고 {getGaugeTotalStock(gaugeValue)}개</div>
                        </div>)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 성능 및 특성 탭 */}
              <TabsContent value="features" className="relative space-y-4">
                {isInitialClientLoading ? (
                  <EditTabOverlaySkeleton tab="features" />
                ) : null}
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
                        className="w-full h-4"
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
              <TabsContent value="inventory" className="relative space-y-4">
                {isInitialClientLoading ? (
                  <EditTabOverlaySkeleton tab="inventory" />
                ) : null}
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
                    <div className="grid gap-4 md:grid-cols-2">
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
              <TabsContent value="images" className="relative space-y-4">
                {isInitialClientLoading ? <EditTabOverlaySkeleton tab="images" /> : null}
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
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {images.map((image, index) => (
                        <div
                          key={index}
                          className={`relative rounded-md border ${index === 0 ? "ring-2 ring-primary" : "bg-muted/40"}`}
                        >
                          <img
                            src={image || "/placeholder.svg"}
                            alt={`스트링 이미지 ${index + 1}`}
                            className="aspect-square h-full w-full rounded-md object-cover"
                          />

                          {/* 삭제 버튼 */}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute right-1 top-1 h-6 w-6"
                            onClick={() => handleRemoveImage(index)}
                          >
                            <span className="sr-only">이미지 삭제</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </Button>

                          {/* 대표 이미지 표시 */}
                          {index === 0 && (
                            <span className="absolute left-1 top-1 rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                              대표
                            </span>
                          )}

                          {/* 대표로 지정 버튼 (대표 아닐 때만) */}
                          {index !== 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="absolute bottom-1 left-1 h-6 text-xs px-1.5 py-0.5"
                              onClick={() => handleSetMainImage(index)}
                            >
                              대표로 지정
                            </Button>
                          )}
                        </div>
                      ))}
                      <label
                        className={`flex aspect-square h-full w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed ${isMaxReached ? "pointer-events-none opacity-50" : ""}`}
                      >
                        {uploading ? (
                          <Loader2 className="mb-2 h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <Upload className="mb-2 h-6 w-6" />
                        )}
                        <span className="text-sm">이미지 추가</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleAddImage}
                          className="hidden"
                          disabled={
                            isMaxReached || uploading || submitting || deleting
                          }
                        />
                      </label>
                    </div>
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
              <Button variant="outline" type="button" asChild>
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
                variant="destructive"
                onClick={handleDelete}
                disabled={uploading || submitting || deleting}
              >
                <Delete className="mr-2 h-4 w-4" />
                삭제
              </Button>
              <Button
                type="submit"
                disabled={uploading || submitting || deleting}
                variant="default"
              >
                <Save className="mr-2 h-4 w-4" />
                {submitting ? "수정 중..." : "수정완료"}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <ProductEditDialogs
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        onConfirm={() => {
          setLeaveDialogOpen(false);
          router.push("/admin/products");
        }}
        title="작성 중인 변경사항이 있습니다"
        description={UNSAVED_CHANGES_MESSAGE}
        confirmText="이동"
        eventKey="admin-products-edit-leave"
      />
      <ProductEditDialogs
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          setDeleteDialogOpen(false);
          void executeDelete();
        }}
        title="상품 삭제 확인"
        description={`영향 개수: 1개 상품
이 작업은 되돌릴 수 없습니다. 정말 삭제하시겠습니까?`}
        confirmText="삭제"
        severity="danger"
        eventKey="admin-products-edit-delete"
        eventMeta={{ productId }}
      />
    </>
  );
}
