'use client';

import type React from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Truck, Loader2, Check, Package, Calendar, FileText, ArrowLeft, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';

// ──────────────────────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────────────────────
type SelfShipInfo = {
  courier?: string;
  trackingNo?: string;
  shippedAt?: string;
  note?: string;
};

const COURIER_OPTIONS = ['CJ대한통운', '우체국택배', '한진택배', '롯데택배', '로젠택배', '경동택배', '기타'];

type Application = {
  _id: string;
  status: string;
  shippingInfo?: {
    collectionMethod?: string; // 실제 스키마
    selfShip?: SelfShipInfo;
  };
};

const FormSchema = z.object({
  courier: z.string().trim().min(1, '택배사를 입력하세요.'),
  trackingNo: z.string().trim().min(1, '송장번호를 입력하세요.'),
  shippedAt: z.string().trim().optional(),
  note: z.string().trim().optional(),
});
type FormValues = z.infer<typeof FormSchema>;

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('데이터 로드 실패');
    return r.json();
  });

// ──────────────────────────────────────────────────────────────
// Wrapper: 데이터 로드/분기만 담당 (훅 순서 안정)
// ──────────────────────────────────────────────────────────────
export default function ShippingFormClient({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const { data, error, isLoading } = useSWR<Application>(`/api/applications/stringing/${applicationId}`, fetcher);
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('return'); // 예: /mypage?tab=applications

  // 1) 로딩/에러(모든 렌더에서 동일한 훅 호출 순서)
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto mt-12 px-4">
        <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">신청 정보 불러오는 중</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">잠시만 기다려 주세요...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto mt-12 px-4">
        <Card className="border-red-200 dark:border-red-800 shadow-lg">
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">신청 정보를 불러올 수 없습니다</h3>
                <p className="text-sm text-red-600 dark:text-red-400">잠시 후 다시 시도해 주세요.</p>
              </div>
              <Button variant="outline" onClick={() => router.back()} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 자가발송 여부
  const rawMethod =
    data.shippingInfo?.collectionMethod ??
    (data as any)?.collectionMethod ?? // 최상위 값 폴백
    null;
  const isSelfShip = typeof rawMethod === 'string' && normalizeCollection(rawMethod) === 'self_ship';

  // 종료 상태(수정 금지)
  const CLOSED = ['작업 중', '교체완료'];
  const isClosed = CLOSED.includes(String(data?.status));
  if (!isSelfShip) {
    return (
      <div className="max-w-3xl mx-auto mt-12 px-4">
        <Card className="border-amber-200 dark:border-amber-800 shadow-lg">
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">자가발송 신청이 아닙니다</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                  현재 신청은 택배 수거 또는 매장 방문 방식입니다.
                  <br />
                  운송장 입력이 필요하지 않습니다.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  돌아가기
                </Button>
                <Button onClick={() => router.push(`/mypage/applications/${applicationId}`)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500">
                  신청 상세로 이동
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="max-w-3xl mx-auto mt-12 px-4">
        <Card className="border-amber-200 dark:border-amber-800 shadow-lg">
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">이미 종료된 신청서입니다</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">작업 중 또는 교체완료 상태에서는 운송장을 수정할 수 없습니다.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3) 자가발송이면 폼 컴포넌트 렌더 (이 아래에서 추가 훅 사용해도 안전)
  return <SelfShipForm applicationId={applicationId} application={data} returnTo={returnTo ?? undefined} />;
}

// 실제 폼
function SelfShipForm({ applicationId, application, returnTo }: { applicationId: string; application: Application; returnTo?: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // 초기값은 항상 계산 (훅 순서 고정)
  const initial: FormValues = useMemo(
    () => ({
      courier: application.shippingInfo?.selfShip?.courier ?? '',
      trackingNo: application.shippingInfo?.selfShip?.trackingNo ?? '',
      shippedAt: application.shippingInfo?.selfShip?.shippedAt ?? '',
      note: application.shippingInfo?.selfShip?.note ?? '',
    }),
    [application]
  );

  const mypageUrl = `/mypage?${new URLSearchParams({ tab: 'applications', id: applicationId }).toString()}`;

  // 신청서로 돌아갈 URL (orderId를 응답에 포함시키고 있으니 그걸 사용)
  const applyUrl = useMemo(() => {
    const oid = (application as any)?.orderId;
    return oid ? `/services/apply?orderId=${oid}` : '/services/apply';
  }, [application]);

  const [form, setForm] = useState<FormValues>(initial);

  const onChange = (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = FormSchema.safeParse(form);
    if (!parsed.success) {
      showErrorToast(parsed.error.issues[0]?.message ?? '입력 값을 확인해 주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/applications/stringing/${applicationId}/shipping`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shippingInfo: { selfShip: parsed.data } }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => '')) || '운송장 업데이트 실패');

      showSuccessToast('운송장 정보가 저장되었습니다.');
      // 1) 마이페이지 목록 캐시 무효화(페이지네이션 포함)
      try {
        await globalMutate((key: any) => typeof key === 'string' && key.startsWith('/api/applications/me'));
      } catch {}

      // 2) 돌아갈 경로 우선 사용
      if (returnTo) {
        router.replace(returnTo);
        router.refresh();
        return;
      }
      // 3) fallback: 신청 상세(마이페이지)로 이동
      const mypageUrlFinal = `/mypage?${new URLSearchParams({ tab: 'applications', id: applicationId }).toString()}`;
      router.replace(mypageUrlFinal);
      router.refresh();
    } catch (err: any) {
      showErrorToast(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-400"></div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-purple-400"></div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-3">자가발송 운송장 입력</h1>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">라켓을 발송하신 뒤, 택배사와 송장번호를 입력해 주세요.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Info Card */}
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">아직 발송 전이신가요?</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    발송 후 이 페이지에서 운송장(택배사/송장번호)을 등록하셔도 됩니다.
                    <br />
                    발송일은 선택 항목이며, 나중에 추가하실 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Form Card */}
          <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="p-8">
              {/* Form Title with Divider */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-600"></div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Package className="w-5 h-5" />
                  <span className="font-semibold">배송 정보</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-600"></div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="courier" className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    택배사
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.courier}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        courier: value,
                      }))
                    }
                  >
                    <SelectTrigger id="courier" className="h-12 text-base border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20">
                      <SelectValue placeholder="택배사를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {COURIER_OPTIONS.map((label) => (
                        <SelectItem key={label} value={label}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tracking Number Field */}
                <div className="space-y-2">
                  <Label htmlFor="trackingNo" className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    송장번호
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="trackingNo"
                    value={form.trackingNo}
                    onChange={onChange('trackingNo')}
                    placeholder="숫자 또는 영문 조합으로 입력해 주세요"
                    className="h-12 text-base border-slate-300 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20"
                  />
                </div>

                {/* Shipped Date Field */}
                <div className="space-y-2">
                  <Label htmlFor="shippedAt" className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    발송일
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">(선택사항)</span>
                  </Label>
                  <Input
                    id="shippedAt"
                    type="date"
                    value={form.shippedAt ?? ''}
                    onChange={onChange('shippedAt')}
                    className="h-12 text-base border-slate-300 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20"
                  />
                </div>

                {/* Note Field */}
                <div className="space-y-2">
                  <Label htmlFor="note" className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    메모
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">(선택사항)</span>
                  </Label>
                  <Textarea
                    id="note"
                    value={form.note ?? ''}
                    onChange={onChange('note')}
                    placeholder="포장 상태, 수거 관련 참고사항 등을 입력해 주세요"
                    rows={4}
                    className="text-base border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-slate-400/20 resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => history.back()} className="flex-1 h-12 text-base border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  돌아가기
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push(applyUrl)} className="flex-1 h-12 text-base border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Clock className="w-4 h-4 mr-2" />
                  나중에 등록할게요
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      저장하기
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
