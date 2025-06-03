'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Filter, MoreHorizontal, UserX, Trash2, Mail, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { showErrorToast, showSuccessToast, showToast } from '@/lib/toast';

// 임시 회원 데이터
const users = [
  {
    id: '1',
    name: '김재민',
    email: 'woals4800@gmail.com',
    joinDate: '2025-01-01',
    status: 'active',
    lastLogin: '2025-01-01',
    membershipType: '성인반',
  },
  {
    id: '2',
    name: '섭',
    email: 'pplo23@gmail.com',
    joinDate: '2025-01-01',
    status: 'inactive',
    lastLogin: '2025-01-01',
    membershipType: '주말반',
  },
];

export default function UsersPage() {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 전체 선택 여부와 일부 선택 여부 계산
  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;
  const isPartiallySelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  // 체크박스 DOM 요소를 참조할 ref 생성
  // ShadCN의 Checkbox 컴포넌트는 실제로 HTMLButtonElement로 타입이 잡혀 있음
  const allCheckboxRef = useRef<HTMLButtonElement>(null);

  // indeterminate 상태 설정: 일부만 선택되었을 경우 체크박스를 반쯤 체크된 것처럼 보이게 만듦
  useEffect(() => {
    if (allCheckboxRef.current) {
      // 실제 Checkbox 내부에 숨겨진 <input type="checkbox"> 요소를 찾아냄
      const input = allCheckboxRef.current.querySelector("input[type='checkbox']");

      // 그 input 요소가 존재하고 HTMLInputElement가 맞다면
      if (input instanceof HTMLInputElement) {
        // indeterminate 속성을 직접 DOM에 설정 (true 또는 false)
        input.indeterminate = isPartiallySelected;
      }
    }
  }, [isPartiallySelected]);

  // 전체 선택/해제 처리
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((user) => user.id));
    }
  };

  // 개별 선택/해제 처리
  const handleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // 필터링된 회원 목록
  const filteredUsers = users.filter((user) => {
    // 검색어 필터링
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());

    // 상태 필터링
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-7xl">
        {/* 페이지 제목 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">회원 관리</h1>
          <p className="mt-2 text-muted-foreground">가입한 모든 회원 정보를 확인하고 관리할 수 있습니다.</p>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input placeholder="이름 또는 이메일로 검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9" />
            <Button variant="outline" size="sm" className="h-9 px-3">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="상태 필터" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 선택된 항목에 대한 액션 */}
        {selectedUsers.length > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-muted p-2">
            <span className="text-sm font-medium">{selectedUsers.length}명의 회원이 선택됨</span>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="h-8">
                <Mail className="mr-2 h-3.5 w-3.5" />
                메일 발송
              </Button>
              <Button variant="outline" size="sm" className="h-8">
                <UserX className="mr-2 h-3.5 w-3.5" />
                비활성화
              </Button>
              <Button variant="destructive" size="sm" className="h-8">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                삭제
              </Button>
            </div>
          </div>
        )}

        {/* 회원 테이블 */}
        <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[50px]">
                    <Checkbox
                      ref={allCheckboxRef} // 위에서 만든 ref를 여기 연결
                      checked={isAllSelected} // 모두 선택됐는지 여부 (true/false)
                      onCheckedChange={handleSelectAll} // 클릭 시 전체 선택/해제 로직 수행
                      aria-label="전체 선택" // 접근성 개선용 텍스트
                    />
                  </TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>회원 유형</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead>마지막 로그인</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[100px]">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox checked={selectedUsers.includes(user.id)} onCheckedChange={() => handleSelectUser(user.id)} aria-label={`${user.name} 선택`} />
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.membershipType === '성인반' ? 'default' : user.membershipType === '주니어반' ? 'secondary' : 'outline'}>{user.membershipType}</Badge>
                      </TableCell>
                      <TableCell>{user.joinDate}</TableCell>
                      <TableCell>{user.lastLogin}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {user.status === 'active' ? (
                            <>
                              <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                              <span className="text-sm">활성</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-1.5 h-3.5 w-3.5 text-red-500" />
                              <span className="text-sm">비활성</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">메뉴 열기</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>상세 정보</DropdownMenuItem>
                            <DropdownMenuItem>메일 발송</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-amber-500">{user.status === 'active' ? '비활성화' : '활성화'}</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500">삭제</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={async () => {
              const previewRes = await fetch('/api/system/cleanup/preview');
              const preview = await previewRes.json();

              if (!Array.isArray(preview) || preview.length === 0) {
                showToast('삭제 예정인 탈퇴 회원이 없습니다.');
                return;
              }

              const previewText = preview.map((user: any) => `- ${user.name} (${user.email})`).join('\n');

              const ok = window.confirm(`삭제 예정 회원 (${preview.length}명):\n\n${previewText}\n\n정말 삭제하시겠습니까?`);
              if (!ok) return;

              const res = await fetch('/api/system/cleanup');
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
            className="mt-4"
            onClick={async () => {
              const previewRes = await fetch('/api/system/purge');
              const preview = await previewRes.json();

              if (!Array.isArray(preview) || preview.length === 0) {
                showToast('탈퇴한지 1년 이상이 된 계정이 없습니다.');
                return;
              }

              const previewText = preview.map((user: any) => `- ${user.name} (${user.email})`).join('\n');
              const ok = window.confirm(`삭제 예정 회원 (${preview.length}명):\n\n${previewText}\n\n정말 삭제하시겠습니까?`);
              if (!ok) return;

              const res = await fetch('/api/system/purge');
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

        {/* 페이지네이션 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">총 {filteredUsers.length}명의 회원</div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              이전
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              1
            </Button>
            <Button variant="outline" size="sm" disabled>
              다음
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
