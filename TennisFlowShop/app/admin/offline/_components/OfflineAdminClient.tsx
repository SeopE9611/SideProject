"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { maskPhone } from "@/lib/offline/normalizers";
import type { OfflineCustomerDto } from "@/types/admin/offline";

type SelectedCustomer =
  | { source: "offline"; offlineCustomerId: string; userId?: string | null; name: string; phone: string; email?: string | null }
  | { source: "online"; userId: string; name: string; phone: string; email?: string | null; offlineCustomerId?: string | null };

const KIND_LABELS = { stringing: "스트링 작업", package_sale: "패키지 판매", etc: "기타" } as const;
const RECORD_STATUS_LABELS = { received: "접수", in_progress: "작업중", completed: "완료", picked_up: "수령완료", canceled: "취소" } as const;
const PAYMENT_STATUS_LABELS = { pending: "미결제", paid: "결제완료", refunded: "환불" } as const;
const PAYMENT_METHOD_LABELS = { cash: "현금", card: "카드", bank_transfer: "계좌이체", etc: "기타" } as const;


function formatCurrency(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "numeric", day: "numeric" }).format(new Date(value));
}

export default function OfflineAdminClient() {
  const [query, setQuery] = useState({ name: "", phone: "", email: "" });
  const [submittedQuery, setSubmittedQuery] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [selected, setSelected] = useState<SelectedCustomer | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [form, setForm] = useState({ kind: "stringing", status: "received", racketName: "", stringName: "", tensionMain: "", tensionCross: "", memo: "", amount: 0, method: "cash", payStatus: "pending" });
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", memo: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const key = submittedQuery
    ? `/api/admin/offline/lookup?name=${encodeURIComponent(submittedQuery.name)}&phone=${encodeURIComponent(submittedQuery.phone)}&email=${encodeURIComponent(submittedQuery.email)}`
    : null;

  const { data, isLoading: searchLoading, mutate } = useSWR<{ onlineUsers: any[]; offlineCustomers: any[] }>(key, authenticatedSWRFetcher);
  const { data: records, isLoading: recordsLoading, mutate: mutateRecords } = useSWR<{ items: any[] }>("/api/admin/offline/records", authenticatedSWRFetcher);

  async function selectOfflineCustomer(id: string) {
    const res = (await authenticatedSWRFetcher(`/api/admin/offline/customers/${id}`)) as { item: OfflineCustomerDto };
    setSelected({ source: "offline", offlineCustomerId: res.item.id, userId: res.item.linkedUserId ?? null, name: res.item.name, phone: res.item.phone, email: res.item.email ?? null });
  }

  const onlineItems = data?.onlineUsers ?? [];
  const offlineItems = data?.offlineCustomers ?? [];
  const hasSearchResult = onlineItems.length > 0 || offlineItems.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>고객 검색</CardTitle>
              <CardDescription>이름, 휴대폰 번호, 이메일로 온라인 회원 또는 오프라인 명부 고객을 검색합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearchMessage(null);
                  if (!query.name.trim() && !query.phone.trim() && !query.email.trim()) {
                    setSearchMessage("검색어를 입력한 뒤 고객을 조회하세요.");
                    return;
                  }
                  setSubmittedQuery({ ...query });
                }}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="offline-search-name">이름</Label>
                    <Input id="offline-search-name" value={query.name} onChange={(e) => setQuery({ ...query, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offline-search-phone">휴대폰 번호</Label>
                    <Input id="offline-search-phone" value={query.phone} onChange={(e) => setQuery({ ...query, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="offline-search-email">이메일</Label>
                    <Input id="offline-search-email" value={query.email} onChange={(e) => setQuery({ ...query, email: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit">검색</Button>
                </div>
              </form>

              {!submittedQuery && <p className="text-sm">검색어를 입력한 뒤 고객을 조회하세요.</p>}
              {searchMessage && <p className="text-sm text-foreground">{searchMessage}</p>}
              {searchLoading && <p className="text-sm">검색 중...</p>}
              {submittedQuery && !searchLoading && !hasSearchResult && (
                <p className="text-sm">검색 결과가 없습니다. 신규 오프라인 고객으로 등록할 수 있습니다.</p>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">온라인 회원 결과</p>
                    <Badge variant="outline">온라인 회원</Badge>
                  </div>
                  {onlineItems.map((u: any) => (
                    <div key={u.id} className="rounded-md border p-2 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{u.name || "이름 없음"}</p>
                          {u.email ? <p className="text-muted-foreground">{u.email}</p> : null}
                          {u.phone ? <p className="text-muted-foreground">{maskPhone(u.phone)}</p> : null}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setSelected({ source: "online", name: u.name, phone: u.phone, email: u.email, userId: u.id, offlineCustomerId: u.offlineCustomerId ?? null })}>선택</Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">오프라인 명부 결과</p>
                    <Badge variant="outline">오프라인 명부</Badge>
                  </div>
                  {offlineItems.map((c: any) => (
                    <div key={c.id} className="rounded-md border p-2 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{c.name || "이름 없음"}</p>
                          <p className="text-muted-foreground">{c.phoneMasked}</p>
                          {c.email ? <p className="text-muted-foreground">{c.email}</p> : null}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => selectOfflineCustomer(c.id)}>선택</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>선택된 고객</CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="text-sm">아직 선택된 고객이 없습니다. 먼저 고객을 검색하거나 신규 고객을 등록하세요.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold">{selected.name}</p>
                    <Badge variant="secondary">{selected.source === "online" ? "온라인 회원" : "오프라인 명부"}</Badge>
                  </div>
                  <p>휴대폰: {maskPhone(selected.phone)}</p>
                  <p>이메일: {selected.email || "-"}</p>
                  {selected.offlineCustomerId ? <p className="text-xs text-muted-foreground">오프라인 고객 ID: {selected.offlineCustomerId}</p> : null}
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelected(null)}>선택 해제</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>신규 오프라인 고객 등록</CardTitle>
              <CardDescription>검색 결과가 없는 방문 고객을 오프라인 명부에 등록합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="offline-new-name">고객명</Label>
                  <Input id="offline-new-name" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offline-new-phone">휴대폰 번호</Label>
                  <Input id="offline-new-phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                  <p className="text-xs text-muted-foreground">하이픈이 있어도 저장 시 숫자만 정규화됩니다.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offline-new-email">이메일(선택)</Label>
                  <Input id="offline-new-email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offline-new-memo">고객 메모(선택)</Label>
                  <Input id="offline-new-memo" value={newCustomer.memo} onChange={(e) => setNewCustomer({ ...newCustomer, memo: e.target.value })} />
                </div>
              </div>
              {registerMessage && <p className="text-sm">{registerMessage}</p>}
              <Button
                variant="secondary"
                onClick={async () => {
                  setRegisterMessage(null);
                  try {
                    const res = (await adminMutator("/api/admin/offline/customers", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: newCustomer.name, phone: newCustomer.phone, email: newCustomer.email || null, memo: newCustomer.memo || "" }),
                    })) as { item: OfflineCustomerDto };
                    const item: OfflineCustomerDto = res.item;
                    setSelected({ source: "offline", offlineCustomerId: item.id, userId: item.linkedUserId ?? null, name: item.name, phone: item.phone, email: item.email ?? null });
                    setNewCustomer({ name: "", phone: "", email: "", memo: "" });
                    setRegisterMessage("고객 등록이 완료되었습니다.");
                    if (submittedQuery) mutate();
                  } catch (e: any) {
                    const message = String(e?.message || "");
                    if (message.includes("duplicate") || message.includes("409")) setRegisterMessage("중복 고객입니다. 기존 고객을 선택해 주세요.");
                    else setRegisterMessage("고객 등록에 실패했습니다.");
                  }
                }}
              >
                고객 등록
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>오프라인 작업/매출 등록</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{selected ? `현재 ${selected.name} 고객의 작업을 등록 중입니다.` : "고객을 먼저 선택해야 작업을 등록할 수 있습니다."}</p>

              <div className="rounded-md border p-3 space-y-3">
                <p className="font-medium">작업 정보</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="kind">작업 유형</Label><select id="kind" className="h-10 w-full rounded-md border bg-background px-3" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                  <div className="space-y-1.5"><Label htmlFor="status">작업 상태</Label><select id="status" className="h-10 w-full rounded-md border bg-background px-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(RECORD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                  <div className="space-y-1.5"><Label htmlFor="racketName">라켓명</Label><Input id="racketName" value={form.racketName} onChange={(e) => setForm({ ...form, racketName: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label htmlFor="stringName">스트링명</Label><Input id="stringName" value={form.stringName} onChange={(e) => setForm({ ...form, stringName: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label htmlFor="tensionMain">메인 텐션</Label><Input id="tensionMain" value={form.tensionMain} onChange={(e) => setForm({ ...form, tensionMain: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label htmlFor="tensionCross">크로스 텐션</Label><Input id="tensionCross" value={form.tensionCross} onChange={(e) => setForm({ ...form, tensionCross: e.target.value })} /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="memo">작업 메모</Label><textarea id="memo" className="w-full rounded-md border p-2" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} /></div>
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <p className="font-medium">결제 정보</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="payStatus">결제 상태</Label><select id="payStatus" className="h-10 w-full rounded-md border bg-background px-3" value={form.payStatus} onChange={(e) => setForm({ ...form, payStatus: e.target.value })}>{Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                  <div className="space-y-1.5"><Label htmlFor="method">결제수단</Label><select id="method" className="h-10 w-full rounded-md border bg-background px-3" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                  <div className="space-y-1.5 md:col-span-2"><Label htmlFor="amount">결제 금액</Label><Input id="amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /><p className="text-xs text-muted-foreground">원 단위 금액으로 입력해 주세요.</p></div>
                </div>
              </div>

              {saveMessage && <p className="text-sm text-foreground">{saveMessage}</p>}
              <Button
                disabled={isSubmitting || !selected}
                onClick={async () => {
                  if (!selected || isSubmitting) return;
                  try {
                    setIsSubmitting(true);
                    setSaveMessage(null);
                    let offlineCustomerId = selected.source === "offline" ? selected.offlineCustomerId : selected.offlineCustomerId;
                    if (selected.source === "online" && !offlineCustomerId) {
                      const ensured = (await adminMutator("/api/admin/offline/customers/ensure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected.userId }) })) as { item: OfflineCustomerDto };
                      offlineCustomerId = ensured.item.id;
                      setSelected({ ...selected, offlineCustomerId });
                    }
                    if (!offlineCustomerId) {
                      setSaveMessage("오프라인 고객 연결에 실패했습니다.");
                      return;
                    }
                    await adminMutator("/api/admin/offline/records", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        offlineCustomerId,
                        userId: selected.source === "online" ? selected.userId : selected.userId || null,
                        kind: form.kind,
                        status: form.status,
                        lines: [{ racketName: form.racketName, stringName: form.stringName, tensionMain: form.tensionMain, tensionCross: form.tensionCross, note: form.memo }],
                        payment: { status: form.payStatus, method: form.method, amount: form.amount },
                        memo: form.memo,
                      }),
                    });
                    setForm({ kind: "stringing", status: "received", racketName: "", stringName: "", tensionMain: "", tensionCross: "", memo: "", amount: 0, method: "cash", payStatus: "pending" });
                    mutateRecords();
                  } catch (e: any) {
                    const message = String(e?.message || "");
                    if (message.includes("휴대폰 번호")) setSaveMessage("온라인 회원에 휴대폰 번호가 없어 오프라인 명부 연결이 필요합니다.");
                    else setSaveMessage(message || "오프라인 작업 저장에 실패했습니다.");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {isSubmitting ? "저장 중..." : "저장"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 오프라인 작업/매출</CardTitle>
          <CardDescription>최근 등록된 오프라인 작업과 매출 기록입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {recordsLoading ? <p className="text-sm">불러오는 중...</p> : null}
          {!recordsLoading && !(records?.items?.length) ? <p className="text-sm">아직 등록된 오프라인 작업/매출 기록이 없습니다.</p> : null}
          {!!records?.items?.length && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">날짜</th><th className="px-2 py-2">고객</th><th className="px-2 py-2">유형</th><th className="px-2 py-2">작업 내용</th><th className="px-2 py-2">금액</th><th className="px-2 py-2">결제</th><th className="px-2 py-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {(records?.items || []).map((r: any) => (
                    <tr key={r.id} className="border-b align-top">
                      <td className="px-2 py-2">{formatDate(r.occurredAt)}</td>
                      <td className="px-2 py-2"><p className="font-medium">{r.customerName}</p><p className="text-xs text-muted-foreground">{r.customerPhoneMasked}</p></td>
                      <td className="px-2 py-2">{KIND_LABELS[r.kind as keyof typeof KIND_LABELS] ?? r.kind}</td>
                      <td className="px-2 py-2">{r.lineSummary || "-"}</td>
                      <td className="px-2 py-2">{formatCurrency(r.payment?.amount)}</td>
                      <td className="px-2 py-2"><Badge variant="outline">{PAYMENT_STATUS_LABELS[r.payment?.status as keyof typeof PAYMENT_STATUS_LABELS] ?? r.payment?.status}</Badge></td>
                      <td className="px-2 py-2"><Badge variant="outline">{RECORD_STATUS_LABELS[r.status as keyof typeof RECORD_STATUS_LABELS] ?? r.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
