"use client";
import { ResultState } from "@/components/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import Link from "next/link";
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
export default function PrivatePaymentClient({ item }: { item: Item }) {
  const [buyer, setBuyer] = useState({
    name: item.customerName || "",
    phone: item.customerPhone || "",
    email: item.customerEmail || "",
  });
  const isExpired = !!item.expiresAt && new Date(item.expiresAt).getTime() < Date.now();
  const emailInvalid = !!buyer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email);
  if (item.status === "inactive")
    return (
      <ResultState
        title="현재 사용할 수 없는 결제 링크입니다."
        description="관리자에게 문의해 주세요."
      >
        <Button asChild>
          <Link href="/">홈으로 이동</Link>
        </Button>
      </ResultState>
    );
  if (isExpired)
    return (
      <ResultState
        title="만료된 결제 링크입니다."
        description="새 결제가 필요한 경우 관리자에게 문의해 주세요."
      >
        <Button asChild>
          <Link href="/">홈으로 이동</Link>
        </Button>
      </ResultState>
    );
  if (item.paymentStatus === "결제완료")
    return (
      <ResultState title="이미 결제가 완료된 링크입니다." description="관리자에게 문의해 주세요.">
        <Button asChild>
          <Link href="/">홈으로 이동</Link>
        </Button>
      </ResultState>
    );
  if (item.paymentStatus === "결제취소")
    return (
      <ResultState
        title="취소된 결제 링크입니다."
        description="새 결제가 필요한 경우 관리자에게 문의해 주세요."
      >
        <Button asChild>
          <Link href="/">홈으로 이동</Link>
        </Button>
      </ResultState>
    );
  if (item.paymentStatus !== "결제대기")
    return (
      <ResultState title="결제할 수 없는 링크입니다." description="관리자에게 문의해 주세요.">
        <Button asChild>
          <Link href="/">홈으로 이동</Link>
        </Button>
      </ResultState>
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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Card className="shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle>개인결제</CardTitle>
          <p className="text-sm text-muted-foreground">
            안내받은 결제 정보를 확인한 뒤 결제를 진행해 주세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">결제명</p>
              <div className="text-lg font-semibold">{item.title}</div>
            </div>
            {item.description && (
              <div>
                <p className="text-xs text-muted-foreground">설명</p>
                <p className="text-sm">{item.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">결제금액</p>
              <div className="text-2xl font-bold">{item.amount.toLocaleString("ko-KR")}원</div>
            </div>
            {(item.customerName || item.customerPhone || item.customerEmail) && (
              <div>
                <p className="text-xs text-muted-foreground">고객 정보</p>
                <p className="text-sm">
                  {[item.customerName, item.customerPhone, item.customerEmail]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            )}
          </div>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>이름</Label>
              <Input
                placeholder="이름"
                value={buyer.name}
                onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>연락처</Label>
              <Input
                placeholder="숫자만 입력해도 됩니다"
                value={buyer.phone}
                onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                하이픈 없이 숫자만 입력해도 결제 요청 시 자동으로 정리됩니다.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>
                이메일 <span className="text-muted-foreground">(선택)</span>
              </Label>
              <Input
                placeholder="이메일(선택)"
                value={buyer.email}
                onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
              />
            </div>
            {emailInvalid && (
              <p className="text-sm text-destructive">이메일 형식을 확인해 주세요.</p>
            )}
          </div>
          {disabledReason && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {disabledReason}
            </p>
          )}
          <PrivatePaymentNiceButton
            privatePaymentId={item.id}
            buyerInfo={{ ...buyer, phone: phoneDigits }}
            disabled={disabled}
          />
        </CardContent>
      </Card>
    </main>
  );
}
