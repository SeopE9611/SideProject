"use client";

import type {
  CareForm,
  CareItem,
  RacketCareHistoryLinkIntent,
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
import { useEffect, useMemo, type InputHTMLAttributes } from "react";

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
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        inputMode={inputMode}
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
  historyLinkIntent: RacketCareHistoryLinkIntent;
  setHistoryLinkIntent: (v: RacketCareHistoryLinkIntent) => void;
  selectedImportCandidateId: string | null;
  setSelectedImportCandidateId: (v: string | null) => void;
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
    historyLinkIntent,
    setHistoryLinkIntent,
    selectedImportCandidateId,
    setSelectedImportCandidateId,
  } = props;
  const estimatedDate = previewDate(form);
  const visibleSteps = editing ? [{ actualStep: 2, label: "라켓 정보" }, { actualStep: 3, label: "관리 기준" }] : [{ actualStep: 1, label: "등록 방식" }, { actualStep: 2, label: "라켓 정보" }, { actualStep: 3, label: "관리 기준" }];
  const editImportCandidates = useMemo(() => importCandidates.filter((candidate) => Boolean(candidate.latestCompletedApplication?.id)), [importCandidates]);
  const clearHistoryLink = (nextForm: CareForm) => { setHistoryLinkIntent("clear"); setSelectedImportCandidateId(null); setForm({ ...nextForm, latestCompletedApplicationId: "" }); };
  const applyCreateCandidate = (candidate: RacketCareImportCandidate) => { setSelectedImportCandidateId(candidate.id); setForm(formFromCandidate(candidate)); };
  const applyEditCandidate = (candidate: RacketCareImportCandidate) => { if (!candidate.latestCompletedApplication?.id || !candidate.lastStringingAt) return; setHistoryLinkIntent("replace"); setSelectedImportCandidateId(candidate.id); setForm({ ...form, lastStringingAt: candidate.lastStringingAt.slice(0, 10), stringName: candidate.stringSnapshot?.name ?? "", gauge: candidate.stringSnapshot?.gauge ?? "", tensionMain: candidate.stringSnapshot?.tensionMain ?? "", tensionCross: candidate.stringSnapshot?.tensionCross ?? "", latestCompletedApplicationId: candidate.latestCompletedApplication.id }); };
  useEffect(() => {
    if (!open) return;
    const focusOrder = step === 3 ? ["playFrequency", "lastStringingAt"] : ["latestCompletedApplicationId", "nickname", "brand", "model", "stringName", "gauge", "tensionMain", "tensionCross"];
    const firstField = focusOrder.find((field) => errors[field]);
    if (!firstField) return;
    const frame = requestAnimationFrame(() => document.getElementById(firstField)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [errors, open, step]);
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen && saving) return;
      setOpen(nextOpen);
    }}>
      <DialogContent className="grid max-h-[min(720px,calc(100dvh-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden" onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }} onPointerDownOutside={(event) => { if (saving) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{editing ? "라켓 정보 수정" : "라켓 등록"}</DialogTitle>
          <div className="mt-3 grid gap-2 bp-sm:grid-cols-3">
            {visibleSteps.map(({ actualStep, label }, index) => {
              const number = index + 1;
              const complete = step > actualStep;
              return (
                <div key={label} className="rounded-control border border-border bg-card p-3 data-[active=true]:border-brand-highlight data-[active=true]:bg-brand-highlight-muted" data-active={step === actualStep}>
                  <span className="flex items-center gap-2 text-ui-label text-muted-foreground">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-ui-micro data-[active=true]:bg-brand-highlight data-[active=true]:text-brand-highlight-foreground" data-active={step === actualStep}>
                      {complete ? <Check className="h-3 w-3" /> : String(number).padStart(2, "0")}
                    </span>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto pr-1">
        {!editing && step === 1 ? (
          <div className="grid gap-3 bp-sm:grid-cols-2">
            <Button
              variant={mode === "import" ? "highlight" : "outline"}
              wrap="responsive"
              disabled={importCandidates.length === 0}
              className="min-h-24 justify-start rounded-panel p-4 text-left"
              onClick={() => {
                setMode("import");
                if (importCandidates[0]) { setSelectedImportCandidateId(importCandidates[0].id); setForm(formFromCandidate(importCandidates[0])); }
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
                setSelectedImportCandidateId(null); setForm(emptyForm());
                setStep(2);
              }}
            >
              <span><span className="block font-semibold">직접 입력하기</span><span className="mt-1 block text-ui-label opacity-70">라켓과 관리 기준을 직접 작성합니다.</span></span>
            </Button>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="space-y-4">
            {editing ? (
              <div id="latestCompletedApplicationId" tabIndex={-1} className="space-y-3 rounded-panel border border-border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div>
                  <h3 className="font-semibold">완료된 교체 이력 불러오기</h3>
                  <p className="mt-1 text-ui-label text-muted-foreground">이전에 완료한 교체서비스의 날짜와 스트링 정보를 적용할 수 있어요.</p>
                  <p className="mt-1 text-ui-label text-muted-foreground">교체일과 스트링 정보만 적용되며, 라켓 별칭과 기본 정보는 유지됩니다.</p>
                </div>
                {editing.lastApplicationId && historyLinkIntent === "keep" ? <Badge variant="success">현재 완료된 교체 이력과 연결되어 있습니다.</Badge> : null}
                {historyLinkIntent === "replace" ? <Badge variant="info">선택한 완료 이력으로 교체일과 스트링 정보가 변경됩니다.</Badge> : null}
                {historyLinkIntent === "clear" ? <Badge variant="warning">직접 입력한 값으로 저장하면 기존 완료 이력 연결이 해제됩니다.</Badge> : null}
                {errors.latestCompletedApplicationId ? <p className="text-ui-label text-destructive">{errors.latestCompletedApplicationId}</p> : null}
                {editImportCandidates.length > 0 ? (
                  <div className="grid gap-2">
                    {editImportCandidates.map((c) => {
                      const disabled = !c.lastStringingAt;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={disabled}
                          className="rounded-control border border-border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 data-[active=true]:border-brand-highlight data-[active=true]:bg-brand-highlight-muted"
                          data-active={selectedImportCandidateId === c.id}
                          onClick={() => applyEditCandidate(c)}
                        >
                          <span className="font-medium">{c.nickname || `${c.racket.brand} ${c.racket.model}`.trim()}</span>
                          <span className="ml-2 text-ui-label text-muted-foreground">{c.sourceLabel}</span>
                          {disabled ? <Badge variant="warning" className="ml-2">완료일 정보 없음</Badge> : null}
                          <p className="mt-1 text-ui-label text-muted-foreground">
                            {c.lastStringingAt ? `최근 교체일 ${dateLabel(c.lastStringingAt)}` : "완료일 정보 없음"} · {c.stringSnapshot?.name || "스트링 정보 없음"}
                            {c.stringSnapshot?.gauge ? ` · ${c.stringSnapshot.gauge}` : ""}
                            {c.stringSnapshot?.tensionMain || c.stringSnapshot?.tensionCross ? ` · ${c.stringSnapshot?.tensionMain ?? "-"}/${c.stringSnapshot?.tensionCross ?? "-"}LB` : ""}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-ui-label text-muted-foreground">불러올 수 있는 완료된 교체 이력이 없습니다.</p>
                )}
              </div>
            ) : null}
            {mode === "import" && importCandidates.length > 0 ? (
              <div className="grid gap-2">
                {importCandidates.map((c) => (
                  <button
                    key={c.id}
                    className="rounded-control border border-border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:border-brand-highlight data-[active=true]:bg-brand-highlight-muted"
                    data-active={selectedImportCandidateId === c.id}
                    type="button"
                    onClick={() => applyCreateCandidate(c)}
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
              onChange={(v) => clearHistoryLink({ ...form, stringName: v })}
            />
            <div className="grid gap-2 bp-sm:grid-cols-3">
              <Field
                id="gauge"
                label="게이지 (mm)"
                value={form.gauge}
                onChange={(v) => clearHistoryLink({ ...form, gauge: v })}
                inputMode="decimal"
              />
              <Field
                id="tensionMain"
                label="메인 텐션 (LB)"
                value={form.tensionMain}
                onChange={(v) => clearHistoryLink({ ...form, tensionMain: v })}
                inputMode="decimal"
              />
              <Field
                id="tensionCross"
                label="크로스 텐션 (LB)"
                value={form.tensionCross}
                onChange={(v) => clearHistoryLink({ ...form, tensionCross: v })}
                inputMode="decimal"
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
                onChange={(e) => clearHistoryLink({ ...form, lastStringingAt: e.target.value })}
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
        </div>
        <DialogFooter className="border-t border-border bg-background pt-3 pb-[env(safe-area-inset-bottom)]">
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
