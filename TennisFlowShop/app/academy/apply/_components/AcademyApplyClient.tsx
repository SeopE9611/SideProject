"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showErrorToast } from "@/lib/toast";
import type {
  AcademyActiveApplicationSummary,
  AcademyApplicantProfile,
  AcademyCurrentLevel,
  AcademyLessonType,
  PublicAcademyClass,
} from "@/lib/types/academy";
import { cn } from "@/lib/utils";

const lessonTypeOptions: { value: AcademyLessonType; label: string }[] = [
  { value: "group", label: "그룹 레슨" },
  { value: "private", label: "개인 레슨" },
  { value: "junior", label: "주니어 레슨" },
  { value: "adult", label: "성인 레슨" },
  { value: "onePoint", label: "원포인트 레슨" },
  { value: "consultation", label: "상담 후 결정" },
];

const levelOptions: { value: AcademyCurrentLevel; label: string }[] = [
  { value: "new", label: "처음 배워요" },
  { value: "beginner", label: "초급" },
  { value: "intermediate", label: "중급" },
  { value: "advanced", label: "상급" },
  { value: "unknown", label: "잘 모르겠어요" },
];

const dayOptions = ["월", "화", "수", "목", "금", "토", "일"];

type FormState = {
  applicantName: string;
  phone: string;
  email: string;
  desiredLessonType: AcademyLessonType | "";
  currentLevel: AcademyCurrentLevel | "";
  preferredDays: string[];
  preferredTimeText: string;
  lessonGoal: string;
  requestMemo: string;
};

type FieldName =
  | "applicantName"
  | "phone"
  | "desiredLessonType"
  | "currentLevel"
  | "preferredDays";

type FieldErrors = Partial<Record<FieldName, string>>;

type ConflictDialogState = {
  title: string;
  description: string;
  applicationId?: string;
} | null;

function createInitialFormState(profile: AcademyApplicantProfile): FormState {
  return {
    applicantName: profile.name,
    phone: profile.phone,
    email: profile.email,
    desiredLessonType: "",
    currentLevel: "",
    preferredDays: [],
    preferredTimeText: "",
    lessonGoal: "",
    requestMemo: "",
  };
}

function formatClassPrice(price: number | null) {
  if (typeof price === "number" && price > 0) {
    return `${price.toLocaleString("ko-KR")}원`;
  }
  return "상담 후 안내";
}

function formatClassCapacity(capacity: number | null) {
  if (typeof capacity === "number" && capacity > 0) {
    return `${capacity}명`;
  }
  return "상담 후 안내";
}

function validateForm(form: FormState): {
  errors: FieldErrors;
  firstErrorField: FieldName | null;
} {
  const errors: FieldErrors = {};

  if (!form.applicantName.trim()) {
    errors.applicantName =
      "회원정보의 이름을 먼저 등록해 주세요. 마이페이지 회원 정보 수정에서 변경할 수 있습니다.";
  }
  if (!form.phone.trim()) {
    errors.phone =
      "회원정보의 연락처를 먼저 등록해 주세요. 마이페이지 회원 정보 수정에서 변경할 수 있습니다.";
  }
  if (!form.desiredLessonType) {
    errors.desiredLessonType = "희망 레슨 유형을 선택해 주세요.";
  }
  if (!form.currentLevel) {
    errors.currentLevel = "현재 실력을 선택해 주세요.";
  }
  if (form.preferredDays.length === 0) {
    errors.preferredDays = "희망 요일을 1개 이상 선택해 주세요.";
  }

  const firstErrorField = ([
    "applicantName",
    "phone",
    "desiredLessonType",
    "currentLevel",
    "preferredDays",
  ] as FieldName[]).find((field) => errors[field]) ?? null;

  return { errors, firstErrorField };
}

function getDayConflict(
  selectedClassId: string | null,
  selectedDays: string[],
  activeApplications: AcademyActiveApplicationSummary[],
) {
  for (const application of activeApplications) {
    if (selectedClassId && application.classId === selectedClassId) continue;

    const overlapDays = application.preferredDays.filter((day) =>
      selectedDays.includes(day),
    );
    if (overlapDays.length > 0) {
      return { application, overlapDays };
    }
  }

  return null;
}

function createConflictDescription({
  applicantName,
  className,
  existingDays,
  overlapDays,
}: {
  applicantName: string;
  className: string | null;
  existingDays: string[];
  overlapDays: string[];
}) {
  const existingDaysText = existingDays.map((day) => `${day}요일`).join(", ");
  const overlapDaysText = overlapDays.map((day) => `${day}요일`).join(", ");
  return `${applicantName || "회원"}님께서는 이미 ‘${className || "기존 클래스"}’에 ${existingDaysText}을 신청하셨습니다. 현재 선택한 요일 중 ${overlapDaysText}이 겹칩니다. 겹치는 요일을 제외한 뒤 다시 신청해 주세요.`;
}

export default function AcademyApplyClient({
  requestedClassId,
  selectedClass,
  initialApplicantInfo,
  activeApplications,
}: {
  requestedClassId?: string | null;
  selectedClass?: PublicAcademyClass | null;
  initialApplicantInfo: AcademyApplicantProfile;
  activeApplications: AcademyActiveApplicationSummary[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() =>
    createInitialFormState(initialApplicantInfo),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictDialog, setConflictDialog] = useState<ConflictDialogState>(null);
  const fieldRefs = useRef<Partial<Record<FieldName, HTMLDivElement | null>>>({});
  const isSelectedClassClosed = selectedClass?.status === "closed";
  const canSubmit = !isSubmitting && !isSelectedClassClosed;

  const selectedDaysLabel = useMemo(
    () =>
      form.preferredDays.length > 0
        ? `선택한 요일: ${form.preferredDays.join(", ")}`
        : "희망 요일을 선택해 주세요.",
    [form.preferredDays],
  );

  const scrollToField = (field: FieldName | null) => {
    if (!field) return;
    const element = fieldRefs.current[field];
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      const focusable = element?.querySelector<HTMLElement>(
        "input, button, [tabindex]:not([tabindex='-1'])",
      );
      focusable?.focus?.();
    }, 250);
  };

  const updateField = (name: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    if (name in fieldErrors) {
      setFieldErrors((current) => ({ ...current, [name]: undefined }));
    }
  };

  const toggleDay = (day: string) => {
    setForm((current) => {
      const exists = current.preferredDays.includes(day);
      return {
        ...current,
        preferredDays: exists
          ? current.preferredDays.filter((item) => item !== day)
          : [...current.preferredDays, day],
      };
    });
    setFieldErrors((current) => ({ ...current, preferredDays: undefined }));
  };

  const openConflictDialog = (dialog: ConflictDialogState) => {
    setConflictDialog(dialog);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSelectedClassClosed) {
      const message =
        "모집이 마감된 클래스는 신청할 수 없습니다. 문의하기를 이용해 주세요.";
      setErrorMessage(message);
      showErrorToast(message);
      return;
    }

    const { errors, firstErrorField } = validateForm(form);
    setFieldErrors(errors);
    if (firstErrorField) {
      const message = errors[firstErrorField] ?? "신청서 필수값을 확인해 주세요.";
      setErrorMessage(message);
      showErrorToast(message);
      scrollToField(firstErrorField);
      return;
    }

    const clientConflict = getDayConflict(
      selectedClass?.status === "visible" ? selectedClass._id : null,
      form.preferredDays,
      activeApplications,
    );
    if (clientConflict) {
      openConflictDialog({
        title: "희망 요일이 기존 신청과 겹칩니다.",
        description: createConflictDescription({
          applicantName: form.applicantName,
          className: clientConflict.application.className,
          existingDays: clientConflict.application.preferredDays,
          overlapDays: clientConflict.overlapDays,
        }),
      });
      scrollToField("preferredDays");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/academy/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desiredLessonType: form.desiredLessonType,
          currentLevel: form.currentLevel,
          preferredDays: form.preferredDays,
          preferredTimeText: form.preferredTimeText,
          lessonGoal: form.lessonGoal,
          requestMemo: form.requestMemo,
          classId:
            selectedClass?.status === "visible" ? selectedClass._id : undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        applicationId?: string;
        existingApplicationId?: string;
        code?: string;
        message?: string;
        conflict?: {
          applicationId?: string;
          className?: string | null;
          existingDays?: string[];
          overlapDays?: string[];
        };
      } | null;

      if (response.status === 409 && data?.code === "ACADEMY_DAY_CONFLICT") {
        openConflictDialog({
          title: "희망 요일이 기존 신청과 겹칩니다.",
          description: createConflictDescription({
            applicantName: form.applicantName,
            className: data.conflict?.className ?? null,
            existingDays: data.conflict?.existingDays ?? [],
            overlapDays: data.conflict?.overlapDays ?? [],
          }),
          applicationId: data.conflict?.applicationId,
        });
        scrollToField("preferredDays");
        return;
      }

      if (response.status === 409 && data?.code === "ACADEMY_DUPLICATE_CLASS") {
        openConflictDialog({
          title: "이미 신청한 클래스입니다.",
          description:
            data.message || "기존 신청 내역에서 진행 상태를 확인해 주세요.",
          applicationId: data.existingApplicationId,
        });
        return;
      }

      if (!response.ok || !data?.success || !data.applicationId) {
        throw new Error(data?.message || "레슨 신청 접수에 실패했습니다.");
      }

      router.push(`/academy/apply/success?applicationId=${data.applicationId}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "레슨 신청 접수에 실패했습니다.";
      setErrorMessage(message);
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {requestedClassId && !selectedClass ? (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="space-y-3 p-5 text-sm text-foreground md:p-6">
              <p className="font-semibold">
                선택한 클래스 정보를 찾을 수 없어 일반 레슨 신청으로 접수됩니다.
              </p>
              <p className="break-keep leading-6 text-muted-foreground">
                특정 클래스를 신청하려면 아카데미 페이지에서 모집 중인 클래스를 다시 선택해 주세요. 일반 신청은 상담 후 수업과 현장결제 안내를 도와드립니다.
              </p>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/academy">클래스 다시 선택하기</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {selectedClass ? (
          <Card className="border-border bg-card">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    selectedClass.status === "closed" ? "secondary" : "success"
                  }
                >
                  {selectedClass.statusLabel}
                </Badge>
                <Badge variant="outline">{selectedClass.lessonTypeLabel}</Badge>
                <Badge variant="outline">{selectedClass.levelLabel}</Badge>
              </div>
              <div className="space-y-1">
                <CardTitle className="break-keep text-xl">
                  선택한 클래스
                </CardTitle>
                <p className="break-keep text-sm leading-6 text-muted-foreground">
                  {selectedClass.status === "closed"
                    ? "이 클래스는 현재 모집이 마감되었습니다."
                    : "선택한 클래스 기준으로 상담 신청이 접수됩니다. 등록 확정 후 현장에서 결제를 안내해드립니다."}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h2 className="break-keep text-lg font-semibold text-foreground">
                  {selectedClass.name}
                </h2>
                {selectedClass.description ? (
                  <p className="break-keep text-sm leading-6 text-muted-foreground">
                    {selectedClass.description}
                  </p>
                ) : null}
              </div>
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <div><dt className="text-muted-foreground">수업 유형</dt><dd className="mt-1 font-medium text-foreground">{selectedClass.lessonTypeLabel}</dd></div>
                <div><dt className="text-muted-foreground">레벨</dt><dd className="mt-1 font-medium text-foreground">{selectedClass.levelLabel}</dd></div>
                <div><dt className="text-muted-foreground">강사</dt><dd className="mt-1 break-keep font-medium text-foreground">{selectedClass.instructorName || "상담 후 안내"}</dd></div>
                <div><dt className="text-muted-foreground">장소</dt><dd className="mt-1 break-keep font-medium text-foreground">{selectedClass.location || "상담 후 안내"}</dd></div>
                <div><dt className="text-muted-foreground">일정</dt><dd className="mt-1 break-keep font-medium text-foreground">{selectedClass.scheduleText || "상담 후 조율"}</dd></div>
                <div><dt className="text-muted-foreground">정원</dt><dd className="mt-1 font-medium text-foreground">{formatClassCapacity(selectedClass.capacity)}</dd></div>
                <div><dt className="text-muted-foreground">기준 수강료</dt><dd className="mt-1 font-medium text-foreground">{formatClassPrice(selectedClass.price)}</dd></div>
                <div><dt className="text-muted-foreground">상태</dt><dd className="mt-1 font-medium text-foreground">{selectedClass.statusLabel}</dd></div>
              </dl>
              {selectedClass.status === "closed" ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <p className="break-keep leading-6">
                    문의하기를 통해 다음 모집 일정을 확인해 주세요. 모집이 마감된
                    클래스는 신청 접수가 비활성화되며, 가능한 수업은 상담 후 안내드립니다.
                  </p>
                  <Button asChild className="mt-3 w-full sm:w-auto">
                    <Link href="/board/qna/write?category=academy">문의하기</Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border bg-card">
          <CardHeader className="space-y-2">
            <CardTitle className="break-keep text-xl">신청자 정보</CardTitle>
            <p className="break-keep text-sm leading-6 text-muted-foreground">
              신청자 정보는 회원정보 기준으로 자동 입력됩니다. 변경이 필요하면{" "}
              <Link href="/mypage/profile" className="font-medium text-primary underline-offset-4 hover:underline">
                마이페이지 회원 정보 수정
              </Link>
              에서 수정해 주세요.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2" ref={(node) => { fieldRefs.current.applicantName = node; }}>
              <Label htmlFor="applicantName">신청자명 *</Label>
              <Input
                id="applicantName"
                value={form.applicantName}
                readOnly
                aria-readonly="true"
                aria-invalid={Boolean(fieldErrors.applicantName)}
                maxLength={50}
                placeholder="회원정보에 등록된 이름"
                disabled={isSubmitting || isSelectedClassClosed}
                className={cn("bg-muted/40", fieldErrors.applicantName && "border-destructive focus-visible:ring-destructive")}
              />
              {fieldErrors.applicantName ? <p className="text-sm font-medium text-destructive">{fieldErrors.applicantName}</p> : null}
            </div>
            <div className="space-y-2" ref={(node) => { fieldRefs.current.phone = node; }}>
              <Label htmlFor="phone">연락처 *</Label>
              <Input
                id="phone"
                value={form.phone}
                readOnly
                aria-readonly="true"
                aria-invalid={Boolean(fieldErrors.phone)}
                maxLength={30}
                placeholder="회원정보에 등록된 연락처"
                disabled={isSubmitting || isSelectedClassClosed}
                className={cn("bg-muted/40", fieldErrors.phone && "border-destructive focus-visible:ring-destructive")}
              />
              {fieldErrors.phone ? <p className="text-sm font-medium text-destructive">{fieldErrors.phone}</p> : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                readOnly
                aria-readonly="true"
                maxLength={100}
                placeholder="회원정보에 등록된 이메일"
                disabled={isSubmitting || isSelectedClassClosed}
                className="bg-muted/40"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="break-keep text-xl">레슨 희망 내용</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2" ref={(node) => { fieldRefs.current.desiredLessonType = node; }}>
                <Label>희망 레슨 유형 *</Label>
                <Select
                  value={form.desiredLessonType}
                  onValueChange={(value) =>
                    updateField("desiredLessonType", value as AcademyLessonType)
                  }
                  disabled={isSubmitting || isSelectedClassClosed}
                >
                  <SelectTrigger
                    aria-invalid={Boolean(fieldErrors.desiredLessonType)}
                    className={cn(fieldErrors.desiredLessonType && "border-destructive focus:ring-destructive")}
                  >
                    <SelectValue placeholder="레슨 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {lessonTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.desiredLessonType ? <p className="text-sm font-medium text-destructive">{fieldErrors.desiredLessonType}</p> : null}
              </div>
              <div className="space-y-2" ref={(node) => { fieldRefs.current.currentLevel = node; }}>
                <Label>현재 실력 *</Label>
                <Select
                  value={form.currentLevel}
                  onValueChange={(value) =>
                    updateField("currentLevel", value as AcademyCurrentLevel)
                  }
                  disabled={isSubmitting || isSelectedClassClosed}
                >
                  <SelectTrigger
                    aria-invalid={Boolean(fieldErrors.currentLevel)}
                    className={cn(fieldErrors.currentLevel && "border-destructive focus:ring-destructive")}
                  >
                    <SelectValue placeholder="현재 실력 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.currentLevel ? <p className="text-sm font-medium text-destructive">{fieldErrors.currentLevel}</p> : null}
              </div>
            </div>

            <div className="space-y-3" ref={(node) => { fieldRefs.current.preferredDays = node; }}>
              <div className="space-y-1">
                <Label>희망 요일 *</Label>
                <p className="text-sm text-muted-foreground">{selectedDaysLabel}</p>
              </div>
              <div
                aria-invalid={Boolean(fieldErrors.preferredDays)}
                className={cn(
                  "grid grid-cols-2 gap-3 rounded-xl sm:grid-cols-4 md:grid-cols-7",
                  fieldErrors.preferredDays && "border border-destructive p-2",
                )}
              >
                {dayOptions.map((day) => (
                  <label
                    key={day}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    <Checkbox
                      checked={form.preferredDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                      disabled={isSubmitting || isSelectedClassClosed}
                    />
                    <span>{day}요일</span>
                  </label>
                ))}
              </div>
              {fieldErrors.preferredDays ? <p className="text-sm font-medium text-destructive">{fieldErrors.preferredDays}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredTimeText">희망 시간대</Label>
              <Input
                id="preferredTimeText"
                value={form.preferredTimeText}
                onChange={(event) =>
                  updateField("preferredTimeText", event.target.value)
                }
                maxLength={100}
                placeholder="예: 평일 저녁, 주말 오전, 상담 후 결정"
                disabled={isSubmitting || isSelectedClassClosed}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lessonGoal">레슨 목표</Label>
              <Textarea
                id="lessonGoal"
                value={form.lessonGoal}
                onChange={(event) =>
                  updateField("lessonGoal", event.target.value)
                }
                maxLength={500}
                placeholder="예: 기초부터 배우고 싶습니다. 랠리를 오래 이어가고 싶습니다."
                disabled={isSubmitting || isSelectedClassClosed}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestMemo">요청사항</Label>
              <Textarea
                id="requestMemo"
                value={form.requestMemo}
                onChange={(event) =>
                  updateField("requestMemo", event.target.value)
                }
                maxLength={1000}
                placeholder="예: 라켓이 없어도 가능한지 궁금합니다. 가능한 상담 시간을 남겨주세요."
                disabled={isSubmitting || isSelectedClassClosed}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/academy">아카데미로 돌아가기</Link>
          </Button>
          <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
            {isSelectedClassClosed
              ? "모집 마감"
              : isSubmitting
                ? "접수 중..."
                : "신청 접수하기"}
          </Button>
          <p className="break-keep text-xs leading-5 text-muted-foreground sm:basis-full sm:text-right">
            신청 단계에서는 결제가 진행되지 않습니다. 등록이 확정되면 현장에서 결제를 안내해드립니다.
          </p>
        </div>
      </form>

      <AlertDialog
        open={Boolean(conflictDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setConflictDialog(null);
            scrollToField("preferredDays");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{conflictDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription className="break-keep leading-6">
              {conflictDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {conflictDialog?.applicationId ? (
              <Button asChild variant="outline">
                <Link href={`/mypage/academy-applications/${conflictDialog.applicationId}`}>
                  신청 내역 보기
                </Link>
              </Button>
            ) : null}
            <AlertDialogAction>확인하고 수정하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
