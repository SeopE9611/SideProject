"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import useSWR from "swr";
import { ArrowLeft, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { adminFetcher, adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import type { OfflineCustomerDto, OfflineKind, OfflineLinkCandidate, OfflineLinkedUser, OfflinePaymentMethod, OfflinePaymentStatus, OfflineStatus } from "@/types/admin/offline";

type OfflineRecord = {
  id: string;
  kind: OfflineKind;
  status: OfflineStatus;
  occurredAt?: string | null;
  customerSnapshot?: { name?: string; phone?: string; email?: string | null } | null;
  lines?: Array<{ racketName?: string; stringName?: string; tensionMain?: string; tensionCross?: string }>;
  lineSummary?: string;
  payment?: { status?: OfflinePaymentStatus; method?: OfflinePaymentMethod; amount?: number | null } | null;
  memo?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type OfflineCustomerDetail = OfflineCustomerDto & {
  phoneNormalized?: string | null;
  linkedUser?: OfflineLinkedUser | null;
};

type DetailResponse = { item: OfflineCustomerDetail; records?: OfflineRecord[] };

const KIND_LABELS = { stringing: "스트링 작업", package_sale: "패키지 판매", etc: "기타" } as const;
const RECORD_STATUS_LABELS = { received: "접수", in_progress: "작업중", completed: "완료", picked_up: "수령완료", canceled: "취소" } as const;
const PAYMENT_STATUS_LABELS = { pending: "미결제", paid: "결제완료", refunded: "환불" } as const;
const PAYMENT_METHOD_LABELS = { cash: "현금", card: "카드", bank_transfer: "계좌이체", etc: "기타" } as const;

function formatCurrency(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

function formatDate(value?: string | Date | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "numeric", day: "numeric" }).format(date);
}

function formatLineSummary(lines?: OfflineRecord["lines"]): string {
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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1 rounded-md border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{value || "-"}</div>
    </div>
  );
}


type LinkCandidatesResponse = { items: OfflineLinkCandidate[] };

const LINK_ERROR_MESSAGES: Record<string, string> = {
  "customer not found": "오프라인 고객을 찾을 수 없습니다.",
  "user not found": "온라인 회원을 찾을 수 없습니다.",
  "customer already linked to another user": "이미 다른 온라인 회원과 연결된 오프라인 고객입니다.",
  "user already linked to another offline customer": "이미 다른 오프라인 고객과 연결된 온라인 회원입니다.",
  "invalid userId": "온라인 회원 ID가 올바르지 않습니다.",
  "invalid customer id": "오프라인 고객 ID가 올바르지 않습니다.",
};

function translateLinkError(error: unknown): string {
  const message = getAdminErrorMessage(error);
  return LINK_ERROR_MESSAGES[message] ?? message ?? "온라인 회원 연결에 실패했습니다.";
}

function MatchBadge({ active, children }: { active: boolean; children: ReactNode }) {
  return active ? <Badge variant="secondary">{children}</Badge> : <Badge variant="outline" className="text-muted-foreground">{children} 불일치</Badge>;
}

export default function OfflineCustomerDetailClient({ id }: { id: string }) {
  const { data, error, isLoading, mutate: mutateDetail } = useSWR<DetailResponse>(`/api/admin/offline/customers/${id}`, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
  });
  const [candidateQuery, setCandidateQuery] = useState({ name: "", phone: "", email: "" });
  const [submittedCandidateQuery, setSubmittedCandidateQuery] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkMessageType, setLinkMessageType] = useState<"success" | "error" | null>(null);
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const candidateKey = submittedCandidateQuery
    ? `/api/admin/offline/customers/${id}/link-candidates?name=${encodeURIComponent(submittedCandidateQuery.name)}&phone=${encodeURIComponent(submittedCandidateQuery.phone)}&email=${encodeURIComponent(submittedCandidateQuery.email)}`
    : null;
  const { data: candidatesData, isLoading: candidatesLoading, mutate: mutateCandidates } = useSWR<LinkCandidatesResponse>(candidateKey, adminFetcher, {
    revalidateOnFocus: false,
  });

  const item = data?.item;
  const records = data?.records ?? [];
  const pendingCount = records.filter((record) => record.payment?.status === "pending").length;
  const refundedCount = records.filter((record) => record.payment?.status === "refunded").length;
  const candidates = candidatesData?.items ?? [];

  async function handleLinkUser(userId: string) {
    if (!window.confirm("이 온라인 회원을 현재 오프라인 고객과 연결하시겠습니까?")) return;
    setLinkingUserId(userId);
    setLinkMessage(null);
    setLinkMessageType(null);
    try {
      await adminMutator(`/api/admin/offline/customers/${id}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setLinkMessage("온라인 회원과 연결했습니다.");
      setLinkMessageType("success");
      await mutateDetail();
      await mutateCandidates();
    } catch (err) {
      setLinkMessage(translateLinkError(err));
      setLinkMessageType("error");
    } finally {
      setLinkingUserId(null);
    }
  }

  async function handleUnlinkUser() {
    if (!window.confirm("온라인 회원 연결을 해제하시겠습니까? 기존 오프라인 기록은 삭제되지 않습니다.")) return;
    setIsUnlinking(true);
    setLinkMessage(null);
    setLinkMessageType(null);
    try {
      await adminMutator(`/api/admin/offline/customers/${id}/link`, { method: "DELETE" });
      setLinkMessage("온라인 회원 연결을 해제했습니다.");
      setLinkMessageType("success");
      setSubmittedCandidateQuery(null);
      await mutateDetail();
    } catch (err) {
      setLinkMessage(translateLinkError(err));
      setLinkMessageType("error");
    } finally {
      setIsUnlinking(false);
    }
  }


  if (isLoading) {
    return <Card><CardContent className="py-10 text-sm">오프라인 고객 상세 정보를 불러오는 중입니다...</CardContent></Card>;
  }

  if (error || !item) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>오프라인 고객 상세를 불러오지 못했습니다.</CardTitle>
          <CardDescription>고객 ID가 잘못되었거나 고객이 삭제되었을 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline"><Link href="/admin/offline">오프라인 관리로 돌아가기</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">오프라인 고객 상세</h1>
          <p className="mt-1 text-sm text-muted-foreground">고객 기본 정보와 오프라인 작업/매출 이력을 확인합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/offline"><ArrowLeft className="mr-2 h-4 w-4" />오프라인 관리로 돌아가기</Link></Button>
          <Button asChild variant="secondary"><a href="#offline-records"><History className="mr-2 h-4 w-4" />최근 기록으로 이동</a></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>고객 기본 정보</CardTitle>
            <CardDescription>휴대폰은 마스킹 정보를 우선 표시하고, 관리자 확인용 원번호를 보조로 제공합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <DetailRow label="고객명" value={<span className="font-medium">{item.name || "-"}</span>} />
              <DetailRow label="휴대폰 번호" value={<><span>{item.phoneMasked || "-"}</span>{item.phone ? <p className="mt-1 text-xs text-muted-foreground">원번호: {item.phone}</p> : null}</>} />
              <DetailRow label="이메일" value={item.email || "-"} />
              <DetailRow label="마지막 방문일" value={formatDate(item.stats?.lastVisitedAt)} />
              <DetailRow label="등록일" value={formatDate(item.createdAt)} />
              <DetailRow label="수정일" value={formatDate(item.updatedAt)} />
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">메모</p>
              <p className="whitespace-pre-wrap text-sm">{item.memo || "등록된 메모가 없습니다."}</p>
            </div>
            {item.tags?.length ? <div className="flex flex-wrap gap-2">{item.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div> : null}
            <p className="text-xs text-muted-foreground">고객 정보 수정은 오프라인 관리 화면 또는 후속 단계에서 지원 예정입니다.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>온라인 회원 연결 상태</CardTitle>
            <CardDescription>온라인 회원과 오프라인 고객을 관리자가 직접 확인한 뒤 연결합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {item.linkedUserId ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">온라인 회원과 연결됨</Badge>
                  {!item.linkedUser ? <Badge variant="outline">회원 정보 없음</Badge> : null}
                </div>
                <p className="text-muted-foreground">이 연결은 향후 포인트/패키지 연동 기준으로 사용됩니다.</p>
                <DetailRow label="회원명" value={item.linkedUser?.name || "회원 정보 없음"} />
                <DetailRow label="회원 이메일" value={item.linkedUser?.email || "-"} />
                <DetailRow label="회원 휴대폰" value={item.linkedUser?.phoneMasked || item.linkedUser?.phone || "-"} />
                <p className="break-all text-xs text-muted-foreground">linkedUserId: {item.linkedUserId}</p>
                <Button type="button" variant="destructive" size="sm" onClick={handleUnlinkUser} disabled={isUnlinking}>
                  {isUnlinking ? "연결 해제 중..." : "연결 해제"}
                </Button>
              </>
            ) : (
              <>
                <Badge variant="outline">온라인 회원 미연결</Badge>
                <p className="text-muted-foreground">포인트/패키지 연동은 온라인 회원 연결 후 사용할 수 있습니다.</p>
                <form
                  className="space-y-3 rounded-md border p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setCandidateMessage(null);
                    setLinkMessage(null);
                    if (!candidateQuery.name.trim() && !candidateQuery.phone.trim() && !candidateQuery.email.trim()) {
                      setCandidateMessage("검색어를 하나 이상 입력해 주세요.");
                      setSubmittedCandidateQuery(null);
                      return;
                    }
                    setSubmittedCandidateQuery({ ...candidateQuery });
                  }}
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="link-candidate-name">이름</Label>
                      <Input id="link-candidate-name" value={candidateQuery.name} onChange={(e) => setCandidateQuery({ ...candidateQuery, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="link-candidate-phone">휴대폰 번호</Label>
                      <Input id="link-candidate-phone" value={candidateQuery.phone} onChange={(e) => setCandidateQuery({ ...candidateQuery, phone: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                      <Label htmlFor="link-candidate-email">이메일</Label>
                      <Input id="link-candidate-email" type="email" value={candidateQuery.email} onChange={(e) => setCandidateQuery({ ...candidateQuery, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm">검색</Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCandidateQuery({ name: "", phone: "", email: "" });
                        setSubmittedCandidateQuery(null);
                        setCandidateMessage(null);
                        setLinkMessage(null);
                      }}
                    >
                      초기화
                    </Button>
                  </div>
                </form>
                {!submittedCandidateQuery && !candidateMessage ? <p>온라인 회원을 검색해 이 오프라인 고객과 연결할 수 있습니다.</p> : null}
                {candidateMessage ? <p className="text-sm text-destructive">{candidateMessage}</p> : null}
                {submittedCandidateQuery && candidatesLoading ? <p>회원 검색 중...</p> : null}
                {submittedCandidateQuery && !candidatesLoading && candidates.length === 0 ? <p>검색 결과가 없습니다.</p> : null}
                {submittedCandidateQuery && !candidatesLoading && candidates.length > 0 ? (
                  <div className="space-y-2">
                    {candidates.map((candidate) => {
                      const isLinkedToCurrent = candidate.alreadyLinkedOfflineCustomerId === item.id;
                      const isLinkedToOther = !!candidate.alreadyLinkedOfflineCustomerId && !isLinkedToCurrent;
                      return (
                        <div key={candidate.id} className="space-y-2 rounded-md border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium">{candidate.name || "이름 없음"}</p>
                              <p className="break-all text-muted-foreground">{candidate.email || "이메일 없음"}</p>
                              <p className="text-muted-foreground">{candidate.phoneMasked || "휴대폰 없음"}</p>
                              <p className="break-all text-xs text-muted-foreground">회원 ID: {candidate.id}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleLinkUser(candidate.id)}
                              disabled={isLinkedToOther || isLinkedToCurrent || linkingUserId === candidate.id}
                            >
                              {isLinkedToCurrent ? "현재 연결됨" : linkingUserId === candidate.id ? "연결 중..." : "연결"}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <MatchBadge active={candidate.match.name}>이름 일치</MatchBadge>
                            <MatchBadge active={candidate.match.phone}>휴대폰 일치</MatchBadge>
                            <MatchBadge active={candidate.match.email}>이메일 일치</MatchBadge>
                          </div>
                          {isLinkedToOther ? <p className="text-xs text-destructive">이미 다른 오프라인 고객({candidate.alreadyLinkedOfflineCustomerId})과 연결된 회원입니다.</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
            {linkMessage ? <p className={linkMessageType === "error" ? "text-sm text-destructive" : "text-sm text-foreground"}>{linkMessage}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>누적 통계</CardTitle>
          <CardDescription>오프라인 고객 기준으로 누적된 방문/작업/결제 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <DetailRow label="방문 횟수" value={`${item.stats?.visitCount ?? 0}회`} />
          <DetailRow label="총 작업 수" value={`${item.stats?.totalServiceCount ?? 0}건`} />
          <DetailRow label="총 결제액" value={formatCurrency(item.stats?.totalPaid)} />
          <DetailRow label="마지막 방문일" value={formatDate(item.stats?.lastVisitedAt)} />
          <DetailRow label="미결제 기록 수" value={`${pendingCount}건`} />
          <DetailRow label="환불 기록 수" value={`${refundedCount}건`} />
        </CardContent>
      </Card>

      <Card id="offline-records">
        <CardHeader>
          <CardTitle>작업/매출 이력</CardTitle>
          <CardDescription>해당 고객에게 등록된 최근 오프라인 작업/매출 이력입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm">아직 등록된 오프라인 작업/매출 이력이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">날짜</th>
                    <th className="px-2 py-2">유형</th>
                    <th className="px-2 py-2">작업 내용</th>
                    <th className="px-2 py-2">결제 금액</th>
                    <th className="px-2 py-2">결제 상태</th>
                    <th className="px-2 py-2">작업 상태</th>
                    <th className="px-2 py-2">메모</th>
                    <th className="px-2 py-2">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b align-top">
                      <td className="px-2 py-2">{formatDate(record.occurredAt)}</td>
                      <td className="px-2 py-2">{KIND_LABELS[record.kind] ?? record.kind}</td>
                      <td className="px-2 py-2">{record.lineSummary || formatLineSummary(record.lines)}</td>
                      <td className="px-2 py-2">{formatCurrency(record.payment?.amount)}</td>
                      <td className="px-2 py-2"><Badge variant="outline">{record.payment?.status ? PAYMENT_STATUS_LABELS[record.payment.status] : "-"}</Badge><p className="mt-1 text-xs text-muted-foreground">{record.payment?.method ? PAYMENT_METHOD_LABELS[record.payment.method] : "-"}</p></td>
                      <td className="px-2 py-2"><Badge variant="outline">{RECORD_STATUS_LABELS[record.status] ?? record.status}</Badge></td>
                      <td className="max-w-xs px-2 py-2">{record.memo || "-"}</td>
                      <td className="px-2 py-2"><Button asChild size="sm" variant="outline"><Link href="/admin/offline">오프라인 관리에서 수정</Link></Button></td>
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
