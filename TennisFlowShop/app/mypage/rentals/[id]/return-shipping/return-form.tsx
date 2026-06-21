"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Truck } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getSelectableCourierCatalog, normalizeCourierCode } from "@/lib/shipping/courier-map";
import { normalizeTrackingNumber } from "@/lib/shipping/tracking-number";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";

// 서버 정규확 검증
const isValidTrackingDigits = (digits: string) =>
  digits.length >= 9 && digits.length <= 20;

function formatFieldErrors(
  fieldErrors?: Record<string, string[] | undefined> | null,
) {
  if (!fieldErrors) return "";
  const lines: string[] = [];
  for (const [field, msgs] of Object.entries(fieldErrors)) {
    for (const msg of msgs ?? []) lines.push(`- ${field}: ${msg}`);
  }
  return lines.join("\n");
}

export default function ReturnShippingForm({ rentalId }: { rentalId: string }) {
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  const [prefillDone, setPrefillDone] = useState(false);

  const fingerprint = useMemo(
    () => JSON.stringify({ courier, tracking, date, note }),
    [courier, tracking, date, note],
  );
  const baselineRef = useRef<string | null>(null);
  const isDirty = useMemo(
    () => baselineRef.current !== null && baselineRef.current !== fingerprint,
    [fingerprint],
  );

  useEffect(() => {
    if (!prefillDone) return;
    if (baselineRef.current !== null) return;
    baselineRef.current = fingerprint;
  }, [prefillDone, fingerprint]);

  useUnsavedChangesGuard(isDirty);

  // 프리필(수정 모드 지원)
  useEffect(() => {
    let cancelled = false;
    setPrefillDone(false);
    (async () => {
      try {
        const res = await fetch(`/api/rentals/${rentalId}`, {
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const ret = json?.shipping?.return;
        if (ret) {
          setCourier(normalizeCourierCode(ret.courier) || "");
          setTracking(normalizeTrackingNumber(ret.trackingNumber));
          setDate(ret.shippedAt ? String(ret.shippedAt).slice(0, 10) : "");
          setNote(ret.note || "");
          setHasExisting(true);
        }
      } finally {
        if (!cancelled) setPrefillDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rentalId]);

  const onSubmit = async () => {
    if (!courier) return showErrorToast("택배사를 입력하세요");
    // 운송장: 숫자만 + 9~20자리
    const trackingDigits = normalizeTrackingNumber(tracking);
    if (!trackingDigits) return showErrorToast("운송장 번호를 입력하세요");
    if (!isValidTrackingDigits(trackingDigits))
      return showErrorToast("운송장 번호는 숫자 9~20자리만 입력해주세요");

    // 메모: 200자 제한
    const noteTrimmed = note.trim();
    if (noteTrimmed.length > 200)
      return showErrorToast("메모는 200자 이내로 입력해주세요");

    setBusy(true);
    const res = await fetch(`/api/rentals/${rentalId}/return-shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        courier: normalizeCourierCode(courier),
        trackingNumber: trackingDigits,
        shippedAt: date || undefined,
        note: noteTrimmed || undefined,
      }),
    });
    setBusy(false);
    // 서버가 400에서 { error, fieldErrors }를 내려주면 그대로 노출
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error || json?.message || "등록 실패";
      const details = formatFieldErrors(json?.fieldErrors);
      return showErrorToast(details ? `${msg}\n${details}` : msg);
    }
    showSuccessToast("반납 운송장을 저장했습니다");
    history.back();
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5 bp-sm:px-6 bp-sm:py-6">
      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20 px-4 py-4 bp-sm:px-6">
          <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 break-keep text-foreground">
                <Truck className="h-5 w-5 text-primary" /> 반납 운송장{" "}
                {hasExisting ? "수정" : "등록"}
              </CardTitle>
              <CardDescription className="mt-1 break-keep">
                반납 접수 후 받은 택배사와 운송장 번호를 등록해 주세요.
              </CardDescription>
            </div>
            {hasExisting ? (
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                등록된 정보 있음
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 bp-sm:p-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              택배사
            </Label>
            <Select value={courier} onValueChange={setCourier}>
              <SelectTrigger className="border-border bg-background focus:ring-ring">
                <SelectValue placeholder="택배사를 선택" />
              </SelectTrigger>
              <SelectContent>
                {getSelectableCourierCatalog().map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              운송장 번호
            </Label>
            <Input
              value={tracking}
              onChange={(e) => {
                // 입력 중에도 숫자만 유지 + 최대 20자리 제한
                const digits = normalizeTrackingNumber(e.target.value).slice(0, 20);
                setTracking(digits);
              }}
              inputMode="numeric"
              placeholder="숫자만 입력 (9~20자리)"
              className="h-9 border-border bg-background tabular-nums focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              발송일(선택)
            </Label>
            <Input
              type="date"
              value={date}
              className="h-9 border-border bg-background focus-visible:ring-ring"
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              메모(선택)
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="택배 접수 지점 등"
              className="border-border bg-background focus-visible:ring-ring"
            />
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            운송장 번호는 숫자만 저장되며, 택배사와 번호를 다시 확인해 주세요.
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              onClick={onSubmit}
              disabled={busy}
              className="h-9 w-full overflow-hidden whitespace-nowrap sm:w-auto"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 저장
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
