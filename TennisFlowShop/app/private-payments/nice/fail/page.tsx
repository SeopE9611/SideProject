import { ResultState } from "@/components/public";
import { Button } from "@/components/ui/button";

export default async function PrivatePaymentNiceFailPage({ searchParams }: { searchParams: Promise<{ code?: string; message?: string; paymentId?: string }> }) {
  const params = await searchParams;
  return <main className="mx-auto max-w-2xl px-4 py-10"><ResultState title="결제를 완료하지 못했습니다." description={params.message || "결제 처리 중 문제가 발생했습니다."}><div className="text-sm text-muted-foreground">오류 코드: {params.code || "UNKNOWN"}</div>{params.paymentId ? <Button asChild><a href={`/private-payments/${params.paymentId}`}>결제 링크로 돌아가기</a></Button> : <Button asChild><a href="/">홈으로 이동</a></Button>}</ResultState></main>;
}
