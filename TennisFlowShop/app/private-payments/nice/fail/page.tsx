import { PaymentFailureResult } from "@/components/checkout/PaymentFailureResult";

export default async function PrivatePaymentNiceFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string; paymentId?: string }>;
}) {
  const params = await searchParams;
  return (
    <PaymentFailureResult
      guide={{
        title: "결제를 완료하지 못했습니다.",
        description: [params.message || "결제 처리 중 문제가 발생했습니다."],
      }}
      code={params.code || "UNKNOWN"}
      primaryAction={
        params.paymentId
          ? {
              label: "결제 링크로 돌아가기",
              href: `/private-payments/${params.paymentId}`,
            }
          : {
              label: "홈으로 이동",
              href: "/",
            }
      }
    />
  );
}
