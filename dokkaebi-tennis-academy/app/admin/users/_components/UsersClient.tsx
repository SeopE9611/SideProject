'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Search, Filter, MoreHorizontal, Copy, Mail, UserX, UserCheck, Trash2, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown, ChevronsLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AuthGuard from '@/components/auth/AuthGuard';
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

// ---------------------- fetcher ----------------------
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include', cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('불러오기 실패');
    return r.json();
  });

// ---------------------- helpers ----------------------
// 전체 주소 문자열
const fullAddress = (postal?: string, addr?: string, detail?: string) => {
  const p = postal ? `[${postal}] ` : '';
  const a = addr || '';
  const d = detail ? ` ${detail}` : '';
  const s = `${p}${a}${d}`.trim();
  return s || '-';
};

// 요약 주소(도/시/구 정도까지만)
const shortAddress = (addr?: string) => {
  if (!addr) return '-';
  const t = addr.split(/\s+/).filter(Boolean);
  // 시/도 + 시/구 + (동) 정도까지만 노출
  return t.slice(0, 3).join(' ');
};

// 날짜/시간 두 줄 표시용
const splitDateTime = (iso?: string) => {
  if (!iso) return { date: '-', time: '' };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString(),
  };
};

// 헤더/셀(컴팩트)
const th = 'sticky top-0 z-10 whitespace-nowrap px-3.5 py-2 bg-gray-50/90 dark:bg-gray-900/70 shadow-sm border-b border-slate-200 text-[12px] font-semibold text-slate-600 text-center';
const td = 'px-3.5 py-2 align-middle text-center text-[13px] leading-tight tabular-nums';

// 배지
const roleColors: Record<'admin' | 'user', string> = {
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  user: 'bg-slate-100 text-slate-700 border-slate-200',
};
const STATUS = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  suspended: 'bg-amber-100 text-amber-800 border-amber-200',
  deleted: 'bg-red-100 text-red-800 border-red-200',
} as const;
type UserStatusKey = keyof typeof STATUS; // "active" | "suspended" | "deleted"

const badgeSm = 'px-2 py-0.5 text-[11px] rounded-md font-medium border';

// 페이지 목록(… 포함)
const buildPageItems = (page: number, totalPages: number) => {
  const arr: (number | '...')[] = [];
  const DOT: '...' = '...';
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) arr.push(i);
  } else {
    const l = Math.max(2, page - 1);
    const r = Math.min(totalPages - 1, page + 1);
    arr.push(1);
    if (l > 2) arr.push(DOT);
    for (let i = l; i <= r; i++) arr.push(i);
    if (r < totalPages - 1) arr.push(DOT);
    arr.push(totalPages);
  }
  return arr;
};

export default function UsersClient() {
  // 서버 페이징 & 필터
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [sort, setSort] = useState<'created_desc' | 'created_asc' | 'name_asc' | 'name_desc'>('created_desc');

  // 상태 필터 타입 보정 ('suspended' 포함)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deleted' | 'suspended'>('all');

  const key = (() => {
    const p = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (searchQuery.trim()) p.set('q', searchQuery.trim());
    if (roleFilter !== 'all') p.set('role', roleFilter);
    if (statusFilter !== 'all') p.set('status', statusFilter);
    if (sort) p.set('sort', sort);
    return `/api/admin/users?${p.toString()}`;
  })();

  const { data, isLoading, mutate } = useSWR(key, fetcher);

  const rows =
    (data?.items as Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
      address?: string;
      addressDetail?: string;
      postalCode?: string;
      role: 'user' | 'admin';
      isDeleted: boolean;
      createdAt?: string;
      lastLoginAt?: string;
      isSuspended?: boolean;
    }>) || [];

  // 선택된 사용자 ID 목록 상태
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // 선택된 행의 현재 상태를 계산
  const selectedRows = useMemo(() => (selectedUsers.length ? rows.filter((r) => selectedUsers.includes(r.id)) : []), [rows, selectedUsers]);

  // 각각 가능 여부
  const canSuspend = useMemo(() => selectedRows.some((u) => !u.isDeleted && !u.isSuspended), [selectedRows]);
  const canUnsuspend = useMemo(() => selectedRows.some((u) => !u.isDeleted && u.isSuspended), [selectedRows]);
  const hasSelection = selectedUsers.length > 0;
  const canSoftDelete = useMemo(() => selectedRows.some((u) => !u.isDeleted), [selectedRows]);

  const total = (data?.total as number) || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageItems = buildPageItems(page, totalPages);

  // KPI 카드 값 주입
  useEffect(() => {
    if (!data) return;
    const q = (sel: string) => document.querySelector(sel);
    const c = (data as any).counters;

    // data.counters가 있으면 그 값으로, 없으면 fallback(현 페이지 집계)
    const active = c?.active ?? rows.filter((u) => !u.isDeleted && !u.isSuspended).length;
    const deleted = c?.deleted ?? rows.filter((u) => u.isDeleted).length;
    const admins = c?.admins ?? rows.filter((u) => u.role === 'admin').length;
    const suspended = c?.suspended ?? rows.filter((u) => u.isSuspended && !u.isDeleted).length;
    const totalVal = c?.total ?? total;

    (q('#kpi-total') as HTMLElement | null)?.replaceChildren(document.createTextNode(String(totalVal)));
    (q('#kpi-active') as HTMLElement | null)?.replaceChildren(document.createTextNode(String(active)));
    (q('#kpi-deleted') as HTMLElement | null)?.replaceChildren(document.createTextNode(String(deleted)));
    (q('#kpi-admins') as HTMLElement | null)?.replaceChildren(document.createTextNode(String(admins)));
    (q('#kpi-suspended') as HTMLElement | null)?.replaceChildren(document.createTextNode(String(suspended)));
  }, [data, rows, total]);

  // 선택
  const isAllSelected = rows.length > 0 && selectedUsers.length === rows.length;
  const isPartiallySelected = selectedUsers.length > 0 && selectedUsers.length < rows.length;
  const allCheckboxRef = useRef<HTMLButtonElement>(null);

  // 삭제된 회원이 하나라도 선택
  const hasDeletedSelected = useMemo(() => selectedRows.some((u) => u.isDeleted), [selectedRows]);

  useEffect(() => {
    if (!allCheckboxRef.current) return;
    const input = allCheckboxRef.current.querySelector("input[type='checkbox']");
    if (input instanceof HTMLInputElement) input.indeterminate = isPartiallySelected;
  }, [isPartiallySelected]);

  const handleSelectAll = () => setSelectedUsers(isAllSelected ? [] : rows.map((u) => u.id));
  const handleSelectUser = (id: string) => setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // 복사 공통
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccessToast('클립보드에 복사되었습니다.');
    } catch {
      showErrorToast('복사에 실패했습니다.');
    }
  };

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)));

  // 공용: 선택된 row의 이메일
  const selectedEmails = rows
    .filter((r) => selectedUsers.includes(r.id))
    .map((r) => r.email)
    .filter(Boolean);

  // 메일 발송(초기 구현은 mailto로 기본 메일 클라이언트 호출)
  const handleBulkMail = () => {
    if (selectedEmails.length === 0) return;
    const bcc = encodeURIComponent(selectedEmails.join(','));
    window.location.href = `mailto:?bcc=${bcc}`;
  };

  //  비활성화/해제
  const bulkSuspend = async (suspend: boolean) => {
    try {
      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ op: suspend ? 'suspend' : 'unsuspend', ids: selectedUsers }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || '실패');

      const modified = Number(json.modifiedCount || 0);
      const alreadyCnt = Array.isArray(json?.skipped?.already) ? json.skipped.already.length : 0;
      const incompatibleCnt = Array.isArray(json?.skipped?.incompatible) ? json.skipped.incompatible.length : 0;

      if (modified > 0) {
        showSuccessToast(`${suspend ? '비활성화' : '비활성 해제'} ${modified}건 완료`);
      }
      if (alreadyCnt > 0) {
        showInfoToast(`${alreadyCnt}건은 이미 ${suspend ? '비활성' : '활성'} 상태여서 건너뜀`);
      }
      if (incompatibleCnt > 0 && suspend) {
        // 비활성화 시도에서만 안내: 삭제 계정 비활성화 불가
        showInfoToast(`${incompatibleCnt}건은 삭제 상태라 비활성화할 수 없음`);
      }

      if (modified === 0 && alreadyCnt + incompatibleCnt > 0) {
        // 실제 변경 없음
        showInfoToast('변경된 항목이 없습니다.');
      }

      setSelectedUsers([]);
      mutate?.();
    } catch (e: any) {
      showErrorToast(e.message || '처리 중 오류');
    }
  };

  // 삭제(소프트 삭제)
  const bulkSoftDelete = async () => {
    if (!window.confirm(`선택된 ${selectedUsers.length}명을 삭제(탈퇴) 처리할까요?`)) return;
    try {
      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ op: 'softDelete', ids: selectedUsers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || '실패');

      const modified = Number(json.modifiedCount || 0);
      const alreadyCnt = Array.isArray(json?.skipped?.already) ? json.skipped.already.length : 0;

      if (modified > 0) showSuccessToast(`삭제(탈퇴) ${modified}건 완료`);
      if (alreadyCnt > 0) showInfoToast(`${alreadyCnt}건은 이미 삭제 상태여서 건너뜀`);
      if (modified === 0 && alreadyCnt > 0) showInfoToast('변경된 항목이 없습니다.');

      setSelectedUsers([]);
      mutate?.();
    } catch (e: any) {
      showErrorToast(e.message || '처리 중 오류');
    }
  };
  // --- Cleanup(7일) 모달 상태 ---
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<any[]>([]);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupSubmitting, setCleanupSubmitting] = useState(false);
  const [cleanupAck, setCleanupAck] = useState(false);

  // --- Purge(1년) 모달 상태 ---
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgePreview, setPurgePreview] = useState<any[]>([]);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeSubmitting, setPurgeSubmitting] = useState(false);
  const [purgeAck, setPurgeAck] = useState(false);

  // --- 미리보기 요청 ---
  const fetchCleanupPreview = async () => {
    setCleanupLoading(true);
    try {
      const res = await fetch('/api/system/cleanup/preview', { credentials: 'include' });
      const json = await res.json();
      setCleanupPreview(Array.isArray(json?.candidates) ? json.candidates : []);
    } catch {
      setCleanupPreview([]);
    } finally {
      setCleanupLoading(false);
    }
  };

  const fetchPurgePreview = async () => {
    setPurgeLoading(true);
    try {
      const res = await fetch('/api/system/purge/preview', { credentials: 'include' });
      const json = await res.json();
      setPurgePreview(Array.isArray(json?.candidates) ? json.candidates : []);
    } catch {
      setPurgePreview([]);
    } finally {
      setPurgeLoading(false);
    }
  };

  // --- 실행(DELETE) ---
  const confirmCleanup = async () => {
    setCleanupSubmitting(true);
    try {
      const res = await fetch('/api/system/cleanup', { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (res.ok) {
        showSuccessToast(`삭제된 계정 수: ${json.deletedCount ?? 0}`);
        setCleanupOpen(false);
        setCleanupAck(false);
        mutate?.();
      } else {
        showErrorToast(json?.message || '삭제 실패');
      }
    } catch {
      showErrorToast('네트워크 오류');
    } finally {
      setCleanupSubmitting(false);
    }
  };

  const confirmPurge = async () => {
    setPurgeSubmitting(true);
    try {
      const res = await fetch('/api/system/purge', { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (res.ok) {
        showSuccessToast(`완전 삭제된 계정 수: ${json.deletedCount ?? 0}`);
        setPurgeOpen(false);
        setPurgeAck(false);
        mutate?.();
      } else {
        showErrorToast(json?.message || '완전 삭제 실패');
      }
    } catch {
      showErrorToast('네트워크 오류');
    } finally {
      setPurgeSubmitting(false);
    }
  };

  // ▽ 미사용 handleCleanup/handlePurge (AlertDialog 플로우로 대체)
  // 7일 경과 탈퇴 회원 정리(soft-deleted → 완전삭제)
  const handleCleanup = async () => {
    try {
      const previewRes = await fetch('/api/system/cleanup/preview', {
        method: 'GET',
        credentials: 'include',
      });
      const previewJson = await previewRes.json();
      const candidates: any[] = Array.isArray(previewJson?.candidates) ? previewJson.candidates : [];

      if (candidates.length === 0) {
        showInfoToast('삭제 예정인 탈퇴 회원이 없습니다.');
        return;
      }

      const previewText = candidates.map((u) => `- ${u.name} (${u.email})`).join('\n');
      if (!window.confirm(`삭제 예정 회원 (${candidates.length}명):\n\n${previewText}\n\n정말 삭제하시겠습니까?`)) return;

      const res = await fetch('/api/system/cleanup', {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();

      if (res.ok) {
        showSuccessToast(`삭제된 계정 수: ${json.deletedCount}`);
        mutate?.();
      } else {
        showErrorToast(`실패: ${json.message || '요청 실패'}`);
      }
    } catch (e) {
      showErrorToast('실패: 예기치 못한 오류');
    }
  };

  // 1년 경과 탈퇴 회원 완전 삭제
  const handlePurge = async () => {
    try {
      const previewRes = await fetch('/api/system/purge/preview', {
        method: 'GET',
        credentials: 'include',
      });
      const previewJson = await previewRes.json();
      const candidates: any[] = Array.isArray(previewJson?.candidates) ? previewJson.candidates : [];

      if (candidates.length === 0) {
        showInfoToast('탈퇴한지 1년 이상이 된 계정이 없습니다.');
        return;
      }

      const previewText = candidates.map((u) => `- ${u.name} (${u.email})`).join('\n');
      if (!window.confirm(`삭제 예정 회원 (${candidates.length}명):\n\n${previewText}\n\n정말 삭제하시겠습니까?`)) return;

      const res = await fetch('/api/system/purge', {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();

      if (res.ok) {
        showSuccessToast(`완전 삭제된 계정 수: ${json.deletedCount}`);
        mutate?.();
      } else {
        showErrorToast(`실패: ${json.message || '요청 실패'}`);
      }
    } catch (e) {
      showErrorToast('실패: 예기치 못한 오류');
    }
  };
  // △ 미사용 handleCleanup/handlePurge (AlertDialog 플로우로 대체)

  return (
    <AuthGuard>
      {/* 검색/필터 바 */}
      <div className="border-0 bg-white/80 shadow-lg backdrop-blur-sm rounded-xl p-4 sm:p-6 mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이름/이메일/전화 검색"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* 상태 */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[130px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="상태" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="suspended">비활성</SelectItem>
                <SelectItem value="deleted">삭제됨</SelectItem>
              </SelectContent>
            </Select>

            {/* 역할 */}
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="역할" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="user">일반</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>

            {/* 정렬 */}
            <Select
              value={sort}
              onValueChange={(v) => {
                setSort(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">가입일 ↓</SelectItem>
                <SelectItem value="created_asc">가입일 ↑</SelectItem>
                <SelectItem value="name_asc">이름 A→Z</SelectItem>
                <SelectItem value="name_desc">이름 Z→A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 선택 액션바 */}
      {selectedUsers.length > 0 && (
        <div className="mb-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedUsers.length}명의 회원이 선택됨</span>
            </div>

            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Button variant="outline" size="sm" onClick={handleBulkMail}>
                <Mail className="mr-2 h-3.5 w-3.5" />
                메일 발송
              </Button>

              {/* 상태 변경: 삭제 선택 시 비활성, 그 외 토글/드롭다운 */}
              {hasDeletedSelected ? (
                <Button variant="outline" size="sm" disabled title="삭제(탈퇴)된 회원은 상태 변경/복구가 불가합니다. 재가입을 안내하세요.">
                  상태 변경
                </Button>
              ) : (
                <>
                  {/* 전원 활성 → 비활성화만 가능 */}
                  {canSuspend && !canUnsuspend && (
                    <Button variant="outline" size="sm" onClick={() => bulkSuspend(true)} title={!hasSelection ? '선택된 회원이 없습니다' : undefined} disabled={!hasSelection}>
                      <UserX className="mr-2 h-3.5 w-3.5" />
                      비활성화
                    </Button>
                  )}

                  {/* 전원 비활성 → 활성화만 가능 */}
                  {!canSuspend && canUnsuspend && (
                    <Button variant="outline" size="sm" onClick={() => bulkSuspend(false)} title={!hasSelection ? '선택된 회원이 없습니다' : undefined} disabled={!hasSelection}>
                      <UserCheck className="mr-2 h-3.5 w-3.5" />
                      활성화
                    </Button>
                  )}

                  {/* 혼합 선택 → 드롭다운 */}
                  {canSuspend && canUnsuspend && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" title={!hasSelection ? '선택된 회원이 없습니다' : '선택된 회원의 상태를 일괄 변경'} disabled={!hasSelection}>
                          상태 변경
                          <ChevronDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => bulkSuspend(false)}>
                          <UserCheck className="mr-2 h-3.5 w-3.5" />
                          활성화
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkSuspend(true)}>
                          <UserX className="mr-2 h-3.5 w-3.5" />
                          비활성화
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}

              <Button variant="destructive" size="sm" onClick={bulkSoftDelete} disabled={!canSoftDelete} title={!canSoftDelete ? '선택 항목이 이미 삭제 상태입니다' : undefined}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                삭제
              </Button>
            </div>
          </div>

          {((canSuspend && canUnsuspend) || hasDeletedSelected) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {canSuspend && canUnsuspend && (
                <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/70 dark:bg-white/5 border border-blue-200/70 dark:border-blue-800 px-2 py-1 text-blue-700 dark:text-blue-200">
                    <UserCheck className="h-3.5 w-3.5" />
                    활성화 가능 {selectedRows.filter((u) => !u.isDeleted && u.isSuspended).length}건
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/70 dark:bg-white/5 border border-blue-200/70 dark:border-blue-800 px-2 py-1 text-blue-700 dark:text-blue-200">
                    <UserX className="h-3.5 w-3.5" />
                    비활성화 가능 {selectedRows.filter((u) => !u.isDeleted && !u.isSuspended).length}건
                  </span>
                </>
              )}

              {/* 삭제 선택 시: 경고 칩 */}
              {hasDeletedSelected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 py-1 text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  삭제(탈퇴)된 회원은 복구할 수 없습니다. 재가입만 가능합니다.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 한눈에 보기: 칼럼 병합 + 고정폭 + dense */}
      <div className="border-0 bg-white/80 shadow-lg backdrop-blur-sm rounded-xl max-w-[1120px] mx-auto">
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4">
          <h2 className="text-lg font-semibold">회원 목록</h2>
          <p className="text-sm text-muted-foreground">총 {total}명의 회원</p>
        </div>

        <div className="relative overflow-x-hidden px-3 sm:px-4 pb-3">
          <div className="relative rounded-2xl border border-slate-200 shadow-sm min-w-0">
            <Table className="w-full table-fixed border-separate [border-spacing-block:0.35rem] [border-spacing-inline:0] text-xs [&_th]:text-center [&_td]:text-center" aria-busy={isLoading && rows.length === 0}>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(th, 'w-[40px]')}>
                    <Checkbox ref={allCheckboxRef} checked={isAllSelected} onCheckedChange={() => handleSelectAll()} aria-label="전체 선택" />
                  </TableHead>
                  <TableHead className={cn(th, 'w-[220px]')}>회원</TableHead>
                  <TableHead className={cn(th, 'w-[72px]')}>권한</TableHead>
                  <TableHead className={cn(th, 'w-[110px]')}>전화</TableHead>
                  <TableHead className={cn(th, 'w-[280px]')}>주소</TableHead>
                  {/* 가입일 + 마지막 로그인 병합 */}
                  <TableHead className={cn(th, 'w-[150px]')}>활동(가입/로그인)</TableHead>
                  <TableHead className={cn(th, 'w-[64px]')}>상태</TableHead>
                  <TableHead className={cn(th, 'w-[44px] text-center')}>작업</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* 로딩 스켈레톤 */}
                {isLoading &&
                  rows.length === 0 &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`sk-${i}`} className="border-b last:border-0">
                      <TableCell className={td}>
                        <div className="h-4 w-4 mx-auto rounded bg-gray-200" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-3.5 w-40 mx-auto rounded bg-gray-200" />
                        <div className="h-3 w-28 mx-auto mt-1 rounded bg-gray-200" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-4 w-10 mx-auto rounded-full bg-gray-200" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-3.5 w-24 mx-auto rounded bg-gray-200" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-3.5 w-48 mx-auto rounded bg-gray-200" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-3.5 w-28 mx-auto rounded bg-gray-200" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-4 w-10 mx-auto rounded-full bg-gray-200" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-5 w-5 mx-auto rounded bg-gray-200" />
                      </TableCell>
                    </TableRow>
                  ))}

                {/* 데이터 */}
                {rows.length > 0 &&
                  rows.map((u) => {
                    const statusKey: UserStatusKey = u.isDeleted ? 'deleted' : u.isSuspended ? 'suspended' : 'active';
                    const joined = splitDateTime(u.createdAt);
                    const last = splitDateTime(u.lastLoginAt);

                    return (
                      <TableRow key={u.id} className="hover:bg-primary/5 transition-colors even:bg-slate-50/60 border-b last:border-0">
                        {/* 선택 */}
                        <TableCell className={cn(td, 'w-[40px]')}>
                          <Checkbox checked={selectedUsers.includes(u.id)} onCheckedChange={() => handleSelectUser(u.id)} aria-label={`${u.name || '사용자'} 선택`} />
                        </TableCell>

                        {/* 회원: 이름/이메일 두 줄 + 복사 */}
                        <TableCell className={cn(td, 'w-[220px]')}>
                          <div className="min-w-0 flex flex-col items-center text-center mx-auto max-w-[200px]">
                            <span className="font-medium truncate">{u.name || '(이름없음)'}</span>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
                              <span className="truncate">{u.email}</span>
                              <button className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-slate-100" onClick={() => copy(u.email)} title="복사" aria-label="이메일 복사">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </TableCell>

                        {/* 권한 */}
                        <TableCell className={cn(td, 'w-[72px] whitespace-nowrap')}>
                          <Badge className={cn(badgeSm, roleColors[u.role])}>{u.role === 'admin' ? '관리자' : '일반'}</Badge>
                        </TableCell>

                        {/* 전화 */}
                        <TableCell className={cn(td, 'w-[110px] whitespace-nowrap')}>
                          {u.phone ? (
                            <div className="flex items-center justify-center gap-1">
                              <a href={`tel:${u.phone}`} className="underline decoration-dotted">
                                {u.phone}
                              </a>
                              <button className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-slate-100" onClick={() => copy(u.phone!)} title="복사" aria-label="전화번호 복사">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>

                        {/* 주소: 요약 + 복사, 전체는 title로 */}
                        <TableCell className={cn(td, 'w-[280px]')} title={fullAddress(u.postalCode, u.address, u.addressDetail)}>
                          <div className="min-w-0 flex items-center justify-center gap-1">
                            <span className="truncate block max-w-[250px]">{shortAddress(u.address)}</span>
                            <button
                              className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-slate-100"
                              onClick={() => copy(fullAddress(u.postalCode, u.address, u.addressDetail))}
                              title="전체 주소 복사"
                              aria-label="주소 복사"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </TableCell>

                        {/* 활동(가입/로그인) 한 칼럼 */}
                        <TableCell className={cn(td, 'w-[150px] whitespace-nowrap')}>
                          <div className="flex flex-col items-center leading-tight">
                            <span className="text-[12px]">{joined.date}</span>
                            <span className="text-[11px] text-muted-foreground">{last.time ? `${last.date} ${last.time}` : '-'}</span>
                          </div>
                        </TableCell>

                        {/* 상태 */}
                        <TableCell className={cn(td, 'w-[64px] whitespace-nowrap')}>
                          <Badge className={cn(badgeSm, STATUS[statusKey])}>{statusKey === 'active' ? '활성' : statusKey === 'suspended' ? '비활성' : '삭제됨'}</Badge>
                        </TableCell>

                        {/* 작업 */}
                        <TableCell className={cn(td, 'w-[44px] p-0')}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/users/${u.id}`}>상세 보기</Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          <div className="relative mt-3 h-10">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(1)} disabled={page <= 1} aria-label="첫 페이지">
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="이전">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {pageItems.map((it, i) =>
                typeof it === 'number' ? (
                  <Button key={i} variant={it === page ? 'default' : 'outline'} className="h-8 min-w-8 px-2" onClick={() => goToPage(it)} aria-current={it === page ? 'page' : undefined}>
                    {it}
                  </Button>
                ) : (
                  <span key={i} className="px-2 text-muted-foreground select-none">
                    …
                  </span>
                )
              )}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} aria-label="다음">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(totalPages)} disabled={page >= totalPages} aria-label="끝 페이지">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700 dark:text-red-300 text-sm">탈퇴 회원 정리 (Danger zone)</CardTitle>
            <CardDescription className="text-xs">7일 경과 탈퇴 계정은 정리, 1년 경과 탈퇴 계정은 완전 삭제합니다. 실행 전 미리보기 목록을 확인하세요.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {/* 탈퇴 회원 자동 삭제 실행 (7일 경과) */}
            <AlertDialog
              open={cleanupOpen}
              onOpenChange={(o) => {
                setCleanupOpen(o);
                if (o) {
                  setCleanupAck(false);
                  fetchCleanupPreview();
                }
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive">7일 이상 경과한 탈퇴 회원 자동 삭제 실행</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>탈퇴 회원 자동 삭제</AlertDialogTitle>
                  <AlertDialogDescription>탈퇴 후 7일이 지난 계정을 영구 삭제합니다. 아래 목록을 확인하고 동의 후 실행하세요.</AlertDialogDescription>
                </AlertDialogHeader>

                {/* 미리보기 리스트 */}
                <div className="border rounded-md p-3 max-h-64 overflow-auto">
                  {cleanupLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
                    </div>
                  ) : cleanupPreview.length === 0 ? (
                    <div className="text-sm text-muted-foreground">삭제 예정인 탈퇴 회원이 없습니다.</div>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {cleanupPreview.map((u: any) => (
                        <li key={String(u._id)} className="flex items-center justify-between gap-2">
                          <span className="truncate">{u.name || u.email || u._id}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 동의 체크 */}
                <div className="mt-3 flex items-center gap-2">
                  <Checkbox id="cleanup-ack" checked={cleanupAck} onCheckedChange={(v) => setCleanupAck(Boolean(v))} />
                  <label htmlFor="cleanup-ack" className="text-xs text-muted-foreground">
                    위 목록을 확인했으며, 영구 삭제에 동의합니다.
                  </label>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={cleanupSubmitting}>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmCleanup} disabled={cleanupSubmitting || cleanupLoading || !cleanupAck || cleanupPreview.length === 0}>
                    {cleanupSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    영구 삭제 실행
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* 1년 이상 경과한 탈퇴 회원 완전 삭제 */}
            <AlertDialog
              open={purgeOpen}
              onOpenChange={(o) => {
                setPurgeOpen(o);
                if (o) {
                  setPurgeAck(false);
                  fetchPurgePreview();
                }
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive">1년 이상 경과한 탈퇴 회원 완전 삭제</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>탈퇴 1년 경과 계정 완전 삭제</AlertDialogTitle>
                  <AlertDialogDescription>개인정보 최소 보관 정책에 따라, 탈퇴 후 1년이 지난 계정을 완전 삭제합니다.</AlertDialogDescription>
                </AlertDialogHeader>

                {/* 미리보기 리스트 */}
                <div className="border rounded-md p-3 max-h-64 overflow-auto">
                  {purgeLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
                    </div>
                  ) : purgePreview.length === 0 ? (
                    <div className="text-sm text-muted-foreground">완전 삭제 대상 계정이 없습니다.</div>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {purgePreview.map((u: any) => (
                        <li key={String(u._id)} className="flex items-center justify-between gap-2">
                          <span className="truncate">{u.name || u.email || u._id}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 동의 체크 */}
                <div className="mt-3 flex items-center gap-2">
                  <Checkbox id="purge-ack" checked={purgeAck} onCheckedChange={(v) => setPurgeAck(Boolean(v))} />
                  <label htmlFor="purge-ack" className="text-xs text-muted-foreground">
                    위 목록을 확인했으며, 완전 삭제에 동의합니다.
                  </label>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={purgeSubmitting}>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmPurge} disabled={purgeSubmitting || purgeLoading || !purgeAck || purgePreview.length === 0}>
                    {purgeSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    완전 삭제 실행
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
