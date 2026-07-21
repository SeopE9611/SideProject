import Link from "next/link";
import { Home, ArrowRight } from "lucide-react";

import SiteContainer from "@/components/layout/SiteContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <SiteContainer className="flex min-h-[calc(100svh-200px)] items-center justify-center py-20">
      <Card variant="feature" className="w-full max-w-xl rounded-panel text-center">
        <CardContent className="space-y-8 p-6 bp-sm:p-8">
          <div>
            <p className="font-brand-display text-ui-display text-foreground">
              404
            </p>
          </div>

          <div>
            <h1 className="text-ui-page-title font-ui-bold tracking-normal bp-sm:text-ui-page-title-lg">
              페이지를 찾을 수 없습니다.
            </h1>
          </div>

          <div className="space-y-2">
            <p className="text-ui-body text-muted-foreground">
              요청하신 페이지가 존재하지 않거나, 이동되었을 수 있습니다.
            </p>
            <p className="text-ui-body-sm text-muted-foreground/80">
              찾으시는 페이지가 있다면 홈으로 돌아가서 다시 시도해보세요.
            </p>
          </div>

          <div className="grid w-full gap-3 bp-sm:flex bp-sm:justify-center">
            <Button wrap="responsive" asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
                홈으로 돌아가기
              </Link>
            </Button>
            <Button variant="outline" wrap="responsive" asChild>
              <Link href="/board/qna/write">
                문의하기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </SiteContainer>
  );
}
