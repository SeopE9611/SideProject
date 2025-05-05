"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpDown, ChevronDown, Filter, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"

// 게시판 유형 정의
const boardTypes = [
  { id: "notice", name: "공지사항", color: "default" },
  { id: "qna", name: "Q&A", color: "blue" },
  { id: "community", name: "커뮤니티", color: "green" },
  { id: "faq", name: "자주 묻는 질문", color: "amber" },
]

// 게시물 상태 정의
const postStatuses = [
  { id: "published", name: "게시됨", color: "green" },
  { id: "draft", name: "임시저장", color: "yellow" },
  { id: "hidden", name: "숨김", color: "gray" },
]

// 샘플 게시물 데이터
const posts = [
  {
    id: 1,
    title: "5월 스트링 할인 이벤트",
    author: "관리자",
    email: "admin@dokkaebi.com",
    boardType: "notice",
    category: "이벤트",
    status: "published",
    isPinned: true,
    commentCount: 0,
    viewCount: 245,
    createdAt: "2023-05-01T09:00:00",
  },
  {
    id: 2,
    title: "여름 아카데미 회원 모집",
    author: "관리자",
    email: "admin@dokkaebi.com",
    boardType: "notice",
    category: "아카데미",
    status: "published",
    isPinned: true,
    commentCount: 0,
    viewCount: 187,
    createdAt: "2023-05-10T11:30:00",
  },
  {
    id: 3,
    title: "스트링 장착 서비스 문의",
    author: "테니스러버",
    email: "tennis@example.com",
    boardType: "qna",
    category: "서비스",
    status: "published",
    isPinned: false,
    commentCount: 1,
    viewCount: 56,
    createdAt: "2023-05-05T14:22:00",
  },
  {
    id: 4,
    title: "주문 취소 가능한가요?",
    author: "초보자",
    email: "beginner@example.com",
    boardType: "qna",
    category: "주문/결제",
    status: "published",
    isPinned: false,
    commentCount: 0,
    viewCount: 32,
    createdAt: "2023-04-28T16:45:00",
  },
  {
    id: 5,
    title: "테니스 라켓 추천 부탁드립니다",
    author: "테니스마니아",
    email: "mania@example.com",
    boardType: "community",
    category: "장비추천",
    status: "published",
    isPinned: false,
    commentCount: 12,
    viewCount: 189,
    createdAt: "2023-05-12T08:15:00",
  },
  {
    id: 6,
    title: "테니스 초보 연습 방법",
    author: "테니스초보",
    email: "newbie@example.com",
    boardType: "community",
    category: "팁/노하우",
    status: "published",
    isPinned: false,
    commentCount: 8,
    viewCount: 156,
    createdAt: "2023-05-08T19:30:00",
  },
  {
    id: 7,
    title: "회원 등급은 어떻게 올라가나요?",
    author: "관리자",
    email: "admin@dokkaebi.com",
    boardType: "faq",
    category: "회원",
    status: "published",
    isPinned: false,
    commentCount: 0,
    viewCount: 78,
    createdAt: "2023-04-15T10:00:00",
  },
  {
    id: 8,
    title: "적립금 사용 방법",
    author: "관리자",
    email: "admin@dokkaebi.com",
    boardType: "faq",
    category: "적립금",
    status: "published",
    isPinned: false,
    commentCount: 0,
    viewCount: 92,
    createdAt: "2023-04-10T11:20:00",
  },
  {
    id: 9,
    title: "6월 휴무 안내",
    author: "관리자",
    email: "admin@dokkaebi.com",
    boardType: "notice",
    category: "공지",
    status: "draft",
    isPinned: false,
    commentCount: 0,
    viewCount: 0,
    createdAt: "2023-05-25T15:40:00",
  },
  {
    id: 10,
    title: "테니스 대회 후기",
    author: "대회참가자",
    email: "player@example.com",
    boardType: "community",
    category: "대회/이벤트",
    status: "hidden",
    isPinned: false,
    commentCount: 3,
    viewCount: 45,
    createdAt: "2023-05-20T20:15:00",
  },
]

export default function BoardsPage() {
  const [selectedPosts, setSelectedPosts] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [boardTypeFilter, setBoardTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // 모든 게시물 선택/해제
  const toggleSelectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([])
    } else {
      setSelectedPosts(filteredPosts.map((post) => post.id))
    }
  }

  // 개별 게시물 선택/해제
  const togglePostSelection = (postId: number) => {
    if (selectedPosts.includes(postId)) {
      setSelectedPosts(selectedPosts.filter((id) => id !== postId))
    } else {
      setSelectedPosts([...selectedPosts, postId])
    }
  }

  // 게시판 유형에 따른 배지 색상 가져오기
  const getBoardTypeBadge = (type: string) => {
    const boardType = boardTypes.find((b) => b.id === type)
    return boardType ? boardType.name : type
  }

  // 게시물 상태에 따른 배지 색상 가져오기
  const getStatusBadge = (status: string) => {
    const postStatus = postStatuses.find((s) => s.id === status)
    return postStatus ? postStatus.name : status
  }

  // 게시물 상태에 따른 배지 색상 가져오기
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500/20 text-green-500 hover:bg-green-500/30"
      case "draft":
        return "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
      case "hidden":
        return "bg-gray-500/20 text-gray-500 hover:bg-gray-500/30"
      default:
        return "bg-gray-500/20 text-gray-500 hover:bg-gray-500/30"
    }
  }

  // 게시판 유형에 따른 배지 색상 가져오기
  const getBoardTypeColor = (type: string) => {
    switch (type) {
      case "notice":
        return "bg-primary/20 text-primary hover:bg-primary/30"
      case "qna":
        return "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
      case "community":
        return "bg-green-500/20 text-green-500 hover:bg-green-500/30"
      case "faq":
        return "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
      default:
        return "bg-gray-500/20 text-gray-500 hover:bg-gray-500/30"
    }
  }

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // 필터링된 게시물 목록
  const filteredPosts = posts.filter((post) => {
    // 검색어 필터링
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.category.toLowerCase().includes(searchTerm.toLowerCase())

    // 게시판 유형 필터링
    const matchesBoardType = boardTypeFilter === "all" || post.boardType === boardTypeFilter

    // 상태 필터링
    const matchesStatus = statusFilter === "all" || post.status === statusFilter

    return matchesSearch && matchesBoardType && matchesStatus
  })

  return (
    <div className="p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">게시판 관리</h1>
            <p className="text-muted-foreground">웹사이트의 모든 게시판과 게시물을 관리합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/admin/boards/new">
                <Plus className="mr-2 h-4 w-4" />새 게시물
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/boards/categories">카테고리 관리</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>게시물 목록</CardTitle>
            <CardDescription>
              전체 게시물 {posts.length}개 중 {filteredPosts.length}개 표시 중
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Select value={boardTypeFilter} onValueChange={setBoardTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="게시판 유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>게시판 유형</SelectLabel>
                      <SelectItem value="all">전체 게시판</SelectItem>
                      {boardTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="게시물 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>게시물 상태</SelectLabel>
                      <SelectItem value="all">전체 상태</SelectItem>
                      {postStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="게시물 검색..."
                  className="w-full pl-8 sm:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {selectedPosts.length > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-muted p-2">
                <span className="text-sm font-medium">{selectedPosts.length}개 선택됨</span>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm">
                    상태 변경
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="모두 선택"
                      />
                    </TableHead>
                    <TableHead className="w-[80px]">번호</TableHead>
                    <TableHead className="w-[120px]">게시판</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead className="w-[120px]">카테고리</TableHead>
                    <TableHead className="w-[120px]">작성자</TableHead>
                    <TableHead className="w-[100px]">
                      <div className="flex items-center">
                        조회수
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[160px]">
                      <div className="flex items-center">
                        작성일
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[100px]">상태</TableHead>
                    <TableHead className="w-[80px]">고정</TableHead>
                    <TableHead className="w-[80px]">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center">
                        검색 결과가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPosts.includes(post.id)}
                            onCheckedChange={() => togglePostSelection(post.id)}
                            aria-label={`${post.title} 선택`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{post.id}</TableCell>
                        <TableCell>
                          <Badge className={getBoardTypeColor(post.boardType)} variant="outline">
                            {getBoardTypeBadge(post.boardType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Link href={`/admin/boards/${post.id}`} className="font-medium hover:underline">
                              {post.title}
                            </Link>
                            {post.commentCount > 0 && (
                              <Badge variant="outline" className="ml-2">
                                댓글 {post.commentCount}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{post.category}</TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-default">{post.author}</TooltipTrigger>
                              <TooltipContent>
                                <p>{post.email}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>{post.viewCount}</TableCell>
                        <TableCell>{formatDate(post.createdAt)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(post.status)} variant="outline">
                            {getStatusBadge(post.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={post.isPinned} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">메뉴 열기</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>작업</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Link href={`/admin/boards/${post.id}`} className="flex w-full">
                                  상세 보기
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href={`/admin/boards/${post.id}/edit`} className="flex w-full">
                                  수정
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Link href={`/admin/boards/${post.id}/comments`} className="flex w-full">
                                  댓글 관리
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">삭제</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">총 {filteredPosts.length}개 게시물</div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">페이지당 항목</p>
                  <Select defaultValue="10">
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent side="top">
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">1 / 1</div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="icon" disabled>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </Button>
                  <Button variant="outline" size="icon" disabled>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
