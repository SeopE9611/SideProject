"use client";

import Link from "next/link";
import SiteContainer from "@/components/layout/SiteContainer";
import { ResultState } from "@/components/public";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccountDeletedPage() {
  return (
    <SiteContainer className="grid min-h-[100svh] place-items-center py-12">
      <ResultState
        status="success"
        icon={<CheckCircle className="h-6 w-6" />}
        title="회원 탈퇴가 정상적으로 완료되었습니다"
        description="탈퇴 후 7일간 개인정보를 보관 후 폐기됩니다."
        actions={
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/">홈으로 이동</Link>
          </Button>
        }
      />
    </SiteContainer>
  );
}
