"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, BookOpen, Save } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminSurface } from "@/components/admin/admin-typography";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  ACADEMY_CLASS_LESSON_TYPES,
  ACADEMY_CLASS_LEVELS,
  ACADEMY_CLASS_STATUSES,
  getAcademyClassLessonTypeLabel,
  getAcademyClassLevelLabel,
  getAcademyClassStatusLabel,
  type AcademyClass,
  type AcademyClassLessonType,
  type AcademyClassLevel,
  type AcademyClassStatus,
} from "@/lib/types/academy";

const LIST_PATH = "/admin/academy/classes";

type FormMode = "create" | "edit";

type FormState = {
  name: string;
  description: string;
  lessonType: AcademyClassLessonType;
  level: AcademyClassLevel;
  instructorName: string;
  location: string;
  scheduleText: string;
  capacity: string;
  price: string;
  status: AcademyClassStatus;
};

type MutationResponse = {
  success: true;
  item: AcademyClass;
};

type AcademyClassFormClientProps = {
  mode: FormMode;
  initialItem?: AcademyClass;
};

function toFormState(item?: AcademyClass): FormState {
  return {
    name: item?.name ?? "",
    description: item?.description ?? "",
    lessonType: item?.lessonType ?? "group",
    level: item?.level ?? "all",
    instructorName: item?.instructorName ?? "",
    location: item?.location ?? "",
    scheduleText: item?.scheduleText ?? "",
    capacity: typeof item?.capacity === "number" ? String(item.capacity) : "",
    price: typeof item?.price === "number" ? String(item.price) : "",
    status: item?.status ?? "draft",
  };
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

export default function AcademyClassFormClient({
  mode,
  initialItem,
}: AcademyClassFormClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toFormState(initialItem));
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm(toFormState(initialItem));
  }, [initialItem]);

  const isEdit = mode === "edit";
  const endpoint = isEdit && initialItem?._id
    ? `/api/admin/academy/classes/${initialItem._id}`
    : "/api/admin/academy/classes";

  const title = isEdit ? "클래스 수정" : "새 클래스 등록";
  const description = isEdit
    ? "등록된 레슨 프로그램 정보를 수정합니다."
    : "아카데미에서 운영할 레슨 프로그램 정보를 입력합니다.";

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateClient() {
    if (!form.name.trim()) return "클래스명을 입력해 주세요.";
    if (form.name.trim().length > 80) return "클래스명은 80자 이하로 입력해 주세요.";
    if (form.description.trim().length > 1000) return "설명은 1000자 이하로 입력해 주세요.";
    if (form.instructorName.trim().length > 50) return "강사명은 50자 이하로 입력해 주세요.";
    if (form.location.trim().length > 100) return "장소는 100자 이하로 입력해 주세요.";
    if (form.scheduleText.trim().length > 200) return "일정 안내는 200자 이하로 입력해 주세요.";

    const capacity = optionalNumber(form.capacity);
    if (capacity !== null && (!Number.isFinite(capacity) || capacity < 0)) {
      return "정원은 0 이상의 숫자로 입력해 주세요.";
    }

    const price = optionalNumber(form.price);
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return "가격은 0 이상의 숫자로 입력해 주세요.";
    }

    return "";
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateClient();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      showErrorToast(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await adminMutator<MutationResponse>(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          lessonType: form.lessonType,
          level: form.level,
          instructorName: form.instructorName.trim() || null,
          location: form.location.trim() || null,
          scheduleText: form.scheduleText.trim() || null,
          capacity: optionalNumber(form.capacity),
          price: optionalNumber(form.price),
          status: form.status,
        }),
      });
      showSuccessToast(isEdit ? "클래스가 수정되었습니다." : "클래스가 등록되었습니다.");
      router.push(LIST_PATH);
      router.refresh();
    } catch (submitError) {
      const message = getAdminErrorMessage(submitError);
      setErrorMessage(message);
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageHeader
        title={title}
        description={description}
        icon={BookOpen}
        scope="도깨비테니스 아카데미"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={LIST_PATH}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              목록으로 돌아가기
            </Link>
          </Button>
        }
      />

      <Card className={adminSurface.card}>
        <CardContent className="p-5 sm:p-6">
          <form className="space-y-6" onSubmit={submitForm}>
            {errorMessage ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="academy-class-name">클래스명 <span className="text-destructive">*</span></Label>
                <Input
                  id="academy-class-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="예: 성인 입문반"
                  maxLength={80}
                  required
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="academy-class-description">설명</Label>
                <Textarea
                  id="academy-class-description"
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="레슨 프로그램 소개를 입력해 주세요."
                  maxLength={1000}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">{form.description.length}/1000자</p>
              </div>

              <div className="space-y-2">
                <Label>수업 유형</Label>
                <Select
                  value={form.lessonType}
                  onValueChange={(value) => updateField("lessonType", value as AcademyClassLessonType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="수업 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMY_CLASS_LESSON_TYPES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {getAcademyClassLessonTypeLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>레벨</Label>
                <Select
                  value={form.level}
                  onValueChange={(value) => updateField("level", value as AcademyClassLevel)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="레벨 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMY_CLASS_LEVELS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {getAcademyClassLevelLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="academy-class-instructor">강사명</Label>
                <Input
                  id="academy-class-instructor"
                  value={form.instructorName}
                  onChange={(event) => updateField("instructorName", event.target.value)}
                  placeholder="예: 도깨비 코치"
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="academy-class-location">장소</Label>
                <Input
                  id="academy-class-location"
                  value={form.location}
                  onChange={(event) => updateField("location", event.target.value)}
                  placeholder="예: 도깨비테니스 실내 코트"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="academy-class-schedule">일정 안내</Label>
                <Input
                  id="academy-class-schedule"
                  value={form.scheduleText}
                  onChange={(event) => updateField("scheduleText", event.target.value)}
                  placeholder="예: 화/목 저녁 7시"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="academy-class-capacity">정원</Label>
                <Input
                  id="academy-class-capacity"
                  type="number"
                  min="0"
                  step="1"
                  value={form.capacity}
                  onChange={(event) => updateField("capacity", event.target.value)}
                  placeholder="예: 6"
                />
                <p className="text-xs text-muted-foreground">미입력 시 제한 없음으로 표시됩니다.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="academy-class-price">가격</Label>
                <Input
                  id="academy-class-price"
                  type="number"
                  min="0"
                  step="1"
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  placeholder="예: 180000"
                />
              </div>

              <div className="space-y-2">
                <Label>상태</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => updateField("status", value as AcademyClassStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMY_CLASS_STATUSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {getAcademyClassStatusLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-5 sm:flex-row sm:justify-end">
              <Button asChild variant="outline">
                <Link href={LIST_PATH}>취소</Link>
              </Button>
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "저장 중" : isEdit ? "수정하기" : "등록하기"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
