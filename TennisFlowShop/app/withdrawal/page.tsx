"use client";

import Link from "next/link";
import SiteContainer from "@/components/layout/SiteContainer";
import { ResultState } from "@/components/public";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

export default function AccountDeletedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleRestore = async () => {
    if (!token) {
      showErrorToast("복구 토큰이 없습니다.");
      return;
    }

    // 복구 요청 전송 (POST 요청으로 변경)
    const res = await fetch("/api/users/me/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "include",
    });

    if (res.ok) {
      showSuccessToast("계정이 복구되었습니다. 다시 로그인해주세요.");
      router.push("/login");
    } else {
      showErrorToast("복구 중 오류가 발생했습니다.");
    }
  };

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
