import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TossCheckoutFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const code = sp.code || "UNKNOWN";
  const message = sp.message || "결제가 취소되었거나 실패했습니다.";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold">결제에 실패했습니다.</h1>
      <p className="text-sm text-muted-foreground">코드: {code}</p>
      <p className="text-sm">{message}</p>
      <Button asChild>
        <Link href="/checkout">체크아웃으로 돌아가기</Link>
      </Button>
    </div>
  );
}
