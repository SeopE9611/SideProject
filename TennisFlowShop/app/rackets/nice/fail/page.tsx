import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const FAIL_GUIDE_MAP: Record<string, { title: string; description: string[]; accent?: "default" | "warning" }> = {
  PAYMENT_PROVIDER_DISABLED: {
    title: "현재 Nice 결제를 사용할 수 없어요",
    description: ["운영 설정상 Nice 결제가 비활성화되어 있어 결제를 진행할 수 없어요.", "다른 결제수단을 이용하거나 관리자에게 문의해주세요."],
  },
  INVALID_QUERY: {
    title: "결제 결과 정보가 올바르지 않아요",
    description: ["결제 결과를 확인하는 중 필수 값이 누락되었어요.", "라켓 구매 페이지로 돌아가 다시 결제를 진행해주세요."],
  },
  AUTH_FAILED: {
    title: "인증 단계에서 결제가 중단되었어요",
    description: ["인증 결과 확인 중 문제가 발생했어요.", "잠시 후 다시 시도하거나 다른 결제수단을 이용해주세요."],
  },
  APPROVE_FAILED: {
    title: "승인 처리에 실패했어요",
    description: ["인증 후 승인 요청 중 문제가 발생했어요.", "잠시 후 다시 시도하거나 관리자에게 문의해주세요."],
  },
  AMOUNT_MISMATCH: {
    title: "결제 금액 검증에 실패했어요",
    description: ["결제 금액이 주문 정보와 일치하지 않아 결제가 중단되었어요.", "라켓 구매 페이지에서 금액을 다시 확인한 뒤 시도해주세요."],
  },
  SESSION_NOT_FOUND: {
    title: "결제 세션을 찾지 못했어요",
    description: ["결제 준비 정보가 없어 결제를 완료할 수 없어요.", "라켓 구매 페이지에서 다시 결제를 시도해주세요."],
  },
  SESSION_EXPIRED: {
    title: "결제 유효시간이 만료되었어요",
    description: ["결제 준비 시간이 지나 결제를 이어서 진행할 수 없어요.", "라켓 구매 페이지에서 다시 결제를 시도해주세요."],
  },
  ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE: {
    title: "결제 후 주문 처리 중 문제가 발생했어요",
    description: ["결제 승인은 완료됐지만 라켓 주문 생성 단계에서 문제가 발생했어요.", "중복 결제를 피하기 위해 주문 내역 또는 관리자 확인이 필요합니다."],
    accent: "warning",
  },
  UNKNOWN: {
    title: "라켓 결제를 완료하지 못했어요",
    description: ["결제 처리 중 문제가 발생했어요.", "라켓 구매 페이지로 돌아가 다시 시도해주세요."],
  },
};

export default async function RacketNiceFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string; fallback?: string }>;
}) {
  const sp = await searchParams;
  const rawCode = (sp.code || "UNKNOWN").trim().toUpperCase();
  const code = FAIL_GUIDE_MAP[rawCode] ? rawCode : "UNKNOWN";
  const guide = FAIL_GUIDE_MAP[code];
  const rawMessage = (sp.message || "").trim();

  const fallbackRaw = (sp.fallback || "/rackets").trim();
  const fallbackHref = fallbackRaw.startsWith("/rackets/") || fallbackRaw === "/rackets" ? fallbackRaw : "/rackets";

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{guide.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm text-muted-foreground">
            {guide.description.map((line) => (
              <p key={line}>• {line}</p>
            ))}
          </div>

          {guide.accent === "warning" && (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning dark:bg-warning/15">
              중복 결제를 막기 위해 반복 결제를 피하고, 주문 내역 또는 관리자 확인 후 진행해주세요.
            </div>
          )}

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <p>오류 코드: {code}</p>
            {rawMessage ? <p className="mt-1">참고 메시지: {rawMessage}</p> : null}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href={fallbackHref}>라켓 구매로 돌아가기</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/rackets">라켓 목록으로 이동</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
