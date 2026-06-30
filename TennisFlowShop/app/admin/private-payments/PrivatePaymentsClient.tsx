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
  offlineLink?: {
    status: "linked";
    offlineCustomerId: string;
    offlineRecordId?: string | null;
    linkedAt: string;
    linkedBy: string;
  };
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
const emptyOfflineLinkForm = { customerName: "", customerPhone: "", customerEmail: "", memo: "", createRecord: true };
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
const isExpired = (item: Item, now: number) => !!item.expiresAt && new Date(item.expiresAt).getTime() < now;

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
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleteMode, setDeleteMode] = useState<"item" | "bulk" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [offlineLinkTarget, setOfflineLinkTarget] = useState<Item | null>(null);
  const [offlineLinkForm, setOfflineLinkForm] = useState(emptyOfflineLinkForm);
  const [offlineLinking, setOfflineLinking] = useState(false);
  const [offlineLinkError, setOfflineLinkError] = useState("");
  const [now, setNow] = useState<number | null>(null);
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
  useEffect(() => {
    setNow(Date.now());
  }, []);
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
  const openDeleteDialog = (item?: Item) => {
    setDeleteTarget(item || null);
    setDeleteMode(item ? "item" : "bulk");
    setDeleteError("");
    setMessage("");
  };
  const confirmDelete = async () => {
    if (!deleteMode) return;
    setDeleting(true);
    setDeleteError("");
    try {
      if (deleteMode === "item") {
        if (!deleteTarget) return;
        await runItemAction(deleteTarget, "delete");
      } else {
        await runBulkAction("delete_pending");
      }
      setDeleteTarget(null);
      setDeleteMode(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };
  const openOfflineLinkDialog = (item: Item) => {
    if (item.paymentStatus !== "결제완료" || item.offlineLink?.status === "linked") return;
    setOfflineLinkTarget(item);
    setOfflineLinkForm({
      customerName: item.customerName || "",
      customerPhone: item.customerPhone || "",
      customerEmail: item.customerEmail || "",
      memo: "",
      createRecord: true,
    });
    setOfflineLinkError("");
    setMessage("");
  };
  const linkOffline = async () => {
    if (!offlineLinkTarget) return;
    setOfflineLinking(true);
    setOfflineLinkError("");
    try {
      const json = await adminFetcher<SaveResponse>(`/api/admin/private-payments/${offlineLinkTarget.id}/link-offline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offlineLinkForm),
      });
      if (!json.ok) throw new Error(json.message || "오프라인 연결에 실패했습니다.");
      setMessage("오프라인 고객/작업 기록과 연결했습니다.");
      setOfflineLinkTarget(null);
      await load();
    } catch (e) {
      setOfflineLinkError(e instanceof Error ? e.message : "오프라인 연결에 실패했습니다.");
    } finally {
      setOfflineLinking(false);
    }
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
  const canEdit = !editing || editing.paymentStatus === "결제대기";
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
            {!canEdit && <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">결제완료/취소 건은 결제 기록 보존을 위해 수정할 수 없습니다. 보관 또는 보관 해제만 가능합니다.</p>}
            <div className="space-y-1.5"><Label>결제명</Label><Input placeholder="예: 김재민 1회 레슨권" value={form.title} disabled={!canEdit} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>결제금액</Label><Input placeholder="예: 40000" type="number" min={1000} value={form.amount} disabled={!canEdit} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>만료일</Label><Input type="datetime-local" value={form.expiresAt} disabled={!canEdit} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /><p className="text-xs text-muted-foreground">신규 생성 기본값은 생성일 기준 7일 뒤입니다. 비우면 만료 없음입니다.</p></div>
            <div className="space-y-1.5"><Label>설명</Label><Textarea placeholder="예: 레슨 1회권 결제" value={form.description} disabled={!canEdit} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-3"><div className="space-y-1.5"><Label>고객명</Label><Input value={form.customerName} disabled={!canEdit} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div><div className="space-y-1.5"><Label>연락처</Label><Input value={form.customerPhone} disabled={!canEdit} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} /></div><div className="space-y-1.5"><Label>이메일</Label><Input value={form.customerEmail} disabled={!canEdit} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} /></div></div>
            <div className="flex flex-wrap gap-2">{canEdit && <Button onClick={() => save().catch((e) => setMessage(e.message))}>{editing ? "수정 저장" : "생성"}</Button>}{editing && <Button variant="outline" onClick={() => { setEditing(null); setForm({ ...empty, expiresAt: defaultExpiresAt() }); }}>취소</Button>}<Button type="button" variant="ghost" disabled={!canEdit} onClick={() => setForm({ ...form, expiresAt: "" })}>만료 없음</Button></div>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </CardContent>
        </Card>
        <Card className={adminSurface.card}>
          <CardHeader><CardTitle>개인결제 목록</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 rounded-xl border bg-muted/20 p-3 md:grid-cols-6"><Input placeholder="검색어" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /><select className="rounded-md border bg-background px-3 py-2 text-sm" value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}><option value="">결제상태 전체</option><option>결제대기</option><option>결제완료</option><option>결제취소</option></select><select className="rounded-md border bg-background px-3 py-2 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">활성상태 전체</option><option value="active">활성</option><option value="inactive">비활성</option></select><select className="rounded-md border bg-background px-3 py-2 text-sm" value={filters.archived} onChange={(e) => setFilters({ ...filters, archived: e.target.value })}><option value="active">보관 제외</option><option value="archived">보관함 보기</option><option value="all">전체 보기</option></select><Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /><Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></div>
            <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!hasArchivable} onClick={() => runBulkAction("archive").catch((e) => setMessage(e.message))}>선택 보관</Button><Button size="sm" variant="outline" disabled={!hasUnarchivable} onClick={() => runBulkAction("unarchive").catch((e) => setMessage(e.message))}>선택 보관 해제</Button><Button size="sm" variant="destructive" disabled={!hasPending} onClick={() => openDeleteDialog()}>선택 삭제</Button></div>
            <div className="max-h-[680px] overflow-auto rounded-xl border">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                  <tr className="border-b text-left">
                    <th className="w-10 p-3">
                      <input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? items.map((item) => item.id) : [])} />
                    </th>
                    <th className="w-[260px] p-3">{header("결제 정보", "title")}</th>
                    <th className="w-[170px] p-3">고객</th>
                    <th className="w-[140px] p-3 text-right">{header("금액", "amount")}</th>
                    <th className="w-[210px] p-3">{header("상태", "paymentStatus")}</th>
                    <th className="w-[190px] p-3">{header("만료/일시", "expiresAt")}</th>
                    <th className="w-[230px] p-3 text-right">작업</th>
                  </tr>
                </thead>
                <tbody>{items.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">조건에 맞는 개인결제가 없습니다.</td></tr> : items.map((item) => (
                  <tr key={item.id} className="border-b align-top leading-relaxed transition-colors hover:bg-muted/40">
                    <td className="p-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} /></td>
                    <td className="p-3"><div className="font-semibold text-foreground">{item.title}</div>{item.description && <div className="mt-1 max-w-[260px] text-xs leading-5 text-muted-foreground line-clamp-2">{item.description}</div>}<div className="mt-2 text-[11px] text-muted-foreground/80">ID {item.id}</div></td>
                    <td className="p-3"><div className="space-y-1 leading-tight"><div className="font-medium text-foreground">{item.customerName || "-"}</div>{(item.customerPhone || item.customerEmail) ? <div className="text-xs leading-5 text-muted-foreground">{[item.customerPhone, item.customerEmail].filter(Boolean).join(" · ")}</div> : <div className="text-xs text-muted-foreground">-</div>}</div></td>
                    <td className="whitespace-nowrap p-3 text-right font-semibold tabular-nums">{money(item.amount)}</td>
                    <td className="p-3"><div className="space-y-2"><div className="flex flex-wrap gap-1.5"><Badge variant={item.paymentStatus === "결제완료" ? "default" : item.paymentStatus === "결제취소" ? "destructive" : "outline"}>{item.paymentStatus}</Badge></div><div className="flex flex-wrap gap-1.5"><Badge variant={item.status === "active" ? "secondary" : "outline"}>{statusLabel(item.status)}</Badge>{now !== null && isExpired(item, now) && <Badge variant="destructive">만료됨</Badge>}{item.archivedAt && <Badge variant="outline">보관됨</Badge>}</div>{item.offlineLink?.status === "linked" && <div className="flex flex-wrap gap-1.5"><Badge variant="secondary">오프라인 연결됨</Badge></div>}</div></td>
                    <td className="p-3 text-xs leading-5 text-muted-foreground"><div className="grid grid-cols-[34px_1fr] gap-x-2 whitespace-nowrap"><span>만료</span><span>{item.expiresAt ? formatKoreanDateTime(item.expiresAt) : "만료 없음"}</span><span>생성</span><span>{formatKoreanDateTime(item.createdAt)}</span>{item.paidAt && <><span>완료</span><span>{formatKoreanDateTime(item.paidAt)}</span></>}{item.canceledAt && <><span>취소</span><span>{formatKoreanDateTime(item.canceledAt)}</span></>}</div></td>
                    <td className="p-3"><div className="flex flex-col items-end gap-2"><div className="flex flex-wrap justify-end gap-1.5"><Button size="sm" variant="outline" onClick={() => copy(item.id)}>링크 복사</Button><Button size="sm" variant="ghost" onClick={() => edit(item)}>상세/수정</Button></div><div className="flex flex-wrap justify-end gap-1.5">{item.paymentStatus === "결제완료" && (item.offlineLink?.status === "linked" ? <span className="self-center text-xs text-muted-foreground">오프라인 연결됨</span> : <Button size="sm" variant="outline" onClick={() => openOfflineLinkDialog(item)}>오프라인 연결</Button>)}{item.paymentStatus === "결제완료" && <Button size="sm" variant="destructive" disabled={cancelingId === item.id} onClick={() => openCancelDialog(item)}>{cancelingId === item.id ? "취소 처리 중..." : "결제취소"}</Button>}{item.paymentStatus === "결제대기" ? <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(item)}>결제대기 삭제</Button> : item.archivedAt ? <Button size="sm" variant="outline" onClick={() => runItemAction(item, "unarchive").catch((e) => setMessage(e.message))}>보관 해제</Button> : <Button size="sm" variant="outline" onClick={() => runItemAction(item, "archive").catch((e) => setMessage(e.message))}>보관</Button>}</div></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!offlineLinkTarget} onOpenChange={(open) => { if (!open && !offlineLinking) { setOfflineLinkError(""); setOfflineLinkTarget(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>오프라인 고객/작업 기록과 연결</AlertDialogTitle><AlertDialogDescription>개인결제는 온라인 PG 매출로 유지되고, 생성되는 오프라인 기록은 고객 관리/작업 이력용으로 매출 집계에서 제외됩니다.</AlertDialogDescription></AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>고객명</Label><Input value={offlineLinkForm.customerName} disabled={offlineLinking} onChange={(e) => setOfflineLinkForm({ ...offlineLinkForm, customerName: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>연락처</Label><Input value={offlineLinkForm.customerPhone} disabled={offlineLinking} onChange={(e) => setOfflineLinkForm({ ...offlineLinkForm, customerPhone: e.target.value })} /></div><div className="space-y-1.5"><Label>이메일</Label><Input value={offlineLinkForm.customerEmail} disabled={offlineLinking} onChange={(e) => setOfflineLinkForm({ ...offlineLinkForm, customerEmail: e.target.value })} /></div></div>
            <div className="space-y-1.5"><Label>작업 메모</Label><Textarea value={offlineLinkForm.memo} disabled={offlineLinking} onChange={(e) => setOfflineLinkForm({ ...offlineLinkForm, memo: e.target.value })} /></div>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm"><input type="checkbox" checked={offlineLinkForm.createRecord} disabled={offlineLinking} onChange={(e) => setOfflineLinkForm({ ...offlineLinkForm, createRecord: e.target.checked })} />오프라인 작업 기록 생성</label>
          </div>
          {offlineLinkError && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{offlineLinkError}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={offlineLinking}>닫기</AlertDialogCancel><Button disabled={offlineLinking} onClick={linkOffline}>{offlineLinking ? "연결 중..." : "연결"}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteMode} onOpenChange={(open) => { if (!open && !deleting) { setDeleteError(""); setDeleteTarget(null); setDeleteMode(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>결제대기 개인결제를 삭제할까요?</AlertDialogTitle><AlertDialogDescription>결제대기 상태의 개인결제만 삭제됩니다. 결제완료/결제취소 기록은 삭제되지 않습니다.</AlertDialogDescription></AlertDialogHeader>
          {deleteError && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{deleteError}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={deleting}>닫기</AlertDialogCancel><Button variant="destructive" disabled={deleting} onClick={confirmDelete}>{deleting ? "삭제 중..." : "삭제"}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open && !cancelingId) { setCancelError(""); setCancelTarget(null); } }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>개인결제를 취소할까요?</AlertDialogTitle><AlertDialogDescription>NICEPAY 승인취소가 진행됩니다. 취소 후 이 개인결제 링크로 다시 결제할 수 없습니다.</AlertDialogDescription></AlertDialogHeader><div className="space-y-2"><Label htmlFor="cancel-reason">취소 사유</Label><Textarea id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} disabled={!!cancelingId} /></div>{cancelError && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{cancelError}</p>}<AlertDialogFooter><AlertDialogCancel disabled={!!cancelingId}>닫기</AlertDialogCancel><Button variant="destructive" disabled={!!cancelingId} onClick={cancelPayment}>{cancelingId ? "취소 처리 중..." : "승인취소 진행"}</Button></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
