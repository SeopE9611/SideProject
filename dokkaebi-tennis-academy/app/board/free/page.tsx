import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: '자유 게시판 (준비중) | 도깨비 테니스',
  description: '질문, 정보 공유, 일상 이야기를 나눌 자유 게시판입니다. 현재 준비 중입니다.',
  alternates: { canonical: '/board/free' },
};

export default function FreeBoardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 헤더 영역 */}
        <div className="flex items-center justify-between gap-3">
          <div>
            {/* 브레드크럼: 게시판 > 자유 게시판 */}
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-teal-600 dark:text-teal-400">게시판</span>
              <span className="mx-1">›</span>
              <span>자유 게시판</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">자유 게시판 (준비중)</h1>
            <p className="mt-1 text-sm md:text-base text-gray-600 dark:text-gray-300">테니스 관련 질문, 정보 공유, 일상 이야기를 자유롭게 나눌 수 있는 공간입니다. 현재 기능을 준비하고 있습니다.</p>
          </div>

          {/* 게시판 메인으로 이동 */}
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/board">게시판 홈으로</Link>
          </Button>
        </div>

        {/* 준비중 안내 카드 */}
        <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-900/40">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-lg md:text-xl">자유 게시판 기능을 준비 중입니다</CardTitle>
            </div>
            <span className="text-xs md:text-sm rounded-full border px-3 py-1 text-gray-600 dark:text-gray-200 dark:border-gray-600 bg-white/60 dark:bg-gray-900/40">Coming Soon</span>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-sm md:text-base text-gray-600 dark:text-gray-300">
            <p>추후 다음과 같은 기능을 제공할 예정입니다:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>질문/답변 형식의 자유로운 Q&amp;A</li>
              <li>테니스 팁, 장비 추천, 대회 정보 등 노하우 공유</li>
              <li>일상 이야기, 번외 이야기 등 자유로운 커뮤니티 활동</li>
            </ul>
            <p className="pt-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">현재는 리뷰 게시판에서 다른 사용자들의 후기를 먼저 둘러보실 수 있습니다.</p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/reviews">리뷰 게시판 둘러보기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
