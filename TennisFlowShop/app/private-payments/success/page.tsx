import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { privatePayments } from "@/lib/private-payments";
import { ResultState } from "@/components/public";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function PrivatePaymentSuccessPage({ searchParams }: { searchParams: Promise<{ paymentId?: string }> }) {
  const { paymentId } = await searchParams;
  const item = paymentId && ObjectId.isValid(paymentId) ? await privatePayments((await clientPromise).db()).findOne({ _id: new ObjectId(paymentId) }) : null;
  return <main className="mx-auto max-w-2xl px-4 py-10"><ResultState title="결제가 완료되었습니다." description="개인결제 승인 내역을 확인해 주세요."><div className="w-full rounded-lg border p-4 text-left text-sm space-y-2"><div>결제명: {item?.title || "-"}</div><div>결제금액: {item?.amount?.toLocaleString() || "0"}원</div><div>결제상태: {item?.paymentStatus || "-"}</div><div>결제일: {item?.paidAt ? new Date(item.paidAt).toLocaleString() : "-"}</div></div><Button asChild><Link href="/">홈으로 이동</Link></Button></ResultState></main>;
}
