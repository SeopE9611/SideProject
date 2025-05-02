"use client"

import { useEffect, useRef, useState } from "react"
import { Search, Filter, MoreHorizontal, Trash2, Edit, Calendar, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// 임시 클래스 데이터
const classes = [
  {
    id: "1",
    name: "성인반",
    instructor: "김재민",
    schedule: "월/수/금 10:00-12:00",
    capacity: "10명",
    enrolled: 8,
    status: "recruiting", // recruiting, closed
    level: "초급",
    location: "실내 코트 A",
  },
  {
    id: "2",
    name: "주니어반",
    instructor: "김재민",
    schedule: "화/목 16:00-18:00",
    capacity: "8명",
    enrolled: 8,
    status: "closed",
    level: "중급",
    location: "실내 코트 B",
  },
  {
    id: "3",
    name: "성인반",
    instructor: "김재민",
    schedule: "월/수/금 19:00-21:00",
    capacity: "12명",
    enrolled: 9,
    status: "recruiting",
    level: "중급",
    location: "실내 코트 C",
  },
  {
    id: "4",
    name: "주말 집중반",
    instructor: "김재민",
    schedule: "토/일 09:00-12:00",
    capacity: "10명",
    enrolled: 7,
    status: "recruiting",
    level: "초급",
    location: "실외 코트 A",
  },
]

export default function ClassesPage() {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // 전체 선택 체크박스 상태
  const isAllSelected = classes.length > 0 && selectedClasses.length === classes.length
  const isPartiallySelected = selectedClasses.length > 0 && selectedClasses.length < classes.length

  const allCheckboxRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (allCheckboxRef.current) {
      const input = allCheckboxRef.current.querySelector("input[type='checkbox']")
      if (input instanceof HTMLInputElement) {
        input.indeterminate = isPartiallySelected
      }
    }
  }, [isPartiallySelected])

  // 전체 선택/해제 처리
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClasses([])
    } else {
      setSelectedClasses(classes.map((cls) => cls.id))
    }
  }

  // 개별 선택/해제 처리
  const handleSelectClass = (classId: string) => {
    if (selectedClasses.includes(classId)) {
      setSelectedClasses(selectedClasses.filter((id) => id !== classId))
    } else {
      setSelectedClasses([...selectedClasses, classId])
    }
  }

  // 필터링된 클래스 목록
  const filteredClasses = classes.filter((cls) => {
    // 검색어 필터링
    const matchesSearch =
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.instructor.toLowerCase().includes(searchQuery.toLowerCase())

    // 상태 필터링
    const matchesStatus = statusFilter === "all" || cls.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-7xl">
        {/* 페이지 제목 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">클래스 관리</h1>
          <p className="mt-2 text-muted-foreground">등록된 테니스 클래스를 확인하고 관리할 수 있습니다.</p>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              placeholder="클래스명 또는 강사명으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
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
                <SelectItem value="recruiting">모집 중</SelectItem>
                <SelectItem value="closed">마감</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-9" asChild>
              <Link href="/admin/classes/new">
                <Plus className="mr-2 h-4 w-4" />
                클래스 등록
              </Link>
            </Button>
          </div>
        </div>

        {/* 선택된 항목에 대한 액션 */}
        {selectedClasses.length > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-muted p-2">
            <span className="text-sm font-medium">{selectedClasses.length}개의 클래스가 선택됨</span>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="h-8">
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

        {/* 클래스 테이블 */}
        <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[50px]">
                    <Checkbox
                      ref={allCheckboxRef}
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="전체 선택"
                    />
                  </TableHead>
                  <TableHead>클래스명</TableHead>
                  <TableHead>강사명</TableHead>
                  <TableHead>요일 및 시간</TableHead>
                  <TableHead>장소</TableHead>
                  <TableHead>정원</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[100px]">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => (
                    <TableRow key={cls.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedClasses.includes(cls.id)}
                          onCheckedChange={() => handleSelectClass(cls.id)}
                          aria-label={`${cls.name} 선택`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{cls.name}</span>
                          <span className="text-xs text-muted-foreground">{cls.level}</span>
                        </div>
                      </TableCell>
                      <TableCell>{cls.instructor}</TableCell>
                      <TableCell>{cls.schedule}</TableCell>
                      <TableCell>{cls.location}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span>
                            {cls.enrolled}/{cls.capacity}
                          </span>
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full ${cls.status === "closed" ? "bg-red-500" : "bg-green-500"}`}
                              style={{
                                width: `${(Number(cls.enrolled) / Number(cls.capacity.replace("명", ""))) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={cls.status === "recruiting" ? "default" : "secondary"}
                          className={cls.status === "recruiting" ? "bg-green-500" : "bg-red-500"}
                        >
                          {cls.status === "recruiting" ? "모집 중" : "마감"}
                        </Badge>
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
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="mr-2 h-4 w-4" />
                              일정 변경
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-amber-500">
                              {cls.status === "recruiting" ? "마감으로 변경" : "모집 중으로 변경"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500">
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
                    <TableCell colSpan={8} className="h-24 text-center">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 페이지네이션 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">총 {filteredClasses.length}개의 클래스</div>
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
  )
}
