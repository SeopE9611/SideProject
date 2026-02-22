'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Filter, MoreHorizontal, Trash2, Edit, Calendar, Plus, Users, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

// 임시 클래스 데이터
const classes = [
  {
    id: '1',
    name: '성인반',
    instructor: '김재민',
    schedule: '월/수/금 10:00-12:00',
    capacity: '10명',
    enrolled: 8,
    status: 'recruiting',
    level: '초급',
    location: '실내 코트 A',
  },
  {
    id: '2',
    name: '주니어반',
    instructor: '김재민',
    schedule: '화/목 16:00-18:00',
    capacity: '8명',
    enrolled: 8,
    status: 'closed',
    level: '중급',
    location: '실내 코트 B',
  },
  {
    id: '3',
    name: '성인반',
    instructor: '김재민',
    schedule: '월/수/금 19:00-21:00',
    capacity: '12명',
    enrolled: 9,
    status: 'recruiting',
    level: '중급',
    location: '실내 코트 C',
  },
  {
    id: '4',
    name: '주말 집중반',
    instructor: '김재민',
    schedule: '토/일 09:00-12:00',
    capacity: '10명',
    enrolled: 7,
    status: 'recruiting',
    level: '초급',
    location: '실외 코트 A',
  },
];

export default function ClassesPage() {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const allCheckboxRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (allCheckboxRef.current) {
      const input = allCheckboxRef.current.querySelector("input[type='checkbox']");
      if (input instanceof HTMLInputElement) {
        input.indeterminate = selectedClasses.length > 0 && selectedClasses.length < classes.length;
      }
    }
  }, [selectedClasses]);

  const handleSelectAll = () => {
    setSelectedClasses(classes.map((cls) => cls.id));
  };

  const handleSelectClass = (classId: string) => {
    setSelectedClasses((prevSelectedClasses) => {
      if (prevSelectedClasses.includes(classId)) {
        return prevSelectedClasses.filter((id) => id !== classId);
      } else {
        return [...prevSelectedClasses, classId];
      }
    });
  };

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase()) || cls.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cls.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-background to-card shadow-lg">
            <Calendar className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">클래스 관리</h1>
            <p className="mt-2 text-lg text-muted-foreground">테니스 클래스를 효율적으로 관리하고 운영하세요</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-0 bg-card shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">전체 클래스</p>
                <p className="text-3xl font-bold text-foreground">{classes.length}</p>
              </div>
              <div className="bg-primary dark:bg-primary rounded-xl p-3">
                <Calendar className="h-6 w-6 text-primary dark:text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">모집 중</p>
                <p className="text-3xl font-bold text-foreground">{classes.filter((c) => c.status === 'recruiting').length}</p>
              </div>
              <div className="bg-primary dark:bg-primary rounded-xl p-3">
                <Users className="h-6 w-6 text-primary dark:text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">마감</p>
                <p className="text-3xl font-bold text-foreground">{classes.filter((c) => c.status === 'closed').length}</p>
              </div>
              <div className="bg-destructive dark:bg-destructive rounded-xl p-3">
                <Clock className="h-6 w-6 text-destructive dark:text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 등록자</p>
                <p className="text-3xl font-bold text-foreground">{classes.reduce((sum, c) => sum + c.enrolled, 0)}</p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <Users className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-card shadow-lg backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-foreground">클래스 목록</CardTitle>
            <Button asChild variant="default" className="shadow-lg">
              <Link href="/admin/classes/new">
                <Plus className="mr-2 h-4 w-4" />
                클래스 등록
              </Link>
            </Button>
          </div>
        </CardHeader>
        <div className="fixed inset-0 bg-overlay/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center gap-6">
          <p className="text-primary-foreground text-2xl md:text-4xl font-semibold">이 기능은 사용하지 않습니다. (아카데미 클래스 관리)</p>
          <p className="text-lg text-muted-foreground">다시 활성화되기 전까지 이 기능은 사용할 수 없습니다.</p>
        </div>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full max-w-sm items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="클래스명 또는 강사명으로 검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 border-border focus:border-border focus:ring-ring" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] border-border">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="상태 필터" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="recruiting">모집 중</SelectItem>
                  <SelectItem value="closed">마감</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClasses.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary dark:bg-primary p-3">
              <span className="text-sm font-medium text-primary dark:text-primary">{selectedClasses.length}개의 클래스가 선택됨</span>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" className="h-8 border-border text-primary dark:text-primary hover:bg-primary dark:hover:bg-primary bg-transparent">
                  <Calendar className="mr-2 h-3.5 w-3.5" />
                  일정 변경
                </Button>
                <Button variant="destructive" size="sm" className="h-8">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  삭제
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-background dark:bg-card hover:bg-background dark:hover:bg-card">
                  <TableHead className="w-[50px]">
                    <Checkbox ref={allCheckboxRef} checked={selectedClasses.length === classes.length} onCheckedChange={handleSelectAll} aria-label="전체 선택" />
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">클래스명</TableHead>
                  <TableHead className="font-semibold text-foreground">강사명</TableHead>
                  <TableHead className="font-semibold text-foreground">요일 및 시간</TableHead>
                  <TableHead className="font-semibold text-foreground">장소</TableHead>
                  <TableHead className="font-semibold text-foreground">정원</TableHead>
                  <TableHead className="font-semibold text-foreground">상태</TableHead>
                  <TableHead className="w-[100px] font-semibold text-foreground">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => (
                    <TableRow key={cls.id} className="hover:bg-background dark:hover:bg-card transition-colors">
                      <TableCell>
                        <Checkbox checked={selectedClasses.includes(cls.id)} onCheckedChange={() => handleSelectClass(cls.id)} aria-label={`${cls.name} 선택`} />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-foreground">{cls.name}</span>
                          <Badge variant="outline" className="w-fit text-xs mt-1">
                            {cls.level}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{cls.instructor}</TableCell>
                      <TableCell className="text-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {cls.schedule}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {cls.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-medium">
                            {cls.enrolled}/{cls.capacity}
                          </span>
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted dark:bg-card">
                            <div
                              className={`h-full transition-all ${cls.status === 'closed' ? 'bg-destructive' : 'bg-primary'}`}
                              style={{
                                width: `${(Number(cls.enrolled) / Number(cls.capacity.replace('명', ''))) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={cls.status === 'recruiting' ? 'default' : 'secondary'}
                          className={
                            cls.status === 'recruiting'
                              ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary hover:bg-primary/20 dark:hover:bg-primary/30'
                              : 'bg-destructive dark:bg-destructive text-destructive dark:text-destructive hover:bg-destructive dark:hover:bg-destructive'
                          }
                        >
                          {cls.status === 'recruiting' ? '모집 중' : '마감'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background dark:hover:bg-card">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">메뉴 열기</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="cursor-pointer">상세 정보</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Calendar className="mr-2 h-4 w-4" />
                              일정 변경
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-primary cursor-pointer">{cls.status === 'recruiting' ? '마감으로 변경' : '모집 중으로 변경'}</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive cursor-pointer">
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">총 {filteredClasses.length}개의 클래스</div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled className="border-border bg-transparent">
                이전
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-border bg-transparent">
                1
              </Button>
              <Button variant="outline" size="sm" disabled className="border-border bg-transparent">
                다음
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
