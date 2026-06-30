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
import { formatKoreanDateTime } from "@/lib/korean-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

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
  createdAt: string;
  paidAt?: string;
  canceledAt?: string;
};
type ListResponse = { ok: boolean; items: Item[] };
type SaveResponse = { ok: boolean; message?: string };
const empty = {
  title: "",
  amount: "",
  description: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
};
const defaultCancelReason = "관리자 개인결제 승인취소";

const statusLabel = (status: string) => (status === "active" ? "활성" : "비활성");

export default function PrivatePaymentsClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Item | null>(null);
  const [message, setMessage] = useState("");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Item | null>(null);
  const [cancelReason, setCancelReason] = useState(defaultCancelReason);
  const [cancelError, setCancelError] = useState("");
  const load = async () => {
    const json = await adminFetcher<ListResponse>("/api/admin/private-payments?limit=50");
    setItems(json.items || []);
  };
  useEffect(() => {
    load().catch(() => setMessage("목록을 불러오지 못했습니다."));
  }, []);
  const save = async () => {
    setMessage("");
    const url = editing
      ? `/api/admin/private-payments/${editing.id}`
      : "/api/admin/private-payments";
    const json = await adminFetcher<SaveResponse>(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
        status: editing?.status || "active",
      }),
    });
    if (!json.ok) throw new Error(json.message || "저장에 실패했습니다.");
    setForm(empty);
    setEditing(null);
    setMessage(
      editing
        ? "수정했습니다."
        : "개인결제 링크를 생성했습니다. 링크 복사 버튼으로 고객에게 전달해 주세요.",
    );
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
    });
  };
  const copy = async (id: string) => {
    const url = `${window.location.origin}/private-payments/${id}`;
    await navigator.clipboard.writeText(url);
    setMessage("고객에게 전달할 결제 링크입니다. 링크를 복사했습니다.");
  };
  const openCancelDialog = (item: Item) => {
    setCancelTarget(item);
    setCancelReason(defaultCancelReason);
    setCancelError("");
    setMessage("");
  };
  const cancelPayment = async () => {
    if (!cancelTarget) return;
    const normalizedReason = cancelReason.trim() || defaultCancelReason;
    setCancelingId(cancelTarget.id);
    setCancelError("");
    setMessage("");
    try {
      const json = await adminFetcher<SaveResponse>(
        `/api/admin/private-payments/${cancelTarget.id}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: normalizedReason }),
        },
      );
      if (!json.ok) throw new Error(json.message || "결제취소에 실패했습니다.");
      setCancelError("");
      setMessage("개인결제를 취소했습니다.");
      setCancelTarget(null);
      await load();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "결제취소에 실패했습니다.");
    } finally {
      setCancelingId(null);
    }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>개인결제 링크 생성</CardTitle>
          <p className="text-sm text-muted-foreground">
            고객별 맞춤 금액을 입력해 결제 링크를 생성합니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing?.paymentStatus === "결제완료" && (
            <p className="text-sm text-destructive">
              결제완료 건은 금액과 결제명을 수정할 수 없습니다.
            </p>
          )}
          <div className="space-y-1.5">
            <Label>결제명</Label>
            <Input
              placeholder="예: 용현님 1회 레슨권"
              value={form.title}
              disabled={editing?.paymentStatus === "결제완료"}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>결제금액</Label>
            <Input
              placeholder="예: 40000"
              type="number"
              min={1000}
              value={form.amount}
              disabled={editing?.paymentStatus === "결제완료"}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>설명</Label>
            <Textarea
              placeholder="예: 레슨 1회권 결제"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>고객명</Label>
            <Input
              placeholder="예: 김용현"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>연락처</Label>
            <Input
              placeholder="예: 01012345678"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>이메일</Label>
            <Input
              placeholder="선택 입력"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => save().catch((e) => setMessage(e.message))}>
              {editing ? "수정 저장" : "생성"}
            </Button>
            {editing && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setForm(empty);
                }}
              >
                취소
              </Button>
            )}
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>개인결제 목록</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">아직 생성된 개인결제가 없습니다.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                왼쪽에서 개인결제 링크를 생성해 고객에게 전달해 주세요.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">결제명</th>
                  <th className="p-2">고객</th>
                  <th className="p-2">금액</th>
                  <th className="p-2">상태</th>
                  <th className="p-2">일시</th>
                  <th className="p-2 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b align-top">
                    <td className="p-2">
                      <div className="font-medium">{item.title}</div>
                      {item.description && (
                        <div className="mt-1 max-w-[240px] text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      <div>{item.customerName || "-"}</div>
                      {(item.customerPhone || item.customerEmail) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {[item.customerPhone, item.customerEmail].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </td>
                    <td className="p-2 font-semibold">{item.amount.toLocaleString("ko-KR")}원</td>
                    <td className="p-2">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge
                          variant={
                            item.paymentStatus === "결제완료"
                              ? "default"
                              : item.paymentStatus === "결제취소"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {item.paymentStatus}
                        </Badge>
                        <Badge variant={item.status === "active" ? "secondary" : "outline"}>
                          {statusLabel(item.status)}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      <div>생성: {formatKoreanDateTime(item.createdAt)}</div>
                      {item.paidAt && <div>완료: {formatKoreanDateTime(item.paidAt)}</div>}
                      {item.canceledAt && <div>취소: {formatKoreanDateTime(item.canceledAt)}</div>}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => copy(item.id)}>
                          링크 복사
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => edit(item)}>
                          상세/수정
                        </Button>
                        {item.paymentStatus === "결제완료" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={cancelingId === item.id}
                            onClick={() => openCancelDialog(item)}
                          >
                            {cancelingId === item.id ? "취소 처리 중..." : "결제취소"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open && !cancelingId) {
            setCancelError("");
            setCancelTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>개인결제를 취소할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              NICEPAY 승인취소가 진행됩니다. 취소 후 이 개인결제 링크로 다시 결제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">취소 사유</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              disabled={!!cancelingId}
            />
          </div>
          {cancelError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {cancelError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!cancelingId}>닫기</AlertDialogCancel>
            <Button variant="destructive" disabled={!!cancelingId} onClick={cancelPayment}>
              {cancelingId ? "취소 처리 중..." : "승인취소 진행"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
