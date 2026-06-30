"use client";

import { adminFetcher } from "@/lib/admin/adminFetcher";
import { formatKoreanDateTime } from "@/lib/korean-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

type Item = { id: string; title: string; amount: number; description?: string; customerName?: string; customerPhone?: string; customerEmail?: string; status: string; paymentStatus: string; createdAt: string; paidAt?: string; canceledAt?: string };
type ListResponse = { ok: boolean; items: Item[] };
type SaveResponse = { ok: boolean; message?: string };
const empty = { title: "", amount: "", description: "", customerName: "", customerPhone: "", customerEmail: "" };
const defaultCancelReason = "관리자 개인결제 승인취소";

export default function PrivatePaymentsClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Item | null>(null);
  const [message, setMessage] = useState("");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const load = async () => { const json = await adminFetcher<ListResponse>("/api/admin/private-payments?limit=50"); setItems(json.items || []); };
  useEffect(() => { load().catch(() => setMessage("목록을 불러오지 못했습니다.")); }, []);
  const save = async () => {
    setMessage("");
    const url = editing ? `/api/admin/private-payments/${editing.id}` : "/api/admin/private-payments";
    const json = await adminFetcher<SaveResponse>(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: Number(form.amount), status: editing?.status || "active" }) });
    if (!json.ok) throw new Error(json.message || "저장에 실패했습니다.");
    setForm(empty); setEditing(null); setMessage(editing ? "수정했습니다." : "개인결제 링크 생성"); await load();
  };
  const edit = (item: Item) => { setEditing(item); setForm({ title: item.title, amount: String(item.amount), description: item.description || "", customerName: item.customerName || "", customerPhone: item.customerPhone || "", customerEmail: item.customerEmail || "" }); };
  const copy = async (id: string) => { const url = `${window.location.origin}/private-payments/${id}`; await navigator.clipboard.writeText(url); setMessage("고객에게 전달할 결제 링크입니다. 링크를 복사했습니다."); };
  const cancelPayment = async (item: Item) => {
    const reason = window.prompt("NICEPAY 승인취소를 진행합니다. 취소 후 이 개인결제 링크로 다시 결제할 수 없습니다.\n취소 사유를 입력해 주세요.", defaultCancelReason);
    if (reason === null) return;
    const normalizedReason = reason.trim() || defaultCancelReason;
    setCancelingId(item.id); setMessage("");
    try {
      const json = await adminFetcher<SaveResponse>(`/api/admin/private-payments/${item.id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: normalizedReason }) });
      if (!json.ok) throw new Error(json.message || "결제취소에 실패했습니다.");
      setMessage("개인결제를 취소했습니다."); await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "결제취소에 실패했습니다.");
    } finally {
      setCancelingId(null);
    }
  };
  return <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
    <Card><CardHeader><CardTitle>개인결제 링크 생성</CardTitle></CardHeader><CardContent className="space-y-3">
      {editing?.paymentStatus === "결제완료" && <p className="text-sm text-destructive">결제완료 건은 금액과 결제명을 수정할 수 없습니다.</p>}
      <Input placeholder="결제명 title" value={form.title} disabled={editing?.paymentStatus === "결제완료"} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <Input placeholder="금액 amount" type="number" min={1000} value={form.amount} disabled={editing?.paymentStatus === "결제완료"} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
      <Textarea placeholder="설명 description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Input placeholder="고객명 customerName" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
      <Input placeholder="연락처 customerPhone" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
      <Input placeholder="이메일 customerEmail" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
      <div className="flex gap-2"><Button onClick={() => save().catch((e) => setMessage(e.message))}>{editing ? "수정 저장" : "생성"}</Button>{editing && <Button variant="outline" onClick={() => { setEditing(null); setForm(empty); }}>취소</Button>}</div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>개인결제 목록</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">결제명</th><th>금액</th><th>고객</th><th>상태</th><th>결제상태</th><th>생성일</th><th>결제완료일</th><th>결제취소일</th><th>링크 복사</th><th>상세/수정</th><th>승인취소</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b"><td className="p-2 font-medium">{item.title}</td><td>{item.amount.toLocaleString("ko-KR")}원</td><td>{item.customerName || "-"}</td><td><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge></td><td><Badge variant={item.paymentStatus === "결제완료" ? "default" : item.paymentStatus === "결제취소" ? "destructive" : "outline"}>{item.paymentStatus}</Badge></td><td>{formatKoreanDateTime(item.createdAt)}</td><td>{formatKoreanDateTime(item.paidAt)}</td><td>{formatKoreanDateTime(item.canceledAt)}</td><td><Button size="sm" variant="outline" onClick={() => copy(item.id)}>복사</Button></td><td><Button size="sm" variant="ghost" onClick={() => edit(item)}>상세/수정</Button></td><td>{item.paymentStatus === "결제완료" ? <Button size="sm" variant="destructive" disabled={cancelingId === item.id} onClick={() => cancelPayment(item)}>{cancelingId === item.id ? "취소 처리 중..." : "결제취소"}</Button> : "-"}</td></tr>)}</tbody></table></CardContent></Card>
  </div>;
}
