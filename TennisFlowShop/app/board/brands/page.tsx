import SiteContainer from "@/components/layout/SiteContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid2X2 } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "브랜드별 게시판 (준비 중)",
  description: "라켓/스트링 브랜드별 사용 후기를 나누는 게시판입니다. 현재 준비 중입니다.",
  alternates: { canonical: "/board/brands" },
};

export default function BrandBoardPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-10 space-y-8">
        {/* 헤더 영역 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="min-w-0">
            <div className="mb-1 text-sm text-muted-foreground">
              <span className="font-medium text-success">게시판</span>
              <span className="mx-1">›</span>
              <span>브랜드별 게시판</span>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold leading-tight break-keep tracking-normal text-foreground">브랜드별 게시판 (준비 중)</h1>
            <p className="mt-1 text-sm md:text-base text-muted-foreground">아직 브랜드별 게시글 분류 기능은 제공되지 않습니다. 현재는 상품 상세와 리뷰 게시판에서 브랜드 후기를 확인해 주세요.</p>
          </div>
        </div>

        {/* 준비 중 안내 카드 */}
        <Card className="border-0 bg-card shadow-xl backdrop-blur-sm">
          <CardHeader className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted/30">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted shadow-lg">
                <Grid2X2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg sm:text-xl md:text-2xl font-semibold leading-tight break-keep">브랜드별 게시판 기능을 준비 중입니다</CardTitle>
            </div>
            <span className="ml-auto shrink-0 text-xs md:text-sm rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">준비 중</span>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-sm md:text-base text-muted-foreground">
            <p>향후 다음과 같은 기능을 제공할 예정입니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>브랜드별 탭/필터를 통한 게시글 분류</li>
              <li>라켓/스트링 모델별 실제 사용 후기 공유</li>
              <li>브랜드별 추천 세팅, 궁합 좋은 조합 논의</li>
            </ul>
            <p className="pt-2 text-xs md:text-sm text-muted-foreground">현재는 상품 상세 페이지와 리뷰 게시판에서 브랜드 후기를 먼저 확인해 보실 수 있습니다.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm" variant="outline">
                <Link href="/products">상품 둘러보기</Link>
              </Button>
              <Button asChild size="sm" className="mt-0">
                <Link href="/reviews">리뷰 게시판 둘러보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </SiteContainer>
    </div>
  );
}
