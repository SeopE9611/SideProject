'use client';

import type React from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import { useEffect, useMemo, useState } from 'react';
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
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

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

type FieldErrors = Partial<Record<keyof FormValues, string>>;

// zod 에러를 필드별 에러로 변환 (인라인 표시/포커스 이동용)
function toFieldErrors(issues: z.ZodIssue[]): FieldErrors {
  const next: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path?.[0] as keyof FormValues | undefined;
    if (!key) continue;
    // 첫 에러만 유지(동일 필드 중복 메시지 방지)
    if (!next[key]) next[key] = issue.message;
  }
  return next;
}

function focusById(id: string) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id) as HTMLElement | null;
  if (!el) return;
  (el as any).focus?.();
  el.scrollIntoView?.({ block: 'center' });
}

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
        <Card className="border-border shadow-lg">
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-background from-background  dark:from-background dark:to-card rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary dark:text-primary animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">신청 정보 불러오는 중</h3>
                <p className="text-sm text-muted-foreground">잠시만 기다려 주세요...</p>
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
        <Card className="border-border dark:border-destructive shadow-lg">
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 bg-accent dark:bg-destructive rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-primary dark:text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-destructive dark:text-destructive">신청 정보를 불러올 수 없습니다</h3>
                <p className="text-sm text-primary dark:text-destructive">잠시 후 다시 시도해 주세요.</p>
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
        <Card className="border-border shadow-lg">
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-primary dark:text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-foreground">자가발송 신청이 아닙니다</h3>
                <p className="text-muted-foreground leading-relaxed max-w-md">
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
                <Button onClick={() => router.push(`/mypage/applications/${applicationId}`)} className="bg-primary  to-card hover:0 hover:to-card">
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
        <Card className="border-border shadow-lg">
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-primary dark:text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-foreground">이미 종료된 신청서입니다</h3>
                <p className="text-muted-foreground leading-relaxed max-w-md">작업 중 또는 교체완료 상태에서는 운송장을 수정할 수 없습니다.</p>
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // 초기값은 항상 계산 (훅 순서 고정)
  const initial: FormValues = useMemo(
    () => ({
      courier: application.shippingInfo?.selfShip?.courier ?? '',
      trackingNo: application.shippingInfo?.selfShip?.trackingNo ?? '',
      shippedAt: application.shippingInfo?.selfShip?.shippedAt ?? '',
      note: application.shippingInfo?.selfShip?.note ?? '',
    }),
    [application],
  );

  const isEdit = Boolean(initial.trackingNo);

  const mypageUrl = `/mypage?${new URLSearchParams({ tab: 'applications', id: applicationId }).toString()}`;

  // 신청서로 돌아갈 URL (orderId를 응답에 포함시키고 있으니 그걸 사용)
  const applyUrl = useMemo(() => {
    const oid = (application as any)?.orderId;
    return oid ? `/services/apply?orderId=${oid}` : '/services/apply?mode=single';
  }, [application]);

  const [form, setForm] = useState<FormValues>(initial);

  const isDirty = form.courier !== initial.courier || form.trackingNo !== initial.trackingNo || form.shippedAt !== initial.shippedAt || form.note !== initial.note;

  // submitting 중에는 confirm 중복 뜨는 걸 막기 위해 guard 비활성
  useUnsavedChangesGuard(isDirty && !submitting);

  const confirmLeaveIfDirty = (go: () => void) => {
    if (submitting) return;
    if (!isDirty) return go();
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (ok) go();
  };


  const onChange = (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setForm((prev) => ({ ...prev, [k]: v }));
    // 입력 중이면 해당 필드 에러를 즉시 해제 (UX)
    if (fieldErrors[k]) {
      setFieldErrors((prev) => ({ ...prev, [k]: undefined }));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = FormSchema.safeParse(form);
    if (!parsed.success) {
      const issues = parsed.error.issues;
      const nextErrors = toFieldErrors(issues);
      setFieldErrors(nextErrors);

      // 기존 토스트 흐름은 유지하되, 어디가 문제인지 인라인으로도 보이게 함
      showErrorToast(issues[0]?.message ?? '입력 값을 확인해 주세요.');

      const firstKey = issues[0]?.path?.[0];
      if (typeof firstKey === 'string') {
        const id = firstKey === 'courier' ? 'courier' : firstKey;
        focusById(id);
      }
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

      // Activity 탭 캐시도 같이 갱신해야 "운송장 등록 → 수정" 라벨이 즉시 반영됨
      // (ActivityFeed는 /api/mypage/activity?page=... 를 사용)
      try {
        await globalMutate((key) => typeof key === 'string' && key.startsWith('/api/mypage/activity'));
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
    <div className="min-h-screen bg-background dark:bg-card py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-px bg-primary from-transparent to-card"></div>
            <div className="w-14 h-14 bg-background  to-card rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="w-7 h-7 text-foreground" />
            </div>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-card"></div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">{isEdit ? '자가발송 운송장 수정' : '자가발송 운송장 입력'}</h1>
          <p className="text-muted-foreground leading-relaxed">{isEdit ? '이미 등록된 운송장 정보를 수정할 수 있습니다.' : '라켓을 발송하신 뒤, 택배사와 송장번호를 입력해 주세요.'}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Info Card */}
          <Card className="border-border bg-background  to-card dark:from-background dark:to-card shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary dark:bg-accent0 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-primary dark:text-primary">아직 발송 전이신가요?</h3>
                  <p className="text-sm text-primary dark:text-primary leading-relaxed">
                    발송 후 이 페이지에서 운송장(택배사/송장번호)을 등록하셔도 됩니다.
                    <br />
                    발송일은 선택 항목이며, 나중에 추가하실 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Form Card */}
          <Card className="border-border shadow-lg">
            <CardContent className="p-8">
              {/* Form Title with Divider */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-primary from-transparent to-card dark:to-card"></div>
                <div className="flex items-center gap-2 text-foreground">
                  <Package className="w-5 h-5" />
                  <span className="font-semibold">배송 정보</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-card dark:to-card"></div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="courier" className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary dark:text-primary" />
                    택배사
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.courier}
                    onValueChange={(value) => {
                      setForm((prev) => ({
                        ...prev,
                        courier: value,
                      }));
                      if (fieldErrors.courier) {
                        setFieldErrors((prev) => ({ ...prev, courier: undefined }));
                      }
                    }}
                  >
                    <SelectTrigger
                      id="courier"
                      className={`h-12 text-base border-border focus:border-border focus:ring-2 focus:ring-ring dark:focus:ring-ring ? ' border-destructive focus:border-destructive focus:ring-ring dark:focus:ring-ring' : ''}`}
                    >
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
                  <p className="min-h-[18px] text-sm text-primary dark:text-destructive">{fieldErrors.courier ?? ''}</p>
                </div>

                {/* Tracking Number Field */}
                <div className="space-y-2">
                  <Label htmlFor="trackingNo" className="text-base font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-foreground" />
                    송장번호
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="trackingNo"
                    value={form.trackingNo}
                    onChange={onChange('trackingNo')}
                    placeholder="숫자 또는 영문 조합으로 입력해 주세요"
                    className={`h-12 text-base border-border focus:border-border dark:focus:border-border focus:ring-2 focus:ring-ring dark:focus:ring-ring${fieldErrors.trackingNo ? ' border-destructive focus:border-destructive focus:ring-ring dark:focus:ring-ring' : ''}`}
                  />
                  <p className="min-h-[18px] text-sm text-primary dark:text-destructive">{fieldErrors.trackingNo ?? ''}</p>
                </div>

                {/* Shipped Date Field */}
                <div className="space-y-2">
                  <Label htmlFor="shippedAt" className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary dark:text-foreground" />
                    발송일
                    <span className="text-xs text-muted-foreground font-normal">(선택사항)</span>
                  </Label>
                  <Input
                    id="shippedAt"
                    type="date"
                    value={form.shippedAt ?? ''}
                    onChange={onChange('shippedAt')}
                    className="h-12 text-base border-border focus:border-border dark:focus:border-border focus:ring-2 focus:ring-ring dark:focus:ring-ring"
                  />
                </div>

                {/* Note Field */}
                <div className="space-y-2">
                  <Label htmlFor="note" className="text-base font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    메모
                    <span className="text-xs text-muted-foreground font-normal">(선택사항)</span>
                  </Label>
                  <Textarea
                    id="note"
                    value={form.note ?? ''}
                    onChange={onChange('note')}
                    placeholder="포장 상태, 수거 관련 참고사항 등을 입력해 주세요"
                    rows={4}
                    className="text-base border-border focus:border-border dark:focus:border-border focus:ring-2 focus:ring-ring dark:focus:ring-ring resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="border-border shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => confirmLeaveIfDirty(() => history.back())}
                  disabled={submitting}
                  className="flex-1 h-12 text-base border-border hover:bg-background dark:hover:bg-card"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  돌아가기
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => confirmLeaveIfDirty(() => router.push(applyUrl))}
                  disabled={submitting}
                  className="flex-1 h-12 text-base border-border hover:bg-background dark:hover:bg-card"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  나중에 등록할게요
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-12 text-base bg-primary  to-card hover:0 hover:to-card text-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {submitting ? '저장 중…' : isEdit ? '수정하기' : '저장하기'}
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
