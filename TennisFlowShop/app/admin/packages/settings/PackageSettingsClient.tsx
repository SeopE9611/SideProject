"use client";

import { getPackagePricingMeta } from "@/app/services/packages/_lib/packageCard";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface } from "@/components/admin/admin-typography";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { runAdminActionWithToast } from "@/lib/admin/adminActionHelpers";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { getMerchandisingBadgeSpec } from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import {
  type GeneralSettings,
  type PackageConfig,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_PACKAGE_CONFIGS,
} from "@/lib/package-settings";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Edit3,
  Package,
  Plus,
  Save,
  Settings,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

type PackageSettingsResponse = {
  packageConfigs?: PackageConfig[];
  generalSettings?: Partial<GeneralSettings>;
};

const AdminConfirmDialog = dynamic(() => import("@/components/admin/AdminConfirmDialog"), {
  loading: () => null,
});

const PACKAGE_SETTINGS_GUIDES = [
  {
    icon: Package,
    title: "패키지 판매 구성",
    description: "고객에게 노출될 패키지명, 횟수, 가격, 혜택을 관리합니다.",
  },
  {
    icon: CheckCircle,
    title: "가격·횟수 확인",
    description: "판매가, 정가, 회당 금액, 할인율이 의도한 값인지 확인합니다.",
  },
  {
    icon: Star,
    title: "노출 상태 관리",
    description: "활성화 여부와 추천 패키지 표시 상태를 점검합니다.",
  },
  {
    icon: Settings,
    title: "일반 정책 점검",
    description: "유효기간, 연장 허용, 최소·최대 이용 횟수 정책을 관리합니다.",
  },
];

function isPositiveInteger(value: unknown): boolean {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue >= 1;
}

function isNonNegativeNumber(value: unknown): boolean {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0;
}

function buildPackageSettingsValidation(
  packageConfigs: PackageConfig[],
  generalSettings: GeneralSettings,
) {
  const packageErrors: Record<string, string[]> = {};
  const generalErrors: string[] = [];

  for (const pkg of packageConfigs) {
    const errors: string[] = [];

    if (!String(pkg.name ?? "").trim()) {
      errors.push("패키지명을 입력해야 합니다.");
    }

    if (!isPositiveInteger(pkg.sessions)) {
      errors.push("이용 횟수는 1 이상이어야 합니다.");
    }

    if (!isPositiveInteger(pkg.price)) {
      errors.push("판매 가격은 1원 이상이어야 합니다.");
    }

    if (
      pkg.originalPrice !== undefined &&
      pkg.originalPrice !== null &&
      !isNonNegativeNumber(pkg.originalPrice)
    ) {
      errors.push("정가는 0원 이상이어야 합니다.");
    }

    if (
      typeof pkg.originalPrice === "number" &&
      pkg.originalPrice > 0 &&
      pkg.originalPrice < Number(pkg.price)
    ) {
      errors.push("정가가 판매 가격보다 낮습니다. 할인 표시가 잘못될 수 있습니다.");
    }

    if (!isPositiveInteger(pkg.validityDays)) {
      errors.push("유효기간은 1일 이상이어야 합니다.");
    }

    if (Array.isArray(pkg.features) && pkg.features.some((feature) => !String(feature).trim())) {
      errors.push("빈 혜택 문구가 있습니다. 삭제하거나 내용을 입력해주세요.");
    }

    if (pkg.isPopular && !pkg.isActive) {
      errors.push("비활성 패키지는 추천 패키지로 표시하지 않는 것이 안전합니다.");
    }

    if (errors.length > 0) {
      packageErrors[pkg.id] = errors;
    }
  }

  if (!isPositiveInteger(generalSettings.maxValidityDays)) {
    generalErrors.push("최대 유효기간은 1일 이상이어야 합니다.");
  }

  if (!isNonNegativeNumber(generalSettings.autoExpireNotificationDays)) {
    generalErrors.push("만료 알림 일수는 0 이상이어야 합니다.");
  }

  if (!isPositiveInteger(generalSettings.minSessions)) {
    generalErrors.push("최소 이용 횟수는 1 이상이어야 합니다.");
  }

  if (!isPositiveInteger(generalSettings.maxSessions)) {
    generalErrors.push("최대 이용 횟수는 1 이상이어야 합니다.");
  }

  if (
    isPositiveInteger(generalSettings.minSessions) &&
    isPositiveInteger(generalSettings.maxSessions) &&
    Number(generalSettings.minSessions) > Number(generalSettings.maxSessions)
  ) {
    generalErrors.push("최소 이용 횟수는 최대 이용 횟수보다 클 수 없습니다.");
  }

  if (!isNonNegativeNumber(generalSettings.extensionFeePercentage)) {
    generalErrors.push("연장 수수료는 0 이상이어야 합니다.");
  }

  const packageErrorMessages = Object.entries(packageErrors).flatMap(([packageId, errors]) => {
    const pkg = packageConfigs.find((item) => item.id === packageId);
    const packageName = pkg?.name?.trim() || packageId;

    return errors.map((error) => `${packageName}: ${error}`);
  });

  const messages = [...packageErrorMessages, ...generalErrors];

  return {
    packageErrors,
    generalErrors,
    messages,
    hasErrors: messages.length > 0,
  };
}

export default function PackageSettingsClient() {
  // 서버에서 가져온 패키지 설정
  const [packageConfigs, setPackageConfigs] = useState<PackageConfig[]>(DEFAULT_PACKAGE_CONFIGS);

  // 서버에서 가져온 일반 설정
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);

  const [isHydratedFromServer, setIsHydratedFromServer] = useState<boolean>(false);

  // 저장 중 여부 (PUT /api/admin/packages/settings)
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const baselineRef = useRef<string | null>(null);
  const snapshot = useMemo(
    () => JSON.stringify({ packageConfigs, generalSettings }),
    [packageConfigs, generalSettings],
  );

  useEffect(() => {
    // 최초 로드 완료 시 baseline 확정
    if (isHydratedFromServer && baselineRef.current === null) baselineRef.current = snapshot;
  }, [isHydratedFromServer, snapshot]);

  const isDirty =
    isHydratedFromServer && baselineRef.current !== null && baselineRef.current !== snapshot;
  useUnsavedChangesGuard(isDirty && !isSaving);

  const confirmLeave = (e: React.MouseEvent) => {
    if (!isDirty) return;
    if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const { data, isLoading, error, mutate } = useSWR<PackageSettingsResponse>(
    "/api/admin/packages/settings",
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const [editingPackage, setEditingPackage] = useState<string | null>(null);
  const [pendingDeletePackageId, setPendingDeletePackageId] = useState<string | null>(null);

  useEffect(() => {
    if (!data || isHydratedFromServer) return;

    const serverPackages: PackageConfig[] = Array.isArray(data.packageConfigs)
      ? data.packageConfigs
      : DEFAULT_PACKAGE_CONFIGS;
    const serverGeneral: GeneralSettings = {
      ...DEFAULT_GENERAL_SETTINGS,
      ...(data.generalSettings ?? {}),
    };

    setPackageConfigs(serverPackages);
    setGeneralSettings(serverGeneral);
    setIsHydratedFromServer(true);
  }, [data, isHydratedFromServer]);

  useEffect(() => {
    if (!error) return;
    showErrorToast("패키지 설정 조회 중 오류가 발생했습니다.");
  }, [error]);

  // 금액 포맷터
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount);

  // 패키지 설정 저장 (패키지 탭에서 호출)
  const handleSavePackages = async () => {
    if (validation.hasErrors) {
      showErrorToast(validation.messages[0] ?? "패키지 설정값을 확인해주세요.");
      return;
    }

    setIsSaving(true);

    const body = {
      packageConfigs,
      generalSettings,
    };

    const result = await runAdminActionWithToast({
      action: () =>
        adminMutator("/api/admin/packages/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      successMessage: "패키지 설정이 저장되었습니다.",
      fallbackErrorMessage: "패키지 설정 저장에 실패했습니다.",
    });

    if (result) {
      baselineRef.current = snapshot;
      await mutate();
    }

    setIsSaving(false);
  };

  // 일반 설정 저장 (일반 설정 탭에서 호출)
  const handleSaveGeneralSettings = async () => {
    if (validation.hasErrors) {
      showErrorToast(validation.messages[0] ?? "일반 설정값을 확인해주세요.");
      return;
    }

    setIsSaving(true);

    const body = {
      packageConfigs,
      generalSettings,
    };

    const result = await runAdminActionWithToast({
      action: () =>
        adminMutator("/api/admin/packages/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      successMessage: "일반 설정이 저장되었습니다.",
      fallbackErrorMessage: "일반 설정 저장에 실패했습니다.",
    });

    if (result) {
      baselineRef.current = snapshot;
      await mutate();
    }

    setIsSaving(false);
  };

  // 패키지 업데이트
  const updatePackage = (id: string, updates: Partial<PackageConfig>) => {
    setPackageConfigs((prev) => prev.map((pkg) => (pkg.id === id ? { ...pkg, ...updates } : pkg)));
  };

  // 새 패키지 추가
  const addNewPackage = () => {
    const newPackage: PackageConfig = {
      id: `package-${Date.now()}`,
      name: "새 패키지",
      sessions: 20,
      price: 200000,
      description: "새로운 패키지 설명",
      features: ["기본 혜택"],
      isActive: false,
      isPopular: false,
      validityDays: 180,
      sortOrder: packageConfigs.length + 1,
    };
    setPackageConfigs((prev) => [...prev, newPackage]);
    setEditingPackage(newPackage.id);
  };

  // 패키지 삭제
  const deletePackage = (id: string) => {
    const target = packageConfigs.find((pkg) => pkg.id === id);

    if (target?.isActive) {
      showErrorToast("활성 패키지는 먼저 비활성화한 뒤 삭제해주세요.");
      return;
    }

    setPackageConfigs((prev) => prev.filter((pkg) => pkg.id !== id));
    showSuccessToast("패키지가 삭제 예정으로 표시되었습니다. 저장해야 최종 반영됩니다.");
  };

  // 변경 사항 되돌리기
  const resetLocalChanges = () => {
    if (!data) return;

    const serverPackages: PackageConfig[] = Array.isArray(data.packageConfigs)
      ? data.packageConfigs
      : DEFAULT_PACKAGE_CONFIGS;

    const serverGeneral: GeneralSettings = {
      ...DEFAULT_GENERAL_SETTINGS,
      ...(data.generalSettings ?? {}),
    };

    setPackageConfigs(serverPackages);
    setGeneralSettings(serverGeneral);
    setEditingPackage(null);
    setPendingDeletePackageId(null);
    baselineRef.current = JSON.stringify({
      packageConfigs: serverPackages,
      generalSettings: serverGeneral,
    });

    showSuccessToast("저장되지 않은 변경사항을 되돌렸습니다.");
  };

  // 특징 추가
  const addFeature = (packageId: string) => {
    const newFeature = prompt("새로운 특징을 입력하세요:");
    if (newFeature?.trim()) {
      updatePackage(packageId, {
        features: [
          ...(packageConfigs.find((p) => p.id === packageId)?.features || []),
          newFeature.trim(),
        ],
      });
    }
  };

  // 특징 삭제
  const removeFeature = (packageId: string, featureIndex: number) => {
    const pkg = packageConfigs.find((p) => p.id === packageId);
    if (pkg) {
      const newFeatures = pkg.features.filter((_, index) => index !== featureIndex);
      updatePackage(packageId, { features: newFeatures });
    }
  };

  const sortedPackageConfigs = useMemo(
    () => [...packageConfigs].sort((a, b) => a.sortOrder - b.sortOrder),
    [packageConfigs],
  );

  const packageSummary = useMemo(() => {
    const total = packageConfigs.length;
    const active = packageConfigs.filter((pkg) => pkg.isActive).length;
    const popular = packageConfigs.filter((pkg) => pkg.isPopular).length;
    const inactive = packageConfigs.filter((pkg) => !pkg.isActive).length;

    return {
      total,
      active,
      popular,
      inactive,
    };
  }, [packageConfigs]);

  const validation = useMemo(
    () => buildPackageSettingsValidation(packageConfigs, generalSettings),
    [packageConfigs, generalSettings],
  );

  const canSaveSettings = !validation.hasErrors;

  const currentSettingsLabel = isDirty ? "저장되지 않은 변경 있음" : "저장됨";

  if (isLoading) {
    return (
      <AdminPageShell variant="wide" className="space-y-6">
        <div className={cn("mb-8 p-8", adminSurface.cardMuted)}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
            <Skeleton className="h-9 w-44" />
          </div>
        </div>

        <div className="space-y-8">
          <Card className={adminSurface.card}>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-80" />
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className={adminSurface.card}>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AdminPageShell>
    );
  }

  if (error) {
    return (
      <AdminPageShell variant="wide" className="space-y-6">
        <AsyncState
          kind="error"
          tone="admin"
          variant="page-center"
          resourceName="패키지 설정"
          onAction={() => {
            void mutate();
          }}
        />
      </AdminPageShell>
    );
  }

  return (
    <>
      <AdminPageShell variant="wide" className="space-y-6">
        <AdminPageHeader
          title="패키지 설정"
          description="판매할 스트링 패키지 상품의 횟수, 가격, 혜택, 활성 상태를 설정합니다."
          icon={Settings2}
          scope="범위: 패키지 상품 구성"
          helperText="구매된 이용권과 사용 이력은 패키지 관리에서 확인합니다."
          actions={
            <Button
              variant="outline"
              size="sm"
              className="bg-card border-border hover:bg-muted"
              asChild
            >
              <Link href="/admin/packages">
                <ArrowLeft className="mr-2 h-4 w-4" />
                패키지 관리로 돌아가기
              </Link>
            </Button>
          }
        />
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGE_SETTINGS_GUIDES.map(({ icon: Icon, title, description }) => (
            <Card key={title} className={adminSurface.fieldPanelMuted}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "전체 패키지",
              value: packageSummary.total,
              icon: Package,
              tone: "bg-muted",
            },
            {
              label: "활성 패키지",
              value: packageSummary.active,
              icon: CheckCircle,
              tone: "bg-success/10 dark:bg-success/15",
            },
            {
              label: "추천 패키지",
              value: packageSummary.popular,
              icon: Star,
              tone: "bg-primary/10 dark:bg-primary/15",
            },
            {
              label: "비활성 패키지",
              value: packageSummary.inactive,
              icon: AlertTriangle,
              tone: "bg-warning/10 dark:bg-warning/15",
            },
          ].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className={adminSurface.kpiCard}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <p className="text-3xl font-bold text-foreground">
                      {value.toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div className={cn(tone, "rounded-xl border border-border p-3")}>
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
        <div className={adminSurface.filterCard}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">현재 설정 상태</p>

              <Badge variant={isDirty ? "outline" : "success"} className="text-xs">
                {currentSettingsLabel}
              </Badge>

              <Badge variant="secondary" className="text-xs">
                활성 {packageSummary.active}개
              </Badge>

              <Badge variant="secondary" className="text-xs">
                추천 {packageSummary.popular}개
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              저장 후 고객 판매 페이지와 패키지 운영 정책에 반영됩니다.
            </p>
          </div>
        </div>
        {validation.hasErrors && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  저장 전 확인이 필요한 설정이 있습니다.
                </p>

                <ul className="mt-2 space-y-1 text-xs text-destructive">
                  {validation.messages.slice(0, 5).map((message) => (
                    <li key={message}>- {message}</li>
                  ))}
                </ul>

                {validation.messages.length > 5 && (
                  <p className="mt-2 text-xs text-destructive">
                    외 {validation.messages.length - 5}개 항목이 더 있습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {isDirty && (
          <div
            className={cn(
              adminSurface.stickyToolbar,
              "sticky top-20 z-20 border-primary/20 p-4 backdrop-blur",
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  저장되지 않은 변경사항이 있습니다.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  저장해야 고객 판매 페이지와 패키지 운영 정책에 반영됩니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetLocalChanges}
                  disabled={isSaving}
                >
                  변경사항 되돌리기
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSavePackages}
                  disabled={isSaving || !canSaveSettings}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "저장 중..." : "변경사항 저장"}
                </Button>
              </div>
            </div>
          </div>
        )}
        <Tabs defaultValue="packages" className="space-y-6">
          <Card className={adminSurface.card}>
            <CardContent className="p-6">
              <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-background">
                <TabsTrigger
                  value="packages"
                  className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-card data-[state=active]:shadow-md"
                >
                  <Package className="h-5 w-5" />
                  <span className="text-xs font-medium">패키지 상품</span>
                </TabsTrigger>
                <TabsTrigger
                  value="general"
                  className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-card data-[state=active]:shadow-md"
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-xs font-medium">일반 설정</span>
                </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          {/* 패키지 상품 설정 */}
          <TabsContent value="packages">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">패키지 상품 설정</h2>
                  <p className="text-muted-foreground">
                    고객 판매 페이지에 노출되는 패키지명, 횟수, 가격, 혜택을 관리합니다.
                  </p>
                </div>
                <Button
                  onClick={addNewPackage}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="mr-2 h-4 w-4" />새 패키지 추가
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {sortedPackageConfigs.map((pkg) => (
                  <Card key={pkg.id} className={adminSurface.card}>
                    <CardHeader className="border-b border-border/60 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <Package className="h-5 w-5 text-primary" />
                            <CardTitle className="truncate text-lg">{pkg.name}</CardTitle>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {pkg.isPopular && (
                              <Badge variant={getMerchandisingBadgeSpec("popular").variant}>
                                추천
                              </Badge>
                            )}
                            {!pkg.isActive && <Badge variant="secondary">비활성</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setEditingPackage(editingPackage === pkg.id ? null : pkg.id)
                            }
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDeletePackageId(pkg.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/15"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {editingPackage === pkg.id ? (
                        <div className="space-y-4">
                          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                            <p className="text-sm font-semibold text-foreground">
                              판매 페이지 반영 설정입니다
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              패키지명, 이용 횟수, 판매 가격, 정가, 유효기간은 고객 판매 페이지와
                              주문 금액에 직접 반영됩니다. 저장 전 실제 노출될 가격과 할인율을
                              확인하세요.
                            </p>
                          </div>
                          {validation.packageErrors[pkg.id]?.length > 0 && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                              <p className="text-sm font-semibold text-destructive">
                                이 패키지에서 수정이 필요한 항목
                              </p>
                              <ul className="mt-2 space-y-1 text-xs text-destructive">
                                {validation.packageErrors[pkg.id].map((error) => (
                                  <li key={error}>- {error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="rounded-xl border border-border/60 bg-card p-4">
                            <p className="text-sm font-semibold text-foreground">기본 판매 정보</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              고객에게 표시될 패키지명, 이용 횟수, 판매 가격, 유효기간을 설정합니다.
                            </p>

                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              <div>
                                <Label htmlFor={`name-${pkg.id}`}>패키지명</Label>
                                <Input
                                  id={`name-${pkg.id}`}
                                  value={pkg.name}
                                  onChange={(e) =>
                                    updatePackage(pkg.id, {
                                      name: e.target.value,
                                    })
                                  }
                                />
                              </div>

                              <div>
                                <Label htmlFor={`sessions-${pkg.id}`}>이용 횟수</Label>
                                <Input
                                  id={`sessions-${pkg.id}`}
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={pkg.sessions}
                                  onChange={(e) =>
                                    updatePackage(pkg.id, {
                                      sessions: Number.parseInt(e.target.value, 10) || 0,
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <p className="mt-3 text-xs text-muted-foreground">
                              할인율과 절감액은 정가와 판매 가격을 기준으로 자동 계산되며, 할인율은
                              소수점 첫째 자리까지 표시됩니다.
                            </p>

                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              <div>
                                <Label htmlFor={`price-${pkg.id}`}>판매 가격 (원)</Label>
                                <FormattedNumberInput
                                  id={`price-${pkg.id}`}
                                  min={0}
                                  step={1000}
                                  value={pkg.price}
                                  onValueChange={(price) =>
                                    updatePackage(pkg.id, {
                                      price,
                                    })
                                  }
                                />
                              </div>

                              <div>
                                <Label htmlFor={`originalPrice-${pkg.id}`}>정가 (원)</Label>
                                <FormattedNumberInput
                                  id={`originalPrice-${pkg.id}`}
                                  min={0}
                                  step={1000}
                                  value={pkg.originalPrice ?? null}
                                  onValueChange={(originalPrice) =>
                                    updatePackage(pkg.id, {
                                      originalPrice: originalPrice > 0 ? originalPrice : undefined,
                                    })
                                  }
                                  placeholder="할인 표시용 (선택사항)"
                                />
                              </div>
                            </div>

                            <div className="mt-4">
                              <Label htmlFor={`validityDays-${pkg.id}`}>유효기간 (일)</Label>
                              <Input
                                id={`validityDays-${pkg.id}`}
                                type="number"
                                min={1}
                                step={1}
                                value={pkg.validityDays}
                                onChange={(e) =>
                                  updatePackage(pkg.id, {
                                    validityDays: Number.parseInt(e.target.value, 10) || 0,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`description-${pkg.id}`}>설명</Label>
                            <Textarea
                              id={`description-${pkg.id}`}
                              value={pkg.description}
                              onChange={(e) =>
                                updatePackage(pkg.id, {
                                  description: e.target.value,
                                })
                              }
                              rows={2}
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label>패키지 특징</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addFeature(pkg.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                추가
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {pkg.features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Input
                                    value={feature}
                                    onChange={(e) => {
                                      const newFeatures = [...pkg.features];
                                      newFeatures[index] = e.target.value;
                                      updatePackage(pkg.id, {
                                        features: newFeatures,
                                      });
                                    }}
                                    className="flex-1"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFeature(pkg.id, index)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                            <p className="text-sm font-semibold text-foreground">노출 설정</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              활성화 여부와 추천 패키지 표시는 고객 판매 페이지 노출에 영향을
                              줍니다.
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div
                                className={cn(
                                  adminSurface.fieldPanel,
                                  "flex items-center justify-between",
                                )}
                              >
                                <Label htmlFor={`active-${pkg.id}`} className="text-sm font-medium">
                                  활성화
                                </Label>
                                <Switch
                                  id={`active-${pkg.id}`}
                                  checked={pkg.isActive}
                                  onCheckedChange={(checked) =>
                                    updatePackage(pkg.id, {
                                      isActive: checked,
                                    })
                                  }
                                />
                              </div>

                              <div
                                className={cn(
                                  adminSurface.fieldPanel,
                                  "flex items-center justify-between",
                                )}
                              >
                                <Label
                                  htmlFor={`popular-${pkg.id}`}
                                  className="text-sm font-medium"
                                >
                                  추천 패키지
                                </Label>
                                <Switch
                                  id={`popular-${pkg.id}`}
                                  checked={pkg.isPopular}
                                  onCheckedChange={(checked) =>
                                    updatePackage(pkg.id, {
                                      isPopular: checked,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(() => {
                            const meta = getPackagePricingMeta(pkg);

                            return (
                              <>
                                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">
                                        판매 가격
                                      </p>
                                      <p className="mt-1 text-2xl font-bold text-foreground">
                                        {formatCurrency(pkg.price)}
                                      </p>
                                      {pkg.originalPrice ? (
                                        <p className="text-sm text-muted-foreground line-through">
                                          {formatCurrency(pkg.originalPrice)}
                                        </p>
                                      ) : null}
                                    </div>

                                    <div className="text-right">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        이용 구성
                                      </p>
                                      <p className="mt-1 text-xl font-semibold text-primary">
                                        {pkg.sessions}회
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {pkg.validityDays}일 유효
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                  <div className="rounded-lg border border-border/60 bg-card p-3 text-center">
                                    <p className="text-xs text-muted-foreground">회당 금액</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">
                                      {formatCurrency(meta.perSession)}
                                    </p>
                                  </div>

                                  <div className="rounded-lg border border-border/60 bg-card p-3 text-center">
                                    <p className="text-xs text-muted-foreground">할인율</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">
                                      {meta.discountRate > 0
                                        ? `${meta.discountRate.toFixed(1)}%`
                                        : "-"}
                                    </p>
                                  </div>

                                  <div className="rounded-lg border border-border/60 bg-card p-3 text-center">
                                    <p className="text-xs text-muted-foreground">절감액</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">
                                      {meta.savingAmount > 0
                                        ? formatCurrency(meta.savingAmount)
                                        : "-"}
                                    </p>
                                  </div>
                                </div>

                                <p className="text-xs leading-relaxed text-muted-foreground">
                                  회당 금액은 판매 가격 ÷ 이용 횟수, 할인율은 정가 대비 판매 가격
                                  기준으로 자동 계산됩니다.
                                </p>
                              </>
                            );
                          })()}

                          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                            <p className="text-sm font-semibold text-foreground">패키지 설명</p>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {pkg.description || "등록된 설명이 없습니다."}
                            </p>
                          </div>

                          <div className="rounded-xl border border-border/60 bg-card p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">포함 혜택</p>
                              <Badge variant="secondary" className="text-xs">
                                {pkg.features.length}개
                              </Badge>
                            </div>

                            {pkg.features.length > 0 ? (
                              <ul className="space-y-2 text-sm text-muted-foreground">
                                {pkg.features.map((feature, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                                    <span className="leading-relaxed">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                등록된 혜택이 없습니다.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  저장 후 패키지 판매 페이지와 신규 주문 금액 계산에 반영됩니다.
                </p>

                <Button
                  onClick={handleSavePackages}
                  disabled={isSaving || !canSaveSettings}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "저장 중..." : "패키지 설정 저장"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* 일반 설정 */}
          <TabsContent value="general">
            <Card className={adminSurface.card}>
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-success" />
                  <span>일반 설정</span>
                </CardTitle>
                <CardDescription>패키지 시스템의 전반적인 설정을 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    패키지 운영 정책 설정입니다
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    패키지 시스템 활성화, 연장 허용, 유효기간, 최소·최대 이용 횟수는 전체 패키지
                    운영 방식에 영향을 줍니다. 운영 중인 패키지가 있는 경우 변경 전 적용 범위를
                    확인하세요.
                  </p>
                </div>
                {validation.generalErrors.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-sm font-semibold text-destructive">
                      일반 설정에서 수정이 필요한 항목
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-destructive">
                      {validation.generalErrors.map((error) => (
                        <li key={error}>- {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-xl border border-border/60 bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">기간/알림</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      패키지 유효기간과 만료 알림 기준을 설정합니다.
                    </p>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxValidityDays">최대 유효기간 (일)</Label>
                        <Input
                          id="maxValidityDays"
                          type="number"
                          min={1}
                          step={1}
                          value={generalSettings.maxValidityDays}
                          onChange={(e) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              maxValidityDays: Number.parseInt(e.target.value, 10) || 0,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="autoExpireNotificationDays">만료 알림 일수</Label>
                        <Input
                          id="autoExpireNotificationDays"
                          type="number"
                          min={0}
                          step={1}
                          value={generalSettings.autoExpireNotificationDays}
                          onChange={(e) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              autoExpireNotificationDays: Number.parseInt(e.target.value, 10) || 0,
                            }))
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          만료 며칠 전에 고객에게 알림을 보낼지 설정
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">이용 횟수/연장</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      패키지 이용 횟수 범위와 연장 수수료를 설정합니다.
                    </p>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="minSessions">최소 이용 횟수</Label>
                        <Input
                          id="minSessions"
                          type="number"
                          min={1}
                          step={1}
                          value={generalSettings.minSessions}
                          onChange={(e) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              minSessions: Number.parseInt(e.target.value, 10) || 0,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxSessions">최대 이용 횟수</Label>
                        <Input
                          id="maxSessions"
                          type="number"
                          min={1}
                          step={1}
                          value={generalSettings.maxSessions}
                          onChange={(e) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              maxSessions: Number.parseInt(e.target.value, 10) || 0,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="extensionFeePercentage">연장 수수료 (%)</Label>
                        <Input
                          id="extensionFeePercentage"
                          type="number"
                          min={0}
                          step={1}
                          value={generalSettings.extensionFeePercentage}
                          onChange={(e) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              extensionFeePercentage: Number.parseInt(e.target.value, 10) || 0,
                            }))
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          패키지 연장 시 부과할 수수료 비율
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <p className="text-sm font-semibold text-foreground">시스템 상태</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      패키지 판매와 연장 요청 가능 여부를 제어합니다.
                    </p>

                    <div className="mt-4 space-y-3">
                      <div
                        className={cn(adminSurface.fieldPanel, "flex items-center justify-between")}
                      >
                        <div>
                          <Label htmlFor="enablePackages" className="font-medium text-foreground">
                            패키지 시스템 활성화
                          </Label>
                          <p className="mt-1 text-sm text-muted-foreground">
                            패키지 상품 판매를 활성화/비활성화합니다.
                          </p>
                        </div>

                        <Switch
                          id="enablePackages"
                          checked={generalSettings.enablePackages}
                          onCheckedChange={(checked) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              enablePackages: checked,
                            }))
                          }
                        />
                      </div>

                      <div
                        className={cn(adminSurface.fieldPanel, "flex items-center justify-between")}
                      >
                        <div>
                          <Label htmlFor="allowExtension" className="font-medium text-foreground">
                            패키지 연장 허용
                          </Label>
                          <p className="mt-1 text-sm text-muted-foreground">
                            고객이 패키지 연장을 요청할 수 있도록 허용합니다.
                          </p>
                        </div>

                        <Switch
                          id="allowExtension"
                          checked={generalSettings.allowExtension}
                          onCheckedChange={(checked) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              allowExtension: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    저장 후 패키지 시스템 정책과 연장 가능 여부에 반영됩니다.
                  </p>

                  <Button
                    onClick={handleSaveGeneralSettings}
                    disabled={isSaving || !canSaveSettings}
                    className="bg-success/10 hover:bg-success/10 dark:bg-success/15 dark:hover:bg-success/15"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "저장 중..." : "일반 설정 저장"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AdminPageShell>
      <AdminConfirmDialog
        open={pendingDeletePackageId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletePackageId(null);
        }}
        onCancel={() => setPendingDeletePackageId(null)}
        onConfirm={() => {
          const packageId = pendingDeletePackageId;
          if (!packageId) return;
          setPendingDeletePackageId(null);
          deletePackage(packageId);
        }}
        severity="danger"
        title="패키지를 삭제 예정으로 표시할까요?"
        description="이 작업은 아직 서버에 반영되지 않습니다. 저장 버튼을 눌러야 최종 반영됩니다. 활성 패키지는 먼저 비활성화해야 삭제할 수 있습니다."
        confirmText="삭제 예정"
        cancelText="취소"
        eventKey="admin-package-settings-delete-confirm"
        eventMeta={{ packageId: pendingDeletePackageId }}
      />
    </>
  );
}
