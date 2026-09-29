import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
import SiteContainer from "@/components/layout/SiteContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AuthRescue from "@/components/system/AuthRescue";

export default function AccessDenied() {
  return (
    <>
      <AuthRescue />
      <div id="__access_denied_marker__" hidden />
      <SiteContainer className="flex min-h-[calc(100svh-200px)] items-center justify-center py-20">
        <Card variant="feature" className="w-full max-w-xl rounded-panel text-center">
          <CardContent className="space-y-8 p-6 bp-sm:p-8">
            <div className="space-y-4">
              <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
              <h1 className="text-ui-page-title font-ui-bold tracking-normal bp-sm:text-ui-page-title-lg">
                접근이 제한된 페이지입니다.
              </h1>
            </div>
            <p className="text-ui-body text-muted-foreground">
              이 페이지를 보려면 관리자 권한 또는 적절한 인증이 필요합니다.
            </p>
            <Button
              asChild
              variant="highlight"
              size="lg"
              wrap="responsive"
              className="w-full bp-sm:w-auto"
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                홈으로 돌아가기
              </Link>
            </Button>
          </CardContent>
        </Card>
      </SiteContainer>
    </>
  );
}
