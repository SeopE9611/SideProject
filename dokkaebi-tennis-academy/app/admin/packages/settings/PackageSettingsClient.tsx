'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Save, Package, Settings, Plus, Trash2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { type PackageConfig, type GeneralSettings, DEFAULT_PACKAGE_CONFIGS, DEFAULT_GENERAL_SETTINGS } from '@/lib/package-settings';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import { adminFetcher, adminMutator } from '@/lib/admin/adminFetcher';
import { runAdminActionWithToast } from '@/lib/admin/adminActionHelpers';

type PackageSettingsResponse = {
  packageConfigs?: PackageConfig[];
  generalSettings?: Partial<GeneralSettings>;
};

export default function PackageSettingsClient() {
  // 서버에서 가져온 패키지 설정
  const [packageConfigs, setPackageConfigs] = useState<PackageConfig[]>(DEFAULT_PACKAGE_CONFIGS);

  // 서버에서 가져온 일반 설정
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);

  const [isHydratedFromServer, setIsHydratedFromServer] = useState<boolean>(false);

  // 저장 중 여부 (PUT /api/admin/packages/settings)
  const [isSaving, setIsSaving] = useState<boolean>(false);

   const baselineRef = useRef<string | null>(null);
  const snapshot = useMemo(() => JSON.stringify({ packageConfigs, generalSettings }), [packageConfigs, generalSettings]);

  useEffect(() => {
    // 최초 로드 완료 시 baseline 확정
    if (isHydratedFromServer && baselineRef.current === null) baselineRef.current = snapshot;
  }, [isHydratedFromServer, snapshot]);

  const isDirty = isHydratedFromServer && baselineRef.current !== null && baselineRef.current !== snapshot;
  useUnsavedChangesGuard(isDirty && !isSaving);

  const confirmLeave = (e: React.MouseEvent) => {
    if (!isDirty) return;
    if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const { data, isLoading, error } = useSWR<PackageSettingsResponse>('/api/admin/packages/settings', adminFetcher, {
    revalidateOnFocus: false,
  });

  const [editingPackage, setEditingPackage] = useState<string | null>(null);
  const [pendingDeletePackageId, setPendingDeletePackageId] = useState<string | null>(null);

  useEffect(() => {
    if (!data || isHydratedFromServer) return;

    const serverPackages: PackageConfig[] = Array.isArray(data.packageConfigs) ? data.packageConfigs : DEFAULT_PACKAGE_CONFIGS;
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
    showErrorToast('패키지 설정 조회 중 오류가 발생했습니다.');
  }, [error]);

  // 금액 포맷터
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  // 패키지 설정 저장 (패키지 탭에서 호출)
  const handleSavePackages = async () => {
    setIsSaving(true);

    const body = {
      packageConfigs,
      generalSettings,
    };

    const result = await runAdminActionWithToast({
      action: () =>
        adminMutator('/api/admin/packages/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      successMessage: '패키지 설정이 저장되었습니다.',
      fallbackErrorMessage: '패키지 설정 저장에 실패했습니다.',
    });

    if (result) baselineRef.current = snapshot;
    setIsSaving(false);
  };

  // 일반 설정 저장 (일반 설정 탭에서 호출)
  const handleSaveGeneralSettings = async () => {
    setIsSaving(true);

    const body = {
      packageConfigs,
      generalSettings,
    };

    const result = await runAdminActionWithToast({
      action: () =>
        adminMutator('/api/admin/packages/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      successMessage: '일반 설정이 저장되었습니다.',
      fallbackErrorMessage: '일반 설정 저장에 실패했습니다.',
    });

    if (result) baselineRef.current = snapshot;
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
      name: '새 패키지',
      sessions: 20,
      price: 200000,
      description: '새로운 패키지 설명',
      features: ['기본 혜택'],
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
    setPackageConfigs((prev) => prev.filter((pkg) => pkg.id !== id));
    showSuccessToast('패키지가 삭제되었습니다.');
  };

  // 특징 추가
  const addFeature = (packageId: string) => {
    const newFeature = prompt('새로운 특징을 입력하세요:');
    if (newFeature?.trim()) {
      updatePackage(packageId, {
        features: [...(packageConfigs.find((p) => p.id === packageId)?.features || []), newFeature.trim()],
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

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">패키지 설정을 불러오는 중입니다...</div>;
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card">
        <div className="container py-6">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-background via-muted to-card rounded-2xl p-8 border border-border shadow-lg mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-card rounded-full p-3 shadow-md">
                  <Settings className="h-8 w-8 text-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">패키지 설정</h1>
                  <p className="mt-1 text-muted-foreground">스트링 패키지 상품의 가격과 설정을 관리합니다</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="bg-card backdrop-blur-sm border-border hover:bg-muted" asChild>
                <Link href="/admin/packages">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  패키지 관리로 돌아가기
                </Link>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="packages" className="space-y-8">
            <Card className="border-0 shadow-2xl bg-card backdrop-blur-sm">
              <CardContent className="p-6">
                <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-background">
                  <TabsTrigger value="packages" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-card data-[state=active]:shadow-md">
                    <Package className="h-5 w-5" />
                    <span className="text-xs font-medium">패키지 상품</span>
                  </TabsTrigger>
                  <TabsTrigger value="general" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-card data-[state=active]:shadow-md">
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
                    <h2 className="text-2xl font-bold text-foreground">패키지 상품 관리</h2>
                    <p className="text-muted-foreground">패키지별 가격, 혜택, 유효기간을 설정할 수 있습니다.</p>
                  </div>
                  <Button onClick={addNewPackage} className="bg-primary hover:bg-primary">
                    <Plus className="mr-2 h-4 w-4" />새 패키지 추가
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {packageConfigs
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((pkg) => (
                      <Card key={pkg.id} className="border-0 bg-card shadow-lg backdrop-blur-sm">
                        <CardHeader className="bg-gradient-to-r from-background to-card border-b">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Package className="h-5 w-5 text-primary" />
                              <CardTitle className="text-lg">{pkg.name}</CardTitle>
                              {pkg.isPopular && <Badge className="bg-warning/10 text-warning">인기</Badge>}
                              {!pkg.isActive && <Badge variant="secondary">비활성</Badge>}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingPackage(editingPackage === pkg.id ? null : pkg.id)}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setPendingDeletePackageId(pkg.id)} className="text-destructive hover:text-destructive hover:bg-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          {editingPackage === pkg.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`name-${pkg.id}`}>패키지명</Label>
                                  <Input id={`name-${pkg.id}`} value={pkg.name} onChange={(e) => updatePackage(pkg.id, { name: e.target.value })} />
                                </div>
                                <div>
                                  <Label htmlFor={`sessions-${pkg.id}`}>이용 횟수</Label>
                                  <Input id={`sessions-${pkg.id}`} type="number" value={pkg.sessions} onChange={(e) => updatePackage(pkg.id, { sessions: Number.parseInt(e.target.value) || 0 })} />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`price-${pkg.id}`}>판매 가격 (원)</Label>
                                  <Input id={`price-${pkg.id}`} type="number" value={pkg.price} onChange={(e) => updatePackage(pkg.id, { price: Number.parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                  <Label htmlFor={`originalPrice-${pkg.id}`}>정가 (원)</Label>
                                  <Input
                                    id={`originalPrice-${pkg.id}`}
                                    type="number"
                                    value={pkg.originalPrice || ''}
                                    onChange={(e) =>
                                      updatePackage(pkg.id, {
                                        originalPrice: Number.parseInt(e.target.value) || undefined,
                                      })
                                    }
                                    placeholder="할인 표시용 (선택사항)"
                                  />
                                </div>
                              </div>

                              <div>
                                <Label htmlFor={`validityDays-${pkg.id}`}>유효기간 (일)</Label>
                                <Input id={`validityDays-${pkg.id}`} type="number" value={pkg.validityDays} onChange={(e) => updatePackage(pkg.id, { validityDays: Number.parseInt(e.target.value) || 0 })} />
                              </div>

                              <div>
                                <Label htmlFor={`description-${pkg.id}`}>설명</Label>
                                <Textarea id={`description-${pkg.id}`} value={pkg.description} onChange={(e) => updatePackage(pkg.id, { description: e.target.value })} rows={2} />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <Label>패키지 특징</Label>
                                  <Button variant="outline" size="sm" onClick={() => addFeature(pkg.id)}>
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
                                          updatePackage(pkg.id, { features: newFeatures });
                                        }}
                                        className="flex-1"
                                      />
                                      <Button variant="ghost" size="sm" onClick={() => removeFeature(pkg.id, index)} className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Switch id={`active-${pkg.id}`} checked={pkg.isActive} onCheckedChange={(checked) => updatePackage(pkg.id, { isActive: checked })} />
                                  <Label htmlFor={`active-${pkg.id}`}>활성화</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch id={`popular-${pkg.id}`} checked={pkg.isPopular} onCheckedChange={(checked) => updatePackage(pkg.id, { isPopular: checked })} />
                                  <Label htmlFor={`popular-${pkg.id}`}>인기 패키지</Label>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-2xl font-bold text-foreground">{formatCurrency(pkg.price)}</p>
                                  {pkg.originalPrice && <p className="text-sm text-muted-foreground line-through">{formatCurrency(pkg.originalPrice)}</p>}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-semibold text-primary">{pkg.sessions}회</p>
                                  <p className="text-sm text-muted-foreground">{pkg.validityDays}일 유효</p>
                                </div>
                              </div>

                              <p className="text-muted-foreground">{pkg.description}</p>

                              <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">포함 혜택:</p>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {pkg.features.map((feature, index) => (
                                    <li key={index} className="flex items-center">
                                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSavePackages} disabled={isSaving} className="bg-primary hover:bg-primary">
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? '저장 중...' : '패키지 설정 저장'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* 일반 설정 */}
            <TabsContent value="general">
              <Card className="border-0 bg-card shadow-lg backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-background to-card border-b">
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-success" />
                    <span>일반 설정</span>
                  </CardTitle>
                  <CardDescription>패키지 시스템의 전반적인 설정을 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="maxValidityDays">최대 유효기간 (일)</Label>
                      <Input
                        id="maxValidityDays"
                        type="number"
                        value={generalSettings.maxValidityDays}
                        onChange={(e) =>
                          setGeneralSettings((prev) => ({
                            ...prev,
                            maxValidityDays: Number.parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="autoExpireNotificationDays">만료 알림 일수</Label>
                      <Input
                        id="autoExpireNotificationDays"
                        type="number"
                        value={generalSettings.autoExpireNotificationDays}
                        onChange={(e) =>
                          setGeneralSettings((prev) => ({
                            ...prev,
                            autoExpireNotificationDays: Number.parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                      <p className="text-sm text-muted-foreground">만료 며칠 전에 고객에게 알림을 보낼지 설정</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minSessions">최소 이용 횟수</Label>
                      <Input
                        id="minSessions"
                        type="number"
                        value={generalSettings.minSessions}
                        onChange={(e) =>
                          setGeneralSettings((prev) => ({
                            ...prev,
                            minSessions: Number.parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxSessions">최대 이용 횟수</Label>
                      <Input
                        id="maxSessions"
                        type="number"
                        value={generalSettings.maxSessions}
                        onChange={(e) =>
                          setGeneralSettings((prev) => ({
                            ...prev,
                            maxSessions: Number.parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="extensionFeePercentage">연장 수수료 (%)</Label>
                      <Input
                        id="extensionFeePercentage"
                        type="number"
                        value={generalSettings.extensionFeePercentage}
                        onChange={(e) =>
                          setGeneralSettings((prev) => ({
                            ...prev,
                            extensionFeePercentage: Number.parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                      <p className="text-sm text-muted-foreground">패키지 연장 시 부과할 수수료 비율</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between p-4 bg-background rounded-xl">
                      <div>
                        <Label htmlFor="enablePackages" className="font-medium text-foreground">
                          패키지 시스템 활성화
                        </Label>
                        <p className="text-sm text-muted-foreground">패키지 상품 판매를 활성화/비활성화합니다.</p>
                      </div>
                      <Switch id="enablePackages" checked={generalSettings.enablePackages} onCheckedChange={(checked) => setGeneralSettings((prev) => ({ ...prev, enablePackages: checked }))} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-background rounded-xl">
                      <div>
                        <Label htmlFor="allowExtension" className="font-medium text-foreground">
                          패키지 연장 허용
                        </Label>
                        <p className="text-sm text-muted-foreground">고객이 패키지 연장을 요청할 수 있도록 허용합니다.</p>
                      </div>
                      <Switch id="allowExtension" checked={generalSettings.allowExtension} onCheckedChange={(checked) => setGeneralSettings((prev) => ({ ...prev, allowExtension: checked }))} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveGeneralSettings} disabled={isSaving} className="bg-success/10 hover:bg-success/10">
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? '저장 중...' : '일반 설정 저장'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
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
        title="패키지를 삭제할까요?"
        description="삭제 후에는 되돌릴 수 없습니다. 운영 중인 패키지인지 확인한 뒤 진행해 주세요."
        confirmText="삭제"
        cancelText="취소"
        eventKey="admin-package-settings-delete-confirm"
        eventMeta={{ packageId: pendingDeletePackageId }}
      />
    </>
  );
}
