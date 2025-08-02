'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Search, Star, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';

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
          <Star key={index} className={`h-4 w-4 ${index < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
        ))}
        <span className="ml-2 text-sm">{rating}/5</span>
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

  return (
    <div className="space-y-4 p-8 pt-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">리뷰 관리</h2>
        <p className="text-muted-foreground">작성된 사용자 리뷰를 확인하고 관리할 수 있습니다.</p>
      </div>

      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>리뷰 목록</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="리뷰 검색..." className="w-full pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>
            <CardDescription>총 {filteredReviews.length}개의 리뷰가 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedReviews.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-8">
                  <Trash2 className="mr-2 h-4 w-4" />
                  선택 삭제 ({selectedReviews.length}개)
                </Button>
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox checked={filteredReviews.length > 0 && selectedReviews.length === filteredReviews.length} onCheckedChange={handleSelectAll} aria-label="전체 선택" />
                    </TableHead>
                    <TableHead className="w-[180px]">작성자</TableHead>
                    <TableHead className="hidden md:table-cell">리뷰 내용</TableHead>
                    <TableHead className="w-[100px]">평점</TableHead>
                    <TableHead className="hidden md:table-cell w-[180px]">작성일</TableHead>
                    <TableHead className="w-[100px]">타입</TableHead>
                    <TableHead className="w-[70px]">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        검색 결과가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <Checkbox checked={selectedReviews.includes(review.id)} onCheckedChange={(checked) => handleSelectOne(review.id, !!checked)} aria-label={`${review.authorName} 리뷰 선택`} />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>{review.authorName}</div>
                          <div className="text-xs text-muted-foreground">{review.authorEmail}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{summarizeContent(review.content)}</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-md">
                                <p>{review.content}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>{renderRating(review.rating)}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatDate(review.createdAt)}</TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap">{getReviewTypeLabel(review.type, review.productName)}</span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">메뉴 열기</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/reviews/${review.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  <span>상세 보기</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(review.id)}>
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
    </div>
  );
}
