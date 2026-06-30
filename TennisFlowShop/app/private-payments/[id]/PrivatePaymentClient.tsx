"use client";
import { ResultState } from "@/components/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import PrivatePaymentNiceButton from "./PrivatePaymentNiceButton";

type Item = { id: string; title: string; amount: number; description?: string; customerName?: string; customerPhone?: string; customerEmail?: string; status: string; paymentStatus: string };
export default function PrivatePaymentClient({ item }: { item: Item }) {
  const [buyer, setBuyer] = useState({ name: item.customerName || "", phone: item.customerPhone || "", email: item.customerEmail || "" });
  const emailInvalid = !!buyer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email);
  if (item.status === "inactive") return <ResultState title="현재 사용할 수 없는 결제 링크입니다." description="관리자에게 문의해 주세요."><Button asChild><a href="/">홈으로 이동</a></Button></ResultState>;
  if (item.paymentStatus === "결제완료") return <ResultState title="이미 결제가 완료된 링크입니다." description="결제 상태는 관리자에게 문의해 주세요."><Button asChild><a href="/">홈으로 이동</a></Button></ResultState>;
  const disabled = !buyer.name.trim() || buyer.phone.replace(/\D/g, "").length < 8 || emailInvalid;
  return <main className="mx-auto max-w-2xl px-4 py-10"><Card><CardHeader><CardTitle>개인결제</CardTitle><p className="text-sm text-muted-foreground">안내받은 결제 정보를 확인한 뒤 결제를 진행해 주세요.</p></CardHeader><CardContent className="space-y-5"><div className="rounded-lg border p-4 space-y-2"><div className="text-lg font-semibold">{item.title}</div>{item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}<div className="text-2xl font-bold">결제금액 {item.amount.toLocaleString()}원</div>{(item.customerName || item.customerPhone || item.customerEmail) && <p className="text-sm text-muted-foreground">{[item.customerName, item.customerPhone, item.customerEmail].filter(Boolean).join(" · ")}</p>}</div><div className="grid gap-3"><Input placeholder="이름" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} /><Input placeholder="연락처" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} /><Input placeholder="이메일(선택)" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />{emailInvalid && <p className="text-sm text-destructive">이메일 형식을 확인해 주세요.</p>}</div><PrivatePaymentNiceButton privatePaymentId={item.id} buyerInfo={{ ...buyer, phone: buyer.phone.replace(/\D/g, "") }} disabled={disabled} /></CardContent></Card></main>;
}
