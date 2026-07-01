"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowLeft, BookOpen, LinkIcon, Save } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageSection from "@/components/admin/AdminPageSection";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminFetcher, adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { badgeToneVariant, type BadgeSemanticTone } from "@/lib/badge-style";
import { cn } from "@/lib/utils";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  ACADEMY_APPLICATION_STATUSES,
  ACADEMY_CURRENT_LEVELS,
  ACADEMY_LESSON_TYPES,
  ACADEMY_PREFERRED_DAY_OPTIONS,
  getAcademyApplicationStatusLabel,
  getAcademyClassStatusLabel,
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
  cancelReason: string | null;
  cancelReasonLabel: string | null;
  cancelReasonDetail: string | null;
  cancelledAt: string | null;
  cancelledBy: "customer" | "admin" | null;
  history: AcademyLessonApplicationHistoryItem[];
  classId: string | null;
  classSnapshot: AcademyClassSnapshot | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type AcademyClassOption = {
  _id: string;
  name: string;
  status: string;
  capacity: number | null;
  confirmedCount?: number;
  applicationStats?: { confirmed: number };
  scheduleText: string | null;
};

type ClassesResponse = {
  success: true;
  items: AcademyClassOption[];
};

type DetailResponse = {
  success: true;
  item: AcademyApplicationDetail;
  classAutoClosed?: boolean;
  classAutoClosedMessage?: string | null;
  classAutoClosedConfirmedCount?: number | null;
  classAutoClosedCapacity?: number | null;
};

function getStatusTone(status: AcademyLessonApplicationStatus): BadgeSemanticTone {
  if (status === "submitted") return "warning";
  if (status === "reviewing") return "info";
  if (status === "contacted") return "brand";
  if (status === "confirmed") return "success";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function AcademyStatusBadge({ status }: { status: AcademyLessonApplicationStatus }) {
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
      <div className={adminTypography.metaMuted}>{label}</div>
      <div className={adminTypography.bodyStrong}>{value || "-"}</div>
    </div>
  );
}

export default function AcademyApplicationDetailClient({ id }: { id: string }) {
  const { data, error, isLoading, mutate } = useSWR<DetailResponse>(
    `/api/admin/academy/applications/${id}`,
    adminFetcher,
  );
  const item = data?.item;
  const { data: classesData } = useSWR<ClassesResponse>(
    "/api/admin/academy/classes?limit=50",
    adminFetcher,
  );

  const [status, setStatus] = useState<AcademyLessonApplicationStatus>("submitted");
  const [reason, setReason] = useState("");
  const [adminMemo, setAdminMemo] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingMemo, setSavingMemo] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classReason, setClassReason] = useState("");
  const [savingClass, setSavingClass] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    applicantName: "",
    phone: "",
    email: "",
    desiredLessonType: "",
    currentLevel: "",
    preferredDays: [] as string[],
    preferredTimeText: "",
    lessonGoal: "",
    requestMemo: "",
  });

  useEffect(() => {
    if (!item) return;
    setStatus(item.status);
    setAdminMemo(item.adminMemo ?? "");
    setCustomerMessage(item.customerMessage ?? "");
    setSelectedClassId(item.classId ?? item.classSnapshot?.classId ?? "");
    setEditForm({
      applicantName: item.applicantName,
      phone: item.phone,
      email: item.email ?? "",
      desiredLessonType: item.desiredLessonType,
      currentLevel: item.currentLevel,
      preferredDays: item.preferredDays,
      preferredTimeText: item.preferredTimeText ?? "",
      lessonGoal: item.lessonGoal ?? "",
      requestMemo: item.requestMemo ?? "",
    });
  }, [item]);

  const classOptions = useMemo(() => {
    return (classesData?.items ?? []).filter(
      (classItem) => classItem.status === "visible" || classItem.status === "closed",
    );
  }, [classesData?.items]);

  const hasLinkedClass = Boolean(item?.classId || item?.classSnapshot?.classId);

  const sortedHistory = useMemo(() => {
    return [...(item?.history ?? [])].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
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
      showSuccessToast(
        result.classAutoClosed && result.classAutoClosedMessage
          ? `신청 상태가 저장되었습니다. ${result.classAutoClosedMessage}`
          : "신청 상태가 저장되었습니다.",
      );
    } catch (mutationError) {
      showErrorToast(getAdminErrorMessage(mutationError));
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveClassLink() {
    if (!item || !selectedClassId) return;
    if (hasLinkedClass) {
      const ok = window.confirm(
        "신청 클래스를 변경하면 고객 마이페이지와 클래스 집계에 반영됩니다. 계속하시겠습니까?",
      );
      if (!ok) return;
    }

    setSavingClass(true);
    try {
      const result = await adminMutator<DetailResponse>(
        `/api/admin/academy/applications/${id}/class`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId: selectedClassId, reason: classReason }),
        },
      );
      await mutate(result, { revalidate: false });
      setClassReason("");
      showSuccessToast(
        result.classAutoClosed && result.classAutoClosedMessage
          ? `신청이 클래스에 연결되었습니다. ${result.classAutoClosedMessage}`
          : "신청이 클래스에 연결되었습니다.",
      );
    } catch (mutationError) {
      showErrorToast(getAdminErrorMessage(mutationError));
    } finally {
      setSavingClass(false);
    }
  }

  const canAdminEditApplication = item?.status !== "cancelled";

  const toggleEditDay = (day: string) => {
    setEditForm((current) => ({
      ...current,
      preferredDays: current.preferredDays.includes(day)
        ? current.preferredDays.filter((item) => item !== day)
        : [...current.preferredDays, day],
    }));
  };

  async function saveApplicationEdit() {
    if (!item) return;
    setSavingEdit(true);
    try {
      const result = await adminMutator<DetailResponse>(
        `/api/admin/academy/applications/${id}/edit`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        },
      );
      await mutate(result, { revalidate: false });
      showSuccessToast("신청 정보가 수정되었습니다.");
    } catch (mutationError) {
      showErrorToast(getAdminErrorMessage(mutationError));
    } finally {
      setSavingEdit(false);
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
        <div className={`${adminSurface.cardMuted} p-8 ${adminTypography.metaMuted}`}>
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
        <div
          className={`${adminSurface.cardMuted} border-destructive/30 bg-destructive/10 p-8 ${adminTypography.body} text-destructive`}
        >
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
          <AdminPageSection title="신청자 정보" contentClassName="pt-4">
              <InfoRow label="이름" value={item.applicantName} />
              <InfoRow label="연락처" value={item.phone} />
              <InfoRow label="이메일" value={item.email ?? "-"} />
              <InfoRow label="회원 여부" value={item.userId ? "회원 신청" : "비회원 신청"} />
              <InfoRow label="접수일" value={formatDateTime(item.createdAt)} />
              {item.status === "cancelled" ? (
                <>
                  <InfoRow label="취소일" value={formatDateTime(item.cancelledAt)} />
                  <InfoRow
                    label="취소 처리"
                    value={item.cancelledBy === "customer" ? "고객 신청 취소" : "관리자 취소"}
                  />
                  <InfoRow
                    label="취소 사유"
                    value={
                      item.cancelReasonLabel
                        ? `${item.cancelReasonLabel}${item.cancelReasonDetail ? ` - ${item.cancelReasonDetail}` : ""}`
                        : "-"
                    }
                  />
                </>
              ) : null}
          </AdminPageSection>

          {item.classSnapshot ? (
            <AdminPageSection
              title="선택 클래스 정보"
              description="신청 당시 저장된 클래스 스냅샷입니다."
              contentClassName="pt-4"
            >
                <InfoRow label="클래스명" value={item.classSnapshot.name || "-"} />
                <InfoRow label="수업 유형" value={item.classSnapshot.lessonTypeLabel ?? "-"} />
                <InfoRow label="레벨" value={item.classSnapshot.levelLabel ?? "-"} />
                <InfoRow label="강사" value={item.classSnapshot.instructorName ?? "상담 후 안내"} />
                <InfoRow label="장소" value={item.classSnapshot.location ?? "상담 후 안내"} />
                <InfoRow label="일정" value={item.classSnapshot.scheduleText ?? "상담 후 조율"} />
                <InfoRow label="기준 수강료" value={formatPrice(item.classSnapshot.price)} />
                <InfoRow label="신청 당시 상태" value={item.classSnapshot.statusLabel ?? "-"} />
            </AdminPageSection>
          ) : item.classId ? (
            <AdminPageSection title="선택 클래스 정보" contentClassName="pt-4">
                <InfoRow label="클래스 ID" value={item.classId} />
                <p className={`mt-3 ${adminTypography.metaMuted}`}>
                  신청 당시 클래스 스냅샷이 없어 ID만 표시합니다.
                </p>
            </AdminPageSection>
          ) : (
            <AdminPageSection title="선택 클래스 정보" contentClassName="pt-4">
                <div className={`${adminSurface.cardMuted} p-4 ${adminTypography.body}`}>
                  <div className="font-medium text-foreground">클래스 미연결</div>
                  <p className={`mt-2 ${adminTypography.metaMuted}`}>
                    이 신청은 기존 단독 신청으로 생성되어 클래스에 연결되어 있지 않습니다. 등록
                    확정 인원에 집계하려면 클래스를 연결해 주세요.
                  </p>
                </div>
            </AdminPageSection>
          )}

          <AdminPageSection title="레슨 희망 정보" contentClassName="pt-4">
              <InfoRow
                label="희망 레슨 유형"
                value={getAcademyLessonTypeLabel(item.desiredLessonType)}
              />
              <InfoRow label="현재 실력" value={getAcademyCurrentLevelLabel(item.currentLevel)} />
              <InfoRow
                label="희망 요일"
                value={item.preferredDays.length ? item.preferredDays.join(", ") : "-"}
              />
              <InfoRow label="희망 시간대" value={item.preferredTimeText ?? "-"} />
              <InfoRow label="레슨 목표" value={item.lessonGoal ?? "-"} />
              <InfoRow label="요청사항" value={item.requestMemo ?? "-"} />
          </AdminPageSection>

          <AdminPageSection
            title="처리 이력"
            description="상태 변경 및 메모 변경 내역입니다."
            contentClassName="pt-4"
          >
              {sortedHistory.length === 0 ? (
                <div className={`${adminSurface.cardMuted} p-5 ${adminTypography.metaMuted}`}>
                  아직 처리 이력이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedHistory.map((historyItem, index) => (
                    <div
                      key={`${historyItem.date}-${index}`}
                      className={cn(adminSurface.cardMuted, "p-4")}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <AcademyStatusBadge status={historyItem.status} />
                        <span className={adminTypography.caption}>
                          {formatDateTime(historyItem.date)}
                        </span>
                      </div>
                      <p className={`mt-2 ${adminTypography.body}`}>{historyItem.description}</p>
                      {historyItem.actorName ? (
                        <p className={`mt-1 ${adminTypography.caption}`}>
                          처리자: {historyItem.actorName}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
          </AdminPageSection>
        </div>

        <div className="space-y-5">
          <AdminPageSection
            title="상태 관리"
            description="상담 진행 상황에 맞게 신청 상태를 변경합니다. 결제 요청이 아니라 상담과 등록 확정 흐름을 관리합니다."
            contentClassName="space-y-4 pt-4"
          >
              <div className="space-y-2">
                <label className={adminTypography.bodyStrong} htmlFor="academy-status">
                  현재 상태
                </label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as AcademyLessonApplicationStatus)}
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
                <label className={adminTypography.bodyStrong} htmlFor="status-reason">
                  상태 변경 사유 <span className="text-muted-foreground">(선택)</span>
                </label>
                <Input
                  id="status-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="예: 상담 일정 확인"
                />
              </div>
              <Button className="w-full" onClick={saveStatus} disabled={savingStatus}>
                <Save className="mr-2 h-4 w-4" />
                {savingStatus ? "저장 중..." : "상태 변경 저장"}
              </Button>
          </AdminPageSection>



          <AdminPageSection
            title="신청 정보 수정"
            description="신청자 정보와 희망 레슨 정보를 수정합니다. 상태, 메모, 클래스 연결 정보는 각 전용 섹션에서만 변경합니다."
            contentClassName="space-y-4 pt-4"
          >
              {item.status === "cancelled" ? (
                <p className={adminTypography.caption}>취소된 신청은 수정할 수 없습니다.</p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={editForm.applicantName} onChange={(event) => setEditForm((current) => ({ ...current, applicantName: event.target.value }))} placeholder="신청자명" disabled={!canAdminEditApplication || savingEdit} maxLength={50} />
                <Input value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} placeholder="연락처" disabled={!canAdminEditApplication || savingEdit} maxLength={30} />
              </div>
              <Input value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} placeholder="이메일" disabled={!canAdminEditApplication || savingEdit} maxLength={100} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={editForm.desiredLessonType} onValueChange={(value) => setEditForm((current) => ({ ...current, desiredLessonType: value }))} disabled={!canAdminEditApplication || savingEdit}>
                  <SelectTrigger><SelectValue placeholder="희망 레슨 유형" /></SelectTrigger>
                  <SelectContent>{ACADEMY_LESSON_TYPES.map((value) => <SelectItem key={value} value={value}>{getAcademyLessonTypeLabel(value)}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editForm.currentLevel} onValueChange={(value) => setEditForm((current) => ({ ...current, currentLevel: value }))} disabled={!canAdminEditApplication || savingEdit}>
                  <SelectTrigger><SelectValue placeholder="현재 실력" /></SelectTrigger>
                  <SelectContent>{ACADEMY_CURRENT_LEVELS.map((value) => <SelectItem key={value} value={value}>{getAcademyCurrentLevelLabel(value)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                {ACADEMY_PREFERRED_DAY_OPTIONS.map((day) => (
                  <label key={day} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <input type="checkbox" checked={editForm.preferredDays.includes(day)} onChange={() => toggleEditDay(day)} disabled={!canAdminEditApplication || savingEdit} />
                    {day}
                  </label>
                ))}
              </div>
              <Input value={editForm.preferredTimeText} onChange={(event) => setEditForm((current) => ({ ...current, preferredTimeText: event.target.value }))} placeholder="희망 시간대" disabled={!canAdminEditApplication || savingEdit} maxLength={100} />
              <Textarea value={editForm.lessonGoal} onChange={(event) => setEditForm((current) => ({ ...current, lessonGoal: event.target.value }))} placeholder="레슨 목표" disabled={!canAdminEditApplication || savingEdit} maxLength={500} />
              <Textarea value={editForm.requestMemo} onChange={(event) => setEditForm((current) => ({ ...current, requestMemo: event.target.value }))} placeholder="요청사항" disabled={!canAdminEditApplication || savingEdit} maxLength={1000} />
              <Button className="w-full" onClick={saveApplicationEdit} disabled={!canAdminEditApplication || savingEdit || editForm.preferredDays.length === 0}>
                <Save className="mr-2 h-4 w-4" />
                {savingEdit ? "저장 중..." : "신청 정보 저장"}
              </Button>
          </AdminPageSection>

          <AdminPageSection
            title={hasLinkedClass ? "클래스 변경" : "클래스 연결"}
            description="모집 클래스에 신청을 연결하면 고객 마이페이지와 클래스 집계에 반영됩니다."
            contentClassName="space-y-4 pt-4"
          >
              {!hasLinkedClass ? (
                <div className={`${adminSurface.cardMuted} p-4 ${adminTypography.metaMuted}`}>
                  클래스 미연결 신청입니다. 등록 확정 인원에 집계하려면 클래스를 연결해 주세요.
                </div>
              ) : null}
              <div className="space-y-2">
                <label className={adminTypography.bodyStrong} htmlFor="academy-class-link">
                  연결할 클래스
                </label>
                <Select
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  disabled={item.status === "cancelled" || savingClass}
                >
                  <SelectTrigger id="academy-class-link">
                    <SelectValue placeholder="클래스 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((classItem) => {
                      const confirmed =
                        classItem.confirmedCount ?? classItem.applicationStats?.confirmed ?? 0;
                      const capacity =
                        typeof classItem.capacity === "number" && classItem.capacity > 0
                          ? `${confirmed.toLocaleString("ko-KR")}/${classItem.capacity.toLocaleString("ko-KR")}명`
                          : `${confirmed.toLocaleString("ko-KR")}명/정원 없음`;
                      return (
                        <SelectItem key={classItem._id} value={classItem._id}>
                          {classItem.name} · {getAcademyClassStatusLabel(classItem.status)} · {capacity}
                          {classItem.scheduleText ? ` · ${classItem.scheduleText}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className={adminTypography.bodyStrong} htmlFor="class-link-reason">
                  연결/변경 사유 <span className="text-muted-foreground">(선택)</span>
                </label>
                <Input
                  id="class-link-reason"
                  value={classReason}
                  onChange={(event) => setClassReason(event.target.value)}
                  placeholder="예: 기존 단독 신청을 모집 클래스로 연결"
                  disabled={item.status === "cancelled" || savingClass}
                />
              </div>
              {item.status === "cancelled" ? (
                <p className={adminTypography.caption}>취소된 신청은 클래스에 연결할 수 없습니다.</p>
              ) : null}
              <Button
                className="w-full"
                onClick={saveClassLink}
                disabled={item.status === "cancelled" || savingClass || !selectedClassId}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {savingClass ? "저장 중..." : hasLinkedClass ? "클래스 변경" : "클래스 연결"}
              </Button>
          </AdminPageSection>

          <AdminPageSection
            title="관리자 메모"
            description="내부 메모와 고객 안내 메시지를 분리해서 저장합니다."
            contentClassName="space-y-4 pt-4"
          >
              <div className="space-y-2">
                <label className={adminTypography.bodyStrong} htmlFor="admin-memo">
                  관리자 내부 메모
                </label>
                <p className={adminTypography.caption}>
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
                <div className={`text-right ${adminTypography.caption}`}>
                  {adminMemo.length}/2000
                </div>
              </div>

              <div className="space-y-2">
                <label className={adminTypography.bodyStrong} htmlFor="customer-message">
                  고객 안내 메시지
                </label>
                <p className={adminTypography.caption}>
                  고객 마이페이지에 표시되는 안내 메시지입니다. 등록 확정, 방문 일정, 현장결제 안내
                  등을 작성하세요.
                </p>
                <Textarea
                  id="customer-message"
                  value={customerMessage}
                  maxLength={1000}
                  onChange={(event) => setCustomerMessage(event.target.value)}
                  placeholder="예: 등록이 확정되었습니다. 첫 수업 방문 시 현장에서 결제해 주세요."
                  className="min-h-28"
                />
                <div className={`text-right ${adminTypography.caption}`}>
                  {customerMessage.length}/1000
                </div>
              </div>

              <Button className="w-full" onClick={saveMemo} disabled={savingMemo}>
                <Save className="mr-2 h-4 w-4" />
                {savingMemo ? "저장 중..." : "메모 저장"}
              </Button>
          </AdminPageSection>
        </div>
      </div>
    </div>
  );
}
