'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Copy } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include', cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('불러오기 실패');
    return r.json();
  });

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

export default function UserDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<UserDetail>(`/api/admin/users/${id}`, fetcher);

  // 폼 로컬 상태
  const [form, setForm] = useState<Partial<UserDetail>>({});

  const user = data;

  const onChange = (k: keyof UserDetail, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

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
      setForm({});
      showSuccessToast('저장되었습니다.');
    } catch {
      showErrorToast('저장에 실패했습니다.');
    }
  };

  const softDelete = async () => {
    if (!confirm('정말 이 사용자를 탈퇴 처리(soft delete)하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
      await mutate();
      showSuccessToast('탈퇴 처리되었습니다.');
    } catch {
      showErrorToast('실패했습니다.');
    }
  };

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      showSuccessToast('클립보드에 복사되었습니다.');
    } catch {
      showErrorToast('복사 실패');
    }
  };

  // 컴포넌트 내부 어딘가: user(id 포함)가 로드되어 있다고 가정
  const [pending, setPending] = useState(false);

  async function patchUser(patch: Record<string, any>) {
    try {
      setPending(true);
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '실패');
      showSuccessToast('저장되었습니다.');
      // SWR/상태 갱신 함수가 있다면 여기서 갱신
      // mutateUser?.();
    } catch (e: any) {
      showErrorToast(e.message || '처리 중 오류');
    } finally {
      setPending(false);
    }
  }

  if (isLoading || !user) {
    return (
      <AuthGuard>
        <div className="space-y-6">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-48 rounded-xl border bg-gray-50" />
            <div className="h-64 rounded-xl border bg-gray-50" />
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">회원 상세</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user.name ?? '(이름없음)'} · <span className="underline decoration-dotted">{user.email}</span>
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={softDelete}>탈퇴(soft delete)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 요약 카드 */}
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">역할</div>
                <Badge variant="secondary" className={user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'}>
                  {user.role === 'admin' ? '관리자' : '일반'}
                </Badge>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-sm text-muted-foreground">상태</div>
                <Badge variant="secondary" className={user.isDeleted ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                  {user.isDeleted ? '삭제됨' : '활성'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">전화</span>
                <div className="flex items-center gap-1">
                  <a className="underline decoration-dotted" href={user.phone ? `tel:${user.phone}` : undefined}>
                    {user.phone || '-'}
                  </a>
                  {!!user.phone && (
                    <button className="h-5 w-5 inline-grid place-items-center rounded hover:bg-slate-100" onClick={() => copy(user.phone!)}>
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">주소</span>
                <div className="flex items-center gap-1 max-w-[70%]">
                  <span className="truncate" title={`${user.address ?? ''} ${user.addressDetail ?? ''} ${user.postalCode ? `[${user.postalCode}]` : ''}`}>
                    {user.address || '-'}
                  </span>
                  {!!(user.address || user.postalCode) && (
                    <button className="h-5 w-5 inline-grid place-items-center rounded hover:bg-slate-100" onClick={() => copy(`${user.address ?? ''} ${user.addressDetail ?? ''} ${user.postalCode ? `[${user.postalCode}]` : ''}`.trim())}>
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">가입일</span>
                <span>{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">마지막 로그인</span>
                <span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 수정 폼 */}
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input id="name" defaultValue={user.name ?? ''} onChange={(e) => onChange('name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">권한</Label>
                <select id="role" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" defaultValue={user.role} onChange={(e) => onChange('role', e.target.value as Role)}>
                  <option value="user">일반</option>
                  <option value="admin">관리자</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">전화번호</Label>
                <Input id="phone" defaultValue={user.phone ?? ''} onChange={(e) => onChange('phone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal">우편번호</Label>
                <Input id="postal" defaultValue={user.postalCode ?? ''} onChange={(e) => onChange('postalCode', e.target.value)} />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="addr">주소</Label>
                <Input id="addr" defaultValue={user.address ?? ''} onChange={(e) => onChange('address', e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="addr2">상세주소</Label>
                <Input id="addr2" defaultValue={user.addressDetail ?? ''} onChange={(e) => onChange('addressDetail', e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => router.back()}>
                목록으로
              </Button>
              <Button onClick={save}>저장</Button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {/* ✅ 비활성화 / 복구 */}
              <Button
                variant="outline"
                disabled={pending}
                onClick={async () => {
                  const next = !Boolean(user.isSuspended);
                  await patchUser({ isSuspended: next });
                  await mutate(); // 화면 갱신
                }}
              >
                {Boolean(user.isSuspended) ? '비활성 해제' : '비활성화'}
              </Button>

              {/* ✅ 탈퇴(삭제) / 복구 */}
              <Button
                variant={user.isDeleted ? 'secondary' : 'destructive'}
                disabled={pending}
                onClick={async () => {
                  const next = !user.isDeleted;
                  if (next && !confirm('이 회원을 삭제(탈퇴) 처리할까요?')) return;
                  await patchUser({ isDeleted: next });
                  await mutate(); // 화면 갱신
                }}
              >
                {user.isDeleted ? '복구' : '탈퇴(삭제)'}
              </Button>

              {/* 기존 버튼들 */}
              <Button variant="outline" onClick={() => router.back()}>
                목록으로
              </Button>
              <Button onClick={save}>저장</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
