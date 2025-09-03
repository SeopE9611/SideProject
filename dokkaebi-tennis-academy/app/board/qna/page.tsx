import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Search, Users, CheckCircle, Clock, ArrowLeft, Plus } from 'lucide-react';

export default function QnaPage() {
  const qnas = [
    {
      id: 1,
      title: '문의1',
      date: '2025-01-01',
      author: '이름테스트',
      status: '답변 완료',
      category: '스트링',
      answers: 1,
      views: 1,
    },
    {
      id: 2,
      title: '문의2',
      date: '2025-01-01',
      author: '이름테스트',
      status: '답변 완료',
      category: '라켓',
      answers: 1,
      views: 99,
    },
    {
      id: 3,
      title: '문의3',
      date: '2025-01-01',
      author: '이름테스트',
      status: '답변 대기',
      category: '주문/결제',
      answers: 0,
      views: 28,
    },
    {
      id: 4,
      title: '문의4',
      date: '2025-01-01',
      author: '이름테스트',
      status: '답변 완료',
      category: '서비스',
      answers: 1,
      views: 67,
    },
    {
      id: 5,
      title: '문의5',
      date: '2025-01-01',
      author: '이름테스트',
      status: '답변 완료',
      category: '아카데미',
      answers: 1,
      views: 54,
    },
    {
      id: 6,
      title: '문의6',
      date: '2025-01-01',
      author: '이름테스트',
      status: '답변 대기',
      category: '환불/교환',
      answers: 0,
      views: 23,
    },
    {
      id: 7,
      title: '문의7',
      date: '2025-01-01',
      author: '이름테스트',
      status: '답변 완료',
      category: '회원',
      answers: 1,
      views: 41,
    },
    {
      id: 8,
      title: '문의8',
      date: '2025-01-01',
      author: '이름테스트',
      status: '답변 완료',
      category: '적립금',
      answers: 1,
      views: 38,
    },
  ];

  const answeredCount = qnas.filter((q) => q.status === '답변 완료').length;
  const waitingCount = qnas.filter((q) => q.status === '답변 대기').length;
  const totalViews = qnas.reduce((sum, q) => sum + q.views, 0);

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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">전체 문의</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{qnas.length}</p>
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
          </div>
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
                <Select defaultValue="all">
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
                <Select defaultValue="all">
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
                <Select defaultValue="title">
                  <SelectTrigger className="w-[120px] bg-white dark:bg-gray-700">
                    <SelectValue placeholder="검색 조건" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">제목</SelectItem>
                    <SelectItem value="content">내용</SelectItem>
                    <SelectItem value="author">작성자</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input type="search" placeholder="검색어를 입력하세요" className="w-[200px] pl-10 bg-white dark:bg-gray-700" />
                </div>
                <Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">검색</Button>
              </div>
            </div>

            <div className="space-y-4">
              {qnas.map((qna) => (
                <Link key={qna.id} href={`/board/qna/${qna.id}`}>
                  <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {qna.category}
                            </Badge>
                            <Badge
                              variant={qna.status === '답변 완료' ? 'default' : 'secondary'}
                              className={qna.status === '답변 완료' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'}
                            >
                              {qna.status === '답변 완료' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                              {qna.status}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-3">{qna.title}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-500">
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{qna.author[0]}</AvatarFallback>
                              </Avatar>
                              <span>{qna.author}</span>
                            </div>
                            <span>{qna.date}</span>
                            <span className="flex items-center">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              답변 {qna.answers}개
                            </span>
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {qna.views}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon" className="bg-white dark:bg-gray-700">
                  <span className="sr-only">이전 페이지</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </Button>
                <Button variant="outline" size="sm" className="h-10 w-10 bg-teal-600 text-white border-teal-600">
                  1
                </Button>
                <Button variant="outline" size="sm" className="h-10 w-10 bg-white dark:bg-gray-700">
                  2
                </Button>
                <Button variant="outline" size="sm" className="h-10 w-10 bg-white dark:bg-gray-700">
                  3
                </Button>
                <Button variant="outline" size="icon" className="bg-white dark:bg-gray-700">
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
