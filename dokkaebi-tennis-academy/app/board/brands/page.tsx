import Link from 'next/link';
import { Grid2X2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SiteContainer from '@/components/layout/SiteContainer';

export const metadata = {
  title: '브랜드별 게시판 (준비중) | 도깨비 테니스',
  description: '라켓/스트링 브랜드별 사용 후기를 나누는 게시판입니다. 현재 준비 중입니다.',
  alternates: { canonical: '/board/brands' },
};

export default function BrandBoardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-10 space-y-8">
        {/* 헤더 영역 */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mb-1 text-sm text-muted-foreground dark:text-muted-foreground">
              <span className="font-medium text-teal-600 dark:text-teal-400">게시판</span>
              <span className="mx-1">›</span>
              <span>브랜드별 게시판</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground dark:text-white">브랜드별 게시판 (준비중)</h1>
            <p className="mt-1 text-sm md:text-base text-muted-foreground dark:text-muted-foreground">윌슨, 바볼랏, 요넥스 등 브랜드별로 라켓/스트링 사용 후기를 모아볼 수 있는 공간입니다. 현재 기능을 준비하고 있습니다.</p>
          </div>

          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/board">게시판 홈으로</Link>
          </Button>
        </div>

        {/* 준비중 안내 카드 */}
        <Card className="border-0 bg-card dark:bg-card shadow-xl backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-gradient-to-r from-indigo-50 to-purple-100 dark:from-indigo-950/50 dark:to-purple-900/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 shadow-lg">
                <Grid2X2 className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-lg md:text-xl">브랜드별 게시판 기능을 준비 중입니다</CardTitle>
            </div>
            <span className="text-xs md:text-sm rounded-full border px-3 py-1 text-muted-foreground dark:text-muted-foreground dark:border-border bg-card dark:bg-card">Coming Soon</span>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-sm md:text-base text-muted-foreground dark:text-muted-foreground">
            <p>추후 다음과 같은 기능을 제공할 예정입니다:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>브랜드별 탭/필터를 통한 게시글 분류</li>
              <li>라켓/스트링 모델별 실제 사용 후기 공유</li>
              <li>브랜드별 추천 세팅, 궁합 좋은 조합 논의</li>
            </ul>
            <p className="pt-2 text-xs md:text-sm text-muted-foreground dark:text-muted-foreground">현재는 상품 상세 페이지와 리뷰 게시판에서 브랜드 후기를 먼저 확인해 보실 수 있습니다.</p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/reviews">리뷰 게시판 둘러보기</Link>
            </Button>
          </CardContent>
        </Card>
      </SiteContainer>
    </div>
  );
}
