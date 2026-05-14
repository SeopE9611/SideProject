"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowLeft, BookOpen, Save } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminSurface } from "@/components/admin/admin-typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  adminFetcher,
  adminMutator,
  getAdminErrorMessage,
} from "@/lib/admin/adminFetcher";
import { badgeToneVariant, type BadgeSemanticTone } from "@/lib/badge-style";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  ACADEMY_APPLICATION_STATUSES,
  getAcademyApplicationStatusLabel,
  getAcademyCurrentLevelLabel,
  getAcademyLessonTypeLabel,
  type AcademyClassSnapshot,
  type AcademyLessonApplicationHistoryItem,
  type AcademyLessonApplicationStatus,
} from "@/lib/types/academy";

type AcademyApplicationDetail = {
  _id: string;
  userId: string | null;
  applicantName: string;
  phone: string;
  email: string | null;
  desiredLessonType: string;
  currentLevel: string;
  preferredDays: string[];
  preferredTimeText: string | null;
  lessonGoal: string | null;
  requestMemo: string | null;
  status: AcademyLessonApplicationStatus;
  adminMemo: string | null;
  customerMessage: string | null;
  history: AcademyLessonApplicationHistoryItem[];
  classId: string | null;
  classSnapshot: AcademyClassSnapshot | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type DetailResponse = {
  success: true;
  item: AcademyApplicationDetail;
};

function getStatusTone(
  status: AcademyLessonApplicationStatus,
): BadgeSemanticTone {
  if (status === "submitted") return "warning";
  if (status === "reviewing") return "info";
  if (status === "contacted") return "brand";
  if (status === "confirmed") return "success";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function AcademyStatusBadge({
  status,
}: {
  status: AcademyLessonApplicationStatus;
}) {
  return (
    <Badge variant={badgeToneVariant(getStatusTone(status))}>
      {getAcademyApplicationStatusLabel(status)}
    </Badge>
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(price: number | null | undefined) {
  if (typeof price === "number" && price > 0) {
    return `${price.toLocaleString("ko-KR")}원`;
  }
  return "상담 후 안내";
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-b-0 sm:grid-cols-[140px_1fr]">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value || "-"}</div>
    </div>
  );
}

export default function AcademyApplicationDetailClient({ id }: { id: string }) {
  const { data, error, isLoading, mutate } = useSWR<DetailResponse>(
    `/api/admin/academy/applications/${id}`,
    adminFetcher,
  );
  const item = data?.item;

  const [status, setStatus] =
    useState<AcademyLessonApplicationStatus>("submitted");
  const [reason, setReason] = useState("");
  const [adminMemo, setAdminMemo] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingMemo, setSavingMemo] = useState(false);

  useEffect(() => {
    if (!item) return;
    setStatus(item.status);
    setAdminMemo(item.adminMemo ?? "");
    setCustomerMessage(item.customerMessage ?? "");
  }, [item]);

  const sortedHistory = useMemo(() => {
    return [...(item?.history ?? [])].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return (
        (Number.isFinite(bTime) ? bTime : 0) -
        (Number.isFinite(aTime) ? aTime : 0)
      );
    });
  }, [item?.history]);

  async function saveStatus() {
    if (!item) return;
    setSavingStatus(true);
    try {
      const result = await adminMutator<DetailResponse>(
        `/api/admin/academy/applications/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reason }),
        },
      );
      await mutate(result, { revalidate: false });
      setReason("");
      showSuccessToast("신청 상태가 저장되었습니다.");
    } catch (mutationError) {
      showErrorToast(getAdminErrorMessage(mutationError));
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveMemo() {
    if (!item) return;
    setSavingMemo(true);
    try {
      const result = await adminMutator<DetailResponse>(
        `/api/admin/academy/applications/${id}/memo`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminMemo, customerMessage }),
        },
      );
      await mutate(result, { revalidate: false });
      showSuccessToast("메모가 저장되었습니다.");
    } catch (mutationError) {
      showErrorToast(getAdminErrorMessage(mutationError));
    } finally {
      setSavingMemo(false);
    }
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-sm text-muted-foreground">
          레슨 신청 상세를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/academy/applications">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Link>
        </Button>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
          레슨 신청 상세를 불러오지 못했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="레슨 신청 상세"
        description="신청자 정보와 희망 레슨 정보를 확인하고 상담 상태를 관리합니다."
        icon={BookOpen}
        scope="도깨비테니스 아카데미"
        actions={
          <div className="flex items-center gap-2">
            <AcademyStatusBadge status={item.status} />
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/academy/applications">
                <ArrowLeft className="mr-2 h-4 w-4" />
                뒤로가기
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card className={adminSurface.card}>
            <CardHeader>
              <CardTitle className="text-base">신청자 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="이름" value={item.applicantName} />
              <InfoRow label="연락처" value={item.phone} />
              <InfoRow label="이메일" value={item.email ?? "-"} />
              <InfoRow
                label="회원 여부"
                value={item.userId ? "회원 신청" : "비회원 신청"}
              />
              <InfoRow label="접수일" value={formatDateTime(item.createdAt)} />
            </CardContent>
          </Card>

          {item.classSnapshot ? (
            <Card className={adminSurface.card}>
              <CardHeader>
                <CardTitle className="text-base">선택 클래스 정보</CardTitle>
                <CardDescription>
                  신청 당시 저장된 클래스 스냅샷입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InfoRow
                  label="클래스명"
                  value={item.classSnapshot.name || "-"}
                />
                <InfoRow
                  label="수업 유형"
                  value={item.classSnapshot.lessonTypeLabel ?? "-"}
                />
                <InfoRow
                  label="레벨"
                  value={item.classSnapshot.levelLabel ?? "-"}
                />
                <InfoRow
                  label="강사"
                  value={item.classSnapshot.instructorName ?? "상담 후 안내"}
                />
                <InfoRow
                  label="장소"
                  value={item.classSnapshot.location ?? "상담 후 안내"}
                />
                <InfoRow
                  label="일정"
                  value={item.classSnapshot.scheduleText ?? "상담 후 조율"}
                />
                <InfoRow
                  label="기준 수강료"
                  value={formatPrice(item.classSnapshot.price)}
                />
                <InfoRow
                  label="신청 당시 상태"
                  value={item.classSnapshot.statusLabel ?? "-"}
                />
              </CardContent>
            </Card>
          ) : item.classId ? (
            <Card className={adminSurface.card}>
              <CardHeader>
                <CardTitle className="text-base">선택 클래스 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="클래스 ID" value={item.classId} />
                <p className="mt-3 text-sm text-muted-foreground">
                  신청 당시 클래스 스냅샷이 없어 ID만 표시합니다.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card className={adminSurface.card}>
            <CardHeader>
              <CardTitle className="text-base">레슨 희망 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow
                label="희망 레슨 유형"
                value={getAcademyLessonTypeLabel(item.desiredLessonType)}
              />
              <InfoRow
                label="현재 실력"
                value={getAcademyCurrentLevelLabel(item.currentLevel)}
              />
              <InfoRow
                label="희망 요일"
                value={
                  item.preferredDays.length
                    ? item.preferredDays.join(", ")
                    : "-"
                }
              />
              <InfoRow
                label="희망 시간대"
                value={item.preferredTimeText ?? "-"}
              />
              <InfoRow label="레슨 목표" value={item.lessonGoal ?? "-"} />
              <InfoRow label="요청사항" value={item.requestMemo ?? "-"} />
            </CardContent>
          </Card>

          <Card className={adminSurface.card}>
            <CardHeader>
              <CardTitle className="text-base">처리 이력</CardTitle>
              <CardDescription>
                상태 변경 및 메모 변경 내역입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedHistory.length === 0 ? (
                <div className="rounded-xl border border-border/70 bg-muted/30 p-5 text-sm text-muted-foreground">
                  아직 처리 이력이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedHistory.map((historyItem, index) => (
                    <div
                      key={`${historyItem.date}-${index}`}
                      className="rounded-xl border border-border/70 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <AcademyStatusBadge status={historyItem.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(historyItem.date)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        {historyItem.description}
                      </p>
                      {historyItem.actorName ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          처리자: {historyItem.actorName}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className={adminSurface.card}>
            <CardHeader>
              <CardTitle className="text-base">상태 관리</CardTitle>
              <CardDescription>
                상담 진행 상황에 맞게 신청 상태를 변경합니다. 결제 요청이 아니라 상담과 등록 확정 흐름을 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="academy-status">
                  현재 상태
                </label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as AcademyLessonApplicationStatus)
                  }
                >
                  <SelectTrigger id="academy-status">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMY_APPLICATION_STATUSES.map((statusValue) => (
                      <SelectItem key={statusValue} value={statusValue}>
                        {getAcademyApplicationStatusLabel(statusValue)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="status-reason">
                  상태 변경 사유{" "}
                  <span className="text-muted-foreground">(선택)</span>
                </label>
                <Input
                  id="status-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="예: 상담 일정 확인"
                />
              </div>
              <Button
                className="w-full"
                onClick={saveStatus}
                disabled={savingStatus}
              >
                <Save className="mr-2 h-4 w-4" />
                {savingStatus ? "저장 중..." : "상태 변경 저장"}
              </Button>
            </CardContent>
          </Card>

          <Card className={adminSurface.card}>
            <CardHeader>
              <CardTitle className="text-base">관리자 메모</CardTitle>
              <CardDescription>
                내부 메모와 고객 안내 메시지를 분리해서 저장합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="admin-memo">
                  관리자 내부 메모
                </label>
                <p className="text-xs text-muted-foreground">
                  내부 운영자 전용 메모입니다. 고객에게 공개되지 않습니다.
                </p>
                <Textarea
                  id="admin-memo"
                  value={adminMemo}
                  maxLength={2000}
                  onChange={(event) => setAdminMemo(event.target.value)}
                  placeholder="전화 상담 내용, 운영 참고사항 등을 입력하세요."
                  className="min-h-32"
                />
                <div className="text-right text-xs text-muted-foreground">
                  {adminMemo.length}/2000
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="customer-message"
                >
                  고객 안내 메시지
                </label>
                <p className="text-xs text-muted-foreground">
                  고객 마이페이지에 표시되는 안내 메시지입니다. 등록 확정, 방문 일정, 현장결제 안내 등을 작성하세요.
                </p>
                <Textarea
                  id="customer-message"
                  value={customerMessage}
                  maxLength={1000}
                  onChange={(event) => setCustomerMessage(event.target.value)}
                  placeholder="예: 등록이 확정되었습니다. 첫 수업 방문 시 현장에서 결제해 주세요."
                  className="min-h-28"
                />
                <div className="text-right text-xs text-muted-foreground">
                  {customerMessage.length}/1000
                </div>
              </div>

              <Button
                className="w-full"
                onClick={saveMemo}
                disabled={savingMemo}
              >
                <Save className="mr-2 h-4 w-4" />
                {savingMemo ? "저장 중..." : "메모 저장"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
