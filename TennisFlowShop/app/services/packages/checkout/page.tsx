import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth.utils";
import PackageCheckoutClient from "@/app/services/packages/checkout/PackageCheckoutClient";
import LoginGate from "@/app/services/packages/checkout/LoginGate";
import { findBlockingPackageOrderByUserId } from "@/lib/package-order-ownership";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ package?: string }>;
}) {
  const sp = await searchParams;
  const token = (await cookies()).get("accessToken")?.value;
  const payload = token ? verifyAccessToken(token) : null;

  if (!payload?.sub) {
    const next =
      "/services/packages/checkout" +
      (sp?.package ? `?package=${sp.package}` : "");
    return <LoginGate next={next} />;
  }

  const blockingOrder = await findBlockingPackageOrderByUserId(
    String(payload.sub),
  );
  if (blockingOrder) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-xl w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">
              현재 패키지 추가 구매가 제한됩니다
            </h2>
            <p className="text-muted-foreground">
              현재 보유 중인 패키지가 있어 이 패키지는 구매할 수 없습니다. 기존
              패키지 이용이 종료된 뒤 다시 구매할 수 있습니다.
            </p>
            <div className="text-sm text-muted-foreground rounded-lg bg-muted/40 p-3">
              현재 상태: {String(blockingOrder.paymentStatus ?? "-")} /{" "}
              {String(blockingOrder.status ?? "-")}
              <br />내 패키지 상태를 확인한 뒤 다시 진행해주세요.
            </div>
            <div className="flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/services/packages">패키지 목록으로 이동</Link>
              </Button>
              <Button asChild>
                <Link href="/mypage?tab=passes">내 패키지 확인</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 로그인 통과 ->  클라 컴포넌트에 사용자 기본정보 전달
  return (
    <PackageCheckoutClient
      initialUser={{
        id: payload.sub,
        email: (payload as any)?.email ?? "",
        name: (payload as any)?.name ?? "",
      }}
      initialQuery={sp}
    />
  );
}
