'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Filter, MoreHorizontal, UserX, Trash2, Mail, CheckCircle, XCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast';
import AuthGuard from '@/components/auth/AuthGuard';
import { Card, CardContent } from '@/components/ui/card';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';

// 공용 fetcher
const LIMIT = 10;
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('불러오기 실패');
    return r.json();
  });

export default function UsersPage() {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  // 검색/필터/정렬
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [sort, setSort] = useState<'created_desc' | 'created_asc' | 'name_asc' | 'name_desc'>('created_desc');

  // getKey: 리뷰 리스트와 동일한 패턴
  const getKey = (index: number, prev: any) => {
    if (prev && prev.items.length < LIMIT) return null;
    const page = index + 1;
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (searchQuery.trim()) p.set('q', searchQuery.trim());
    if (roleFilter !== 'all') p.set('role', roleFilter);
    if (statusFilter !== 'all') p.set('status', statusFilter);
    if (sort) p.set('sort', sort);
    return `/api/admin/users?${p.toString()}`;
  };

  const { data, error, isValidating, size, setSize, mutate } = useSWRInfinite(getKey, fetcher, {
    revalidateFirstPage: true,
    revalidateOnFocus: false,
  });

  // 평탄화된 행
  const rows = (data ? data.flatMap((d: any) => d.items) : []) as Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'user' | 'admin';
    isDeleted: boolean;
    createdAt?: string;
    lastLoginAt?: string;
  }>;

  // ✅ rows 기반/total 기반 지표
  const totalCount = (data && data[0]?.total) ?? rows.length; // 총 회원수(가능하면 total 사용)
  const activeCount = rows.filter((u) => !u.isDeleted).length; // 현재 페이지 기준
  const deletedCount = rows.filter((u) => u.isDeleted).length; // 현재 페이지 기준

  const hasMore = data?.length ? data[data.length - 1].items.length === LIMIT : false;

  const isAllSelected = rows.length > 0 && selectedUsers.length === rows.length;
  const isPartiallySelected = selectedUsers.length > 0 && selectedUsers.length < rows.length;
  const allCheckboxRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (allCheckboxRef.current) {
      const input = allCheckboxRef.current.querySelector("input[type='checkbox']");
      if (input instanceof HTMLInputElement) {
        input.indeterminate = isPartiallySelected;
      }
    }
  }, [isPartiallySelected]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(rows.map((user) => user.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  return (
    <AuthGuard>
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center gap-6">
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-full p-4">
            <Users className="h-8 w-8 text-white" />
          </div>
          <p className="text-white text-xl sm:text-2xl md:text-4xl font-semibold">이 기능은 개발 중입니다</p>
          <p className="text-base sm:text-lg text-gray-300">회원 관리 기능이 곧 활성화됩니다</p>
        </div> */}

        <div className="mx-auto max-w-7xl">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 shadow-lg">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">회원 관리</h1>
                <p className="mt-1 sm:mt-2 text-base sm:text-lg text-gray-600 dark:text-gray-300">가입한 모든 회원 정보를 확인하고 관리할 수 있습니다</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-4 mb-6 sm:mb-8">
            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">전체 회원</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/50 rounded-xl p-3">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">활성 회원</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/50 rounded-xl p-3">
                    <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">비활성 회원</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{deletedCount}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/50 rounded-xl p-3">
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">성인반</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{users.filter((u) => u.membershipType === '성인반').length}</p>
                  </div>
                  <div className="bg-teal-50 dark:bg-teal-950/50 rounded-xl p-3">
                    <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                  </div>
                </div>
              </CardContent>
            </Card> */}
          </div>

          <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm mb-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full max-w-sm items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="이름 또는 이메일로 검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'deleted')}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <SelectValue placeholder="상태 필터" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 상태</SelectItem>
                      <SelectItem value="active">활성</SelectItem>
                      <SelectItem value="deleted">삭제됨</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedUsers.length > 0 && (
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-800">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedUsers.length}명의 회원이 선택됨</span>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button variant="outline" size="sm" className="bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                  <Mail className="mr-2 h-3.5 w-3.5" />
                  메일 발송
                </Button>
                <Button variant="outline" size="sm" className="bg-white dark:bg-gray-700 border-yellow-200 dark:border-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950/20">
                  <UserX className="mr-2 h-3.5 w-3.5" />
                  비활성화
                </Button>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  삭제
                </Button>
              </div>
            </div>
          )}

          <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm">
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700">
                    <TableHead className="w-[50px]">
                      <Checkbox ref={allCheckboxRef} checked={isAllSelected} onCheckedChange={handleSelectAll} aria-label="전체 선택" />
                    </TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>권한</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead>마지막 로그인</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="w-[100px]">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length > 0 ? (
                    rows.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {/* ✅ 1) 행 체크박스 칼럼 추가 (thead 첫 칼럼과 대응) */}
                        <TableCell className="w-[50px]">
                          <Checkbox checked={selectedUsers.includes(user.id)} onCheckedChange={() => handleSelectUser(user.id)} aria-label={`${user.name || '사용자'} 선택`} />
                        </TableCell>

                        {/* 나머지 칼럼은 기존 순서를 그대로 유지 */}
                        <TableCell className="font-medium">{user.name || '(이름없음)'}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="shrink-0">
                            {user.role === 'admin' ? '관리자' : '일반'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="whitespace-nowrap">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}</TableCell>
                        <TableCell className="w-[90px]">
                          {user.isDeleted ? (
                            <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
                              삭제됨
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              활성
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="w-[100px]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="작업">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/users/${user.id}`}>상세 보기</Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    /* ✅ 2) 빈 상태 colSpan을 8(헤더 칼럼 수)로 맞추기 */
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500">
                        검색 결과가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 space-y-2">
              <Button
                variant="destructive"
                onClick={async () => {
                  const previewRes = await fetch('/api/system/cleanup/preview', {
                    method: 'GET',
                  });
                  const preview = await previewRes.json();

                  if (!Array.isArray(preview) || preview.length === 0) {
                    showInfoToast('삭제 예정인 탈퇴 회원이 없습니다.');
                    return;
                  }

                  const previewText = preview.map((user: any) => `- ${user.name} (${user.email})`).join('\n');

                  const ok = window.confirm(`삭제 예정 회원 (${preview.length}명):\n\n${previewText}\n\n정말 삭제하시겠습니까?`);
                  if (!ok) return;

                  const res = await fetch('/api/system/cleanup', {
                    method: 'GET',
                  });
                  const data = await res.json();
                  if (res.ok) {
                    showSuccessToast(`삭제된 계정 수: ${data.deletedCount}`);
                  } else {
                    showErrorToast(`실패: ${data.message}`);
                  }
                }}
              >
                탈퇴 회원 자동 삭제 실행
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  const previewRes = await fetch('/api/system/purge', {
                    method: 'GET',
                    credentials: 'include', // NextAuth 세션 기반
                  });
                  const preview = await previewRes.json();

                  if (!Array.isArray(preview) || preview.length === 0) {
                    showInfoToast('탈퇴한지 1년 이상이 된 계정이 없습니다.');
                    return;
                  }

                  const previewText = preview.map((user: any) => `- ${user.name} (${user.email})`).join('\n');
                  const ok = window.confirm(`삭제 예정 회원 (${preview.length}명):\n\n${previewText}\n\n정말 삭제하시겠습니까?`);
                  if (!ok) return;

                  const res = await fetch('/api/system/purge', {
                    method: 'GET',
                    credentials: 'include', // NextAuth 세션 기반
                  });
                  const data = await res.json();
                  if (res.ok) {
                    showSuccessToast(`완전 삭제된 계정 수: ${data.deletedCount}`);
                  } else {
                    showErrorToast(`실패: ${data.message}`);
                  }
                }}
              >
                1년 이상 경과한 탈퇴 회원 완전 삭제
              </Button>
            </div>
          </Card>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">총 {totalCount}명의 회원</div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                이전
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                1
              </Button>
              <Button variant="outline" size="sm" disabled className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                다음
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
