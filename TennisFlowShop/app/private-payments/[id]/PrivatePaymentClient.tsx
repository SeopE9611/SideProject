"use client";

import Link from "next/link";
import { useState } from "react";

import { PublicPageHero, ResultState, SummaryCard } from "@/components/public";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SerializedPrivatePayment } from "@/lib/private-payments";

import PrivatePaymentNiceButton from "./PrivatePaymentNiceButton";

type Item = Pick<
  SerializedPrivatePayment,
  | "id"
  | "title"
  | "amount"
  | "description"
  | "customerName"
  | "customerPhone"
  | "customerEmail"
  | "status"
  | "paymentStatus"
  | "expiresAt"
>;

function PaymentShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background pb-10">
      <PublicPageHero
        variant="feature"
        eyebrow="개인결제"
        title="안내받은 결제 정보를 확인해 주세요"
        description="결제 내용과 구매자 정보를 확인한 뒤 안전하게 결제를 진행할 수 있습니다."
      />
      <div className="mx-auto max-w-2xl px-4 pt-6 bp-sm:pt-8">{children}</div>
    </main>
  );
}

function LinkResult({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: "success" | "warning" | "error";
}) {
  return (
    <PaymentShell>
      <div className="rounded-panel border border-border/80 bg-card shadow-soft">
        <ResultState
          status={status}
          title={title}
          description={description}
          actions={
            <Button asChild variant="outline" className="w-full rounded-control sm:w-auto">
              <Link href="/">홈으로 이동</Link>
            </Button>
          }
        />
      </div>
    </PaymentShell>
  );
}

export default function PrivatePaymentClient({
  item,
  isExpired,
}: {
  item: Item;
  isExpired: boolean;
}) {
  const [buyer, setBuyer] = useState({
    name: item.customerName || "",
    phone: item.customerPhone || "",
    email: item.customerEmail || "",
  });
  const emailInvalid = !!buyer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email);
  if (item.status === "inactive")
    return (
      <LinkResult
        status="warning"
        title="현재 사용할 수 없는 결제 링크입니다."
        description="관리자에게 문의해 주세요."
      />
    );
  if (item.paymentStatus === "결제완료")
    return (
      <LinkResult
        status="success"
        title="이미 결제가 완료된 링크입니다."
        description="관리자에게 문의해 주세요."
      />
    );
  if (item.paymentStatus === "결제취소")
    return (
      <LinkResult
        status="error"
        title="취소된 결제 링크입니다."
        description="새 결제가 필요한 경우 관리자에게 문의해 주세요."
      />
    );
  if (item.paymentStatus !== "결제대기")
    return (
      <LinkResult
        status="warning"
        title="결제할 수 없는 링크입니다."
        description="관리자에게 문의해 주세요."
      />
    );
  if (isExpired)
    return (
      <LinkResult
        status="warning"
        title="만료된 결제 링크입니다."
        description="새 결제가 필요한 경우 관리자에게 문의해 주세요."
      />
    );

  const phoneDigits = buyer.phone.replace(/\D/g, "");
  const missingName = !buyer.name.trim();
  const phoneInvalid = phoneDigits.length < 8;
  const disabled = missingName || phoneInvalid || emailInvalid;
  const disabledReason = missingName
    ? "이름을 입력하면 결제를 진행할 수 있습니다."
    : phoneInvalid
      ? "연락처를 숫자 기준 8자리 이상 입력해 주세요."
      : emailInvalid
        ? "이메일 형식을 확인해 주세요."
        : "";

  return (
    <PaymentShell>
      <div className="space-y-5">
        <SummaryCard
          variant="feature"
          eyebrow="결제 정보"
          title={item.title}
          description="안내받은 결제 내용을 확인해 주세요."
          contentClassName="space-y-4"
        >
          <div className="rounded-control border border-border bg-brand-highlight-muted/35 p-4">
            <p className="text-ui-body-sm text-muted-foreground">결제금액</p>
            <p className="mt-1 text-ui-page-title font-ui-bold text-brand-highlight-ink">
              {item.amount.toLocaleString("ko-KR")}원
            </p>
          </div>
          {item.description && (
            <div className="rounded-control bg-muted/50 p-4">
              <p className="text-ui-label font-medium text-muted-foreground">결제 설명</p>
              <p className="mt-1 text-ui-body-sm leading-relaxed text-foreground">
                {item.description}
              </p>
            </div>
          )}
          {(item.customerName || item.customerPhone || item.customerEmail) && (
            <div className="rounded-control bg-muted/50 p-4">
              <p className="text-ui-label font-medium text-muted-foreground">안내받은 고객 정보</p>
              <p className="mt-1 text-ui-body-sm text-foreground">
                {[item.customerName, item.customerPhone, item.customerEmail]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          )}
        </SummaryCard>
        <SummaryCard
          variant="feature"
          eyebrow="구매자 정보"
          title="결제할 분의 정보를 입력해 주세요"
          description="이름과 연락처는 필수 입력 항목입니다."
          contentClassName="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="buyer-name">
              이름 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="buyer-name"
              className="h-12 rounded-control"
              placeholder="이름"
              value={buyer.name}
              onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyer-phone">
              연락처 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="buyer-phone"
              className="h-12 rounded-control"
              placeholder="숫자만 입력해도 됩니다"
              value={buyer.phone}
              onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
            />
            <p className="text-ui-body-sm text-muted-foreground">
              하이픈 없이 숫자만 입력해도 결제 요청 시 자동으로 정리됩니다.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyer-email">
              이메일 <span className="font-normal text-muted-foreground">(선택)</span>
            </Label>
            <Input
              id="buyer-email"
              className="h-12 rounded-control"
              placeholder="이메일(선택)"
              value={buyer.email}
              onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
            />
            {emailInvalid && (
              <p className="text-ui-body-sm text-destructive">이메일 형식을 확인해 주세요.</p>
            )}
          </div>
          {disabledReason && (
            <p className="rounded-control bg-brand-highlight-muted/35 px-4 py-3 text-ui-body-sm text-muted-foreground">
              {disabledReason}
            </p>
          )}
          <PrivatePaymentNiceButton
            privatePaymentId={item.id}
            buyerInfo={{ ...buyer, phone: phoneDigits }}
            disabled={disabled}
          />
        </SummaryCard>
      </div>
    </PaymentShell>
  );
}
