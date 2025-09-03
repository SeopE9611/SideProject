import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bell, Search, Eye, Pin, ArrowLeft, Plus } from 'lucide-react';

export default function NoticePage() {
  const notices = [
    {
      id: 1,
      title: '공지1',
      date: '2025-01-01',
      views: 999,
      content: '응애.',
      isPinned: true,
    },
    {
      id: 2,
      title: '공지2',
      date: '2025-01-01',
      views: 999,
      content: '응애.',
      isPinned: true,
    },
    {
      id: 3,
      title: '공지3',
      date: '2025-01-01',
      views: 999,
      content: '응애.',
      isPinned: false,
    },
    {
      id: 4,
      title: '공지4',
      date: '2025-01-01',
      views: 999,
      content: '응애.',
      isPinned: false,
    },
    {
      id: 5,
      title: '공지5',
      date: '2025-01-01',
      views: 999,
      content: '응애.',
      isPinned: false,
    },
    {
      id: 6,
      title: '공지6',
      date: '2025-01-01',
      views: 999,
      content: '응애.',
      isPinned: false,
    },
    {
      id: 7,
      title: '공지7',
      date: '2025-01-01',
      views: 999,
      content: '응애.',
      isPinned: false,
    },
    {
      id: 8,
      title: '공지8',
      date: '2025-01-01',
      views: 999,
      content: '응애.',
      isPinned: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild className="p-2">
              <Link href="/board">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 shadow-lg">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">공지사항</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">도깨비 테니스 아카데미의 최신 소식을 확인하세요</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">전체 공지</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{notices.length}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/50 rounded-xl p-2">
                    <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">고정 공지</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{notices.filter((n) => n.isPinned).length}</p>
                  </div>
                  <div className="bg-teal-50 dark:bg-teal-950/50 rounded-xl p-2">
                    <Pin className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">총 조회수</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{notices.reduce((sum, n) => sum + n.views, 0)}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/50 rounded-xl p-2">
                    <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">이번 달</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">5</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/50 rounded-xl p-2">
                    <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/50 dark:to-teal-950/50 border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <span>공지사항 목록</span>
              </div>

              <div className="flex items-center space-x-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[120px] bg-white dark:bg-gray-700">
                    <SelectValue placeholder="검색 조건" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="title">제목</SelectItem>
                    <SelectItem value="content">내용</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input type="search" placeholder="검색어를 입력하세요" className="w-[200px] pl-10 bg-white dark:bg-gray-700" />
                </div>
                <Button className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700">검색</Button>
                <Button asChild className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
                  <Link href="/board/notice/write">
                    <Plus className="h-4 w-4 mr-2" />
                    작성하기
                  </Link>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {notices.map((notice) => (
                <Link key={notice.id} href={`/board/notice/${notice.id}`}>
                  <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {notice.isPinned && (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                <Pin className="h-3 w-3 mr-1" />
                                고정
                              </Badge>
                            )}
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{notice.title}</h3>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{notice.content}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-500">
                            <span>{notice.date}</span>
                            <span className="flex items-center">
                              <Eye className="h-4 w-4 mr-1" />
                              {notice.views}
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
                <Button variant="outline" size="sm" className="h-10 w-10 bg-blue-600 text-white border-blue-600">
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
