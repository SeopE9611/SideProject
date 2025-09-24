'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Search, Users, CheckCircle, Clock, ArrowLeft, Plus, Lock } from 'lucide-react';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { badgeBaseOutlined, badgeSizeSm, getAnswerStatusColor, getQnaCategoryColor } from '@/lib/badge-style';

const CAT_LABELS: Record<string, string> = {
  product: '상품문의',
  order: '주문/결제',
  delivery: '배송',
  refund: '환불/교환',
  service: '서비스',
  academy: '아카데미',
  member: '회원',
};
const CODE_TO_LABEL = CAT_LABELS; // 가독성용 alias

export default function QnaPage() {
  type QnaItem = {
    _id: string;
    title: string;
    createdAt: string | Date;
    authorName?: string | null;
    category?: string | null; // '상품문의' | '일반문의'
    answer?: any; // 있으면 답변완료
    viewCount?: number;
    isSecret?: boolean;
  };
  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
  const fmt = (v: string | Date) => new Date(v).toLocaleDateString();

  // 필터/페이지 상태
  const [category, setCategory] = useState<string>('all'); // 'all' | 'product' | 'order' ...
  const [answerFilter, setAnswerFilter] = useState<'all' | 'waiting' | 'completed'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;
  // 입력용
  const [inputKeyword, setInputKeyword] = useState('');
  const [inputField, setInputField] = useState<'all' | 'title' | 'content' | 'title_content'>('all');
  // 제출용
  const [keyword, setKeyword] = useState('');
  const [field, setField] = useState<'all' | 'title' | 'content' | 'title_content'>('all');

  const qs = new URLSearchParams({ type: 'qna', page: String(page), limit: String(limit) });
  // 서버는 라벨을 기대 -> 코드 선택 시 라벨로 변환해서 전송
  if (category !== 'all') {
    const label = CODE_TO_LABEL[category] ?? category; // 혹시 라벨이 들어와도 안전
    qs.set('category', label);
  }
  if (keyword.trim()) {
    qs.set('q', keyword.trim());
    qs.set('field', field);
  }
  const { data, error, isLoading } = useSWR(`/api/boards?${qs.toString()}`, fetcher);
  const serverItems: QnaItem[] = data?.items ?? [];
  const items = useMemo(() => {
    // 클라에서 답변상태 필터
    let arr = serverItems;
    if (answerFilter === 'waiting') arr = arr.filter((q) => !q.answer);
    if (answerFilter === 'completed') arr = arr.filter((q) => !!q.answer);
    return arr;
  }, [serverItems, answerFilter]);
  const total = data?.total ?? 0;
  const answeredCount = serverItems.filter((q) => !!q.answer).length;
  const waitingCount = serverItems.filter((q) => !q.answer).length;
  const totalViews = serverItems.reduce((sum, q) => sum + (q.viewCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild className="p-2">
              <Link href="/board">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Q&A</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">궁금한 점을 문의하고 답변을 받아보세요</p>
              </div>
            </div>
          </div>
          {/* KPI 미사용 주석처리 (삭제는 일단 대기)
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">전체 문의</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
                  </div>
                  <div className="bg-teal-50 dark:bg-teal-950/50 rounded-xl p-2">
                    <MessageSquare className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">답변 완료</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{answeredCount}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/50 rounded-xl p-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">답변 대기</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{waitingCount}</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950/50 rounded-xl p-2">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">총 조회수</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalViews}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/50 rounded-xl p-2">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div> */}
        </div>

        <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/50 dark:to-cyan-950/50 border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-teal-600" />
                <span>Q&A 목록</span>
              </div>
              <Button asChild className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
                <Link href="/board/qna/write">
                  <Plus className="h-4 w-4 mr-2" />
                  문의하기
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={category}
                  onValueChange={(v) => {
                    setCategory(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px] bg-white dark:bg-gray-700">
                    <SelectValue placeholder="카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 카테고리</SelectItem>
                    <SelectItem value="product">상품</SelectItem>
                    <SelectItem value="order">주문/결제</SelectItem>
                    <SelectItem value="delivery">배송</SelectItem>
                    <SelectItem value="refund">환불/교환</SelectItem>
                    <SelectItem value="service">서비스</SelectItem>
                    <SelectItem value="academy">아카데미</SelectItem>
                    <SelectItem value="member">회원</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={answerFilter} onValueChange={(v: any) => setAnswerFilter(v)}>
                  <SelectTrigger className="w-[120px] bg-white dark:bg-gray-700">
                    <SelectValue placeholder="답변 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="waiting">답변 대기</SelectItem>
                    <SelectItem value="completed">답변 완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Select
                  value={inputField}
                  onValueChange={(v) => {
                    setInputField(v as any);
                  }}
                >
                  <SelectTrigger className="w-[120px] bg-white dark:bg-gray-700">
                    <SelectValue placeholder="검색 조건" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="title">제목</SelectItem>
                    <SelectItem value="content">내용</SelectItem>
                    <SelectItem value="title_content">제목+내용</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="검색어를 입력하세요"
                    className="w-[200px] pl-10 bg-white dark:bg-gray-700"
                    value={inputKeyword}
                    onChange={(e) => setInputKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setPage(1);
                        setKeyword(inputKeyword);
                        setField(inputField);
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setKeyword(inputKeyword);
                    setField(inputField);
                  }}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                >
                  검색
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {isLoading && <div className="text-sm text-gray-500">불러오는 중…</div>}
              {error && <div className="text-sm text-red-500">불러오기에 실패했습니다.</div>}
              {!isLoading &&
                !error &&
                items.map((qna) => (
                  <Link key={qna._id} href={`/board/qna/${qna._id}`}>
                    <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-gray-200 dark:border-gray-700">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getQnaCategoryColor(qna.category)}`}>
                                {qna.category ?? '일반문의'}
                              </Badge>
                              {qna.isSecret && (
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                  <Lock className="h-3 w-3" /> 비밀글
                                </Badge>
                              )}
                              <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getAnswerStatusColor(!!qna.answer)}`}>
                                {qna.answer ? '답변 완료' : '답변 대기'}
                              </Badge>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-3">{qna.title}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-500">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">{(qna.authorName ?? '익명').slice(0, 1)}</AvatarFallback>
                                </Avatar>
                                <span>{qna.authorName ?? '익명'}</span>
                              </div>
                              <span>{fmt(qna.createdAt)}</span>
                              <span className="flex items-center">
                                <MessageSquare className="h-4 w-4 mr-1" />
                                답변 {qna.answer ? 1 : 0}개
                              </span>
                              <span className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {qna.viewCount ?? 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              {!isLoading && !error && items.length === 0 && <div className="text-sm text-gray-500">{keyword.trim() ? '검색 결과가 없습니다.' : '등록된 문의가 없습니다.'}</div>}
            </div>

            <div className="mt-8 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <span className="sr-only">이전 페이지</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span className="px-3 text-sm text-gray-600 dark:text-gray-400">
                  {page} / {Math.max(1, Math.ceil((data?.total ?? 0) / limit))}
                </span>
                <Button variant="outline" size="icon" className="bg-white dark:bg-gray-700" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.max(1, Math.ceil((data?.total ?? 0) / limit))}>
                  <span className="sr-only">다음 페이지</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
