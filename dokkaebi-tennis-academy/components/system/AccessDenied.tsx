import Link from 'next/link';
import { Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthRescue from '@/components/system/AuthRescue';

export default function AccessDenied() {
  return (
    <>
      <AuthRescue />
      <div id="__access_denied_marker__" hidden />
      <div className="container flex min-h-[calc(100svh-200px)] items-center justify-center py-20">
        <div className="mx-auto max-w-md text-center space-y-8">
          <div>
            <Lock className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-2xl sm:text-3xl font-bold mt-4">접근이 제한된 페이지입니다.</h2>
          </div>
          <p className="text-base text-muted-foreground">이 페이지를 보려면 관리자 권한 또는 적절한 인증이 필요합니다.</p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              홈으로 돌아가기
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
