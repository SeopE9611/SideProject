'use client';
import PhotosUploader from '@/components/reviews/PhotosUploader';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, DollarSign, Settings, ImageIcon, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ImageUploader from '@/components/admin/ImageUploader';
import { RACKET_BRANDS, racketBrandLabel, type RacketBrand } from '@/lib/constants';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { asRecord, safeNumber } from '@/lib/admin/parsers';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
type BrandState = RacketBrand | ''; // 폼 상태에서만 '' 허용

// 관리자 폼 유효성(클라이언트) 보강
const MODEL_MIN = 2;
const MODEL_MAX = 80;
const PRICE_MIN = 1; // "가격 필수" 라벨이므로 0원 저장은 기본적으로 막는 편이 안전
const PATTERN_RE = /^\s*\d{1,2}\s*[xX×]\s*\d{1,2}\s*$/; // 예: 16x19, 18×20

const isFiniteNumber = (v: unknown) => Number.isFinite(safeNumber(v, Number.NaN));
const nonNegative = (v: unknown) => isFiniteNumber(v) && safeNumber(v) >= 0;
const positiveOrNull = (v: unknown) => (v == null || v === '' ? true : isFiniteNumber(v) && safeNumber(v) >= 1);

export type RacketForm = {
  brand: BrandState;
  model: string;
  year: number | null;
  price: number;
  condition: 'A' | 'B' | 'C';
  status: 'available' | 'rented' | 'sold' | 'inactive';
  spec: { weight: number | null; balance: number | null; headSize: number | null; lengthIn: number | null; swingWeight: number | null; stiffnessRa: number | null; pattern: string; gripSize: string };
  rental: {
    enabled: boolean;
    deposit: number;
    fee: { d7: number; d15: number; d30: number };
    disabledReason?: string;
  };
  images: string[];
  quantity: number;

  searchKeywords?: string[];
};


type RacketCondition = RacketForm['condition'];
type RacketStatus = RacketForm['status'];
const RACKET_CONDITIONS: readonly RacketCondition[] = ['A', 'B', 'C'];
const RACKET_STATUSES: readonly RacketStatus[] = ['available', 'rented', 'sold', 'inactive'];

function toCondition(value: unknown): RacketCondition {
  return RACKET_CONDITIONS.includes(value as RacketCondition) ? (value as RacketCondition) : 'B';
}

function toStatus(value: unknown): RacketStatus {
  return RACKET_STATUSES.includes(value as RacketStatus) ? (value as RacketStatus) : 'available';
}

function toNullableNumber(value: unknown): number | null {
  const n = safeNumber(value, Number.NaN);
  return Number.isFinite(n) ? n : null;
}

type Props = {
  initial?: Partial<RacketForm>;
  submitLabel: string;
  onSubmit: (data: RacketForm) => Promise<void>;
};

export default function AdminRacketForm({ initial, submitLabel, onSubmit }: Props) {
  const [form, setForm] = useState<RacketForm>({
    brand: (initial?.brand as BrandState) ?? '',
    model: initial?.model ?? '',
    year: initial?.year ?? null,
    price: initial?.price ?? 0,
    quantity: initial?.quantity ?? 1,
    condition: toCondition(initial?.condition),
    status: toStatus(initial?.status),
    spec: {
      weight: initial?.spec?.weight ?? null,
      balance: initial?.spec?.balance ?? null,
      headSize: initial?.spec?.headSize ?? null,
      lengthIn: toNullableNumber(asRecord(initial?.spec).lengthIn),
      swingWeight: toNullableNumber(asRecord(initial?.spec).swingWeight),
      stiffnessRa: toNullableNumber(asRecord(initial?.spec).stiffnessRa),
      pattern: initial?.spec?.pattern ?? '',
      gripSize: initial?.spec?.gripSize ?? '',
    },
    rental: {
      enabled: initial?.rental?.enabled ?? false,
      deposit: initial?.rental?.deposit ?? 0,
      fee: {
        d7: initial?.rental?.fee?.d7 ?? 0,
        d15: initial?.rental?.fee?.d15 ?? 0,
        d30: initial?.rental?.fee?.d30 ?? 0,
      },
      disabledReason: initial?.rental?.disabledReason ?? '',
    },
    images: Array.isArray(initial?.images) ? initial!.images! : [],
  });

  // 검색 키워드 입력 상태
  const [searchKeywordsText, setSearchKeywordsText] = useState(Array.isArray(initial?.searchKeywords) ? initial!.searchKeywords!.join(', ') : '');

  // 더블클릭/연타 레이스 방지(제출 시작~끝까지 1회만 허용)
  const submitRef = useRef(false);

  const handleGenerateKeywords = () => {
    const base = `${form.brand ?? ''} ${form.model ?? ''}`.trim();
    if (!base) {
      showErrorToast('브랜드와 모델명을 먼저 입력해 주세요.');
      return;
    }

    const tokens = base
      .split(/[\s,()/+]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

    const unique = Array.from(new Set(tokens.map((t) => t.toLowerCase())));
    setSearchKeywordsText(unique.join(', '));
  };

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // ---------------------------
  // Unsaved changes guard
  // ---------------------------
  const baselineRef = useRef<string | null>(null);
  const snapshot = useMemo(() => JSON.stringify({ form, searchKeywordsText }), [form, searchKeywordsText]);

  useEffect(() => {
    // 최초 1회 baseline 설정
    if (baselineRef.current === null) baselineRef.current = snapshot;
  }, [snapshot]);

  const isDirty = baselineRef.current !== null && baselineRef.current !== snapshot;
  useUnsavedChangesGuard(isDirty && !loading);

  const confirmLeave = (e: React.MouseEvent) => {
    if (!isDirty) return;
    if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleSubmit = async () => {
    // 중복 제출 방지
    if (loading || submitRef.current) return;

    // 1) 제출 직전 최종 유효성 검사(관리자 입력 실수 방지)
    const modelTrim = (form.model ?? '').trim();
    const patternTrim = (form.spec?.pattern ?? '').trim();

    if (!form.brand) {
      showErrorToast('브랜드를 선택하세요.');
      return;
    }

    if (!modelTrim) {
      showErrorToast('모델명을 입력하세요.');
      return;
    }
    if (modelTrim.length < MODEL_MIN) {
      showErrorToast(`모델명은 ${MODEL_MIN}자 이상 입력하세요.`);
      return;
    }
    if (modelTrim.length > MODEL_MAX) {
      showErrorToast(`모델명은 ${MODEL_MAX}자 이내로 입력하세요.`);
      return;
    }

    // 가격/수량: 음수 방지 + 가격은 최소 1원
    if (!isFiniteNumber(form.price) || Number(form.price) < PRICE_MIN) {
      showErrorToast(`가격은 ${PRICE_MIN}원 이상 입력하세요.`);
      return;
    }
    if (!isFiniteNumber(form.quantity) || Number(form.quantity) < 1) {
      showErrorToast('보유 수량은 1 이상이어야 합니다.');
      return;
    }

    // 연식: 입력했으면 유효한 범위만 허용(너무 빡빡하게 잡지 않음)
    if (form.year != null) {
      const y = Number(form.year);
      const now = new Date().getFullYear();
      if (!Number.isFinite(y) || y < 1900 || y > now + 1) {
        showErrorToast('연식(year)이 유효하지 않습니다.');
        return;
      }
    }

    // 스펙 숫자 필드: 입력했으면 최소 1 이상(빈값은 null로 허용)
    if (!positiveOrNull(form.spec.weight)) return showErrorToast('무게(weight)는 1 이상 숫자만 입력하세요.');
    if (!positiveOrNull(form.spec.balance)) return showErrorToast('밸런스(balance)는 1 이상 숫자만 입력하세요.');
    if (!positiveOrNull(form.spec.headSize)) return showErrorToast('헤드사이즈(headSize)는 1 이상 숫자만 입력하세요.');
    if (!positiveOrNull(form.spec.lengthIn)) return showErrorToast('길이(lengthIn)는 1 이상 숫자만 입력하세요.');
    if (!positiveOrNull(form.spec.swingWeight)) return showErrorToast('스윙웨이트(swingWeight)는 1 이상 숫자만 입력하세요.');
    if (!positiveOrNull(form.spec.stiffnessRa)) return showErrorToast('강성(stiffnessRa)은 1 이상 숫자만 입력하세요.');

    // 패턴: 빈값은 허용, 입력했으면 16x19 형식만 허용
    if (patternTrim && !PATTERN_RE.test(patternTrim)) {
      showErrorToast('스트링 패턴은 16x19 형식으로 입력하세요.');
      return;
    }

    if (form.rental.enabled === false && !form.rental.disabledReason?.trim()) {
      showErrorToast('대여 불가 사유를 입력하세요.');
      return;
    }

    // 대여 ON일 때 요금 음수 방지
    if (form.rental.enabled) {
      if (!nonNegative(form.rental.deposit)) return showErrorToast('보증금은 0 이상 숫자만 입력하세요.');
      if (!nonNegative(form.rental.fee?.d7)) return showErrorToast('7일 대여료는 0 이상 숫자만 입력하세요.');
      if (!nonNegative(form.rental.fee?.d15)) return showErrorToast('15일 대여료는 0 이상 숫자만 입력하세요.');
      if (!nonNegative(form.rental.fee?.d30)) return showErrorToast('30일 대여료는 0 이상 숫자만 입력하세요.');
    }

    setLoading(true);
    submitRef.current = true;
    try {
      const normalized: RacketForm = {
        ...form,
        model: modelTrim,
        year: form.year != null ? Number(form.year) : null,
        price: Number(form.price || 0),
        quantity: Math.max(1, Number(form.quantity || 1)),
        spec: {
          weight: form.spec.weight != null ? Number(form.spec.weight) : null,
          balance: form.spec.balance != null ? Number(form.spec.balance) : null,
          headSize: form.spec.headSize != null ? Number(form.spec.headSize) : null,
          lengthIn: form.spec.lengthIn != null ? Number(form.spec.lengthIn) : null,
          swingWeight: form.spec.swingWeight != null ? Number(form.spec.swingWeight) : null,
          stiffnessRa: form.spec.stiffnessRa != null ? Number(form.spec.stiffnessRa) : null,
          // 표준화: 공백 제거 + 소문자 + × -> x
          pattern: (patternTrim || '').toLowerCase().replace(/\s+/g, '').replace(/[×]/g, 'x'),
          gripSize: form.spec.gripSize,
        },
        rental: {
          enabled: !!form.rental.enabled,
          deposit: Number(form.rental.deposit || 0),
          fee: {
            d7: Number(form.rental.fee.d7 || 0),
            d15: Number(form.rental.fee.d15 || 0),
            d30: Number(form.rental.fee.d30 || 0),
          },
          // ON이면 공백으로, OFF면 사용자가 입력한 사유 보냄
          disabledReason: form.rental.enabled ? '' : form.rental.disabledReason?.trim() || '',
        },
        images: form.images || [],
        searchKeywords: searchKeywordsText
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 0),
      };

      await onSubmit(normalized);
      // 저장 성공 → 현재 상태를 baseline으로 갱신(다음 이탈 시 경고 안 뜨게)
      baselineRef.current = snapshot;
      showSuccessToast('저장되었습니다.');
    } catch (e) {
      console.error(e);
      showErrorToast('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      submitRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-primary border border-border">
          <TabsTrigger value="basic" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            기본 정보
          </TabsTrigger>
          <TabsTrigger value="specs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            상세 스펙
          </TabsTrigger>
          <TabsTrigger value="rental" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            대여 설정
          </TabsTrigger>
          <TabsTrigger value="images" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            이미지
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card variant="ghost" className="shadow-xl bg-gradient-to-br from-white to-card dark:from-background dark:to-card border border-border">
            <CardHeader className="bg-gradient-to-r from-background to-card dark:from-background dark:to-card border-b border-border">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle className="text-primary">기본 정보</CardTitle>
              </div>
              <CardDescription className="text-primary">라켓의 기본 정보를 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">
                    브랜드 <span className="text-destructive">*</span>
                  </Label>
                  <Select value={form.brand} onValueChange={(v: RacketBrand) => setForm({ ...form, brand: v })}>
                    <SelectTrigger id="brand" className="w-56">
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">
                    모델 <span className="text-destructive">*</span>
                  </Label>
                  <Input id="model" placeholder="예: Pro Staff 97" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">연식</Label>
                  <Input id="year" type="number" placeholder="예: 2023" value={form.year ?? ''} onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">
                    가격 (원) <span className="text-destructive">*</span>
                  </Label>
                  <Input id="price" type="number" placeholder="예: 150000" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value || 0) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">보유 수량</Label>
                  <p className="text-xs text-muted-foreground">보유 수량은 판매로만 감소합니다. 대여 중 점유는 ‘판매가능(available)’로 계산되어 표시됩니다.</p>
                  <Input id="quantity" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value || 1)) })} />
                  <p className="text-xs text-muted-foreground">최소 1개. 다수 보유 시 사용자에게 '잔여 n/총 m'로 표시됩니다.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition">상태 등급</Label>
                  <Select value={form.condition} onValueChange={(value: RacketCondition) => setForm({ ...form, condition: value })}>
                    <SelectTrigger id="condition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A급 (최상)</SelectItem>
                      <SelectItem value="B">B급 (양호)</SelectItem>
                      <SelectItem value="C">C급 (보통)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">판매 상태</Label>
                  <Select value={form.status} onValueChange={(value: RacketStatus) => setForm({ ...form, status: value })}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">판매가능</SelectItem>
                      <SelectItem value="rented">대여중</SelectItem>
                      <SelectItem value="sold">판매완료</SelectItem>
                      <SelectItem value="inactive">비노출</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* 검색 키워드 입력 */}
                <div className="space-y-2">
                  <Label htmlFor="racket-search-keywords">검색 키워드 (쉼표로 구분)</Label>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Input id="racket-search-keywords" placeholder="예: 윌슨 프로스태프, 블레이드, RF97" value={searchKeywordsText} onChange={(e) => setSearchKeywordsText(e.target.value)} />
                    <Button type="button" variant="outline" className="md:ml-2 shrink-0" onClick={handleGenerateKeywords}>
                      브랜드/모델 기준 자동 생성
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">검색창에서 이 키워드들로도 라켓을 찾을 수 있습니다.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specs" className="space-y-4">
          <Card variant="ghost" className="shadow-xl bg-gradient-to-br from-white to-card dark:from-background dark:to-card border border-border">
            <CardHeader className="bg-gradient-to-r from-background to-card dark:from-background dark:to-card border-b border-border">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle className="text-primary">상세 스펙</CardTitle>
              </div>
              <CardDescription className="text-primary">라켓의 상세 스펙을 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">무게 (g)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="예: 305"
                    value={form.spec.weight ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: { ...form.spec, weight: e.target.value ? Number(e.target.value) : null },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balance">밸런스 (mm)</Label>
                  <Input
                    id="balance"
                    type="number"
                    placeholder="예: 315"
                    value={form.spec.balance ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: { ...form.spec, balance: e.target.value ? Number(e.target.value) : null },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headSize">헤드 사이즈 (in²)</Label>
                  <Input
                    id="headSize"
                    type="number"
                    placeholder="예: 97"
                    value={form.spec.headSize ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: { ...form.spec, headSize: e.target.value ? Number(e.target.value) : null },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lengthIn">길이 (in)</Label>
                  <Input
                    id="lengthIn"
                    type="number"
                    placeholder="예: 27"
                    value={form.spec.lengthIn ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: { ...form.spec, lengthIn: e.target.value ? Number(e.target.value) : null },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swingWeight">스윙웨이트 (g)</Label>
                  <Input
                    id="swingWeight"
                    type="number"
                    placeholder="예: 320"
                    value={form.spec.swingWeight ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: { ...form.spec, swingWeight: e.target.value ? Number(e.target.value) : null },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stiffnessRa">강성 (RA)</Label>
                  <Input
                    id="stiffnessRa"
                    type="number"
                    placeholder="예: 65"
                    value={form.spec.stiffnessRa ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spec: { ...form.spec, stiffnessRa: e.target.value ? Number(e.target.value) : null },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pattern">스트링 패턴</Label>
                  <Input id="pattern" placeholder="예: 16x19" value={form.spec.pattern} onChange={(e) => setForm({ ...form, spec: { ...form.spec, pattern: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gripSize">그립 사이즈</Label>
                  <Input id="gripSize" placeholder="예: G2, 4 3/8" value={form.spec.gripSize} onChange={(e) => setForm({ ...form, spec: { ...form.spec, gripSize: e.target.value } })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rental" className="space-y-4">
          <Card variant="ghost" className="shadow-xl bg-gradient-to-br from-white to-card dark:from-background dark:to-card border border-border">
            <CardHeader className="bg-gradient-to-r from-background to-card dark:from-background dark:to-card border-b border-border">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle className="text-primary">대여 설정</CardTitle>
              </div>
              <CardDescription className="text-primary">대여 가능 여부 및 요금을 설정하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="rental-enabled">대여 가능</Label>
                  <p className="text-sm text-muted-foreground">이 라켓을 대여할 수 있도록 설정합니다</p>
                </div>
                <Switch id="rental-enabled" checked={form.rental.enabled} onCheckedChange={(checked) => setForm({ ...form, rental: { ...form.rental, enabled: checked } })} />
              </div>

              {!form.rental.enabled && (
                <div className="gap-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label htmlFor="disabledReason">대여 불가 사유</Label>
                    <Textarea
                      id="disabledReason"
                      placeholder="예: 그립 파손 / 프레임 크랙 등"
                      value={form.rental.disabledReason}
                      onChange={(e) => setForm({ ...form, rental: { ...form.rental, disabledReason: e.target.value } })}
                      className="min-h-[84px]"
                    />
                  </div>
                </div>
              )}

              {form.rental.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label htmlFor="deposit">보증금 (원)</Label>
                    <Input id="deposit" type="number" placeholder="예: 100000" value={form.rental.deposit} onChange={(e) => setForm({ ...form, rental: { ...form.rental, deposit: Number(e.target.value || 0) } })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fee7">7일 대여료 (원)</Label>
                    <Input
                      id="fee7"
                      type="number"
                      placeholder="예: 30000"
                      value={form.rental.fee.d7}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          rental: { ...form.rental, fee: { ...form.rental.fee, d7: Number(e.target.value || 0) } },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fee15">15일 대여료 (원)</Label>
                    <Input
                      id="fee15"
                      type="number"
                      placeholder="예: 50000"
                      value={form.rental.fee.d15}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          rental: { ...form.rental, fee: { ...form.rental.fee, d15: Number(e.target.value || 0) } },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fee30">30일 대여료 (원)</Label>
                    <Input
                      id="fee30"
                      type="number"
                      placeholder="예: 80000"
                      value={form.rental.fee.d30}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          rental: { ...form.rental, fee: { ...form.rental.fee, d30: Number(e.target.value || 0) } },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <Card variant="ghost" className="shadow-xl bg-gradient-to-br from-white to-card dark:from-background dark:to-card border border-border">
            <CardHeader className="bg-gradient-to-r from-background to-card dark:from-background dark:to-card border-b border-border">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-primary">이미지</CardTitle>
              </div>
              <CardDescription className="text-primary">라켓 이미지를 업로드하세요 (최대 10장)</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ImageUploader value={form.images} onChange={(next) => setForm({ ...form, images: next })} max={10} variant="racket" enablePrimary />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end space-x-2">
        <Button variant="outline" type="button" asChild className="bg-muted/40 hover:bg-muted border-border">
          <Link href="/admin/rackets" data-no-unsaved-guard onClick={confirmLeave}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            취소
          </Link>
        </Button>
        <Button onClick={handleSubmit} disabled={loading} variant="default">
          <Save className="mr-2 h-4 w-4" />
          {loading ? '저장 중...' : submitLabel}
        </Button>
      </div>
    </div>
  );
}
