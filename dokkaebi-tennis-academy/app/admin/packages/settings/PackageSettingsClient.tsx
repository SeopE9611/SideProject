'use client';

import { useState } from 'react';
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
import { toast } from 'sonner';
import AuthGuard from '@/components/auth/AuthGuard';

// 패키지 설정 타입
interface PackageConfig {
  id: string;
  name: string;
  sessions: number;
  price: number;
  originalPrice?: number;
  description: string;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  validityDays: number;
  sortOrder: number;
}

// 더미 패키지 설정 데이터
const dummyPackageConfigs: PackageConfig[] = [
  {
    id: 'package-10',
    name: '10회권',
    sessions: 10,
    price: 100000,
    originalPrice: 120000,
    description: '스트링 교체 서비스 10회 이용권',
    features: ['10회 스트링 교체', '3개월 유효기간', '방문/출장 서비스'],
    isActive: true,
    isPopular: false,
    validityDays: 90,
    sortOrder: 1,
  },
  {
    id: 'package-30',
    name: '30회권',
    sessions: 30,
    price: 300000,
    originalPrice: 360000,
    description: '스트링 교체 서비스 30회 이용권',
    features: ['30회 스트링 교체', '6개월 유효기간', '방문/출장 서비스', '우선 예약'],
    isActive: true,
    isPopular: true,
    validityDays: 180,
    sortOrder: 2,
  },
  {
    id: 'package-50',
    name: '50회권',
    sessions: 50,
    price: 500000,
    originalPrice: 600000,
    description: '스트링 교체 서비스 50회 이용권',
    features: ['50회 스트링 교체', '9개월 유효기간', '방문/출장 서비스', '우선 예약', '전용 상담'],
    isActive: true,
    isPopular: false,
    validityDays: 270,
    sortOrder: 3,
  },
  {
    id: 'package-100',
    name: '100회권',
    sessions: 100,
    price: 1000000,
    originalPrice: 1200000,
    description: '스트링 교체 서비스 100회 이용권',
    features: ['100회 스트링 교체', '12개월 유효기간', '방문/출장 서비스', '우선 예약', '전용 상담', 'VIP 혜택'],
    isActive: true,
    isPopular: false,
    validityDays: 365,
    sortOrder: 4,
  },
];

// 일반 설정 타입
interface GeneralSettings {
  enablePackages: boolean;
  maxValidityDays: number;
  minSessions: number;
  maxSessions: number;
  defaultServiceType: '방문' | '출장';
  autoExpireNotificationDays: number;
  allowExtension: boolean;
  extensionFeePercentage: number;
}

// 더미 일반 설정 데이터
const dummyGeneralSettings: GeneralSettings = {
  enablePackages: true,
  maxValidityDays: 365,
  minSessions: 5,
  maxSessions: 200,
  defaultServiceType: '방문',
  autoExpireNotificationDays: 7,
  allowExtension: true,
  extensionFeePercentage: 10,
};

export default function PackageSettingsClient() {
  const [packageConfigs, setPackageConfigs] = useState<PackageConfig[]>(dummyPackageConfigs);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(dummyGeneralSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPackage, setEditingPackage] = useState<string | null>(null);

  // 금액 포맷터
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  // 패키지 설정 저장
  const handleSavePackages = async () => {
    setIsLoading(true);
    try {
      // 실제 구현에서는 API 호출
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('패키지 설정이 저장되었습니다.');
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 일반 설정 저장
  const handleSaveGeneralSettings = async () => {
    setIsLoading(true);
    try {
      // 실제 구현에서는 API 호출
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('일반 설정이 저장되었습니다.');
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
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
    if (confirm('정말로 이 패키지를 삭제하시겠습니까?')) {
      setPackageConfigs((prev) => prev.filter((pkg) => pkg.id !== id));
      toast.success('패키지가 삭제되었습니다.');
    }
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
        <div className="container py-6">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 rounded-2xl p-8 border border-purple-100 shadow-lg mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white rounded-full p-3 shadow-md">
                  <Settings className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">패키지 설정</h1>
                  <p className="mt-1 text-gray-600">스트링 패키지 상품의 가격과 설정을 관리합니다</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm border-purple-200 hover:bg-purple-50" asChild>
                <Link href="/admin/packages">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  패키지 관리로 돌아가기
                </Link>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="packages" className="space-y-8">
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
              <CardContent className="p-6">
                <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-slate-100">
                  <TabsTrigger value="packages" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-md">
                    <Package className="h-5 w-5" />
                    <span className="text-xs font-medium">패키지 상품</span>
                  </TabsTrigger>
                  <TabsTrigger value="general" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-md">
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
                    <h2 className="text-2xl font-bold text-gray-900">패키지 상품 관리</h2>
                    <p className="text-gray-600">패키지별 가격, 혜택, 유효기간을 설정할 수 있습니다.</p>
                  </div>
                  <Button onClick={addNewPackage} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />새 패키지 추가
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {packageConfigs
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((pkg) => (
                      <Card key={pkg.id} className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Package className="h-5 w-5 text-blue-600" />
                              <CardTitle className="text-lg">{pkg.name}</CardTitle>
                              {pkg.isPopular && <Badge className="bg-orange-100 text-orange-800">인기</Badge>}
                              {!pkg.isActive && <Badge variant="secondary">비활성</Badge>}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingPackage(editingPackage === pkg.id ? null : pkg.id)}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deletePackage(pkg.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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
                                      <Button variant="ghost" size="sm" onClick={() => removeFeature(pkg.id, index)} className="text-red-600 hover:text-red-700">
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
                                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(pkg.price)}</p>
                                  {pkg.originalPrice && <p className="text-sm text-gray-500 line-through">{formatCurrency(pkg.originalPrice)}</p>}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-semibold text-blue-600">{pkg.sessions}회</p>
                                  <p className="text-sm text-gray-500">{pkg.validityDays}일 유효</p>
                                </div>
                              </div>

                              <p className="text-gray-600">{pkg.description}</p>

                              <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">포함 혜택:</p>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {pkg.features.map((feature, index) => (
                                    <li key={index} className="flex items-center">
                                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
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
                  <Button onClick={handleSavePackages} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? '저장 중...' : '패키지 설정 저장'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* 일반 설정 */}
            <TabsContent value="general">
              <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-green-600" />
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
                      <p className="text-sm text-gray-500">만료 며칠 전에 고객에게 알림을 보낼지 설정</p>
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
                      <p className="text-sm text-gray-500">패키지 연장 시 부과할 수수료 비율</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <Label htmlFor="enablePackages" className="font-medium text-gray-700">
                          패키지 시스템 활성화
                        </Label>
                        <p className="text-sm text-gray-500">패키지 상품 판매를 활성화/비활성화합니다.</p>
                      </div>
                      <Switch id="enablePackages" checked={generalSettings.enablePackages} onCheckedChange={(checked) => setGeneralSettings((prev) => ({ ...prev, enablePackages: checked }))} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <Label htmlFor="allowExtension" className="font-medium text-gray-700">
                          패키지 연장 허용
                        </Label>
                        <p className="text-sm text-gray-500">고객이 패키지 연장을 요청할 수 있도록 허용합니다.</p>
                      </div>
                      <Switch id="allowExtension" checked={generalSettings.allowExtension} onCheckedChange={(checked) => setGeneralSettings((prev) => ({ ...prev, allowExtension: checked }))} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveGeneralSettings} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? '저장 중...' : '일반 설정 저장'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
}
