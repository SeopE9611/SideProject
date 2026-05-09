"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { maskPhone } from "@/lib/offline/normalizers";
import { cn } from "@/lib/utils";
import type { OfflineCustomerDto } from "@/types/admin/offline";
import { AlertCircle, Calendar, Check, ChevronLeft, ChevronRight, ClipboardList, CreditCard, ExternalLink, History, Mail, Pencil, Phone, RotateCcw, Search, User, UserPlus, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

type SelectedCustomer =
  | { source: "offline"; offlineCustomerId: string; userId?: string | null; name: string; phone: string; email?: string | null }
  | { source: "online"; userId: string; name: string; phone: string; email?: string | null; offlineCustomerId?: string | null };

const KIND_LABELS = { stringing: "스트링 작업", package_sale: "패키지 판매", etc: "기타" } as const;
const RECORD_STATUS_LABELS = { received: "접수", in_progress: "작업중", completed: "완료", picked_up: "수령완료", canceled: "취소" } as const;
const PAYMENT_STATUS_LABELS = { pending: "미결제", paid: "결제완료", refunded: "환불" } as const;
const PAYMENT_METHOD_LABELS = { cash: "현금", card: "카드", bank_transfer: "계좌이체", etc: "기타" } as const;
const RECORDS_LIMIT = 20;
const EMPTY_RECORD_FILTERS = { from: "", to: "", name: "", phone: "", kind: "", status: "", paymentStatus: "", paymentMethod: "" };

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "numeric", day: "numeric" }).format(new Date(value));
}

function formatLineSummary(lines?: Array<{ racketName?: string; stringName?: string; tensionMain?: string; tensionCross?: string }>): string {
  if (!Array.isArray(lines) || lines.length === 0) return "작업 내용 미입력";
  const summary = lines
    .map((line) => {
      const main = String(line.tensionMain ?? "").trim();
      const cross = String(line.tensionCross ?? "").trim();
      const tension = main || cross ? `${main || "-"}/${cross || "-"}` : "";
      return [String(line.racketName ?? "").trim(), String(line.stringName ?? "").trim(), tension].filter(Boolean).join(" · ");
    })
    .filter(Boolean)
    .join(", ");
  return summary || "작업 내용 미입력";
}

// Section Header Component
function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-border/50">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

// Form Field Component
function FormField({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground/80">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Custom Select Component
function Select({ id, value, onChange, children, className }: { id?: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; className?: string }) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      className={cn("h-10 w-full rounded-lg border border-input bg-background px-3 text-sm", "transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring", "hover:border-ring/50", className)}
    >
      {children}
    </select>
  );
}

// Status Badge Component
function StatusBadge({ status, type }: { status: string; type: "record" | "payment" }) {
  const colors = {
    record: {
      received: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      picked_up: "bg-primary/10 text-primary border-primary/20",
      canceled: "bg-destructive/10 text-destructive border-destructive/20",
    },
    payment: {
      pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      refunded: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };

  const labels = type === "record" ? RECORD_STATUS_LABELS : PAYMENT_STATUS_LABELS;
  const colorMap = colors[type] as Record<string, string>;
  const colorClass = colorMap[status] || "bg-muted text-muted-foreground border-border";

  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", colorClass)}>{labels[status as keyof typeof labels] ?? status}</span>;
}

// Message Component
function Message({ type, children }: { type: "success" | "error" | "info"; children: React.ReactNode }) {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-primary/5 text-foreground border-border",
  };
  const icons = {
    success: Check,
    error: AlertCircle,
    info: AlertCircle,
  };
  const Icon = icons[type];

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", styles[type])}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function OfflineAdminClient() {
  const [query, setQuery] = useState({ name: "", phone: "", email: "" });
  const [submittedQuery, setSubmittedQuery] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [selected, setSelected] = useState<SelectedCustomer | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<"success" | "error" | null>(null);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ kind: "stringing", occurredAt: "", racketName: "", stringName: "", tensionMain: "", tensionCross: "", status: "received", paymentStatus: "pending", paymentMethod: "cash", paymentAmount: 0, memo: "" });
  const [recordFilters, setRecordFilters] = useState(EMPTY_RECORD_FILTERS);
  const [submittedRecordFilters, setSubmittedRecordFilters] = useState(EMPTY_RECORD_FILTERS);
  const [recordsPage, setRecordsPage] = useState(1);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [isEditingSubmit, setIsEditingSubmit] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({ kind: "stringing", status: "received", racketName: "", stringName: "", tensionMain: "", tensionCross: "", memo: "", amount: 0, method: "cash", payStatus: "pending" });
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", memo: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const key = submittedQuery ? `/api/admin/offline/lookup?name=${encodeURIComponent(submittedQuery.name)}&phone=${encodeURIComponent(submittedQuery.phone)}&email=${encodeURIComponent(submittedQuery.email)}` : null;

  const recordParams = new URLSearchParams({ page: String(recordsPage), limit: String(RECORDS_LIMIT) });
  Object.entries(submittedRecordFilters).forEach(([filterKey, value]) => {
    if (value.trim()) recordParams.set(filterKey, value.trim());
  });
  const recordsKey = `/api/admin/offline/records?${recordParams.toString()}`;

  const { data, isLoading: searchLoading, mutate } = useSWR<{ onlineUsers: any[]; offlineCustomers: any[] }>(key, authenticatedSWRFetcher);
  const { data: records, isLoading: recordsLoading, mutate: mutateRecords } = useSWR<{ items: any[]; page?: number; limit?: number; total?: number; totalPages?: number }>(recordsKey, authenticatedSWRFetcher);

  async function selectOfflineCustomer(id: string) {
    const res = (await authenticatedSWRFetcher(`/api/admin/offline/customers/${id}`)) as { item: OfflineCustomerDto };
    setSelected({ source: "offline", offlineCustomerId: res.item.id, userId: res.item.linkedUserId ?? null, name: res.item.name, phone: res.item.phone, email: res.item.email ?? null });
  }

  const onlineItems = data?.onlineUsers ?? [];
  const offlineItems = data?.offlineCustomers ?? [];
  const hasSearchResult = onlineItems.length > 0 || offlineItems.length > 0;
  const recordsTotal = records?.total ?? records?.items?.length ?? 0;
  const recordsTotalPages = records?.totalPages ?? (recordsTotal > 0 ? Math.ceil(recordsTotal / RECORDS_LIMIT) : 0);
  const currentRecordsPage = records?.page ?? recordsPage;

  return (
    <div className="space-y-6">
      {/* Top Section: Selected Customer Quick View */}
      {selected && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{selected.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {selected.source === "online" ? "온라인 회원" : "오프라인 명부"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {maskPhone(selected.phone)}
                  </span>
                  {selected.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selected.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected.offlineCustomerId && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/offline/customers/${selected.offlineCustomerId}`}>
                    상세 보기 <ExternalLink className="ml-1.5 h-3 w-3" />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column: Customer Search & Registration */}
        <div className="space-y-6 xl:col-span-4">
          {/* Customer Search Card */}
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="pb-0">
              <SectionHeader icon={Search} title="고객 검색" description="이름, 휴대폰, 이메일로 검색" />
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearchMessage(null);
                  if (!query.name.trim() && !query.phone.trim() && !query.email.trim()) {
                    setSearchMessage("검색어를 입력해주세요.");
                    return;
                  }
                  setSubmittedQuery({ ...query });
                }}
              >
                <div className="space-y-3">
                  <FormField label="이름" htmlFor="offline-search-name">
                    <Input id="offline-search-name" placeholder="고객 이름" value={query.name} onChange={(e) => setQuery({ ...query, name: e.target.value })} className="h-10" />
                  </FormField>
                  <FormField label="휴대폰 번호" htmlFor="offline-search-phone">
                    <Input id="offline-search-phone" placeholder="010-0000-0000" value={query.phone} onChange={(e) => setQuery({ ...query, phone: e.target.value })} className="h-10" />
                  </FormField>
                  <FormField label="이메일" htmlFor="offline-search-email">
                    <Input id="offline-search-email" placeholder="email@example.com" value={query.email} onChange={(e) => setQuery({ ...query, email: e.target.value })} className="h-10" />
                  </FormField>
                </div>
                <Button type="submit" className="w-full h-10">
                  <Search className="mr-2 h-4 w-4" />
                  검색
                </Button>
              </form>

              {/* Search Results */}
              {searchMessage && <Message type="info">{searchMessage}</Message>}
              {submittedQuery && searchLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              {submittedQuery && !searchLoading && !hasSearchResult && <Message type="info">검색 결과가 없습니다. 신규 고객으로 등록할 수 있습니다.</Message>}

              {submittedQuery && !searchLoading && hasSearchResult && (
                <div className="space-y-4">
                  {/* Online Users */}
                  {onlineItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                        <span>온라인 회원</span>
                        <Badge variant="secondary" className="text-xs">
                          {onlineItems.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {onlineItems.map((u: any) => (
                          <div key={u.id} className="group flex items-center justify-between rounded-lg border border-border/60 p-3 transition-all hover:border-primary/40 hover:bg-primary/5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{u.name || "이름 없음"}</p>
                                <p className="text-xs text-muted-foreground">{u.phone ? maskPhone(u.phone) : u.email || "정보 없음"}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() =>
                                setSelected({
                                  source: "online",
                                  name: u.name,
                                  phone: u.phone,
                                  email: u.email,
                                  userId: u.id,
                                  offlineCustomerId: u.offlineCustomerId ?? null,
                                })
                              }
                            >
                              선택 <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Offline Customers */}
                  {offlineItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                        <span>오프라인 명부</span>
                        <Badge variant="secondary" className="text-xs">
                          {offlineItems.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {offlineItems.map((c: any) => (
                          <div key={c.id} className="group flex items-center justify-between rounded-lg border border-border/60 p-3 transition-all hover:border-primary/40 hover:bg-primary/5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{c.name || "이름 없음"}</p>
                                <p className="text-xs text-muted-foreground">{c.phoneMasked}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button asChild size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link href={`/admin/offline/customers/${c.id}`}>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </Button>
                              <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => selectOfflineCustomer(c.id)}>
                                선택 <ChevronRight className="ml-1 h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* New Customer Registration Card */}
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="pb-0">
              <SectionHeader icon={UserPlus} title="신규 고객 등록" description="새로운 오프라인 고객 추가" />
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="고객명" htmlFor="offline-new-name">
                    <Input id="offline-new-name" placeholder="홍길동" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="h-10" />
                  </FormField>
                  <FormField label="휴대폰 번호" htmlFor="offline-new-phone">
                    <Input id="offline-new-phone" placeholder="01012345678" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="h-10" />
                  </FormField>
                </div>
                <FormField label="이메일 (선택)" htmlFor="offline-new-email">
                  <Input id="offline-new-email" placeholder="email@example.com" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} className="h-10" />
                </FormField>
                <FormField label="고객 메모 (선택)" htmlFor="offline-new-memo">
                  <Input id="offline-new-memo" placeholder="특이사항 입력" value={newCustomer.memo} onChange={(e) => setNewCustomer({ ...newCustomer, memo: e.target.value })} className="h-10" />
                </FormField>
              </div>
              {registerMessage && <Message type={registerMessage.includes("완료") ? "success" : "error"}>{registerMessage}</Message>}
              <Button
                variant="secondary"
                className="w-full h-10"
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
                <UserPlus className="mr-2 h-4 w-4" />
                고객 등록
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Work/Payment Registration */}
        <div className="xl:col-span-8">
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="pb-0">
              <SectionHeader icon={ClipboardList} title="오프라인 작업/매출 등록" description={selected ? `${selected.name} 고객의 작업을 등록합니다` : "고객을 먼저 선택해주세요"} />
            </CardHeader>
            <CardContent className="pt-4">
              {!selected ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">좌측에서 고객을 검색하거나 신규 등록 후 작업을 등록할 수 있습니다.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Work Info Section */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Wrench className="h-4 w-4 text-primary" />
                      작업 정보
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <FormField label="작업 유형" htmlFor="kind">
                        <Select id="kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                          {Object.entries(KIND_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                      <FormField label="작업 상태" htmlFor="status">
                        <Select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                          {Object.entries(RECORD_STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                      <FormField label="라켓명" htmlFor="racketName">
                        <Input id="racketName" placeholder="YONEX ASTROX" value={form.racketName} onChange={(e) => setForm({ ...form, racketName: e.target.value })} className="h-10" />
                      </FormField>
                      <FormField label="스트링명" htmlFor="stringName">
                        <Input id="stringName" placeholder="BG65 POWER" value={form.stringName} onChange={(e) => setForm({ ...form, stringName: e.target.value })} className="h-10" />
                      </FormField>
                      <FormField label="메인 텐션" htmlFor="tensionMain">
                        <Input id="tensionMain" placeholder="26" value={form.tensionMain} onChange={(e) => setForm({ ...form, tensionMain: e.target.value })} className="h-10" />
                      </FormField>
                      <FormField label="크로스 텐션" htmlFor="tensionCross">
                        <Input id="tensionCross" placeholder="28" value={form.tensionCross} onChange={(e) => setForm({ ...form, tensionCross: e.target.value })} className="h-10" />
                      </FormField>
                    </div>
                    <FormField label="작업 메모" htmlFor="memo">
                      <textarea
                        id="memo"
                        placeholder="작업 관련 특이사항을 입력하세요"
                        value={form.memo}
                        onChange={(e) => setForm({ ...form, memo: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring hover:border-ring/50 min-h-[80px] resize-none"
                      />
                    </FormField>
                  </div>

                  {/* Payment Info Section */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CreditCard className="h-4 w-4 text-primary" />
                      결제 정보
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <FormField label="결제 상태" htmlFor="payStatus">
                        <Select id="payStatus" value={form.payStatus} onChange={(e) => setForm({ ...form, payStatus: e.target.value })}>
                          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                      <FormField label="결제수단" htmlFor="method">
                        <Select id="method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                          {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                      <FormField label="결제 금액" htmlFor="amount" hint="원 단위로 입력">
                        <Input id="amount" type="number" placeholder="15000" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="h-10" />
                      </FormField>
                    </div>
                  </div>

                  {saveMessage && <Message type={saveMessageType || "info"}>{saveMessage}</Message>}

                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      disabled={isSubmitting || !selected}
                      className="min-w-[140px]"
                      onClick={async () => {
                        if (!selected || isSubmitting) return;
                        try {
                          setIsSubmitting(true);
                          setSaveMessage(null);
                          setSaveMessageType(null);
                          let offlineCustomerId = selected.source === "offline" ? selected.offlineCustomerId : selected.offlineCustomerId;
                          if (selected.source === "online" && !offlineCustomerId) {
                            const ensured = (await adminMutator("/api/admin/offline/customers/ensure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected.userId }) })) as {
                              item: OfflineCustomerDto;
                            };
                            offlineCustomerId = ensured.item.id;
                            setSelected({ ...selected, offlineCustomerId });
                          }
                          if (!offlineCustomerId) {
                            setSaveMessage("오프라인 고객 연결에 실패했습니다.");
                            setSaveMessageType("error");
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
                          setSaveMessage("작업/매출 기록이 저장되었습니다.");
                          setSaveMessageType("success");
                          mutateRecords();
                        } catch (e: any) {
                          const message = String(e?.message || "");
                          if (message.includes("휴대폰 번호")) setSaveMessage("온라인 회원에 휴대폰 번호가 없어 오프라인 명부 연결이 필요합니다.");
                          else setSaveMessage(message || "오프라인 작업 저장에 실패했습니다.");
                          setSaveMessageType("error");
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          저장 중...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          저장
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Records History Section */}
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <SectionHeader icon={History} title="최근 오프라인 작업/매출" description="등록된 기록을 조회하고 관리합니다" />
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
              {showFilters ? <X className="mr-2 h-4 w-4" /> : <Search className="mr-2 h-4 w-4" />}
              {showFilters ? "필터 닫기" : "필터 열기"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Filter Section */}
          {showFilters && (
            <form
              className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmittedRecordFilters({ ...recordFilters });
                setRecordsPage(1);
              }}
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <FormField label="시작일" htmlFor="record-from">
                  <Input id="record-from" type="date" value={recordFilters.from} onChange={(e) => setRecordFilters({ ...recordFilters, from: e.target.value })} className="h-10" />
                </FormField>
                <FormField label="종료일" htmlFor="record-to">
                  <Input id="record-to" type="date" value={recordFilters.to} onChange={(e) => setRecordFilters({ ...recordFilters, to: e.target.value })} className="h-10" />
                </FormField>
                <FormField label="고객명" htmlFor="record-name">
                  <Input id="record-name" placeholder="고객명 검색" value={recordFilters.name} onChange={(e) => setRecordFilters({ ...recordFilters, name: e.target.value })} className="h-10" />
                </FormField>
                <FormField label="휴대폰 번호" htmlFor="record-phone">
                  <Input id="record-phone" placeholder="01012345678" value={recordFilters.phone} onChange={(e) => setRecordFilters({ ...recordFilters, phone: e.target.value })} className="h-10" />
                </FormField>
                <FormField label="작업 유형" htmlFor="record-kind">
                  <Select id="record-kind" value={recordFilters.kind} onChange={(e) => setRecordFilters({ ...recordFilters, kind: e.target.value })}>
                    <option value="">전체</option>
                    {Object.entries(KIND_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="작업 상태" htmlFor="record-status">
                  <Select id="record-status" value={recordFilters.status} onChange={(e) => setRecordFilters({ ...recordFilters, status: e.target.value })}>
                    <option value="">전체</option>
                    {Object.entries(RECORD_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="결제 상태" htmlFor="record-payment-status">
                  <Select id="record-payment-status" value={recordFilters.paymentStatus} onChange={(e) => setRecordFilters({ ...recordFilters, paymentStatus: e.target.value })}>
                    <option value="">전체</option>
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="결제수단" htmlFor="record-payment-method">
                  <Select id="record-payment-method" value={recordFilters.paymentMethod} onChange={(e) => setRecordFilters({ ...recordFilters, paymentMethod: e.target.value })}>
                    <option value="">전체</option>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRecordFilters(EMPTY_RECORD_FILTERS);
                    setSubmittedRecordFilters(EMPTY_RECORD_FILTERS);
                    setRecordsPage(1);
                  }}
                >
                  <RotateCcw className="mr-2 h-3 w-3" />
                  초기화
                </Button>
                <Button type="submit" size="sm">
                  <Search className="mr-2 h-3 w-3" />
                  검색
                </Button>
              </div>
            </form>
          )}

          {/* Loading State */}
          {recordsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {/* Empty State */}
          {!recordsLoading && !records?.items?.length && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">아직 등록된 기록이 없습니다.</p>
            </div>
          )}

          {/* Records Table */}
          {!!records?.items?.length && (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">날짜</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">고객</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">유형</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">작업 내용</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">금액</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">결제</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">상태</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(records?.items || []).map((r: any) => (
                      <tr key={r.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{formatDate(r.occurredAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">
                              {r.offlineCustomerId ? (
                                <Link className="hover:text-primary transition-colors" href={`/admin/offline/customers/${r.offlineCustomerId}`}>
                                  {r.customerName}
                                </Link>
                              ) : (
                                r.customerName
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{r.customerPhoneMasked}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-foreground/80">{KIND_LABELS[r.kind as keyof typeof KIND_LABELS] ?? r.kind}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-muted-foreground line-clamp-1">{formatLineSummary(r.lines)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{formatCurrency(r.payment?.amount)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={r.payment?.status} type="payment" />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={r.status} type="record" />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {r.offlineCustomerId && (
                              <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Link href={`/admin/offline/customers/${r.offlineCustomerId}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                const line = Array.isArray(r.lines) ? (r.lines[0] ?? {}) : {};
                                setEditingRecord(r);
                                setEditForm({
                                  kind: r.kind ?? "stringing",
                                  occurredAt: toDateInputValue(r.occurredAt),
                                  racketName: line.racketName ?? "",
                                  stringName: line.stringName ?? "",
                                  tensionMain: line.tensionMain ?? "",
                                  tensionCross: line.tensionCross ?? "",
                                  status: r.status,
                                  paymentStatus: r.payment?.status ?? "pending",
                                  paymentMethod: r.payment?.method ?? "cash",
                                  paymentAmount: Number(r.payment?.amount ?? 0),
                                  memo: r.memo ?? "",
                                });
                                setEditMessage(null);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{currentRecordsPage}</span> / {Math.max(recordsTotalPages, 1)} 페이지
              <span className="mx-2">·</span>
              전체 <span className="font-medium text-foreground">{recordsTotal.toLocaleString("ko-KR")}</span>건
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" disabled={recordsLoading || currentRecordsPage <= 1 || recordsTotalPages <= 1} onClick={() => setRecordsPage((page) => Math.max(1, page - 1))}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                이전
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={recordsLoading || recordsTotalPages <= 1 || currentRecordsPage >= recordsTotalPages} onClick={() => setRecordsPage((page) => page + 1)}>
                다음
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-overlay/60 backdrop-blur-sm"
            onClick={() => {
              setEditingRecord(null);
              setEditMessage(null);
            }}
          />
          <Card className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border-border/60">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-primary" />
                  기록 수정
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setEditingRecord(null);
                    setEditMessage(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Customer Info */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{editingRecord.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {editingRecord.customerPhoneMasked} · {formatLineSummary(editingRecord.lines)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">기본 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="작업 유형" htmlFor="edit-kind">
                    <Select id="edit-kind" value={editForm.kind} onChange={(e) => setEditForm({ ...editForm, kind: e.target.value })}>
                      {Object.entries(KIND_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="작업일" htmlFor="edit-occurredAt">
                    <Input type="date" id="edit-occurredAt" value={editForm.occurredAt} onChange={(e) => setEditForm({ ...editForm, occurredAt: e.target.value })} className="h-10" />
                  </FormField>
                </div>
              </div>

              {/* Work Info */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">작업 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="라켓명" htmlFor="edit-racketName">
                    <Input id="edit-racketName" value={editForm.racketName} onChange={(e) => setEditForm({ ...editForm, racketName: e.target.value })} className="h-10" />
                  </FormField>
                  <FormField label="스트링명" htmlFor="edit-stringName">
                    <Input id="edit-stringName" value={editForm.stringName} onChange={(e) => setEditForm({ ...editForm, stringName: e.target.value })} className="h-10" />
                  </FormField>
                  <FormField label="메인 텐션" htmlFor="edit-tensionMain">
                    <Input id="edit-tensionMain" value={editForm.tensionMain} onChange={(e) => setEditForm({ ...editForm, tensionMain: e.target.value })} className="h-10" />
                  </FormField>
                  <FormField label="크로스 텐션" htmlFor="edit-tensionCross">
                    <Input id="edit-tensionCross" value={editForm.tensionCross} onChange={(e) => setEditForm({ ...editForm, tensionCross: e.target.value })} className="h-10" />
                  </FormField>
                </div>
              </div>

              {/* Status & Payment Info */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">상태/결제 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="작업 상태" htmlFor="edit-status">
                    <Select id="edit-status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                      {Object.entries(RECORD_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="결제 상태" htmlFor="edit-paymentStatus">
                    <Select id="edit-paymentStatus" value={editForm.paymentStatus} onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}>
                      {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="결제수단" htmlFor="edit-paymentMethod">
                    <Select id="edit-paymentMethod" value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="결제 금액" htmlFor="edit-paymentAmount">
                    <Input type="number" id="edit-paymentAmount" value={editForm.paymentAmount} onChange={(e) => setEditForm({ ...editForm, paymentAmount: Number(e.target.value) })} className="h-10" />
                  </FormField>
                </div>
              </div>

              {/* Memo */}
              <FormField label="작업 메모" htmlFor="edit-memo">
                <textarea
                  id="edit-memo"
                  value={editForm.memo}
                  onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring hover:border-ring/50 min-h-[80px] resize-none"
                />
              </FormField>

              {editMessage && <Message type="error">{editMessage}</Message>}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingRecord(null);
                    setEditMessage(null);
                  }}
                >
                  취소
                </Button>
                <Button
                  disabled={isEditingSubmit}
                  onClick={async () => {
                    if (!editingRecord || isEditingSubmit) return;
                    setIsEditingSubmit(true);
                    setEditMessage(null);
                    try {
                      await adminMutator(`/api/admin/offline/records/${editingRecord.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          kind: editForm.kind,
                          occurredAt: editForm.occurredAt ? new Date(`${editForm.occurredAt}T00:00:00.000Z`).toISOString() : undefined,
                          status: editForm.status,
                          lines: [{ racketName: editForm.racketName, stringName: editForm.stringName, tensionMain: editForm.tensionMain, tensionCross: editForm.tensionCross }],
                          payment: { status: editForm.paymentStatus, method: editForm.paymentMethod, amount: Number(editForm.paymentAmount || 0) },
                          memo: editForm.memo,
                        }),
                      });
                      await mutateRecords();
                      setEditingRecord(null);
                    } catch (e: any) {
                      setEditMessage(String(e?.message || "수정 저장에 실패했습니다."));
                    } finally {
                      setIsEditingSubmit(false);
                    }
                  }}
                >
                  {isEditingSubmit ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      수정 저장
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
