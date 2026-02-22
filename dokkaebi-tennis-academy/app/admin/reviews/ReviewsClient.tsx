'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Search, Star, Trash2, Eye, MessageSquare, TrendingUp, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

// 리뷰 데이터 타입 정의
interface Review {
  id: string;
  authorName: string;
  authorEmail: string;
  content: string;
  rating: number;
  createdAt: string;
  type: 'lesson' | 'stringing' | 'product';
  productName?: string;
}

// 샘플 리뷰 데이터
const sampleReviews: Review[] = [
  {
    id: 'rev_001',
    authorName: '김재민',
    authorEmail: 'tennis@example.com',
    content: '코치님의 지도가 매우 친절하고 전문적이었습니다. 기본기부터 차근차근 알려주셔서 실력이 많이 향상되었어요. 다음 시즌에도 꼭 등록하고 싶습니다.',
    rating: 5,
    createdAt: '2025-01-01T09:30:00Z',
    type: 'lesson',
  },
  {
    id: 'rev_002',
    authorName: '김재민',
    authorEmail: 'tennis@example.com',
    content: '스트링 장력이 제가 원하는 대로 정확하게 맞춰주셨어요. 타구감이 확실히 좋아졌습니다.',
    rating: 4,
    createdAt: '2025-01-01T09:30:00Z',
    type: 'stringing',
  },
  {
    id: 'rev_003',
    authorName: '김재민',
    authorEmail: 'tennis@example.com',
    content: '그룹 레슨이 너무 재미있었어요. 다른 회원들과 함께 배우면서 동기부여도 되고 좋았습니다.',
    rating: 5,
    createdAt: '2025-01-01T09:30:00Z',
    type: 'lesson',
  },
  {
    id: 'rev_004',
    authorName: '섭',
    authorEmail: 'seop@example.com',
    content: '스트링 교체 후 공이 너무 튕겨서 컨트롤이 어려웠어요. 다음에는 좀 더 낮은 장력으로 부탁드립니다.',
    rating: 3,
    createdAt: '2025-01-01T09:30:00Z',
    type: 'stringing',
  },
];

export default function ReviewsClient() {
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 검색어로 필터링된 리뷰 목록
  const filteredReviews = sampleReviews.filter(
    (review) => review.authorName.toLowerCase().includes(searchTerm.toLowerCase()) || review.content.toLowerCase().includes(searchTerm.toLowerCase()) || review.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 체크박스 전체 선택/해제 처리
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviews(filteredReviews.map((review) => review.id));
    } else {
      setSelectedReviews([]);
    }
  };

  // 개별 체크박스 선택/해제 처리
  const handleSelectOne = (reviewId: string, checked: boolean) => {
    if (checked) {
      setSelectedReviews((prev) => [...prev, reviewId]);
    } else {
      setSelectedReviews((prev) => prev.filter((id) => id !== reviewId));
    }
  };

  // 리뷰 삭제 처리 (실제로는 API 호출 필요)
  const handleDelete = (reviewId: string) => {
    // 실제 구현에서는 API 호출 후 성공 시 상태 업데이트
    setSelectedReviews((prev) => prev.filter((id) => id !== reviewId));
    alert(`리뷰 ID: ${reviewId} 삭제 요청됨`);
  };

  // 선택된 리뷰 일괄 삭제
  const handleBulkDelete = () => {
    // 실제 구현에서는 API 호출 후 성공 시 상태 업데이트
    alert(`선택된 ${selectedReviews.length}개 리뷰 삭제 요청됨`);
    setSelectedReviews([]);
  };

  // 리뷰 내용 요약 (최대 50자)
  const summarizeContent = (content: string, maxLength = 50) => {
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  };

  // 평점을 별로 표시
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className={`h-4 w-4 ${index < rating ? 'text-warning fill-current' : 'text-muted-foreground'}`} />
        ))}
        <span className="ml-2 text-sm font-medium text-foreground">{rating}/5</span>
      </div>
    );
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 리뷰 타입 표시
  const getReviewTypeLabel = (type: Review['type'], productName?: string) => {
    switch (type) {
      case 'lesson':
        return '레슨 리뷰';
      case 'stringing':
        return '스트링 서비스 리뷰';
      case 'product':
        return `상품 리뷰${productName ? `: ${productName}` : ''}`;
      default:
        return '기타 리뷰';
    }
  };

  // 리뷰 타입별 배지 색상
  const getReviewTypeBadge = (type: Review['type']) => {
    switch (type) {
      case 'lesson':
        return 'bg-primary text-primary hover:bg-primary';
      case 'stringing':
        return 'bg-primary text-primary hover:bg-primary';
      case 'product':
        return 'bg-muted text-foreground hover:bg-muted';
      default:
        return 'bg-background text-foreground hover:bg-muted';
    }
  };

  // 통계 계산
  const totalReviews = sampleReviews.length;
  const averageRating = sampleReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
  const fiveStarReviews = sampleReviews.filter((review) => review.rating === 5).length;
  const lessonReviews = sampleReviews.filter((review) => review.type === 'lesson').length;

  return (
    <div className="p-6 space-y-8">
      {/* 페이지 제목 */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-background to-card shadow-lg">
            <Star className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">리뷰 관리</h1>
            <p className="mt-2 text-lg text-muted-foreground">고객 리뷰를 관리하고 서비스 품질을 향상시키세요</p>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-0 bg-card shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">전체 리뷰</p>
                <p className="text-3xl font-bold text-foreground">{totalReviews}</p>
              </div>
              <div className="bg-primary rounded-xl p-3">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">평균 평점</p>
                <p className="text-3xl font-bold text-foreground">{averageRating.toFixed(1)}</p>
              </div>
              <div className="bg-warning/10 rounded-xl p-3">
                <Star className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">5점 리뷰</p>
                <p className="text-3xl font-bold text-foreground">{fiveStarReviews}</p>
              </div>
              <div className="bg-primary rounded-xl p-3">
                <Award className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">레슨 리뷰</p>
                <p className="text-3xl font-bold text-foreground">{lessonReviews}</p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <TrendingUp className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 리뷰 관리 카드 */}

      <Card className="border-0 bg-card shadow-lg backdrop-blur-sm">
        <div className="fixed inset-0 bg-overlay/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center gap-6">
          <p className="text-primary-foreground text-2xl md:text-4xl font-semibold">이 기능은 개발 중 입니다. (리뷰 관리)</p>
          <p className="text-lg text-muted-foreground">다시 활성화되기 전까지 이 기능은 사용할 수 없습니다.</p>
        </div>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">리뷰 목록</CardTitle>
              <CardDescription className="text-muted-foreground">총 {filteredReviews.length}개의 리뷰가 있습니다.</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="search" placeholder="리뷰 검색..." className="pl-10 border-border focus:border-border focus:ring-ring" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {selectedReviews.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive p-3">
              <span className="text-sm font-medium text-destructive">선택된 {selectedReviews.length}개 리뷰</span>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="ml-auto h-8">
                <Trash2 className="mr-2 h-4 w-4" />
                선택 삭제
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-background hover:bg-background">
                  <TableHead className="w-12">
                    <Checkbox checked={filteredReviews.length > 0 && selectedReviews.length === filteredReviews.length} onCheckedChange={handleSelectAll} aria-label="전체 선택" />
                  </TableHead>
                  <TableHead className="font-semibold text-foreground w-[180px]">작성자</TableHead>
                  <TableHead className="font-semibold text-foreground hidden md:table-cell">리뷰 내용</TableHead>
                  <TableHead className="font-semibold text-foreground w-[120px]">평점</TableHead>
                  <TableHead className="font-semibold text-foreground hidden md:table-cell w-[180px]">작성일</TableHead>
                  <TableHead className="font-semibold text-foreground w-[140px]">타입</TableHead>
                  <TableHead className="font-semibold text-foreground w-[70px]">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReviews.map((review) => (
                    <TableRow key={review.id} className="hover:bg-background transition-colors">
                      <TableCell>
                        <Checkbox checked={selectedReviews.includes(review.id)} onCheckedChange={(checked) => handleSelectOne(review.id, !!checked)} aria-label={`${review.authorName} 리뷰 선택`} />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div className="text-foreground">{review.authorName}</div>
                          <div className="text-xs text-muted-foreground">{review.authorEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help text-foreground">{summarizeContent(review.content)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-md">
                              <p>{review.content}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{renderRating(review.rating)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(review.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getReviewTypeBadge(review.type)}>
                          {getReviewTypeLabel(review.type, review.productName)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">메뉴 열기</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`/admin/reviews/${review.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>상세 보기</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(review.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>삭제</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
