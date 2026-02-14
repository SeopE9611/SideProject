'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Copy,
  Mail,
  UserCog,
  ShieldCheck,
  MoreHorizontal,
  Phone,
  MapPin,
  CalendarDays,
  LogIn,
  ChevronLeft,
  ExternalLink,
  Activity as ActivityIcon,
  ShoppingBag,
  Wrench,
  Star,
  RefreshCw,
  ShieldAlert,
  ListTree,
  Box,
  Pencil,
  Smartphone,
  MonitorSmartphone,
} from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Section, SectionHeader, SectionBody } from '@/components/admin/Section';
import { InfoItem } from '@/components/admin/InfoItem';
import StatusBadge from '@/components/admin/StatusBadge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { useUserSessions } from '@/app/admin/users/_hooks/useUserSessions';
import { UserActivityTabsSection } from '@/app/admin/users/_components/UserActivityTabsSection';

// 변경이력 포맷터 유틸
const AUDIT_LABELS: Record<string, string> = {
  name: '이름',
  email: '이메일',
  phone: '전화번호',
  address: '주소',
  addressDetail: '상세주소',
  postalCode: '우편번호',
  role: '권한',
  isSuspended: '상태',
  isDeleted: '상태',
};

function humanizeAuditDetail(action: string, raw?: string) {
  if (!raw) return '';
  let obj: any;
  try {
    obj = JSON.parse(raw);
  } catch {
    return ''; // JSON 아니면 숨김
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return '';

  const entries = Object.entries(obj) as [string, any][];

  // isSuspended / isDeleted만 있는 경우는 제목(액션)으로 충분하니 생략
  if (entries.length === 1 && (entries[0][0] === 'isSuspended' || entries[0][0] === 'isDeleted')) {
    return '';
  }

  const parts = entries.map(([k, v]) => {
    const label = AUDIT_LABELS[k] ?? k;
    if (k === 'isSuspended') return `${label}: ${v ? '비활성화' : '비활성 해제'}`;
    if (k === 'isDeleted') return `${label}: ${v ? '삭제됨' : '—'}`;
    if (k === 'role') return `${label}: ${v === 'admin' ? '관리자' : '일반'}`;
    const val = v === '' || v === null || v === undefined ? '—' : String(v);
    return `${label}: ${val}`;
  });

  return parts.join(' · ');
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include', cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('불러오기 실패');
    return r.json();
  });

// list 응답 파싱: Array | {items} | {data} | {results} | {rows}
function asArray<T = any>(val: any): T[] {
  if (Array.isArray(val)) return val;
  if (val?.items) return val.items;
  if (val?.data) return val.data;
  if (val?.results) return val.results;
  if (val?.rows) return val.rows;
  return [];
}
function asTotal(val: any): number | undefined {
  if (typeof val?.total === 'number') return val.total;
  if (typeof val?.count === 'number') return val.count;
  if (Array.isArray(val)) return val.length;
  return undefined;
}

type Role = 'user' | 'admin';
interface UserDetail {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  addressDetail?: string;
  postalCode?: string;
  role: Role;
  isDeleted: boolean;
  isSuspended?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

type AuditLog = { id?: string; action: string; detail?: string; at: string; by?: string };

export default function UserDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<UserDetail>(`/api/admin/users/${id}`, fetcher);

  // 다음 주소 API
  type DaumWindow = typeof window & { daum?: any };
  const [daumReady, setDaumReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as DaumWindow;

    if (w.daum?.Postcode) {
      setDaumReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => setDaumReady(true);
    document.body.appendChild(script);
  }, []);

  // 주소 팝업 핸들러
  const handleOpenPostcode = () => {
    if (!daumReady) return;
    const w = window as DaumWindow;
    new w.daum!.Postcode({
      oncomplete: (data: any) => {
        const postal = data.zonecode ?? '';
        const addr = data.roadAddress || data.jibunAddress || '';
        // 폼 상태 갱신(컨트롤드 값으로 바로 반영)
        setForm((prev) => ({
          ...prev,
          postalCode: postal,
          address: addr,
          addressDetail: '', // 상세주소는 비워두기
        }));
      },
    }).open();
  };

  // 비밀번호 초기화 다이얼로그 상태
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [tmpPw, setTmpPw] = useState<string | null>(null);

  // 비번 초기화 실행 전 입력 확인용
  const [pwConfirmOpen, setPwConfirmOpen] = useState(false);
  const [pwConfirmText, setPwConfirmText] = useState('');

  // KPI
  const { data: kpi } = useSWR<{ orders: number; applications: number; reviews: number }>(`/api/admin/users/${id}/kpi`, fetcher);

  // 최근 항목
  const { data: ordersResp } = useSWR(`/api/admin/users/${id}/orders?limit=5`, fetcher);
  const { data: appsResp } = useSWR(`/api/admin/users/${id}/applications/stringing?limit=5`, fetcher);
  const { data: reviewsResp } = useSWR(`/api/admin/users/${id}/reviews?limit=5`, fetcher);
  const { data: auditResp } = useSWR(`/api/admin/users/${id}/audit?limit=5`, fetcher);
  const { data: sessionsResp, mutate: mutateSessions } = useUserSessions(id, 5);
  const orders = asArray(ordersResp);
  const apps = asArray(appsResp);
  const reviews = asArray(reviewsResp);

  // 세션 정리
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupDays, setCleanupDays] = useState<'0' | '30' | '90' | '180'>('90'); // 기본 90일

  //kpi 안전 가드
  const kpiSafe = useMemo(
    () => ({
      orders: kpi?.orders ?? asTotal(ordersResp) ?? orders?.length ?? 0,
      applications: kpi?.applications ?? asTotal(appsResp) ?? apps?.length ?? 0,
      reviews: kpi?.reviews ?? asTotal(reviewsResp) ?? reviews?.length ?? 0,
    }),
    [kpi, ordersResp, appsResp, reviewsResp, orders, apps, reviews],
  );

  const [localAudit, setLocalAudit] = useState<AuditLog[]>([]);
  const audit: AuditLog[] = (auditResp?.items ?? auditResp ?? []) as AuditLog[];
  const auditMerged = [...(audit || []), ...localAudit].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 5);

  // 폼 로컬 상태 (미저장 변경 탐지)
  const [form, setForm] = useState<Partial<UserDetail>>({});
  const hasDirty = useMemo(() => Object.keys(form).length > 0, [form]);

  // 입력 중 이탈 방지(뒤로가기/탭닫기/링크이동)
  useUnsavedChangesGuard(hasDirty);

  const user = data;
  const onChange = (k: keyof UserDetail, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  const [pending, setPending] = useState(false);

  function pushAudit(action: string, detail?: string) {
    setLocalAudit((prev) => [{ action, detail, at: new Date().toISOString(), by: 'admin' }, ...prev].slice(0, 5));
  }

  // 서버 PATCH
  async function patchUser(patch: Record<string, any>, auditLabel?: string) {
    try {
      setPending(true);
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || '실패');
      showSuccessToast('저장되었습니다.');
      if (auditLabel) pushAudit(auditLabel, JSON.stringify(patch));
    } catch (e: any) {
      showErrorToast(e?.message || '처리 중 오류');
    } finally {
      setPending(false);
    }
  }

  // 폼 저장
  const save = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      await mutate();
      pushAudit('프로필 수정', JSON.stringify(form));
      setForm({});
      showSuccessToast('저장되었습니다.');
    } catch {
      showErrorToast('저장에 실패했습니다.');
    }
  };

  // 소프트 삭제
  const softDelete = async () => {
    try {
      await patchUser({ isDeleted: true }, '탈퇴(삭제)');
      await mutate();
    } catch {
      /* handled */
    }
  };

  // 복사 유틸
  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      showSuccessToast('클립보드에 복사되었습니다.');
    } catch {
      showErrorToast('복사 실패');
    }
  };

  // 상태 -> StatusBadge 매핑
  const statusKey = (u?: UserDetail) => (!u ? 'active' : u.isDeleted ? 'deleted' : u.isSuspended ? 'suspended' : 'active');

  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded-xl bg-muted animate-pulse" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-60 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-muted/30 animate-pulse" />
          <div className="h-60 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-muted/30 animate-pulse" />
        </div>
      </div>
    );
  }

  const initials = (
    user.name
      ?.trim()
      ?.split(' ')
      ?.map((s) => s[0])
      ?.slice(0, 2)
      .join('') ||
    user.email?.[0] ||
    '?'
  ).toUpperCase();

  // 비밀번호 초기화
  async function resetPassword() {
    try {
      setPending(true);
      const res = await fetch(`/api/admin/users/${id}/password/reset`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '초기화 실패');

      setTmpPw(json?.tempPassword || null); // 한 번만 보여줄 PW
      setPwDialogOpen(true);
      pushAudit('비밀번호 초기화');
      showSuccessToast('임시 비밀번호가 생성되었습니다.');
    } catch (e: any) {
      showErrorToast(e?.message || '처리 중 오류');
    } finally {
      setPending(false);
    }
  }

  // 세션 정리 모달
  async function cleanupSessions() {
    try {
      setPending(true);
      const res = await fetch(`/api/admin/users/${id}/sessions/cleanup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanDays: Number(cleanupDays) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '정리에 실패했습니다.');
      showSuccessToast(`세션 로그 ${json?.deleted ?? 0}건 정리 완료`);
      setCleanupOpen(false);
      await mutateSessions(); // 최신 세션 목록 새로고침
    } catch (e: any) {
      showErrorToast(e?.message || '처리 중 오류');
    } finally {
      setPending(false);
    }
  }

  return (
      <div className="relative">
        {/* 컬러 워시 + 도트 패턴 */}
        <div
          aria-hidden
          className={[
            'pointer-events-none absolute inset-0 -z-10',
            'bg-[radial-gradient(1000px_600px_at_-10%_-10%,theme(colors.emerald.50/.6),transparent_60%),',
            'radial-gradient(800px_500px_at_110%_20%,theme(colors.sky.50/.45),transparent_55%)]',
            "before:content-[''] before:absolute before:inset-0 before:[background:radial-gradient(circle_1px,theme(colors.slate.400/.12)_1px,transparent_1.5px)]",
            'before:[background-size:18px_18px]',
          ].join(' ')}
        />
        <TooltipProvider>
          {/* 상단 스티키 액션바 */}
          <div
            className="sticky top-14 md:top-[64px] z-50 -mx-2 px-2 pt-2 pb-3 border-b border-slate-200/70 dark:border-slate-800/70
             bg-white/80 dark:bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:dark:bg-slate-950/60"
          >
            <div className="mx-auto max-w-5xl flex items-center justify-between gap-2">
              {/* 좌측: 뒤로 */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => router.back()}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  목록으로
                </Button>
              </div>

              {/* 우측: 모든 주요 액션 */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 비활성/해제 토글 */}
                <Button
                  variant="outline"
                  className="whitespace-nowrap shrink-0"
                  disabled={pending}
                  onClick={async () => {
                    const next = !user.isSuspended;
                    await patchUser({ isSuspended: next }, next ? '비활성화' : '비활성 해제');
                    await mutate();
                  }}
                >
                  {user.isSuspended ? '비활성 해제' : '비활성화'}
                </Button>

                {/* 비밀번호 초기화 (실수 방지: 확인 다이얼로그 1단계) */}
                <AlertDialog
                  open={pwConfirmOpen}
                  onOpenChange={(o) => {
                    setPwConfirmOpen(o);
                    if (!o) setPwConfirmText('');
                  }}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="secondary" className="whitespace-nowrap shrink-0" disabled={pending}>
                      비밀번호 초기화
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>비밀번호 초기화 실행</AlertDialogTitle>
                      <AlertDialogDescription>
                        이 회원의 비밀번호를 임시 비밀번호로 재설정합니다. 실행 즉시 <b>임시 비밀번호가 1회 표시</b>되며, 사용자는 로그인 후 비밀번호 변경이 <b>강제</b>됩니다.
                        <br />
                        실수 클릭 방지를 위해 아래 확인 문구를 입력해 주세요.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                      <Label>확인 문구</Label>
                      <div className="text-xs text-muted-foreground">
                        아래 입력창에 <code>초기화</code> 라고 입력하면 실행 버튼이 활성화됩니다.
                      </div>
                      <Input value={pwConfirmText} onChange={(e) => setPwConfirmText(e.target.value)} placeholder="초기화" />
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={pwConfirmText !== '초기화' || pending}
                        onClick={async () => {
                          await resetPassword(); // ← 실제 초기화 호출(기존 함수 그대로 사용)
                          setPwConfirmOpen(false); // 다이얼로그 닫기
                          setPwConfirmText(''); // 입력값 초기화
                        }}
                      >
                        초기화 실행
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* 탈퇴(삭제) */}
                {user.isDeleted ? (
                  <Button variant="secondary" className="whitespace-nowrap shrink-0" disabled>
                    삭제됨
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="whitespace-nowrap shrink-0">
                        탈퇴(삭제)
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>탈퇴(삭제) 처리</AlertDialogTitle>
                        <AlertDialogDescription>이 회원을 삭제(탈퇴) 처리합니다. 진행 후에는 복구할 수 없습니다.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await patchUser({ isDeleted: true }, '탈퇴(삭제)');
                            await mutate();
                          }}
                        >
                          삭제(탈퇴) 실행
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* 저장 */}
                {hasDirty && <Badge variant="outline">미저장 변경</Badge>}
                <Button onClick={save} disabled={pending}>
                  저장
                </Button>
              </div>
            </div>
          </div>

          {/* 히어로 헤더 */}
          <div
            className={cn('mb-6 rounded-2xl border overflow-hidden shadow-sm', 'bg-gradient-to-br from-white via-emerald-50/25 to-slate-50 dark:from-slate-900 dark:via-transparent dark:to-slate-950', 'border-slate-200/70 dark:border-slate-800/70')}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="size-12 shadow-sm ring-2 ring-white dark:ring-slate-900">
                    <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      'absolute -right-1 -bottom-1 size-3 rounded-full ring-2 ring-white dark:ring-slate-900',
                      statusKey(user) === 'active' && 'bg-emerald-500',
                      statusKey(user) === 'suspended' && 'bg-amber-500',
                      statusKey(user) === 'deleted' && 'bg-rose-500',
                    )}
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">{user.name ?? '(이름없음)'}</h1>
                    <Badge variant="secondary" className={user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'}>
                      {user.role === 'admin' ? '관리자' : '일반'}
                    </Badge>
                    <StatusBadge status={statusKey(user) as any} />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      <button className="underline decoration-dotted" onClick={() => copy(user.email)} title="이메일 복사">
                        {user.email}
                      </button>
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>회원 ID: </span>
                      <button className="underline decoration-dotted" onClick={() => copy(user.id)} title="ID 복사">
                        {user.id}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 좌: 요약/보안/액티비티 KPI/최근 항목 탭  |  우: 프로필 수정 */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            {/* 좌측 스택 */}
            <div className="space-y-6">
              {/* 계정 요약 */}
              <Section>
                <SectionHeader title="계정 요약" aside={<UserCog className="h-4 w-4 text-muted-foreground" />} />
                <SectionBody className="space-y-3">
                  <InfoItem
                    icon={<Phone className="h-3.5 w-3.5" />}
                    label="전화"
                    value={
                      user.phone ? (
                        <a className="underline decoration-dotted" data-no-unsaved-guard href={`tel:${user.phone}`}>
                          {user.phone}
                        </a>
                      ) : (
                        '-'
                      )
                    }
                    onCopy={user.phone ? () => copy(user.phone!) : undefined}
                    mono
                  />
                  <InfoItem
                    icon={<MapPin className="h-3.5 w-3.5" />}
                    label="주소"
                    value={
                      user.address ? (
                        <span className="truncate">
                          {user.address} {user.addressDetail ? ` ${user.addressDetail}` : ''} {user.postalCode ? ` [${user.postalCode}]` : ''}
                        </span>
                      ) : (
                        '-'
                      )
                    }
                    onCopy={user.address || user.postalCode ? () => copy(`${user.address ?? ''} ${user.addressDetail ?? ''} ${user.postalCode ? `[${user.postalCode}]` : ''}`.trim()) : undefined}
                  />
                </SectionBody>
              </Section>

              {/* 보안 & 최근 활동 */}
              <Section>
                <SectionHeader title="보안 & 최근 활동" aside={<ShieldAlert className="h-4 w-4 text-muted-foreground" />} />
                <SectionBody className="space-y-3">
                  <InfoItem icon={<CalendarDays className="h-3.5 w-3.5" />} label="가입일" value={fmt(user.createdAt)} />
                  <InfoItem
                    icon={<LogIn className="h-3.5 w-3.5" />}
                    label="마지막 로그인"
                    value={
                      <>
                        <span className="block">{fmt(sessionsResp?.items?.[0]?.at ?? user.lastLoginAt)}</span>
                        <span className="block text-xs text-muted-foreground">{fromNowK(sessionsResp?.items?.[0]?.at ?? user.lastLoginAt)}</span>
                      </>
                    }
                  />

                  {/* 최근 로그인 장치 */}
                  <div className="mt-2 rounded-xl border bg-white/70 dark:bg-slate-950/60 border-slate-200/70 dark:border-slate-800/70 p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">최근 로그인 장치</div>
                      <Button variant="outline" size="sm" onClick={() => setCleanupOpen(true)} className="whitespace-nowrap">
                        세션 로그 정리
                      </Button>
                    </div>

                    {sessionsResp?.items?.length ? (
                      <div className="space-y-2">
                        {sessionsResp.items.map((s, i) => (
                          <SessionRow key={i} s={s} highlight={i === 0} />
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground">최근 로그인 기록이 없습니다.</div>
                    )}
                  </div>
                </SectionBody>
              </Section>

              <AlertDialog open={cleanupOpen} onOpenChange={setCleanupOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>세션 로그 정리</AlertDialogTitle>
                    <AlertDialogDescription>
                      선택한 기간 <b>이전</b>의 로그인 세션 기록을 영구 삭제합니다. 현재 로그인 세션에는 영향이 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="mt-2 space-y-3">
                    <RadioGroup value={cleanupDays} onValueChange={(v) => setCleanupDays(v as any)}>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="days30" value="30" />
                        <Label htmlFor="days30">30일 이전 로그 삭제</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="days90" value="90" />
                        <Label htmlFor="days90">90일 이전 로그 삭제</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="days180" value="180" />
                        <Label htmlFor="days180">180일 이전 로그 삭제</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="days0" value="0" />
                        <Label htmlFor="days0" className="text-red-600">
                          전체 삭제
                        </Label>
                      </div>
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">* 삭제 후에는 복구할 수 없습니다. 감사 로그에 삭제 내역이 기록됩니다.</p>
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={cleanupSessions}>
                      삭제 실행
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* 액티비티 KPI */}
              <Section>
                <SectionHeader title="액티비티" aside={<ActivityIcon className="h-4 w-4 text-muted-foreground" />} />
                <SectionBody>
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard tone="emerald" icon={<ShoppingBag className="h-4 w-4" />} label="주문" value={kpiSafe.orders} href="/admin/orders" />
                    <StatCard tone="sky" icon={<Wrench className="h-4 w-4" />} label="신청(스트링)" value={kpiSafe.applications} href="/admin/applications/stringing" />
                    <StatCard tone="violet" icon={<Star className="h-4 w-4" />} label="리뷰" value={kpiSafe.reviews} href="/admin/reviews" />
                  </div>
                </SectionBody>
              </Section>

              {/* 최근 항목 탭 (주문/신청/리뷰) */}
              <Section>
                <SectionHeader
                  title={
                    <div>
                      <div>최근 항목</div>
                      <div className="mt-1 text-xs text-muted-foreground font-normal">* 최근 5개만 표시됩니다.</div>
                    </div>
                  }
                  aside={<ListTree className="h-4 w-4 text-muted-foreground" />}
                />
                <SectionBody>
                  <UserActivityTabsSection orders={orders} apps={apps} reviews={reviews} MiniList={MiniList} Row={Row} />
                </SectionBody>
              </Section>

              {/* 감사 로그 (Audit) */}
              <Section>
                <SectionHeader
                  title={
                    <div>
                      <div>변경 이력</div>
                      <div className="mt-1 text-xs text-muted-foreground font-normal">* 최근 5개만 표시됩니다.</div>
                    </div>
                  }
                  aside={<Pencil className="h-4 w-4 text-muted-foreground" />}
                />
                <SectionBody>
                  <MiniList
                    empty="변경 이력이 없습니다."
                    items={auditMerged}
                    render={(log: AuditLog) => <Row title={log.action} subtitle={humanizeAuditDetail(log.action, log.detail)} right={new Date(log.at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })} />}
                  />
                </SectionBody>
              </Section>
            </div>

            {/* 우측: 프로필 수정 */}
            <div className="space-y-6">
              <Section>
                <SectionHeader
                  title={
                    <div className="flex items-center gap-2">
                      <span>프로필 수정</span>
                      {hasDirty && <Badge variant="outline">미저장 변경</Badge>}
                    </div>
                  }
                  aside={<RefreshCw className="h-4 w-4 text-muted-foreground" />}
                />
                <SectionBody>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormRow label="이름" htmlFor="name">
                      <Input id="name" defaultValue={user.name ?? ''} onChange={(e) => onChange('name', e.target.value)} />
                    </FormRow>

                    <FormRow label="권한" htmlFor="role">
                      <select id="role" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" defaultValue={user.role} onChange={(e) => onChange('role', e.target.value as Role)}>
                        <option value="user">일반</option>
                        <option value="admin">관리자</option>
                      </select>
                    </FormRow>

                    <FormRow label="전화번호" htmlFor="phone">
                      <Input id="phone" defaultValue={user.phone ?? ''} onChange={(e) => onChange('phone', e.target.value)} />
                    </FormRow>

                    {/* 우편번호 */}
                    <FormRow label="우편번호" htmlFor="postal">
                      <div className="flex gap-2">
                        <Input
                          id="postal"
                          readOnly
                          aria-readonly
                          value={form.postalCode ?? user.postalCode ?? ''}
                          className="bg-muted/40 text-slate-700 dark:text-slate-200"
                          onClick={handleOpenPostcode} // 클릭만으로도 검색 열기 원하면 유지
                        />
                        <Button variant="outline" className="shrink-0 whitespace-nowrap" onClick={handleOpenPostcode} disabled={!daumReady}>
                          주소 검색
                        </Button>
                      </div>
                    </FormRow>

                    {/* 주소 */}
                    <FormRow label="주소" htmlFor="addr" colSpan>
                      <Input id="addr" readOnly aria-readonly value={form.address ?? user.address ?? ''} className="bg-muted/40 text-slate-700 dark:text-slate-200" onClick={handleOpenPostcode} />
                    </FormRow>

                    {/* 상세주소 */}
                    <FormRow label="상세주소" htmlFor="addr2" colSpan>
                      <Input id="addr2" value={form.addressDetail ?? user.addressDetail ?? ''} onChange={(e) => onChange('addressDetail', e.target.value)} placeholder="동/호수, 층 등" />
                    </FormRow>
                  </div>

                  {/* 상태 토글 */}
                  <div className="mt-5 flex justify-end">
                    <Button variant="ghost" className="whitespace-nowrap" disabled={!hasDirty} onClick={() => setForm({})}>
                      변경 취소
                    </Button>
                  </div>
                </SectionBody>
              </Section>
            </div>
          </div>

          {/* 임시 비밀번호 안내 모달 */}
          <AlertDialog
            open={pwDialogOpen}
            onOpenChange={(o) => {
              setPwDialogOpen(o);
              if (!o) setTmpPw(null); // 닫을 때 메모리에서 지움 (보안)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>임시 비밀번호</AlertDialogTitle>
                <AlertDialogDescription>
                  아래 비밀번호는 <b>이번 한 번만</b> 표시됩니다. 사용자가 로그인한 후 비밀번호를 변경하도록 안내하세요.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2">
                <Label>생성된 임시 비밀번호</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={tmpPw ?? ''} />
                  <Button variant="outline" onClick={() => tmpPw && copy(tmpPw)}>
                    복사
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">* 서버에는 해시만 저장됩니다. 이 값은 창을 닫으면 다시 볼 수 없습니다.</p>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>닫기</AlertDialogCancel>
                <AlertDialogAction onClick={() => setPwDialogOpen(false)}>확인</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TooltipProvider>
      </div>
  );
}

/* -----------작은 조각들 모음--------------  */

// 상대시간 포맷: "5분 전", "3시간 전", "2일 전"
function fromNowK(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  return `${day}일 전`;
}

// IP 표기 정규화
function normalizeIp(ip?: string) {
  if (!ip) return '-';
  const t = ip.trim().toLowerCase();
  // IPv6 loopback → 로컬
  if (t === '::1' || t === '0:0:0:0:0:0:0:1') return '127.0.0.1 (로컬)';
  // IPv4-mapped IPv6 → 순수 IPv4 추출 (::ffff:192.168.0.10)
  const v4 = t.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/)?.[1];
  if (v4) return v4;
  return t; // 나머지 IPv6는 그대로
}

// 한 줄 UI
function SessionRow({ s, highlight = false }: { s: { at: string; ip: string; os: string; browser: string; isMobile: boolean }; highlight?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg border', 'border-slate-200/70 dark:border-slate-800/70 bg-white/80 dark:bg-slate-950/60', highlight && 'ring-1 ring-emerald-200/70 dark:ring-emerald-900/40')}>
      <div className={cn('grid size-9 place-items-center rounded-lg', s.isMobile ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300' : 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300')}>
        {s.isMobile ? <Smartphone className="h-4 w-4" /> : <MonitorSmartphone className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium truncate">
          {s.browser} · {s.os}
          {highlight && <Badge className="border-0 bg-emerald-100 text-emerald-700">현재</Badge>}
          <Badge className={cn('border-0 hidden sm:inline-block', s.isMobile ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700')}>{s.isMobile ? '모바일' : '데스크탑'}</Badge>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{normalizeIp(s.ip)}</code>
          <span className="shrink-0">
            {new Date(s.at).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })} · {fromNowK(s.at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function FormRow({ label, htmlFor, children, colSpan }: { label: string; htmlFor: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={cn('space-y-2', colSpan && 'sm:col-span-2')}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  tone = 'emerald', // 'emerald' | 'sky' | 'violet' | 'slate'
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href?: string;
  tone?: 'emerald' | 'sky' | 'violet' | 'slate';
}) {
  const toneMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };

  const content = (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 p-3 bg-white/70 dark:bg-slate-950/60 shadow-sm">
      <div className={cn('grid size-8 place-items-center rounded-lg', toneMap[tone])}>{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-base font-semibold">{value}</div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} target="_blank" rel="noreferrer" className="hover:-translate-y-0.5 transition-transform">
      {content}
    </Link>
  ) : (
    content
  );
}

function MiniList<T>({ items, render, empty }: { items: T[]; render: (item: T) => React.ReactNode; empty: string }) {
  if (!items?.length) {
    return <div className="text-sm text-muted-foreground">{empty}</div>;
  }
  return (
    <ul className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
      {items.map((it, idx) => (
        <li key={idx} className="py-2">
          {render(it)}
        </li>
      ))}
    </ul>
  );
}

function Row({ title, subtitle, right, href }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode; href?: string }) {
  const core = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        {subtitle ? <div className="text-xs text-muted-foreground truncate">{subtitle}</div> : null}
      </div>
      {right ? <div className="text-xs text-muted-foreground whitespace-nowrap">{right}</div> : null}
    </div>
  );
  return href ? (
    <Link href={href} target="_blank" rel="noreferrer" className="block hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg px-2 -mx-2 py-2 transition-colors">
      {core}
    </Link>
  ) : (
    core
  );
}

function truncate(s = '', n = 80) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
