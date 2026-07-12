"use client";

import type {
  CareForm,
  CareItem,
  RacketCareImportCandidate,
} from "@/app/mypage/racket-care/_components/racket-care-client.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import { useEffect } from "react";

const freqLabels: Record<string, string> = {
  monthly: "월 1~2회",
  weekly: "주 1회",
  biweekly_plus: "주 2~3회",
  heavy: "주 4회 이상",
};
const intervalByFreq: Record<string, number> = {
  monthly: 120,
  weekly: 90,
  biweekly_plus: 60,
  heavy: 30,
};
function localDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
function previewDate(form: CareForm) {
  if (!form.lastStringingAt) return null;
  const base = new Date(`${form.lastStringingAt}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() + (intervalByFreq[form.playFrequency] ?? 90));
  return dateLabel(base.toISOString());
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <p className="mt-1 text-ui-label text-destructive">{error}</p>}
    </div>
  );
}

export default function RacketCareRegistrationDialog(props: {
  open: boolean;
  setOpen: (v: boolean) => void;
  step: number;
  setStep: (v: number) => void;
  mode: "import" | "manual";
  setMode: (v: "import" | "manual") => void;
  editing: CareItem | null;
  form: CareForm;
  setForm: (v: CareForm) => void;
  errors: Record<string, string>;
  saving: boolean;
  save: () => void;
  importCandidates: RacketCareImportCandidate[];
  emptyForm: () => CareForm;
  formFromCandidate: (candidate: RacketCareImportCandidate) => CareForm;
}) {
  const {
    open,
    setOpen,
    step,
    setStep,
    mode,
    setMode,
    editing,
    form,
    setForm,
    errors,
    saving,
    save,
    importCandidates,
    emptyForm,
    formFromCandidate,
  } = props;
  const estimatedDate = previewDate(form);
  const steps = ["등록 방식", "라켓 정보", "관리 기준"];
  useEffect(() => {
    if (!open || step !== 2) return;
    const firstField = ["nickname", "brand", "model"].find((field) => errors[field]);
    if (firstField) document.getElementById(firstField)?.focus();
  }, [errors, open, step]);
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen && saving) return;
      setOpen(nextOpen);
    }}>
      <DialogContent className="max-h-[min(720px,calc(100dvh-2rem))] overflow-y-auto" onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }} onPointerDownOutside={(event) => { if (saving) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{editing ? "라켓 정보 수정" : "라켓 등록"}</DialogTitle>
          <div className="mt-3 grid gap-2 bp-sm:grid-cols-3">
            {steps.map((label, index) => {
              const number = index + 1;
              const complete = step > number;
              return (
                <div key={label} className="rounded-control border border-border bg-card p-3 data-[active=true]:border-brand-highlight data-[active=true]:bg-brand-highlight-muted" data-active={step === number}>
                  <span className="flex items-center gap-2 text-ui-label text-muted-foreground">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-ui-micro data-[active=true]:bg-brand-highlight data-[active=true]:text-brand-highlight-foreground" data-active={step === number}>
                      {complete ? <Check className="h-3 w-3" /> : String(number).padStart(2, "0")}
                    </span>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogHeader>
        {!editing && step === 1 ? (
          <div className="grid gap-3 bp-sm:grid-cols-2">
            <Button
              variant={mode === "import" ? "highlight" : "outline"}
              wrap="responsive"
              disabled={importCandidates.length === 0}
              className="min-h-24 justify-start rounded-panel p-4 text-left"
              onClick={() => {
                setMode("import");
                if (importCandidates[0]) setForm(formFromCandidate(importCandidates[0]));
                setStep(2);
              }}
            >
              <span><span className="block font-semibold">기존 정보에서 가져오기</span><span className="mt-1 block text-ui-label opacity-70">{importCandidates.length > 0 ? "프로필과 완료 이력을 활용합니다." : "가져올 정보가 없습니다."}</span></span>
            </Button>
            <Button
              variant={mode === "manual" ? "highlight" : "outline"}
              wrap="responsive"
              className="min-h-24 justify-start rounded-panel p-4 text-left"
              onClick={() => {
                setMode("manual");
                setForm(emptyForm());
                setStep(2);
              }}
            >
              <span><span className="block font-semibold">직접 입력하기</span><span className="mt-1 block text-ui-label opacity-70">라켓과 관리 기준을 직접 작성합니다.</span></span>
            </Button>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="space-y-4">
            {mode === "import" && importCandidates.length > 0 ? (
              <div className="grid gap-2">
                {importCandidates.map((c) => (
                  <button
                    key={c.id}
                    className="rounded-control border border-border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:border-brand-highlight data-[active=true]:bg-brand-highlight-muted"
                    data-active={form.latestCompletedApplicationId === (c.latestCompletedApplication?.id ?? "") && form.nickname === c.nickname}
                    onClick={() => setForm(formFromCandidate(c))}
                  >
                    <span className="font-medium">{c.nickname}</span>
                    <span className="ml-2 text-ui-label text-muted-foreground">
                      {c.sourceLabel}
                    </span>
                    {c.racket.brand && c.racket.model ? null : (
                      <Badge variant="warning" className="ml-2">추가 정보 필요</Badge>
                    )}
                    <p className="mt-1 text-ui-label text-muted-foreground">
                      {c.lastStringingAt
                        ? `최근 교체일 ${dateLabel(c.lastStringingAt)}`
                        : "마지막 교체일을 입력하면 예상 교체일을 계산합니다."}{" "}
                      · {c.stringSnapshot?.name || "스트링 정보 없음"}
                      {c.stringSnapshot?.gauge ? ` · ${c.stringSnapshot.gauge}` : ""}
                      {c.stringSnapshot?.tensionMain || c.stringSnapshot?.tensionCross
                        ? ` · ${c.stringSnapshot?.tensionMain ?? "-"}/${c.stringSnapshot?.tensionCross ?? "-"}LB`
                        : ""}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
            <Field
              id="nickname"
              label="라켓 별칭"
              value={form.nickname}
              error={errors.nickname}
              onChange={(v) => setForm({ ...form, nickname: v })}
            />
            <Field
              id="brand"
              label="브랜드"
              value={form.brand}
              error={errors.brand}
              onChange={(v) => setForm({ ...form, brand: v })}
            />
            <Field
              id="model"
              label="모델"
              value={form.model}
              error={errors.model}
              onChange={(v) => setForm({ ...form, model: v })}
            />
            <Field
              id="stringName"
              label="최근 스트링명(선택)"
              value={form.stringName}
              onChange={(v) => setForm({ ...form, stringName: v })}
            />
            <div className="grid gap-2 bp-sm:grid-cols-3">
              <Field
                id="gauge"
                label="게이지"
                value={form.gauge}
                onChange={(v) => setForm({ ...form, gauge: v })}
              />
              <Field
                id="tensionMain"
                label="메인 텐션"
                value={form.tensionMain}
                onChange={(v) => setForm({ ...form, tensionMain: v })}
              />
              <Field
                id="tensionCross"
                label="크로스 텐션"
                value={form.tensionCross}
                onChange={(v) => setForm({ ...form, tensionCross: v })}
              />
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="grid gap-3">
            <div>
              <Label htmlFor="playFrequency">플레이 빈도</Label>
              <select
                id="playFrequency"
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-ui-body-sm"
                value={form.playFrequency}
                onChange={(e) => setForm({ ...form, playFrequency: e.target.value })}
              >
                {Object.entries(freqLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              {errors.playFrequency && (
                <p className="mt-1 text-ui-label text-destructive">{errors.playFrequency}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastStringingAt">마지막 교체일</Label>
              <Input
                id="lastStringingAt"
                type="date"
                max={localDateInputValue()}
                value={form.lastStringingAt}
                onChange={(e) => setForm({ ...form, lastStringingAt: e.target.value })}
              />
              {errors.lastStringingAt && (
                <p className="mt-1 text-ui-label text-destructive">{errors.lastStringingAt}</p>
              )}
            </div>
            <div className="flex min-h-11 items-center gap-3">
              <Switch
                id="new-reminder"
                checked={form.reminderEnabled}
                onCheckedChange={(checked) => setForm({ ...form, reminderEnabled: checked })}
              />
              <Label htmlFor="new-reminder">교체 알림 사용</Label>
            </div>
            <Card className="rounded-control border-brand-highlight/30 bg-brand-highlight-muted"><CardContent className="p-3 text-ui-body-sm">
              {estimatedDate ? (
                <>
                  저장 전 예상 교체일: <span className="font-medium">{estimatedDate}</span>
                </>
              ) : (
                "마지막 교체일을 입력하면 예상 교체일을 계산합니다."
              )}
            </CardContent></Card>
            {errors.form && <p className="text-ui-body-sm text-destructive">{errors.form}</p>}
          </div>
        ) : null}
        <DialogFooter className="sticky bottom-0 bg-background pt-3 pb-[env(safe-area-inset-bottom)]">
          <Button
            variant="outline"
            onClick={() => (step > (editing ? 2 : 1) ? setStep(step - 1) : setOpen(false))}
            disabled={saving}
          >
            {step > (editing ? 2 : 1) ? "이전" : "취소"}
          </Button>
          {step < 3 ? (
            <Button variant="highlight" wrap="responsive" onClick={() => setStep(step + 1)}>다음</Button>
          ) : (
            <Button variant="highlight" wrap="responsive" onClick={save} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
