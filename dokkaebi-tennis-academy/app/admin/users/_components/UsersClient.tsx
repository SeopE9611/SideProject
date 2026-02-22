'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, MoreHorizontal, Copy, Mail, UserX, UserCheck, Trash2, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown, ChevronsLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import UserPointsDialog from '@/app/admin/users/_components/UserPointsDialog';
import { FiltersSection } from '@/app/admin/users/_components/users-client/FiltersSection';
import { TableSection } from '@/app/admin/users/_components/users-client/TableSection';
import { BulkActionsSection } from '@/app/admin/users/_components/users-client/BulkActionsSection';
import { DialogsSection } from '@/app/admin/users/_components/users-client/DialogsSection';
import { UsersKpiCards } from '@/app/admin/users/_components/users-client/UsersKpiCards';
import { useUserList } from '@/app/admin/users/_hooks/useUserList';
import type { UserCleanupPreviewCandidateDto } from '@/types/admin/users';
import { STATUS, badgeSm, buildPageItems, fullAddress, roleColors, shortAddress, splitDateTime, td, th, type UserStatusKey } from '@/app/admin/users/_lib/usersClientUtils';
import { useAdminListQueryState } from '@/lib/admin/useAdminListQueryState';
import { adminFetcher, adminMutator, getAdminErrorMessage } from '@/lib/admin/adminFetcher';
import { runAdminActionWithToast } from '@/lib/admin/adminActionHelpers';

interface BulkActionResponse {
  message?: string;
  modifiedCount?: number;
  skipped?: {
    already?: string[];
    incompatible?: string[];
  };
}

interface AdminDeleteResponse {
  deletedCount?: number;
  message?: string;
  previewHash?: string;
}

interface SystemActionPreviewResponse {
  candidates?: unknown;
  previewHash?: string;
  requestHash?: string;
  confirmationToken?: string;
  reconfirmText?: string;
}

interface UsersListCounters {
  active?: number;
  deleted?: number;
  admins?: number;
  suspended?: number;
  total?: number;
}

interface UsersListPayload {
  counters?: UsersListCounters;
}

const asPreviewCandidates = (value: unknown): UserCleanupPreviewCandidateDto[] =>
  Array.isArray(value)
    ? value.map((item) => ({
      _id: typeof item === 'object' && item && '_id' in item ? String((item as { _id?: unknown })._id ?? '') : '',
      name: typeof item === 'object' && item && 'name' in item && typeof (item as { name?: unknown }).name === 'string' ? (item as { name: string }).name : undefined,
      email: typeof item === 'object' && item && 'email' in item && typeof (item as { email?: unknown }).email === 'string' ? (item as { email: string }).email : undefined,
    }))
    : [];


export default function UsersClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 서버 페이징 & 필터
  const [limit] = useState(10);
  const { state, patchState, setPage } = useAdminListQueryState<{
    page: number;
    searchQuery: string;
    roleFilter: 'all' | 'user' | 'admin';
    statusFilter: 'all' | 'active' | 'deleted' | 'suspended';
    loginFilter: 'all' | 'nologin' | 'recent30' | 'recent90';
    signupFilter: 'all' | 'local' | 'kakao' | 'naver';
    sort: 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';
  }>({
    pathname: pathname || '/admin/users',
    searchParams,
    replace: router.replace,
    defaults: {
      page: 1,
      searchQuery: '',
      roleFilter: 'all',
      statusFilter: 'all',
      loginFilter: 'all',
      signupFilter: 'all',
      sort: 'created_desc',
    },
    parse: (params, defaults) => {
      const role = params.get('role');
      const status = params.get('status');
      const login = params.get('login');
      const signup = params.get('signup');
      const sort = params.get('sort');
      return {
        page: Math.max(1, Number.parseInt(params.get('page') || String(defaults.page), 10) || defaults.page),
        searchQuery: params.get('q') || defaults.searchQuery,
        roleFilter: role === 'all' || role === 'user' || role === 'admin' ? role : defaults.roleFilter,
        statusFilter: status === 'all' || status === 'active' || status === 'deleted' || status === 'suspended' ? status : defaults.statusFilter,
        loginFilter: login === 'all' || login === 'nologin' || login === 'recent30' || login === 'recent90' ? login : defaults.loginFilter,
        signupFilter: signup === 'all' || signup === 'local' || signup === 'kakao' || signup === 'naver' ? signup : defaults.signupFilter,
        sort: sort === 'created_desc' || sort === 'created_asc' || sort === 'name_asc' || sort === 'name_desc' ? sort : defaults.sort,
      };
    },
    toQueryParams: (queryState) => ({
      page: queryState.page === 1 ? undefined : queryState.page,
      q: queryState.searchQuery.trim(),
      role: queryState.roleFilter,
      status: queryState.statusFilter,
      login: queryState.loginFilter,
      signup: queryState.signupFilter,
      sort: queryState.sort,
    }),
    pageResetKeys: ['searchQuery', 'roleFilter', 'statusFilter', 'loginFilter', 'signupFilter', 'sort'],
  });

  const { page, searchQuery, roleFilter, signupFilter, sort, statusFilter, loginFilter } = state;

  const { data, error, isLoading, mutate, rows, total } = useUserList({
    page,
    limit,
    searchQuery,
    roleFilter,
    statusFilter,
    loginFilter,
    signupFilter,
    sort,
  });

  // 선택된 사용자 ID 목록 상태
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    setSelectedUsers([]);
  }, [searchQuery, roleFilter, statusFilter, loginFilter, signupFilter, sort]);

  // 포인트(적립금) 다이얼로그 상태
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [pointsTarget, setPointsTarget] = useState<{ id: string; name?: string } | null>(null);

  // 유저별 포인트 다이얼로그 열기
  const openPointsDialog = (userId: string, userName?: string) => {
    setPointsTarget({ id: userId, name: userName });
    setPointsDialogOpen(true);
  };

  // 선택된 행의 현재 상태를 계산
  const selectedRows = useMemo(() => (selectedUsers.length ? rows.filter((r) => selectedUsers.includes(r.id)) : []), [rows, selectedUsers]);

  // 각각 가능 여부
  const canSuspend = useMemo(() => selectedRows.some((u) => !u.isDeleted && !u.isSuspended), [selectedRows]);
  const canUnsuspend = useMemo(() => selectedRows.some((u) => !u.isDeleted && u.isSuspended), [selectedRows]);
  const hasSelection = selectedUsers.length > 0;
  const canSoftDelete = useMemo(() => selectedRows.some((u) => !u.isDeleted), [selectedRows]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageItems = buildPageItems(page, totalPages);

  const kpiValues = useMemo(() => {
    const counters = (data as UsersListPayload | undefined)?.counters;

    return {
      active: counters?.active ?? rows.filter((u) => !u.isDeleted && !u.isSuspended).length,
      deleted: counters?.deleted ?? rows.filter((u) => u.isDeleted).length,
      admins: counters?.admins ?? rows.filter((u) => u.role === 'admin').length,
      suspended: counters?.suspended ?? rows.filter((u) => u.isSuspended && !u.isDeleted).length,
      total: counters?.total ?? total,
    };
  }, [data, rows, total]);

  const kpiStatus = useMemo<'loading' | 'error' | 'ready'>(() => {
    if (isLoading && !data) return 'loading';
    if (error) return 'error';
    return 'ready';
  }, [data, error, isLoading]);

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
      const json = await adminMutator<BulkActionResponse>('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: suspend ? 'suspend' : 'unsuspend', ids: selectedUsers }),
      });

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
    } catch (e: unknown) {
      showErrorToast(getAdminErrorMessage(e));
    }
  };

  // 삭제(소프트 삭제)
  const bulkSoftDelete = async () => {
    try {
      const json = await adminMutator<BulkActionResponse>('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'softDelete', ids: selectedUsers }),
      });

      const modified = Number(json.modifiedCount || 0);
      const alreadyCnt = Array.isArray(json?.skipped?.already) ? json.skipped.already.length : 0;

      if (modified > 0) showSuccessToast(`삭제(탈퇴) ${modified}건 완료`);
      if (alreadyCnt > 0) showInfoToast(`${alreadyCnt}건은 이미 삭제 상태여서 건너뜀`);
      if (modified === 0 && alreadyCnt > 0) showInfoToast('변경된 항목이 없습니다.');

      setSelectedUsers([]);
      mutate?.();
    } catch (e: unknown) {
      showErrorToast(getAdminErrorMessage(e));
    }
  };
  const [softDeleteDialogOpen, setSoftDeleteDialogOpen] = useState(false);

  // --- Cleanup(7일) 모달 상태 ---
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<UserCleanupPreviewCandidateDto[]>([]);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupSubmitting, setCleanupSubmitting] = useState(false);
  const [cleanupAck, setCleanupAck] = useState(false);
  const [cleanupPreviewHash, setCleanupPreviewHash] = useState('');
  const [cleanupRequestHash, setCleanupRequestHash] = useState('');
  const [cleanupConfirmationToken, setCleanupConfirmationToken] = useState('');
  const [cleanupExpectedText, setCleanupExpectedText] = useState('');
  const [cleanupConfirmText, setCleanupConfirmText] = useState('');

  // --- Purge(1년) 모달 상태 ---
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgePreview, setPurgePreview] = useState<UserCleanupPreviewCandidateDto[]>([]);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeSubmitting, setPurgeSubmitting] = useState(false);
  const [purgeAck, setPurgeAck] = useState(false);
  const [purgePreviewHash, setPurgePreviewHash] = useState('');
  const [purgeRequestHash, setPurgeRequestHash] = useState('');
  const [purgeConfirmationToken, setPurgeConfirmationToken] = useState('');
  const [purgeExpectedText, setPurgeExpectedText] = useState('');
  const [purgeConfirmText, setPurgeConfirmText] = useState('');

  // --- 미리보기 요청 ---
  const fetchCleanupPreview = async () => {
    setCleanupLoading(true);
    try {
      const json = await adminFetcher<SystemActionPreviewResponse>('/api/admin/system/cleanup/preview');
      setCleanupPreview(asPreviewCandidates(json?.candidates));
      setCleanupPreviewHash(typeof json?.previewHash === 'string' ? json.previewHash : '');
      setCleanupRequestHash(typeof json?.requestHash === 'string' ? json.requestHash : '');
      setCleanupConfirmationToken(typeof json?.confirmationToken === 'string' ? json.confirmationToken : '');
      setCleanupExpectedText(typeof json?.reconfirmText === 'string' ? json.reconfirmText : '');
    } catch {
      setCleanupPreview([]);
      setCleanupPreviewHash('');
      setCleanupRequestHash('');
      setCleanupConfirmationToken('');
      setCleanupExpectedText('');
    } finally {
      setCleanupLoading(false);
    }
  };

  const fetchPurgePreview = async () => {
    setPurgeLoading(true);
    try {
      const json = await adminFetcher<SystemActionPreviewResponse>('/api/admin/system/purge/preview');
      setPurgePreview(asPreviewCandidates(json?.candidates));
      setPurgePreviewHash(typeof json?.previewHash === 'string' ? json.previewHash : '');
      setPurgeRequestHash(typeof json?.requestHash === 'string' ? json.requestHash : '');
      setPurgeConfirmationToken(typeof json?.confirmationToken === 'string' ? json.confirmationToken : '');
      setPurgeExpectedText(typeof json?.reconfirmText === 'string' ? json.reconfirmText : '');
    } catch {
      setPurgePreview([]);
      setPurgePreviewHash('');
      setPurgeRequestHash('');
      setPurgeConfirmationToken('');
      setPurgeExpectedText('');
    } finally {
      setPurgeLoading(false);
    }
  };

  // --- 실행(DELETE): dry-run 선검증 -> execute 확정 실행 ---
  const confirmCleanup = async () => {
    console.info('[admin-confirm-dialog]', { event: 'confirm', eventKey: 'admin-users-cleanup', count: cleanupPreview.length });
    setCleanupSubmitting(true);
    try {
      const dryRun = await runAdminActionWithToast<AdminDeleteResponse>({
        action: () =>
          adminMutator('/api/admin/system/cleanup', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'dry-run' }),
          }),
        fallbackErrorMessage: '삭제 대상 검증 실패',
      });

      if (!dryRun) return;

      if (!dryRun.previewHash || dryRun.previewHash !== cleanupPreviewHash || cleanupRequestHash !== cleanupPreviewHash) {
        showErrorToast('미리보기 대상이 변경되었습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.');
        await fetchCleanupPreview();
        return;
      }

      const json = await runAdminActionWithToast<AdminDeleteResponse>({
        action: () =>
          adminMutator('/api/admin/system/cleanup', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'execute',
              previewHash: cleanupPreviewHash,
              requestHash: cleanupRequestHash,
              confirmationToken: cleanupConfirmationToken,
              confirmationText: cleanupConfirmText,
            }),
          }),
        fallbackErrorMessage: '삭제 실패',
      });
      if (json) {
        showSuccessToast(`삭제된 계정 수: ${json.deletedCount ?? 0}`);
        setCleanupOpen(false);
        setCleanupAck(false);
        setCleanupConfirmText('');
        mutate?.();
      }
    } finally {
      setCleanupSubmitting(false);
    }
  };

  const confirmPurge = async () => {
    console.info('[admin-confirm-dialog]', { event: 'confirm', eventKey: 'admin-users-purge', count: purgePreview.length });
    setPurgeSubmitting(true);
    try {
      const dryRun = await runAdminActionWithToast<AdminDeleteResponse>({
        action: () =>
          adminMutator('/api/admin/system/purge', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'dry-run' }),
          }),
        fallbackErrorMessage: '완전 삭제 대상 검증 실패',
      });

      if (!dryRun) return;

      if (!dryRun.previewHash || dryRun.previewHash !== purgePreviewHash || purgeRequestHash !== purgePreviewHash) {
        showErrorToast('미리보기 대상이 변경되었습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.');
        await fetchPurgePreview();
        return;
      }

      const json = await runAdminActionWithToast<AdminDeleteResponse>({
        action: () =>
          adminMutator('/api/admin/system/purge', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'execute',
              previewHash: purgePreviewHash,
              requestHash: purgeRequestHash,
              confirmationToken: purgeConfirmationToken,
              confirmationText: purgeConfirmText,
            }),
          }),
        fallbackErrorMessage: '완전 삭제 실패',
      });
      if (json) {
        showSuccessToast(`완전 삭제된 계정 수: ${json.deletedCount ?? 0}`);
        setPurgeOpen(false);
        setPurgeAck(false);
        setPurgeConfirmText('');
        mutate?.();
      }
    } finally {
      setPurgeSubmitting(false);
    }
  };



  return (
    <>
      <UsersKpiCards status={kpiStatus} values={kpiValues} />

      <FiltersSection>{/* 검색/필터 바 */}
      <div className="border-0 bg-card/80 shadow-lg backdrop-blur-sm rounded-xl p-4 sm:p-6 mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이름/이메일/전화 검색"
              value={searchQuery}
              onChange={(e) => patchState({ searchQuery: e.target.value })}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* 상태 */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                if (v === 'all' || v === 'active' || v === 'deleted' || v === 'suspended') patchState({ statusFilter: v });
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
                if (v === 'all' || v === 'user' || v === 'admin') patchState({ roleFilter: v });
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

            {/* 가입유형 (SNS) */}
            <Select
              value={signupFilter}
              onValueChange={(v) => {
                patchState({ signupFilter: v as 'all' | 'local' | 'kakao' | 'naver' });
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="가입유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">가입유형 전체</SelectItem>
                <SelectItem value="local">일반 가입</SelectItem>
                <SelectItem value="kakao">카카오 가입</SelectItem>
                <SelectItem value="naver">네이버 가입</SelectItem>
              </SelectContent>
            </Select>

            {/* 로그인 필터 */}
            <Select
              value={loginFilter}
              onValueChange={(v) => {
                patchState({ loginFilter: v as 'all' | 'nologin' | 'recent30' | 'recent90' });
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="로그인" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">로그인 전체</SelectItem>
                <SelectItem value="recent30">최근 30일 로그인</SelectItem>
                <SelectItem value="recent90">최근 90일 로그인</SelectItem>
                <SelectItem value="nologin">미로그인</SelectItem>
              </SelectContent>
            </Select>

            {/* 정렬 */}
            <Select
              value={sort}
              onValueChange={(v) => {
                if (v === 'created_desc' || v === 'created_asc' || v === 'name_asc' || v === 'name_desc') patchState({ sort: v });
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

      </FiltersSection>

      <BulkActionsSection>
      {/* 선택 액션바 */}
      {selectedUsers.length > 0 && (
        <div className="mb-3 rounded-md bg-primary dark:bg-primary border border-border p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary dark:text-primary">{selectedUsers.length}명의 회원이 선택됨</span>
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

              <Button variant="destructive" size="sm" onClick={() => setSoftDeleteDialogOpen(true)} disabled={!canSoftDelete} title={!canSoftDelete ? '선택 항목이 이미 삭제 상태입니다' : undefined}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                삭제
              </Button>
            </div>
          </div>

          {((canSuspend && canUnsuspend) || hasDeletedSelected) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {canSuspend && canUnsuspend && (
                <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2 py-1 text-primary dark:text-primary">
                    <UserCheck className="h-3.5 w-3.5" />
                    활성화 가능 {selectedRows.filter((u) => !u.isDeleted && u.isSuspended).length}건
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2 py-1 text-primary dark:text-primary">
                    <UserX className="h-3.5 w-3.5" />
                    비활성화 가능 {selectedRows.filter((u) => !u.isDeleted && !u.isSuspended).length}건
                  </span>
                </>
              )}

              {/* 삭제 선택 시: 경고 칩 */}
              {hasDeletedSelected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-1 text-primary dark:text-primary">
                  <AlertCircle className="h-3.5 w-3.5" />
                  삭제(탈퇴)된 회원은 복구할 수 없습니다. 재가입만 가능합니다.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      </BulkActionsSection>

      <TableSection>
      <div className="border-0 bg-card/80 shadow-lg backdrop-blur-sm rounded-xl max-w-[1120px] mx-auto">
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4">
          <h2 className="text-lg font-semibold text-foreground">회원 목록</h2>
          <p className="text-sm text-muted-foreground">총 {total}명의 회원</p>
        </div>

        <div className="relative overflow-x-hidden px-3 sm:px-4 pb-3">
          <div className="relative rounded-2xl border border-border shadow-sm min-w-0">
            <Table className="w-full table-fixed border-separate [border-spacing-block:0.35rem] [border-spacing-inline:0] text-xs [&_th]:text-center [&_td]:text-center" aria-busy={isLoading && rows.length === 0}>
              {/* 열 폭 고정: 체크 / 회원 / 권한 / 전화 / 주소 / 활동 / 상태 / 작업 */}
              <colgroup>
                <col style={{ width: '40px' }} />
                <col style={{ width: '220px' }} />
                <col style={{ width: '72px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '280px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '64px' }} />
                <col style={{ width: '44px' }} />
              </colgroup>
              <TableHeader className="sticky top-0 z-10 bg-background backdrop-blur shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]">
                <TableRow>
                  <TableHead className={cn(th, 'w-[40px] px-0')}>
                    <Checkbox ref={allCheckboxRef} checked={isAllSelected} onCheckedChange={() => handleSelectAll()} aria-label="전체 선택" className="mx-auto" />
                  </TableHead>
                  <TableHead className={cn(th, 'w-[220px]')}>회원</TableHead>
                  <TableHead className={cn(th, 'w-[72px]')}>권한</TableHead>
                  <TableHead className={cn(th, 'w-[110px]')}>전화</TableHead>
                  <TableHead className={cn(th, 'w-[280px]')}>주소</TableHead>
                  {/* 가입일 + 마지막 로그인 병합 */}
                  <TableHead className={cn(th, 'w-[150px]')}>활동(가입/로그인)</TableHead>
                  <TableHead className={cn(th, 'w-[64px] px-0')}>상태</TableHead>
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
                        <div className="h-4 w-4 mx-auto rounded bg-muted" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-3.5 w-40 mx-auto rounded bg-muted" />
                        <div className="h-3 w-28 mx-auto mt-1 rounded bg-muted" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-4 w-10 mx-auto rounded-full bg-muted" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-3.5 w-24 mx-auto rounded bg-muted" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-3.5 w-48 mx-auto rounded bg-muted" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-3.5 w-28 mx-auto rounded bg-muted" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-4 w-10 mx-auto rounded-full bg-muted" />
                      </TableCell>
                      <TableCell className={td}>
                        <div className="h-5 w-5 mx-auto rounded bg-muted" />
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
                      <TableRow key={u.id} className="hover:bg-primary/5 transition-colors even:bg-muted/40">
                        {/* 선택 */}
                        <TableCell className={cn(td, 'w-[40px] px-0')}>
                          <Checkbox checked={selectedUsers.includes(u.id)} onCheckedChange={() => handleSelectUser(u.id)} aria-label={`${u.name || '사용자'} 선택`} className="mx-auto" />
                        </TableCell>

                        {/* 회원: 이름/이메일 두 줄 + 복사 */}
                        <TableCell className={cn(td, 'w-[220px]')}>
                          <div className="min-w-0 flex flex-col items-center text-center mx-auto max-w-[200px]">
                            <span className="font-medium truncate">{u.name || '(이름없음)'}</span>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
                              <span className="truncate">{u.email}</span>
                              <button className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-background" onClick={() => copy(u.email)} title="복사" aria-label="이메일 복사">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            {/* 소셜 배지: 카카오/네이버 */}
                            {Array.isArray(u.socialProviders) && u.socialProviders.length > 0 && (
                              <div className="mt-1 flex items-center gap-1">
                                {/* 브랜드 예외: 소셜 로그인 연동 상태 뱃지는 각 브랜드 식별 색상을 유지합니다. */}
                                {u.socialProviders.includes('kakao') && <Badge className="bg-[#FEE500] text-[#191919] hover:bg-[#FDD835] border-0 text-[10px] h-5 px-2">카카오</Badge>}
                                {u.socialProviders.includes('naver') && <Badge className="bg-[#03C75A] text-primary-foreground hover:bg-[#02B350] border-0 text-[10px] h-5 px-2">네이버</Badge>}
                              </div>
                            )}
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
                              <button className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-background" onClick={() => copy(u.phone!)} title="복사" aria-label="전화번호 복사">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* 주소: 요약 + 복사, 전체는 title로 */}
                        <TableCell className={cn(td, 'w-[280px]')} title={fullAddress(u.postalCode, u.address, u.addressDetail)}>
                          <div className="min-w-0 flex items-center justify-center gap-1">
                            <span className="truncate block max-w-[250px]">{shortAddress(u.address)}</span>
                            <button
                              className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-background"
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
                        <TableCell className={cn(td, 'w-[64px] whitespace-nowrap px-0')}>
                          <div className="flex justify-center">
                            <Badge className={cn(badgeSm, STATUS[statusKey])}>{statusKey === 'active' ? '활성' : statusKey === 'suspended' ? '비활성' : '삭제됨'}</Badge>
                          </div>
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
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  openPointsDialog(u.id, u.name);
                                }}
                              >
                                포인트 내역/조정
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

      </TableSection>

      <DialogsSection>
      <div className="mt-6">
        <Card className="border-destructive dark:border-destructive bg-destructive dark:bg-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive dark:text-destructive text-sm">탈퇴 회원 정리 (Danger zone)</CardTitle>
            <CardDescription className="text-xs">7일 경과 탈퇴 계정은 정리, 1년 경과 탈퇴 계정은 완전 삭제합니다. 실행 전 미리보기 목록을 확인하세요.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {/* 탈퇴 회원 자동 삭제 실행 (7일 경과) */}
            <AlertDialog
              open={cleanupOpen}
              onOpenChange={(o) => {
                setCleanupOpen(o);
                console.info('[admin-confirm-dialog]', { event: o ? 'open' : 'cancel', eventKey: 'admin-users-cleanup' });
                if (o) {
                  setCleanupAck(false);
                  setCleanupConfirmText('');
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
                  <AlertDialogDescription>{`영향 개수: ${cleanupPreview.length}개 계정\n탈퇴 후 7일이 지난 계정을 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}</AlertDialogDescription>
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
                      {cleanupPreview.map((u) => (
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

                <div className="mt-3 space-y-1">
                  <label htmlFor="cleanup-reconfirm" className="text-xs text-muted-foreground">
                    재확인 문구 입력: <span className="font-mono">{cleanupExpectedText || '-'}</span>
                  </label>
                  <Input
                    id="cleanup-reconfirm"
                    value={cleanupConfirmText}
                    onChange={(e) => setCleanupConfirmText(e.target.value)}
                    placeholder={cleanupExpectedText || '재확인 문구'}
                    autoComplete="off"
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={cleanupSubmitting}>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmCleanup}
                    disabled={cleanupSubmitting || cleanupLoading || !cleanupAck || cleanupPreview.length === 0 || !cleanupPreviewHash || !cleanupRequestHash || cleanupConfirmText.trim() !== cleanupExpectedText}
                  >
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
                console.info('[admin-confirm-dialog]', { event: o ? 'open' : 'cancel', eventKey: 'admin-users-purge' });
                if (o) {
                  setPurgeAck(false);
                  setPurgeConfirmText('');
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
                  <AlertDialogDescription>{`영향 개수: ${purgePreview.length}개 계정\n탈퇴 1년 경과 계정을 완전 삭제합니다. 이 작업은 되돌릴 수 없습니다.\n실행 전 재확인 문구("${purgeExpectedText || '-'}")를 정확히 입력해야 합니다.`}</AlertDialogDescription>
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
                      {purgePreview.map((u) => (
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

                <div className="mt-3 space-y-1">
                  <label htmlFor="purge-reconfirm" className="text-xs text-muted-foreground">
                    재확인 문구 입력: <span className="font-mono">{purgeExpectedText || '-'}</span>
                  </label>
                  <Input
                    id="purge-reconfirm"
                    value={purgeConfirmText}
                    onChange={(e) => setPurgeConfirmText(e.target.value)}
                    placeholder={purgeExpectedText || '재확인 문구'}
                    autoComplete="off"
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={purgeSubmitting}>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmPurge}
                    disabled={purgeSubmitting || purgeLoading || !purgeAck || purgePreview.length === 0 || !purgePreviewHash || !purgeRequestHash || purgeConfirmText.trim() !== purgeExpectedText}
                  >
                    {purgeSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    완전 삭제 실행
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
      </DialogsSection>
      <AdminConfirmDialog
        open={softDeleteDialogOpen}
        onOpenChange={setSoftDeleteDialogOpen}
        onConfirm={() => {
          setSoftDeleteDialogOpen(false);
          void bulkSoftDelete();
        }}
        title="회원 삭제(탈퇴) 처리 확인"
        description={`영향 개수: ${selectedUsers.length}명\n선택한 회원을 삭제(탈퇴) 상태로 변경합니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제(탈퇴) 처리"
        severity="danger"
        eventKey="admin-users-soft-delete"
        eventMeta={{ selectedCount: selectedUsers.length }}
      />
      <UserPointsDialog open={pointsDialogOpen} onOpenChange={setPointsDialogOpen} userId={pointsTarget?.id ?? null} userName={pointsTarget?.name} />
    </>
  );
}
