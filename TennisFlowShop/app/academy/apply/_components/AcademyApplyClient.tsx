"use client";

import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Target,
  User,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// ========== Types & Constants ==========

const lessonTypeOptions: {
  value: AcademyLessonType;
  label: string;
  description: string;
}[] = [
  {
    value: "group",
    label: "그룹 레슨",
    description: "여러 명이 함께 배우는 수업",
  },
  { value: "private", label: "개인 레슨", description: "1:1 맞춤 수업" },
  { value: "junior", label: "주니어 레슨", description: "청소년 대상 수업" },
  { value: "adult", label: "성인 레슨", description: "성인 대상 수업" },
  {
    value: "onePoint",
    label: "원포인트 레슨",
    description: "특정 기술 집중 수업",
  },
  {
    value: "consultation",
    label: "상담 후 결정",
    description: "상담 후 수업 유형 결정",
  },
];

const levelOptions: {
  value: AcademyCurrentLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "new",
    label: "처음 배워요",
    description: "테니스를 처음 시작합니다",
  },
  {
    value: "beginner",
    label: "초급",
    description: "기본 스트로크를 배웠습니다",
  },
  { value: "intermediate", label: "중급", description: "랠리가 가능합니다" },
  { value: "advanced", label: "상급", description: "경기 운영이 가능합니다" },
  {
    value: "unknown",
    label: "잘 모르겠어요",
    description: "상담 후 결정합니다",
  },
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

type FieldName = "applicantName" | "phone" | "desiredLessonType" | "currentLevel" | "preferredDays";

type FieldErrors = Partial<Record<FieldName, string>>;

type ConflictDialogState = {
  title: string;
  description: string;
  applicationId?: string;
} | null;

// ========== UI Components ==========

function SectionCard({
  children,
  className = "",
  icon: Icon,
  title,
  description,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: React.ElementType;
  title?: string;
  description?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft",
        className,
      )}
    >
      {(title || description) && (
        <div className="border-b border-border bg-brand-highlight-muted/45 px-5 py-4 md:px-6">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="shrink-0 rounded-control bg-brand-highlight-muted p-2 text-brand-highlight-foreground">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="font-ui-bold text-ui-body-lg font-semibold text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-ui-body-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

function FormField({
  label,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0 space-y-2.5">
      <Label className="text-ui-body-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-ui-label leading-relaxed text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-ui-body-sm font-medium leading-relaxed text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; description?: string }[];
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex w-full min-w-0 items-center justify-between rounded-control border bg-background px-4 py-3 text-left text-ui-body-sm transition-all",
          "hover:border-brand-highlight/60 focus:outline-none focus:ring-2 focus:ring-brand-highlight focus:ring-offset-2",
          error ? "border-destructive" : "border-border/60",
          disabled && "cursor-not-allowed opacity-50",
          isOpen && "border-brand-highlight ring-2 ring-brand-highlight ring-offset-2",
        )}
      >
        <span className={cn(selectedOption ? "text-foreground" : "text-muted-foreground")}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-panel border border-border bg-popover p-1.5 shadow-soft">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left transition-colors",
                  "hover:bg-brand-highlight-muted",
                  option.value === value &&
                    "bg-brand-highlight-muted text-brand-highlight-foreground",
                )}
              >
                <span className="text-ui-body-sm font-medium text-foreground">{option.label}</span>
                {option.description && (
                  <span className="text-ui-label text-muted-foreground">{option.description}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ========== Utilities ==========

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

function validateForm(form: FormState): {
  errors: FieldErrors;
  firstErrorField: FieldName | null;
} {
  const errors: FieldErrors = {};

  if (!form.applicantName.trim()) {
    errors.applicantName =
      "회원정보의 이름을 먼저 등록해 주세요. 마이페이지에서 변경할 수 있습니다.";
  }
  if (!form.phone.trim()) {
    errors.phone = "회원정보의 연락처를 먼저 등록해 주세요. 마이페이지에서 변경할 수 있습니다.";
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

  const firstErrorField =
    (
      [
        "applicantName",
        "phone",
        "desiredLessonType",
        "currentLevel",
        "preferredDays",
      ] as FieldName[]
    ).find((field) => errors[field]) ?? null;

  return { errors, firstErrorField };
}

function getDayConflict(
  selectedClassId: string | null,
  selectedDays: string[],
  activeApplications: AcademyActiveApplicationSummary[],
) {
  for (const application of activeApplications) {
    if (selectedClassId && application.classId === selectedClassId) continue;

    const overlapDays = application.preferredDays.filter((day) => selectedDays.includes(day));
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
  return `${applicantName || "회원"}님께서는 이미 '${className || "기존 클래스"}'에 ${existingDaysText}을 신청하셨습니다. 현재 선택한 요일 중 ${overlapDaysText}이 겹칩니다. 겹치는 요일을 제외한 뒤 다시 신청해 주세요.`;
}

// ========== Main Component ==========

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
  const [form, setForm] = useState<FormState>(() => createInitialFormState(initialApplicantInfo));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictDialog, setConflictDialog] = useState<ConflictDialogState>(null);
  const fieldRefs = useRef<Partial<Record<FieldName, HTMLDivElement | null>>>({});
  const isSelectedClassClosed = selectedClass?.status === "closed";
  const canSubmit = !isSubmitting && !isSelectedClassClosed;

  const selectedDaysLabel = useMemo(
    () =>
      form.preferredDays.length > 0
        ? `${form.preferredDays.map((d) => `${d}요일`).join(", ")} 선택됨`
        : "요일을 선택해 주세요",
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
      const message = "모집이 마감된 클래스는 신청할 수 없습니다. 문의하기를 이용해 주세요.";
      showErrorToast(message);
      return;
    }

    const { errors, firstErrorField } = validateForm(form);
    setFieldErrors(errors);
    if (firstErrorField) {
      const message = errors[firstErrorField] ?? "신청서 필수값을 확인해 주세요.";
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
          classId: selectedClass?.status === "visible" ? selectedClass._id : undefined,
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
          description: data.message || "기존 신청 내역에서 진행 상태를 확인해 주세요.",
          applicationId: data.existingApplicationId,
        });
        return;
      }

      if (!response.ok || !data?.success || !data.applicationId) {
        throw new Error(data?.message || "레슨 신청 접수에 실패했습니다.");
      }

      router.push(`/academy/apply/success?applicationId=${data.applicationId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "레슨 신청 접수에 실패했습니다.";
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Applicant Info Section */}
        <SectionCard
          icon={User}
          title="신청자 정보"
          description="회원정보 기준으로 자동 입력됩니다"
        >
          <div className="mb-5 rounded-xl border border-border bg-muted/20 p-4">
            <p className="break-keep text-ui-label leading-relaxed text-muted-foreground">
              정보 변경이 필요하시면{" "}
              <Link
                href="/mypage/profile"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                마이페이지 회원 정보 수정
              </Link>
              에서 수정해 주세요.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div
              ref={(node) => {
                fieldRefs.current.applicantName = node;
              }}
            >
              <FormField label="신청자명" required error={fieldErrors.applicantName}>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={form.applicantName}
                    readOnly
                    aria-readonly="true"
                    tabIndex={-1}
                    className={cn(
                      "cursor-not-allowed border-muted bg-muted/60 pl-10 text-foreground/80 shadow-none focus-visible:ring-0",
                      fieldErrors.applicantName && "border-destructive",
                    )}
                  />
                </div>
              </FormField>
            </div>

            <div
              ref={(node) => {
                fieldRefs.current.phone = node;
              }}
            >
              <FormField label="연락처" required error={fieldErrors.phone}>
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={form.phone}
                    readOnly
                    aria-readonly="true"
                    tabIndex={-1}
                    className={cn(
                      "cursor-not-allowed border-muted bg-muted/60 pl-10 text-foreground/80 shadow-none focus-visible:ring-0",
                      fieldErrors.phone && "border-destructive",
                    )}
                  />
                </div>
              </FormField>
            </div>

            <div className="min-w-0 md:col-span-2">
              <FormField label="이메일">
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    type="email"
                    value={form.email}
                    readOnly
                    aria-readonly="true"
                    tabIndex={-1}
                    className="cursor-not-allowed border-muted bg-muted/60 pl-10 text-foreground/80 shadow-none focus-visible:ring-0"
                  />
                </div>
              </FormField>
            </div>
          </div>
        </SectionCard>

        {/* Lesson Preferences Section */}
        <SectionCard
          icon={Target}
          title="레슨 희망 내용"
          description="원하시는 레슨 정보를 입력해 주세요"
        >
          <div className="space-y-6">
            {/* Lesson Type & Level */}
            <div className="grid gap-5 md:grid-cols-2">
              <div
                ref={(node) => {
                  fieldRefs.current.desiredLessonType = node;
                }}
              >
                <FormField label="희망 레슨 유형" required error={fieldErrors.desiredLessonType}>
                  <CustomSelect
                    value={form.desiredLessonType}
                    onChange={(value) => updateField("desiredLessonType", value)}
                    options={lessonTypeOptions}
                    placeholder="레슨 유형을 선택해 주세요"
                    disabled={isSubmitting || isSelectedClassClosed}
                    error={Boolean(fieldErrors.desiredLessonType)}
                  />
                </FormField>
              </div>

              <div
                ref={(node) => {
                  fieldRefs.current.currentLevel = node;
                }}
              >
                <FormField label="현재 실력" required error={fieldErrors.currentLevel}>
                  <CustomSelect
                    value={form.currentLevel}
                    onChange={(value) => updateField("currentLevel", value)}
                    options={levelOptions}
                    placeholder="현재 실력을 선택해 주세요"
                    disabled={isSubmitting || isSelectedClassClosed}
                    error={Boolean(fieldErrors.currentLevel)}
                  />
                </FormField>
              </div>
            </div>

            {/* Preferred Days */}
            <div
              ref={(node) => {
                fieldRefs.current.preferredDays = node;
              }}
            >
              <FormField
                label="희망 요일"
                required
                error={fieldErrors.preferredDays}
                hint={selectedDaysLabel}
              >
                <div
                  className={cn(
                    "grid grid-cols-4 gap-2 rounded-xl p-1 min-[390px]:grid-cols-7",
                    fieldErrors.preferredDays && "ring-2 ring-destructive ring-offset-2",
                  )}
                >
                  {dayOptions.map((day) => {
                    const isSelected = form.preferredDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        disabled={isSubmitting || isSelectedClassClosed}
                        className={cn(
                          "flex min-w-0 flex-col items-center justify-center rounded-xl border py-3 text-ui-body-sm font-medium transition-all",
                          "hover:border-brand-highlight/60 hover:bg-brand-highlight-muted",
                          "focus:outline-none focus:ring-2 focus:ring-brand-highlight focus:ring-offset-2",
                          isSelected
                            ? "border-brand-highlight bg-brand-highlight text-brand-highlight-foreground hover:bg-brand-highlight/90"
                            : "border-border/60 bg-background text-muted-foreground",
                          (isSubmitting || isSelectedClassClosed) &&
                            "cursor-not-allowed opacity-50",
                        )}
                      >
                        <span className="text-ui-label">{day}</span>
                      </button>
                    );
                  })}
                </div>
              </FormField>
            </div>

            {/* Preferred Time */}
            <FormField label="희망 시간대" hint="예: 평일 저녁, 주말 오전">
              <div className="relative">
                <Clock
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={form.preferredTimeText}
                  onChange={(e) => updateField("preferredTimeText", e.target.value)}
                  maxLength={100}
                  placeholder="희망하시는 시간대를 입력해 주세요"
                  disabled={isSubmitting || isSelectedClassClosed}
                  className="pl-10"
                />
              </div>
            </FormField>

            {/* Lesson Goal */}
            <FormField label="레슨 목표" hint="원하시는 레슨 목표를 자유롭게 작성해 주세요">
              <div className="relative">
                <Target
                  className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                <Textarea
                  value={form.lessonGoal}
                  onChange={(e) => updateField("lessonGoal", e.target.value)}
                  maxLength={500}
                  placeholder="예: 기초부터 배우고 싶습니다. 랠리를 오래 이어가고 싶습니다."
                  disabled={isSubmitting || isSelectedClassClosed}
                  className="min-h-32 resize-y pl-10 leading-relaxed"
                />
              </div>
            </FormField>

            {/* Request Memo */}
            <FormField label="요청사항" hint="추가로 궁금하신 점이나 요청사항을 남겨주세요">
              <div className="relative">
                <MessageSquare
                  className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                <Textarea
                  value={form.requestMemo}
                  onChange={(e) => updateField("requestMemo", e.target.value)}
                  maxLength={1000}
                  placeholder="예: 라켓이 없어도 가능한지 궁금합니다."
                  disabled={isSubmitting || isSelectedClassClosed}
                  className="min-h-32 resize-y pl-10 leading-relaxed"
                />
              </div>
            </FormField>
          </div>
        </SectionCard>

        {/* Submit Section */}
        <div className="rounded-panel border border-border/80 bg-card p-5 shadow-soft md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="text-ui-body-sm font-medium text-foreground">
                신청서 제출 준비가 완료되셨나요?
              </p>
              <p className="break-keep text-ui-label leading-relaxed text-muted-foreground">
                신청 단계에서는 결제가 진행되지 않습니다. 등록 확정 후 현장에서 안내드립니다.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:shrink-0">
              <Button
                asChild
                variant="outline"
                className="h-11 w-full gap-2 whitespace-nowrap rounded-control sm:w-auto"
              >
                <Link href="/academy">아카데미로 돌아가기</Link>
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                variant="highlight"
                className="h-11 w-full gap-2 whitespace-nowrap rounded-control px-6 sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    접수 중...
                  </>
                ) : isSelectedClassClosed ? (
                  "모집 마감"
                ) : (
                  <>
                    신청 접수하기
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Conflict Dialog */}
      <AlertDialog
        open={Boolean(conflictDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setConflictDialog(null);
            scrollToField("preferredDays");
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <AlertCircle className="h-6 w-6 text-warning" />
            </div>
            <AlertDialogTitle>{conflictDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {conflictDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            {conflictDialog?.applicationId && (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={`/mypage/academy-applications/${conflictDialog.applicationId}`}>
                  신청 내역 보기
                </Link>
              </Button>
            )}
            <AlertDialogAction className="w-full sm:w-auto">확인하고 수정하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
