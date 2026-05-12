import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "인기글 모아보기 (준비 중)",
  description: "조회수/댓글/공감 수 기준 인기 게시글을 모아서 보여주는 페이지입니다. 현재 준비 중입니다.",
  alternates: { canonical: "/board/hot" },
};

export default function HotBoardPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 헤더 영역 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="min-w-0">
            <div className="mb-1 text-sm text-muted-foreground">
              <span className="font-medium text-success">게시판</span>
              <span className="mx-1">›</span>
              <span>인기글 모아보기</span>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold leading-tight break-keep tracking-normal text-foreground">인기글 모아보기 (준비 중)</h1>
            <p className="mt-1 text-sm md:text-base text-muted-foreground">아직 인기글 집계 기능은 제공되지 않습니다. 현재 이용 가능한 게시판과 리뷰를 먼저 둘러봐 주세요.</p>
          </div>
        </div>

        {/* 준비 중 안내 카드 */}
        <Card className="border-0 bg-card shadow-xl backdrop-blur-sm">
          <CardHeader className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted/30">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 shadow-lg dark:bg-warning/15">
                <Flame className="h-5 w-5 text-warning" />
              </div>
              <CardTitle className="text-lg sm:text-xl md:text-2xl font-semibold leading-tight break-keep">인기글 모아보기 기능을 준비 중입니다</CardTitle>
            </div>
            <span className="ml-auto shrink-0 text-xs md:text-sm rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">준비 중</span>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-sm md:text-base text-muted-foreground">
            <p>향후 다음과 같은 기준으로 인기글을 보여줄 예정입니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>조회수 상위 게시글</li>
              <li>댓글/답글 수가 많은 활발한 게시글</li>
              <li>공감/좋아요 수가 높은 하이라이트 게시글</li>
            </ul>
            <p className="pt-2 text-xs md:text-sm text-muted-foreground">기능 오픈 전까지는 커뮤니티 홈에서 운영 중인 게시판을 확인하거나 리뷰 게시판을 둘러봐 주세요.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm" variant="outline">
                <Link href="/board">커뮤니티 홈으로</Link>
              </Button>
              <Button asChild size="sm" className="mt-0">
                <Link href="/reviews">리뷰 게시판 둘러보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
