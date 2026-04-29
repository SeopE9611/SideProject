import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "환불 및 취소 정책 | 도깨비테니스",
  description: "도깨비테니스의 주문 취소, 환불, 교체서비스, 패키지, 대여 관련 환불 기준을 안내합니다.",
};

const sections = [
  { title: "공통 안내", items: ["주문 상태에 따라 취소 가능 여부가 달라질 수 있습니다.", "이미 작업이 시작된 교체서비스는 취소/환불이 제한될 수 있습니다.", "결제수단에 따라 환불 처리 시간이 다를 수 있습니다.", "무통장 입금 건은 환불 계좌 확인이 필요할 수 있습니다.", "카드/간편결제 건은 PG사 정책에 따라 처리 시간이 달라질 수 있습니다."] },
  { title: "상품 주문 취소/환불", items: ["결제 완료 후 배송 준비 전 단계에서는 취소 요청이 가능합니다.", "배송 준비 또는 배송 중 단계에서는 단순 취소가 제한될 수 있습니다.", "상품 수령 후 교환/환불은 상품 상태 확인 후 순차 처리됩니다.", "사용 흔적, 훼손, 구성품 누락이 있는 경우 환불이 제한될 수 있습니다."] },
  { title: "스트링 교체서비스 취소/환불", items: ["신청 접수 후 작업 시작 전에는 취소 요청이 가능합니다.", "스트링 장착 작업이 시작된 이후에는 취소/환불이 제한될 수 있습니다.", "고객 요청 스펙 기반 서비스 특성상 작업 완료 후 단순 변심 환불은 제한될 수 있습니다.", "서비스 진행 상태는 마이페이지 또는 고객센터를 통해 확인하실 수 있습니다."] },
  { title: "패키지 환불", items: ["패키지 미사용 상태에서는 취소/환불 요청이 가능합니다.", "일부 사용한 패키지는 사용 횟수와 할인 적용 내역에 따라 환불 가능 금액이 달라질 수 있습니다.", "패키지 혜택이 적용된 경우 사용분은 정상가 또는 정책 기준 금액으로 정산될 수 있습니다.", "정확한 환불 금액은 신청 내역 확인 후 안내드립니다."] },
  { title: "라켓 대여 취소/환불", items: ["대여 시작 전에는 취소 요청이 가능합니다.", "대여가 시작되었거나 상품이 발송된 이후에는 취소/환불이 제한될 수 있습니다.", "보증금은 반납 상태 확인 후 환급 처리됩니다.", "파손, 분실, 구성품 누락이 있는 경우 보증금에서 차감될 수 있습니다."] },
  { title: "환불 처리 기간", items: ["무통장 입금은 환불 계좌 확인 후 영업일 기준 순차 처리됩니다.", "카드/간편결제는 PG사 승인 취소 기준에 따라 처리됩니다.", "실제 환불 반영 시점은 카드사/결제사 정책에 따라 달라질 수 있습니다."] },
];

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <section className="space-y-3 rounded-2xl border bg-background p-6 md:p-8">
        <p className="text-sm font-medium text-primary">Policy</p>
        <h1 className="text-3xl font-bold tracking-tight">환불 및 취소 정책</h1>
        <p className="text-muted-foreground">주문, 교체서비스, 패키지, 대여 이용 전 취소와 환불 기준을 확인해주세요.</p>
        <p className="text-sm text-muted-foreground">정책은 운영 상황과 결제수단에 따라 일부 달라질 수 있으며, 자세한 확인이 필요한 경우 고객센터 Q&A로 문의해주세요.</p>
      </section>

      <section className="mt-8 space-y-4">
        {sections.map((section) => (
          <article key={section.title} className="rounded-2xl border bg-muted/30 p-5 md:p-6">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground md:text-base">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border bg-background p-5 md:p-6">
        <h2 className="text-lg font-semibold">문의 안내</h2>
        <p className="mt-2 text-sm text-muted-foreground">최종 환불 가능 여부와 금액은 주문/서비스 상태 확인 후 안내드리며, 필요 시 운영 정책 기준에 따라 추가 확인이 진행될 수 있습니다.</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground md:text-base">
          <li>고객센터: <Link href="/support" className="underline underline-offset-4">/support</Link></li>
          <li>Q&A 문의: <Link href="/board/qna/write" className="underline underline-offset-4">/board/qna/write</Link></li>
          <li>약관: <Link href="/terms" className="underline underline-offset-4">/terms</Link></li>
          <li>개인정보처리방침: <Link href="/privacy" className="underline underline-offset-4">/privacy</Link></li>
        </ul>
      </section>
    </main>
  );
}
