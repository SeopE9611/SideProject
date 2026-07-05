import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth.utils";
import PackageCheckoutClient from "@/app/services/packages/checkout/PackageCheckoutClient";
import LoginGate from "@/app/services/packages/checkout/LoginGate";
import { findBlockingPackageOrderByUserId } from "@/lib/package-order-ownership";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadPackageSettings } from "@/app/features/packages/api/db";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "패키지 결제",
};

function resolveCheckoutAuthPayload(accessToken?: string, refreshToken?: string) {
  // 1) 우선 accessToken을 사용한다.
  const accessPayload = accessToken ? verifyAccessToken(accessToken) : null;
  if (accessPayload?.sub) return { payload: accessPayload, recoveredByRefresh: false };

  // 2) accessToken이 만료/누락된 "타이밍 엇갈림" 구간에서는 refreshToken으로 1회 회복 기회를 준다.
  //    여기서 바로 LoginGate로 보내면 로그인 직후/만료 직후에 체감 흔들림이 커지기 때문이다.
  if (!refreshToken) return { payload: null, recoveredByRefresh: false };
  try {
    const refreshPayload = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!,
    ) as jwt.JwtPayload;
    return {
      payload: refreshPayload?.sub ? refreshPayload : null,
      recoveredByRefresh: Boolean(refreshPayload?.sub),
    };
  } catch {
    return { payload: null, recoveredByRefresh: false };
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ package?: string }>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;
  const { payload } = resolveCheckoutAuthPayload(accessToken, refreshToken);

  if (!payload?.sub) {
    const next = "/services/packages/checkout" + (sp?.package ? `?package=${sp.package}` : "");
    return <LoginGate next={next} />;
  }

  // checkout은 로그인 사용자 의존 데이터(이름/이메일/연락처)를 바로 보여주는 화면이다.
  // mount 후 /api/users/me를 다시 부르면 첫 입력 가능 시점이 늦어져 체감이 느려진다.
  // 따라서 서버에서 사용자 기본 정보를 선조회해 초기 props로 내려준다.
  const subStr = String(payload.sub);
  if (!ObjectId.isValid(subStr)) {
    const next = "/services/packages/checkout" + (sp?.package ? `?package=${sp.package}` : "");
    return <LoginGate next={next} />;
  }
  const db = await getDb();
  const authUser = await db.collection("users").findOne(
    { _id: new ObjectId(subStr) },
    {
      projection: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        isDeleted: 1,
        isSuspended: 1,
      },
    },
  );
  if (!authUser || authUser.isDeleted || authUser.isSuspended) {
    const next = "/services/packages/checkout" + (sp?.package ? `?package=${sp.package}` : "");
    return <LoginGate next={next} />;
  }

  const blocking = await findBlockingPackageOrderByUserId(String(payload.sub));
  if (blocking) {
    const isPendingOrder = blocking.kind === "pending_order";
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-xl border border-border bg-card shadow-sm">
          <CardContent className="space-y-6 p-6 text-center sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <p className="text-ui-body-sm font-semibold text-primary">패키지권 확인 필요</p>
              <h2 className="text-ui-page-title font-semibold">
                현재 패키지 추가 구매가 제한됩니다
              </h2>
              <p className="break-keep text-ui-body text-muted-foreground">
                {isPendingOrder
                  ? "입금 확인 대기 중인 패키지 주문이 있어 새 패키지를 바로 구매할 수 없습니다."
                  : "사용 가능한 패키지권이 남아 있어 기존 패키지권을 먼저 이용해 주세요."}
              </p>
            </div>
            <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 text-left text-ui-body-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">현재 상태</p>
                  <p className="mt-1 text-muted-foreground">
                    {isPendingOrder ? "입금 확인 대기" : "사용 가능한 패키지권 보유"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">다음 행동</p>
                  <p className="mt-1 text-muted-foreground">
                    {isPendingOrder
                      ? "기존 주문의 입금 상태 확인"
                      : `남은 횟수 ${Number(blocking.activePass.remainingCount ?? 0)}회 확인`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <Button asChild variant="outline" className="h-11">
                <Link href="/services/packages">패키지 목록으로 이동</Link>
              </Button>
              <Button asChild className="h-11">
                <Link href="/mypage?tab=passes">내 패키지권 확인</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // checkout 첫 진입에서 /api/packages/settings 재요청을 없애기 위해,
  // 목록 페이지와 동일한 loadPackageSettings 서버 선조회 결과를 전달한다.
  // 이 값은 로그인 사용자와 무관한 공용 설정이라 서버에서 계산 가능하다.
  const { packageConfigs } = await loadPackageSettings();
  const initialPackageConfigs = packageConfigs
    .filter((pkg) => pkg.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // ownership 차단은 서버에서 blockingOrder로 이미 판정했다.
  // checkout client가 mount 후 /api/packages/ownership를 다시 부를 필요가 없다.
  return (
    <PackageCheckoutClient
      initialUser={{
        id: String(authUser._id),
        email: String(authUser.email ?? (payload as any)?.email ?? ""),
        name: String(authUser.name ?? (payload as any)?.name ?? ""),
        phone: String(authUser.phone ?? ""),
      }}
      initialQuery={sp}
      initialPackageConfigs={initialPackageConfigs}
      initialOwnershipBlockedMessage={null}
    />
  );
}
