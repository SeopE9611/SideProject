"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminFetcher } from "@/lib/admin/adminFetcher";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { formatKoreanDateTime } from "@/lib/korean-date";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  title: string;
  amount: number;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: string;
  paymentStatus: string;
  expiresAt?: string;
  archivedAt?: string;
  createdAt: string;
  paidAt?: string;
  canceledAt?: string;
};
type Summary = { total: number; pending: number; paid: number; canceled: number; monthPaidAmount: number };
type ListResponse = { ok: boolean; items: Item[]; summary?: Summary };
type SaveResponse = { ok: boolean; message?: string };
type Filters = { q: string; paymentStatus: string; status: string; archived: string; from: string; to: string };
const empty = {
  title: "",
  amount: "",
  description: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  expiresAt: "",
};
const emptyFilters: Filters = { q: "", paymentStatus: "", status: "", archived: "active", from: "", to: "" };
const defaultCancelReason = "관리자 개인결제 승인취소";
const defaultSummary: Summary = { total: 0, pending: 0, paid: 0, canceled: 0, monthPaidAmount: 0 };

const statusLabel = (status: string) => (status === "active" ? "활성" : "비활성");
const money = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
const toDateTimeLocal = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const defaultExpiresAt = () => {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const isExpired = (item: Item) => !!item.expiresAt && new Date(item.expiresAt).getTime() < Date.now();

export default function PrivatePaymentsClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary>(defaultSummary);
  const [form, setForm] = useState({ ...empty, expiresAt: defaultExpiresAt() });
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [message, setMessage] = useState("");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Item | null>(null);
  const [cancelReason, setCancelReason] = useState(defaultCancelReason);
  const [cancelError, setCancelError] = useState("");
  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: "50", sort, dir });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params.toString();
  }, [filters, sort, dir]);
  const load = async () => {
    const json = await adminFetcher<ListResponse>(`/api/admin/private-payments?${query}`);
    setItems(json.items || []);
    setSummary(json.summary || defaultSummary);
    setSelected([]);
  };
  useEffect(() => {
    load().catch(() => setMessage("목록을 불러오지 못했습니다."));
  }, [query]);
  const save = async () => {
    setMessage("");
    const url = editing ? `/api/admin/private-payments/${editing.id}` : "/api/admin/private-payments";
    const json = await adminFetcher<SaveResponse>(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount), status: editing?.status || "active" }),
    });
    if (!json.ok) throw new Error(json.message || "저장에 실패했습니다.");
    setForm({ ...empty, expiresAt: defaultExpiresAt() });
    setEditing(null);
    setMessage(editing ? "수정했습니다." : "개인결제 링크를 생성했습니다. 링크 복사 버튼으로 고객에게 전달해 주세요.");
    await load();
  };
  const edit = (item: Item) => {
    setEditing(item);
    setForm({
      title: item.title,
      amount: String(item.amount),
      description: item.description || "",
      customerName: item.customerName || "",
      customerPhone: item.customerPhone || "",
      customerEmail: item.customerEmail || "",
      expiresAt: toDateTimeLocal(item.expiresAt),
    });
  };
  const copy = async (id: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/private-payments/${id}`);
    setMessage("고객에게 전달할 결제 링크입니다. 링크를 복사했습니다.");
  };
  const runItemAction = async (item: Item, action: "archive" | "unarchive" | "delete") => {
    const json = await adminFetcher<SaveResponse>(`/api/admin/private-payments/${item.id}`, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: action === "delete" ? undefined : JSON.stringify({ action }),
    });
    if (!json.ok) throw new Error(json.message || "작업에 실패했습니다.");
    setMessage(action === "archive" ? "보관했습니다." : action === "unarchive" ? "보관 해제했습니다." : "결제대기 건을 삭제했습니다.");
    await load();
  };
  const runBulkAction = async (action: "archive" | "unarchive" | "delete_pending") => {
    const json = await adminFetcher<SaveResponse>("/api/admin/private-payments/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: selected }),
    });
    if (!json.ok) throw new Error(json.message || "선택 작업에 실패했습니다.");
    setMessage(action === "archive" ? "선택 항목을 보관했습니다." : action === "unarchive" ? "선택 항목을 보관 해제했습니다." : "선택한 결제대기 건을 삭제했습니다.");
    await load();
  };
  const openCancelDialog = (item: Item) => {
    setCancelTarget(item);
    setCancelReason(defaultCancelReason);
    setCancelError("");
    setMessage("");
  };
  const cancelPayment = async () => {
    if (!cancelTarget) return;
    setCancelingId(cancelTarget.id);
    setCancelError("");
    try {
      const json = await adminFetcher<SaveResponse>(`/api/admin/private-payments/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() || defaultCancelReason }),
      });
      if (!json.ok) throw new Error(json.message || "결제취소에 실패했습니다.");
      setMessage("개인결제를 취소했습니다.");
      setCancelTarget(null);
      await load();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "결제취소에 실패했습니다.");
    } finally {
      setCancelingId(null);
    }
  };
  const toggleSort = (key: string) => {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir("desc");
    }
  };
  const allChecked = items.length > 0 && selected.length === items.length;
  const selectedItems = items.filter((item) => selected.includes(item.id));
  const hasArchivable = selectedItems.some((item) => item.paymentStatus !== "결제대기" && !item.archivedAt);
  const hasUnarchivable = selectedItems.some((item) => item.archivedAt);
  const hasPending = selectedItems.some((item) => item.paymentStatus === "결제대기");
  const header = (label: string, key: string) => (
    <button className="inline-flex items-center gap-1 font-semibold" type="button" onClick={() => toggleSort(key)}>
      {label}<span className="text-[10px] text-muted-foreground">{sort === key ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        {[['전체', summary.total], ['결제대기', summary.pending], ['결제완료', summary.paid], ['결제취소', summary.canceled], ['이번 달 완료금액', money(summary.monthPaidAmount)]].map(([label, value]) => (
          <Card key={label} className={cn(adminSurface.card, "shadow-sm")}><CardContent className="p-4"><p className={adminTypography.caption}>{label}</p><p className="mt-2 text-xl font-bold">{value}</p></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className={adminSurface.card}>
          <CardHeader><CardTitle>{editing ? "개인결제 상세/수정" : "개인결제 링크 생성"}</CardTitle><p className="text-sm text-muted-foreground">만료일을 비우면 만료 없이 운영됩니다.</p></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label>결제명</Label><Input placeholder="예: 김재민 1회 레슨권" value={form.title} disabled={editing?.paymentStatus === "결제완료"} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>결제금액</Label><Input placeholder="예: 40000" type="number" min={1000} value={form.amount} disabled={editing?.paymentStatus === "결제완료"} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>만료일</Label><Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /><p className="text-xs text-muted-foreground">신규 생성 기본값은 생성일 기준 7일 뒤입니다. 비우면 만료 없음입니다.</p></div>
            <div className="space-y-1.5"><Label>설명</Label><Textarea placeholder="예: 레슨 1회권 결제" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-3"><div className="space-y-1.5"><Label>고객명</Label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div><div className="space-y-1.5"><Label>연락처</Label><Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} /></div><div className="space-y-1.5"><Label>이메일</Label><Input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} /></div></div>
            <div className="flex flex-wrap gap-2"><Button onClick={() => save().catch((e) => setMessage(e.message))}>{editing ? "수정 저장" : "생성"}</Button>{editing && <Button variant="outline" onClick={() => { setEditing(null); setForm({ ...empty, expiresAt: defaultExpiresAt() }); }}>취소</Button>}<Button type="button" variant="ghost" onClick={() => setForm({ ...form, expiresAt: "" })}>만료 없음</Button></div>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </CardContent>
        </Card>
        <Card className={adminSurface.card}>
          <CardHeader><CardTitle>개인결제 목록</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 rounded-xl border bg-muted/20 p-3 md:grid-cols-6"><Input placeholder="검색어" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /><select className="rounded-md border bg-background px-3 py-2 text-sm" value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}><option value="">결제상태 전체</option><option>결제대기</option><option>결제완료</option><option>결제취소</option></select><select className="rounded-md border bg-background px-3 py-2 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">활성상태 전체</option><option value="active">활성</option><option value="inactive">비활성</option></select><select className="rounded-md border bg-background px-3 py-2 text-sm" value={filters.archived} onChange={(e) => setFilters({ ...filters, archived: e.target.value })}><option value="active">보관 제외</option><option value="archived">보관함 보기</option><option value="all">전체 보기</option></select><Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /><Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></div>
            <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!hasArchivable} onClick={() => runBulkAction("archive").catch((e) => setMessage(e.message))}>선택 보관</Button><Button size="sm" variant="outline" disabled={!hasUnarchivable} onClick={() => runBulkAction("unarchive").catch((e) => setMessage(e.message))}>선택 보관 해제</Button><Button size="sm" variant="destructive" disabled={!hasPending} onClick={() => runBulkAction("delete_pending").catch((e) => setMessage(e.message))}>선택 삭제</Button></div>
            <div className="max-h-[680px] overflow-auto rounded-xl border">
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur"><tr className="border-b text-left"><th className="p-3"><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? items.map((item) => item.id) : [])} /></th><th className="p-3">{header("결제 정보", "title")}</th><th className="p-3">고객</th><th className="p-3">{header("금액", "amount")}</th><th className="p-3">{header("상태", "paymentStatus")}</th><th className="p-3">{header("만료/일시", "expiresAt")}</th><th className="p-3 text-right">작업</th></tr></thead>
                <tbody>{items.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">조건에 맞는 개인결제가 없습니다.</td></tr> : items.map((item) => (
                  <tr key={item.id} className="border-b align-top transition-colors hover:bg-muted/40"><td className="p-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} /></td><td className="p-3"><div className="font-medium">{item.title}</div>{item.description && <div className="mt-1 max-w-[260px] text-xs text-muted-foreground line-clamp-2">{item.description}</div>}<div className="mt-2 text-xs text-muted-foreground">ID {item.id}</div></td><td className="p-3"><div>{item.customerName || "-"}</div>{(item.customerPhone || item.customerEmail) && <div className="mt-1 text-xs text-muted-foreground">{[item.customerPhone, item.customerEmail].filter(Boolean).join(" · ")}</div>}</td><td className="p-3 font-semibold">{money(item.amount)}</td><td className="p-3"><div className="flex flex-wrap gap-1.5"><Badge variant={item.paymentStatus === "결제완료" ? "default" : item.paymentStatus === "결제취소" ? "destructive" : "outline"}>{item.paymentStatus}</Badge>{isExpired(item) && <Badge variant="destructive">만료됨</Badge>}<Badge variant={item.status === "active" ? "secondary" : "outline"}>{statusLabel(item.status)}</Badge>{item.archivedAt && <Badge variant="outline">보관됨</Badge>}</div></td><td className="p-3 text-xs text-muted-foreground"><div>만료: {item.expiresAt ? formatKoreanDateTime(item.expiresAt) : "만료 없음"}</div><div>생성: {formatKoreanDateTime(item.createdAt)}</div>{item.paidAt && <div>완료: {formatKoreanDateTime(item.paidAt)}</div>}{item.canceledAt && <div>취소: {formatKoreanDateTime(item.canceledAt)}</div>}</td><td className="p-3"><div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={() => copy(item.id)}>링크 복사</Button><Button size="sm" variant="ghost" onClick={() => edit(item)}>상세/수정</Button>{item.paymentStatus === "결제완료" && <Button size="sm" variant="destructive" disabled={cancelingId === item.id} onClick={() => openCancelDialog(item)}>{cancelingId === item.id ? "취소 처리 중..." : "결제취소"}</Button>}{item.paymentStatus === "결제대기" ? <Button size="sm" variant="destructive" onClick={() => runItemAction(item, "delete").catch((e) => setMessage(e.message))}>결제대기 삭제</Button> : item.archivedAt ? <Button size="sm" variant="outline" onClick={() => runItemAction(item, "unarchive").catch((e) => setMessage(e.message))}>보관 해제</Button> : <Button size="sm" variant="outline" onClick={() => runItemAction(item, "archive").catch((e) => setMessage(e.message))}>보관</Button>}</div></td></tr>
                ))}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open && !cancelingId) { setCancelError(""); setCancelTarget(null); } }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>개인결제를 취소할까요?</AlertDialogTitle><AlertDialogDescription>NICEPAY 승인취소가 진행됩니다. 취소 후 이 개인결제 링크로 다시 결제할 수 없습니다.</AlertDialogDescription></AlertDialogHeader><div className="space-y-2"><Label htmlFor="cancel-reason">취소 사유</Label><Textarea id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} disabled={!!cancelingId} /></div>{cancelError && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{cancelError}</p>}<AlertDialogFooter><AlertDialogCancel disabled={!!cancelingId}>닫기</AlertDialogCancel><Button variant="destructive" disabled={!!cancelingId} onClick={cancelPayment}>{cancelingId ? "취소 처리 중..." : "승인취소 진행"}</Button></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
