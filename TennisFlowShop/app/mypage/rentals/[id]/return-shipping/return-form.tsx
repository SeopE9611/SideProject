"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Truck } from "lucide-react";

import { PublicPageHero, PublicSurface, SummaryCard } from "@/components/public";
import { Button } from "@/components/ui/button";
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
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { getSelectableCourierCatalog, normalizeCourierCode } from "@/lib/shipping/courier-map";
import { normalizeTrackingNumber } from "@/lib/shipping/tracking-number";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

const isValidTrackingDigits = (digits: string) => digits.length >= 9 && digits.length <= 20;
function formatFieldErrors(fieldErrors?: Record<string, string[] | undefined> | null) {
  if (!fieldErrors) return "";
  return Object.entries(fieldErrors)
    .flatMap(([field, msgs]) => (msgs ?? []).map((msg) => `- ${field}: ${msg}`))
    .join("\n");
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
    if (prefillDone && baselineRef.current === null) baselineRef.current = fingerprint;
  }, [prefillDone, fingerprint]);
  useUnsavedChangesGuard(isDirty);
  useEffect(() => {
    let cancelled = false;
    setPrefillDone(false);
    (async () => {
      try {
        const res = await fetch(`/api/rentals/${rentalId}`, { credentials: "include" });
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
    const trackingDigits = normalizeTrackingNumber(tracking);
    if (!trackingDigits) return showErrorToast("운송장 번호를 입력하세요");
    if (!isValidTrackingDigits(trackingDigits))
      return showErrorToast("운송장 번호는 숫자 9~20자리만 입력해주세요");
    const noteTrimmed = note.trim();
    if (noteTrimmed.length > 200) return showErrorToast("메모는 200자 이내로 입력해주세요");
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
    <main className="min-h-screen bg-background pb-10">
      <PublicPageHero
        variant="feature"
        eyebrow="대여 반납"
        title={hasExisting ? "반납 운송장을 수정해 주세요" : "반납 운송장을 등록해 주세요"}
        description="대여 상품을 반납하기 위해 택배사와 운송장 번호를 등록하는 화면입니다."
      />
      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-6">
        <PublicSurface variant="muted" padding="md">
          <div className="flex gap-3">
            <Truck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">반납 접수 후 받은 정보를 입력해 주세요.</p>
              <p className="mt-1 text-ui-body-sm text-muted-foreground">
                운송장 번호는 숫자 9~20자리로 저장됩니다.
              </p>
            </div>
          </div>
        </PublicSurface>
        <SummaryCard
          variant="feature"
          eyebrow="반납 발송 정보"
          title={`반납 운송장 ${hasExisting ? "수정" : "등록"}`}
          description="택배사와 운송장 번호를 확인한 뒤 저장해 주세요."
          action={
            hasExisting ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-ui-label font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                등록된 정보 있음
              </span>
            ) : undefined
          }
          contentClassName="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="return-courier">
              택배사 <span className="text-destructive">*</span>
            </Label>
            <Select value={courier} onValueChange={setCourier}>
              <SelectTrigger id="return-courier" className="h-12 rounded-control">
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
            <Label htmlFor="return-tracking">
              운송장 번호 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="return-tracking"
              value={tracking}
              onChange={(e) => setTracking(normalizeTrackingNumber(e.target.value).slice(0, 20))}
              inputMode="numeric"
              placeholder="숫자만 입력 (9~20자리)"
              className="h-12 rounded-control tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="return-date">
              발송일 <span className="font-normal text-muted-foreground">(선택)</span>
            </Label>
            <Input
              id="return-date"
              type="date"
              value={date}
              className="h-12 rounded-control"
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="return-note">
              메모 <span className="font-normal text-muted-foreground">(선택, 200자 이내)</span>
            </Label>
            <Textarea
              id="return-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="택배 접수 지점 등"
              className="min-h-24 rounded-control"
            />
          </div>
          <div className="rounded-control border border-border bg-muted/40 p-3 text-ui-body-sm text-muted-foreground">
            운송장 번호는 숫자만 저장되며, 택배사와 번호를 다시 확인해 주세요.
          </div>
          <Button
            onClick={onSubmit}
            variant="highlight"
            disabled={busy}
            className="h-12 w-full rounded-control"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? "저장 중..." : "저장하기"}
          </Button>
        </SummaryCard>
      </div>
    </main>
  );
}
