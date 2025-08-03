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

export default async function ReviewsClient() {
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
          <Star key={index} className={`h-4 w-4 ${index < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">{rating}/5</span>
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
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'stringing':
        return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
      case 'product':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg">
            <Star className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">리뷰 관리</h1>
            <p className="mt-2 text-lg text-gray-600">고객 리뷰를 관리하고 서비스 품질을 향상시키세요</p>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 리뷰</p>
                <p className="text-3xl font-bold text-gray-900">{totalReviews}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 평점</p>
                <p className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">5점 리뷰</p>
                <p className="text-3xl font-bold text-gray-900">{fiveStarReviews}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <Award className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">레슨 리뷰</p>
                <p className="text-3xl font-bold text-gray-900">{lessonReviews}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 리뷰 관리 카드 */}
      <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">리뷰 목록</CardTitle>
              <CardDescription className="text-gray-600">총 {filteredReviews.length}개의 리뷰가 있습니다.</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input type="search" placeholder="리뷰 검색..." className="pl-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {selectedReviews.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3">
              <span className="text-sm font-medium text-red-800">선택된 {selectedReviews.length}개 리뷰</span>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="ml-auto h-8">
                <Trash2 className="mr-2 h-4 w-4" />
                선택 삭제
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="w-12">
                    <Checkbox checked={filteredReviews.length > 0 && selectedReviews.length === filteredReviews.length} onCheckedChange={handleSelectAll} aria-label="전체 선택" />
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 w-[180px]">작성자</TableHead>
                  <TableHead className="font-semibold text-gray-900 hidden md:table-cell">리뷰 내용</TableHead>
                  <TableHead className="font-semibold text-gray-900 w-[120px]">평점</TableHead>
                  <TableHead className="font-semibold text-gray-900 hidden md:table-cell w-[180px]">작성일</TableHead>
                  <TableHead className="font-semibold text-gray-900 w-[140px]">타입</TableHead>
                  <TableHead className="font-semibold text-gray-900 w-[70px]">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReviews.map((review) => (
                    <TableRow key={review.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <Checkbox checked={selectedReviews.includes(review.id)} onCheckedChange={(checked) => handleSelectOne(review.id, !!checked)} aria-label={`${review.authorName} 리뷰 선택`} />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div className="text-gray-900">{review.authorName}</div>
                          <div className="text-xs text-gray-500">{review.authorEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help text-gray-700">{summarizeContent(review.content)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-md">
                              <p>{review.content}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{renderRating(review.rating)}</TableCell>
                      <TableCell className="hidden md:table-cell text-gray-600">{formatDate(review.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getReviewTypeBadge(review.type)}>
                          {getReviewTypeLabel(review.type, review.productName)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
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
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={() => handleDelete(review.id)}>
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
