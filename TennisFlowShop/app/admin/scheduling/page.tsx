"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  CalendarDays,
  Clock,
  Users,
  Settings2,
  Plus,
  Trash2,
  Pencil,
  Save,
  Info,
} from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { Slider } from "@/components/ui/slider";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";
import AsyncState from "@/components/system/AsyncState";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { runAdminActionWithToast } from "@/lib/admin/adminActionHelpers";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import {
  sanitizeExceptionInput,
  validateBaseSettings,
  validateExceptionItem,
} from "@/lib/stringingSettingsValidation";

type ExceptionItem = {
  date: string;
  closed?: boolean;
  start?: string;
  end?: string;
  interval?: number;
  capacity?: number;
};

type StringingSettings = {
  _id: "stringingSlots";
  capacity?: number;
  businessDays?: number[]; // 0~6
  start?: string;
  end?: string;
  interval?: number;
  holidays?: string[];
  exceptions?: ExceptionItem[];
  bookingWindowDays?: number;
  updatedAt?: string;
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// “저장 전 변경 여부(dirty)” 판별용 시그니처
// - 배열(요일/휴무/예외)은 정렬해서 “순서 차이”로 불필요하게 dirty 되는 것을 방지
const settingsDirtySignature = (v: {
  capacity: number;
  start: string;
  end: string;
  interval: number;
  bookingWindowDays: number;
  businessDays: number[];
  holidays: string[];
  exceptions: ExceptionItem[];
}) =>
  JSON.stringify({
    capacity: Number(v.capacity),
    start: String(v.start),
    end: String(v.end),
    interval: Number(v.interval),
    bookingWindowDays: Number(v.bookingWindowDays),
    businessDays: [...(v.businessDays ?? [])].slice().sort((a, b) => a - b),
    holidays: [...(v.holidays ?? [])].slice().sort(),
    exceptions: [...(v.exceptions ?? [])]
      .map((x) => ({
        date: String(x.date ?? ""),
        closed: !!x.closed,
        start: x.start == null ? undefined : String(x.start),
        end: x.end == null ? undefined : String(x.end),
        interval: x.interval == null ? undefined : Number(x.interval),
        capacity: x.capacity == null ? undefined : Number(x.capacity),
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  });

export default function StringingSettingsPage() {
  // 기본 설정
  const [capacity, setCapacity] = useState<number>(1);
  const [start, setStart] = useState<string>("10:00");
  const [end, setEnd] = useState<string>("19:00");
  const [interval, setInterval] = useState<number>(30);
  const [bookingWindowDays, setBookingWindowDays] = useState<number>(30);

  // 요일/휴무/예외
  const [businessDays, setBusinessDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);

  // 입력 보조
  const [holidayInput, setHolidayInput] = useState("");
  const [exInput, setExInput] = useState<ExceptionItem>({ date: "" });

  // 상태
  const [saving, setSaving] = useState(false);

  // 서버/초기 로드 완료 후 baseline(초기값)으로 삼을 시그니처
  const [initialSig, setInitialSig] = useState("");

  const {
    data: serverSettings,
    error,
    isLoading: loading,
    mutate,
  } = useSWR<StringingSettings | null>("/api/admin/settings/stringing", authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // 현재 상태 시그니처
  const currentSig = useMemo(
    () =>
      settingsDirtySignature({
        capacity,
        start,
        end,
        interval,
        bookingWindowDays,
        businessDays,
        holidays,
        exceptions,
      }),
    [capacity, start, end, interval, bookingWindowDays, businessDays, holidays, exceptions],
  );

  const isDirty = Boolean(initialSig) && currentSig !== initialSig;
  useUnsavedChangesGuard(isDirty);

  // 초기 로드
  useEffect(() => {
    if (!serverSettings) return;

    const next = {
      capacity: Number(serverSettings.capacity ?? 1),
      start: String(serverSettings.start ?? "10:00"),
      end: String(serverSettings.end ?? "19:00"),
      interval: Number(serverSettings.interval ?? 30),
      businessDays: Array.isArray(serverSettings.businessDays)
        ? serverSettings.businessDays
        : [1, 2, 3, 4, 5],
      holidays: Array.isArray(serverSettings.holidays) ? serverSettings.holidays : [],
      bookingWindowDays: Number(serverSettings.bookingWindowDays ?? 30),
      exceptions: Array.isArray(serverSettings.exceptions) ? serverSettings.exceptions : [],
    };

    setCapacity(next.capacity);
    setStart(next.start);
    setEnd(next.end);
    setInterval(next.interval);
    setBusinessDays(next.businessDays);
    setHolidays(next.holidays);
    setBookingWindowDays(next.bookingWindowDays);
    setExceptions(next.exceptions);
    setInitialSig((sig) => sig || settingsDirtySignature(next));
  }, [serverSettings]);

  useEffect(() => {
    if (!error) return;
    showErrorToast("설정을 불러오지 못했습니다.");
  }, [error]);

  // 저장
  async function save() {
    const baseValidationError = validateBaseSettings({
      capacity,
      start,
      end,
      interval,
      bookingWindowDays,
    });
    if (baseValidationError) {
      showErrorToast(baseValidationError);
      return;
    }

    for (const ex of exceptions) {
      const sanitized = sanitizeExceptionInput(ex);
      const validationError = validateExceptionItem(sanitized);
      if (validationError) {
        showErrorToast(validationError);
        return;
      }
    }

    setSaving(true);
    const payload: Partial<StringingSettings> = {
      capacity,
      start,
      end,
      interval,
      businessDays,
      holidays,
      exceptions: exceptions.map((ex) => sanitizeExceptionInput(ex)),
      bookingWindowDays,
    };

    const result = await runAdminActionWithToast({
      action: () =>
        adminMutator("/api/admin/settings/stringing", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      successMessage: "저장되었습니다. 새 예약/제출부터 즉시 반영됩니다.",
      fallbackErrorMessage: "저장 실패",
    });

    if (result) setInitialSig(currentSig);
    setSaving(false);
  }

  function resetToDefaults() {
    setCapacity(1);
    setStart("10:00");
    setEnd("19:00");
    setInterval(30);
    setBusinessDays([1, 2, 3, 4, 5]);
    setHolidays([]);
    setExceptions([]);
    setBookingWindowDays(30);
    showInfoToast("기본값으로 되돌렸습니다. 저장 시 적용됩니다.");
  }

  const sortedHolidays = useMemo(() => [...holidays].sort(), [holidays]);
  const sortedExceptions = useMemo(
    () => [...exceptions].sort((a, b) => a.date.localeCompare(b.date)),
    [exceptions],
  );

  if (loading) {
    return (
      <AdminPageShell variant="wide" className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className={cn(adminSurface.card, "h-96 animate-pulse")} />
          <div className={cn(adminSurface.card, "h-96 animate-pulse")} />
        </div>
      </AdminPageShell>
    );
  }

  if (error) {
    return (
      <AdminPageShell variant="wide">
        <AsyncState
          kind="error"
          tone="admin"
          variant="page-center"
          resourceName="스케줄링 설정"
          onAction={() => {
            void mutate();
          }}
        />
      </AdminPageShell>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <AdminPageShell variant="wide" className="space-y-6">
        <AdminPageHeader
          variant="form"
          className="flex-wrap"
          title="예약 · 영업일 설정"
          description="교체서비스 예약 가능 시간, 영업 요일, 휴무일, 예외일을 관리합니다."
          icon={CalendarDays}
          scope="범위: 교체서비스 예약 슬롯"
          helperText="운영 정책 변경은 실제 예약 가능 시간에 즉시 영향을 줄 수 있습니다."
        />

        <div className={cn(adminSurface.fieldPanelMuted, "overflow-hidden p-0")}>
          <div className="flex items-start gap-3 p-4">
            <div className="rounded-md bg-muted p-2">
              <Info className="h-5 w-5" />
            </div>
            <div className="flex-1 text-sm leading-relaxed text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">
                저장 후 신규 예약에 즉시 반영됩니다
              </p>
              <p>
                동시 수용량과 영업 시간은 예약 슬롯 수에 영향을 줍니다. 휴무일과 예외일은 기본 영업
                요일보다 우선하며, 기존 예약 데이터는 이 화면에서 수정하지 않습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className={cn("overflow-hidden", adminSurface.card)}>
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
                <div className="rounded-md bg-primary/10 p-2 text-primary dark:bg-primary/20">
                  <Clock className="h-5 w-5" />
                </div>
                기본 슬롯 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">
                    {/* was: text-foreground */}동시 수용량
                  </Label>
                  <Badge variant="brand" className="px-3 py-1">
                    {capacity}명
                  </Badge>
                </div>
                <Slider
                  value={[capacity]}
                  onValueChange={(v) => setCapacity(Math.max(1, Math.min(10, v?.[0] ?? 1)))}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-3"
                />
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {/* was: text-muted-foreground */}예) 2로 저장하면 동일 시간대 최대 2건까지
                  접수됩니다.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start" className="text-sm font-medium text-foreground">
                    영업 시작
                  </Label>
                  <Input
                    id="start"
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="border-border focus:border-border focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end" className="text-sm font-medium text-foreground">
                    영업 종료
                  </Label>
                  <Input
                    id="end"
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="border-border focus:border-border focus:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval" className="text-sm font-medium text-foreground">
                  간격 (5~240분)
                </Label>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    id="interval"
                    type="number"
                    min={5}
                    max={240}
                    value={interval}
                    onChange={(e) => {
                      const v = Number(e.target.value || 30);
                      if (Number.isFinite(v)) setInterval(Math.max(5, Math.min(240, v)));
                    }}
                    className="w-32 border-border focus:border-border focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">예: 30분 → 10:00, 10:30…</span>
                </div>
              </div>

              {/* 예약 가능 기간(일) */}
              <div className="space-y-2">
                <Label htmlFor="bookingWindowDays" className="text-sm font-medium text-foreground">
                  예약 가능 기간(일)
                </Label>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    id="bookingWindowDays"
                    type="number"
                    min={1}
                    max={180}
                    value={bookingWindowDays}
                    onChange={(e) => {
                      const v = Number(e.target.value || 30);
                      if (Number.isFinite(v)) setBookingWindowDays(Math.max(1, Math.min(180, v)));
                    }}
                    className="w-32 border-border focus:border-border focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">
                    예: 30 → 오늘부터 30일 이내만 신청 가능 (최대 180)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn("overflow-hidden", adminSurface.card)}>
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
                <div className="rounded-md bg-muted p-2">
                  <CalendarDays className="h-5 w-5" />
                </div>
                영업 요일 · 휴무일
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
              <div>
                <Label className="mb-3 block text-sm font-medium text-foreground">영업 요일</Label>
                <div className="grid grid-cols-7 gap-2">
                  {DAY_LABELS.map((label, i) => {
                    const on = businessDays.includes(i);
                    return (
                      <Button
                        key={i}
                        type="button"
                        variant={on ? "default" : "outline"}
                        className={
                          on
                            ? "border-0 bg-primary font-medium text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                        }
                        onClick={() =>
                          setBusinessDays((prev) =>
                            prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort(),
                          )
                        }
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  예외일로 별도 지정한 날짜는 이 요일 설정과 무관하게 동작합니다.
                </p>
              </div>

              <Separator className="bg-border" />

              <div>
                <Label className="mb-3 block text-sm font-medium text-foreground">휴무일</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={holidayInput}
                    onChange={(e) => setHolidayInput(e.target.value)}
                    className="max-w-[200px] border-border focus:border-border focus:ring-ring"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!holidayInput) return;
                      if (!holidays.includes(holidayInput))
                        setHolidays([...holidays, holidayInput]);
                      setHolidayInput("");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> 추가
                  </Button>
                </div>

                {sortedHolidays.length > 0 ? (
                  <ul className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
                    {sortedHolidays.map((h) => (
                      <li
                        key={h}
                        className="flex items-center justify-between border-t border-border px-4 py-3 text-sm first:border-t-0 hover:bg-muted/20"
                      >
                        <span className="font-medium text-foreground">{h}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="hover:bg-destructive/10 dark:hover:bg-destructive/15 text-destructive hover:text-destructive"
                          aria-label={`${h} 휴무일 삭제`}
                          title={`${h} 휴무일 삭제`}
                          onClick={() => setHolidays((prev) => prev.filter((x) => x !== h))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">등록된 휴무일이 없습니다.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className={cn("overflow-hidden", adminSurface.card)}>
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
              <div className="rounded-md bg-muted p-2">
                <Users className="h-5 w-5" />
              </div>
              예외일 (특별 운영/휴무)
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <div className={adminSurface.fieldPanelMuted}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                <div className="space-y-2 xl:col-span-2">
                  <Label className="text-xs font-medium text-foreground">날짜</Label>
                  <Input
                    type="date"
                    value={exInput.date || ""}
                    onChange={(e) => setExInput({ ...exInput, date: e.target.value })}
                    className="border-border bg-card focus:border-border focus:ring-ring"
                  />
                </div>

                <div className="flex items-center gap-2 pt-0 xl:pt-7">
                  <Switch
                    checked={!!exInput.closed}
                    onCheckedChange={(v) => setExInput({ ...exInput, closed: v })}
                    id="ex-closed"
                  />
                  <Label htmlFor="ex-closed" className="text-sm font-medium text-foreground">
                    해당 날짜 휴무
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">시작</Label>
                  <Input
                    type="time"
                    value={exInput.start || ""}
                    onChange={(e) => setExInput({ ...exInput, start: e.target.value })}
                    className="border-border bg-card focus:border-border focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">종료</Label>
                  <Input
                    type="time"
                    value={exInput.end || ""}
                    onChange={(e) => setExInput({ ...exInput, end: e.target.value })}
                    className="border-border bg-card focus:border-border focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">간격(분)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={240}
                    value={exInput.interval ?? ""}
                    onChange={(e) =>
                      setExInput({
                        ...exInput,
                        interval: Number(e.target.value) || undefined,
                      })
                    }
                    className="border-border bg-card focus:border-border focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">수용량</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={exInput.capacity ?? ""}
                    onChange={(e) =>
                      setExInput({
                        ...exInput,
                        capacity: Number(e.target.value) || undefined,
                      })
                    }
                    className="border-border bg-card focus:border-border focus:ring-ring"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (!exInput.date) {
                      showErrorToast("날짜는 필수입니다.");
                      return;
                    }

                    const sanitized = sanitizeExceptionInput(exInput);
                    const validationError = validateExceptionItem(sanitized);
                    if (validationError) {
                      showErrorToast(validationError);
                      return;
                    }

                    setExceptions((prev) => {
                      const rest = prev.filter((x) => x.date !== sanitized.date);
                      return [...rest, sanitized];
                    });
                    setExInput({ date: "" });
                    showSuccessToast("예외일이 추가/수정되었습니다.");
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" /> 예외일 추가/수정
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-border bg-transparent hover:bg-muted/20 hover:text-foreground"
                  onClick={() => setExInput({ date: "" })}
                >
                  입력 초기화
                </Button>
              </div>
            </div>

            {sortedExceptions.length > 0 ? (
              <ul className="overflow-hidden rounded-lg border border-border bg-card">
                {sortedExceptions.map((ex) => (
                  <li
                    key={ex.date}
                    className="flex items-start justify-between gap-4 border-t border-border px-5 py-4 first:border-t-0 hover:bg-muted/20"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-foreground mb-1">{ex.date}</div>
                      {ex.closed ? (
                        <Badge variant="danger">휴무</Badge>
                      ) : (
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <div>
                            {ex.start && ex.end
                              ? `${ex.start} ~ ${ex.end}`
                              : "시간 미지정(기본값 사용)"}
                          </div>
                          {(typeof ex.interval === "number" || typeof ex.capacity === "number") && (
                            <div className="flex items-center gap-2">
                              {typeof ex.interval === "number" && (
                                <Badge
                                  variant="outline"
                                  className="border-border text-muted-foreground"
                                >
                                  간격 {ex.interval}분
                                </Badge>
                              )}
                              {typeof ex.capacity === "number" && (
                                <Badge
                                  variant="outline"
                                  className="border-border text-muted-foreground"
                                >
                                  수용 {ex.capacity}명
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="hover:bg-primary/10 dark:hover:bg-primary/20 text-primary"
                        onClick={() => setExInput(ex)}
                        aria-label={`${ex.date} 예외일 수정`}
                        title={`${ex.date} 예외일 수정`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="hover:bg-destructive/10 dark:hover:bg-destructive/15 text-destructive"
                        onClick={() =>
                          setExceptions((prev) => prev.filter((x) => x.date !== ex.date))
                        }
                        aria-label={`${ex.date} 예외일 삭제`}
                        title={`${ex.date} 예외일 삭제`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={cn(adminSurface.fieldPanelMuted, "border-dashed p-8 text-center")}>
                <p className="text-sm text-muted-foreground">등록된 예외일이 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/95 px-4 py-3 supports-[backdrop-filter]:backdrop-blur">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant={isDirty ? "warning" : "success"}>
              {isDirty ? "저장되지 않은 변경" : "저장됨"}
            </Badge>
            <span className="min-w-0 flex-1 text-sm text-muted-foreground">
              {isDirty
                ? "저장해야 신규 예약에 반영됩니다."
                : "현재 화면과 저장된 설정이 일치합니다."}
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={resetToDefaults}
              className="border-border bg-transparent hover:bg-muted/20 hover:text-foreground"
            >
              기본값으로
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={saving}
              className="bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "저장 중…" : "저장"}
            </Button>
          </div>
        </div>
      </AdminPageShell>
    </TooltipProvider>
  );
}
