'use client';

import PhotosUploader from '@/components/reviews/PhotosUploader';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, DollarSign, Settings, ImageIcon } from 'lucide-react';
import Link from 'next/link';

export type RacketForm = {
  brand: string;
  model: string;
  year: number | null;
  price: number;
  condition: 'A' | 'B' | 'C';
  status: 'available' | 'rented' | 'sold' | 'inactive';
  spec: { weight: number | null; balance: number | null; headSize: number | null; pattern: string; gripSize: string };
  rental: { enabled: boolean; deposit: number; fee: { d7: number; d15: number; d30: number } };
  images: string[]; // Supabase 업로드로 교체 예정
  quantity: number;
};

type Props = {
  initial?: Partial<RacketForm>;
  submitLabel: string;
  onSubmit: (data: RacketForm) => Promise<void>;
};

export default function AdminRacketForm({ initial, submitLabel, onSubmit }: Props) {
  const [form, setForm] = useState<RacketForm>({
    brand: initial?.brand ?? '',
    model: initial?.model ?? '',
    year: initial?.year ?? null,
    price: initial?.price ?? 0,
    quantity: 1,
    condition: (initial?.condition as any) ?? 'B',
    status: (initial?.status as any) ?? 'available',
    spec: {
      weight: initial?.spec?.weight ?? null,
      balance: initial?.spec?.balance ?? null,
      headSize: initial?.spec?.headSize ?? null,
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
    },
    images: Array.isArray(initial?.images) ? initial!.images! : [],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    // 숫자 필드 캐스팅 안전하게 한 번 더 (사용자 입력이 문자열일 수 있으므로)
    const normalized: RacketForm = {
      ...form,
      year: form.year ? Number(form.year) : null,
      price: Number(form.price || 0),
      quantity: Math.max(1, Number(form.quantity || 1)),
      spec: {
        weight: form.spec.weight ? Number(form.spec.weight) : null,
        balance: form.spec.balance ? Number(form.spec.balance) : null,
        headSize: form.spec.headSize ? Number(form.spec.headSize) : null,
        pattern: form.spec.pattern,
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
      },
      images: form.images || [],
    };
    await onSubmit(normalized);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            <CardTitle>기본 정보</CardTitle>
          </div>
          <CardDescription>라켓의 기본 정보를 입력하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">브랜드</Label>
              <Input id="brand" placeholder="예: Wilson, Babolat" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">모델</Label>
              <Input id="model" placeholder="예: Pro Staff 97" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">연식</Label>
              <Input id="year" type="number" placeholder="예: 2023" value={form.year ?? ''} onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">가격 (원)</Label>
              <Input id="price" type="number" placeholder="예: 150000" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value || 0) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">보유 수량</Label>
              <Input id="quantity" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value || 1)) })} />
              <p className="text-xs text-slate-500 dark:text-slate-400">최소 1개. 다수 보유 시 사용자에게 '잔여 n/총 m'로 표시됩니다.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition">상태 등급</Label>
              <Select value={form.condition} onValueChange={(value) => setForm({ ...form, condition: value as any })}>
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
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as any })}>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-600" />
            <CardTitle>상세 스펙</CardTitle>
          </div>
          <CardDescription>라켓의 상세 스펙을 입력하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">무게 (g)</Label>
              <Input id="weight" type="number" placeholder="예: 305" value={form.spec.weight ?? ''} onChange={(e) => setForm({ ...form, spec: { ...form.spec, weight: e.target.value ? Number(e.target.value) : null } })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance">밸런스 (mm)</Label>
              <Input id="balance" type="number" placeholder="예: 315" value={form.spec.balance ?? ''} onChange={(e) => setForm({ ...form, spec: { ...form.spec, balance: e.target.value ? Number(e.target.value) : null } })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headSize">헤드 사이즈 (in²)</Label>
              <Input id="headSize" type="number" placeholder="예: 97" value={form.spec.headSize ?? ''} onChange={(e) => setForm({ ...form, spec: { ...form.spec, headSize: e.target.value ? Number(e.target.value) : null } })} />
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <CardTitle>대여 설정</CardTitle>
          </div>
          <CardDescription>대여 가능 여부 및 요금을 설정하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="rental-enabled">대여 가능</Label>
              <p className="text-sm text-slate-500 dark:text-slate-400">이 라켓을 대여할 수 있도록 설정합니다</p>
            </div>
            <Switch id="rental-enabled" checked={form.rental.enabled} onCheckedChange={(checked) => setForm({ ...form, rental: { ...form.rental, enabled: checked } })} />
          </div>

          {form.rental.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-emerald-600" />
            <CardTitle>이미지</CardTitle>
          </div>
          <CardDescription>라켓 이미지를 업로드하세요 (최대 10장)</CardDescription>
        </CardHeader>
        <CardContent>
          <PhotosUploader value={form.images} onChange={(next) => setForm({ ...form, images: next })} max={10} onUploadingChange={(u) => {}} />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">첫 번째 이미지가 대표 이미지로 사용됩니다.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/admin/rackets">
          <Button variant="outline" type="button">
            취소
          </Button>
        </Link>
        <Button onClick={handleSubmit} disabled={loading} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
          {loading ? '저장 중...' : submitLabel}
        </Button>
      </div>
    </div>
  );
}
