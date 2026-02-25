import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: '인기글 모아보기 (준비중) | 테니스 플로우',
  description: '조회수/댓글/공감 수 기준 인기 게시글을 모아서 보여주는 페이지입니다. 현재 준비 중입니다.',
  alternates: { canonical: '/board/hot' },
};

export default function HotBoardPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 헤더 영역 */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mb-1 text-sm text-muted-foreground">
              <span className="font-medium text-success">게시판</span>
              <span className="mx-1">›</span>
              <span>인기글 모아보기</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">인기글 모아보기 (준비중)</h1>
            <p className="mt-1 text-sm md:text-base text-muted-foreground">조회수, 댓글 수, 공감 수 등을 기준으로 인기 게시글을 큐레이션하는 페이지입니다. 현재 기능을 준비하고 있습니다.</p>
          </div>

          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/board">게시판 홈으로</Link>
          </Button>
        </div>

        {/* 준비중 안내 카드 */}
        <Card className="border-0 bg-card shadow-xl backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 shadow-lg dark:bg-warning/15">
                <Flame className="h-5 w-5 text-warning" />
              </div>
              <CardTitle className="text-lg md:text-xl">인기글 모아보기 기능을 준비 중입니다</CardTitle>
            </div>
            <span className="text-xs md:text-sm rounded-full border px-3 py-1 text-muted-foreground dark:border-border bg-card">Coming Soon</span>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-sm md:text-base text-muted-foreground">
            <p>추후 다음과 같은 기준으로 인기글을 보여줄 예정입니다:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>조회수 상위 게시글</li>
              <li>댓글/답글 수가 많은 활발한 게시글</li>
              <li>공감/좋아요 수가 높은 하이라이트 게시글</li>
            </ul>
            <p className="pt-2 text-xs md:text-sm text-muted-foreground">기능 오픈 전까지는 리뷰 게시판에서 인기 있는 후기들을 먼저 확인해 보실 수 있습니다.</p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/reviews">리뷰 게시판 둘러보기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
