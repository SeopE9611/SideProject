"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

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
import type {
  AcademyCurrentLevel,
  AcademyLessonType,
  PublicAcademyClass,
} from "@/lib/types/academy";

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

const initialFormState: FormState = {
  applicantName: "",
  phone: "",
  email: "",
  desiredLessonType: "",
  currentLevel: "",
  preferredDays: [],
  preferredTimeText: "",
  lessonGoal: "",
  requestMemo: "",
};

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

function getClientValidationMessage(form: FormState) {
  if (!form.applicantName.trim()) return "신청자명을 입력해 주세요.";
  if (!form.phone.trim()) return "연락처를 입력해 주세요.";
  if (!form.desiredLessonType) return "희망 레슨 유형을 선택해 주세요.";
  if (!form.currentLevel) return "현재 실력을 선택해 주세요.";
  if (form.preferredDays.length === 0) {
    return "희망 요일을 1개 이상 선택해 주세요.";
  }
  return null;
}

export default function AcademyApplyClient({
  requestedClassId,
  selectedClass,
}: {
  requestedClassId?: string | null;
  selectedClass?: PublicAcademyClass | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSelectedClassClosed = selectedClass?.status === "closed";
  const canSubmit = !isSubmitting && !isSelectedClassClosed;

  const selectedDaysLabel = useMemo(
    () =>
      form.preferredDays.length > 0
        ? `선택한 요일: ${form.preferredDays.join(", ")}`
        : "희망 요일을 선택해 주세요.",
    [form.preferredDays],
  );

  const updateField = (name: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
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
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSelectedClassClosed) {
      setErrorMessage(
        "모집이 마감된 클래스는 신청할 수 없습니다. 문의하기를 이용해 주세요.",
      );
      return;
    }

    const validationMessage = getClientValidationMessage(form);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/academy/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantName: form.applicantName,
          phone: form.phone,
          email: form.email,
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
        message?: string;
      } | null;

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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
              특정 클래스를 신청하려면 아카데미 페이지에서 클래스를 다시 선택해 주세요.
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
                  : "이 클래스 기준으로 레슨 신청이 접수됩니다."}
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
              <div>
                <dt className="text-muted-foreground">수업 유형</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {selectedClass.lessonTypeLabel}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">레벨</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {selectedClass.levelLabel}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">강사</dt>
                <dd className="mt-1 break-keep font-medium text-foreground">
                  {selectedClass.instructorName || "상담 후 안내"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">장소</dt>
                <dd className="mt-1 break-keep font-medium text-foreground">
                  {selectedClass.location || "상담 후 안내"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">일정</dt>
                <dd className="mt-1 break-keep font-medium text-foreground">
                  {selectedClass.scheduleText || "상담 후 조율"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">정원</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {formatClassCapacity(selectedClass.capacity)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">수강료</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {formatClassPrice(selectedClass.price)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">상태</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {selectedClass.statusLabel}
                </dd>
              </div>
            </dl>
            {selectedClass.status === "closed" ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="break-keep leading-6">
                  문의하기를 통해 다음 모집 일정을 확인해 주세요. 모집이 마감된
                  클래스는 신청 접수가 비활성화됩니다.
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
        <CardHeader>
          <CardTitle className="break-keep text-xl">신청자 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="applicantName">신청자명 *</Label>
            <Input
              id="applicantName"
              value={form.applicantName}
              onChange={(event) =>
                updateField("applicantName", event.target.value)
              }
              maxLength={50}
              placeholder="홍길동"
              disabled={isSubmitting || isSelectedClassClosed}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">연락처 *</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              maxLength={30}
              placeholder="010-1234-5678"
              disabled={isSubmitting || isSelectedClassClosed}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              maxLength={100}
              placeholder="test@example.com"
              disabled={isSubmitting || isSelectedClassClosed}
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
            <div className="space-y-2">
              <Label>희망 레슨 유형 *</Label>
              <Select
                value={form.desiredLessonType}
                onValueChange={(value) =>
                  updateField("desiredLessonType", value as AcademyLessonType)
                }
                disabled={isSubmitting || isSelectedClassClosed}
              >
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label>현재 실력 *</Label>
              <Select
                value={form.currentLevel}
                onValueChange={(value) =>
                  updateField("currentLevel", value as AcademyCurrentLevel)
                }
                disabled={isSubmitting || isSelectedClassClosed}
              >
                <SelectTrigger>
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
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>희망 요일 *</Label>
              <p className="text-sm text-muted-foreground">
                {selectedDaysLabel}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
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
        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full sm:w-auto"
        >
          {isSelectedClassClosed
            ? "모집 마감"
            : isSubmitting
              ? "접수 중..."
              : "신청 접수하기"}
        </Button>
      </div>
    </form>
  );
}
