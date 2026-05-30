"use client";

import type useCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter";
import TimeSlotSelector from "@/app/services/_components/TimeSlotSelector";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock3, Settings2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

const toNumberText = (raw: string) => raw.replace(/[^0-9.]/g, "").slice(0, 4);
const formatWon = (value: number) =>
  `${Number(value || 0).toLocaleString("ko-KR")}원`;
const previewText = (value: string, fallback: string) => {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed;
};

type CheckoutStringingServiceAdapter = ReturnType<
  typeof useCheckoutStringingServiceAdapter
>;

type Props = {
  adapter: CheckoutStringingServiceAdapter;
};

export default function CheckoutStringingCompactEditor({ adapter }: Props) {
  const {
    formData,
    setFormData,
    lineCount,
    linesForSubmit,
    handleLineFieldChange,
    timeSlots,
    disabledTimes,
    reservedTimes,
    slotsLoading,
    hasCacheForDate,
    slotsError,
    visitSlotCountUi,
    visitDurationMinutesUi,
    visitTimeRange,
    lineValidationErrors,
  } = adapter;

  const isVisit = formData.collectionMethod === "visit";
  const [bulkTensionMain, setBulkTensionMain] = useState<string>(() =>
    String(formData?.defaultMainTension ?? ""),
  );
  const [bulkTensionCross, setBulkTensionCross] = useState<string>(() =>
    String(formData?.defaultCrossTension ?? ""),
  );
  const [bulkLineNote, setBulkLineNote] = useState<string>("");

  const applyBulkToAllLines = useCallback(
    (opts?: { main?: string; cross?: string; note?: string }) => {
      const main = (opts?.main ?? bulkTensionMain ?? "").trim();
      const cross = (opts?.cross ?? bulkTensionCross ?? "").trim();
      const note = (opts?.note ?? bulkLineNote ?? "").trim();
      if (!main && !cross && !note) return;

      setFormData((prev) => {
        const baseLines =
          Array.isArray(prev?.lines) && prev.lines.length > 0
            ? prev.lines
            : (linesForSubmit ?? []);
        if (!Array.isArray(baseLines) || baseLines.length === 0) return prev;

        const nextLines = baseLines.map((line) => ({
          ...line,
          tensionMain: main ? main : (line?.tensionMain ?? ""),
          tensionCross: cross ? cross : (line?.tensionCross ?? ""),
          note: note ? note : (line?.note ?? ""),
        }));

        return {
          ...prev,
          lines: nextLines,
          ...(main ? { defaultMainTension: main } : {}),
          ...(cross ? { defaultCrossTension: cross } : {}),
        };
      });
    },
    [
      bulkTensionCross,
      bulkTensionMain,
      bulkLineNote,
      linesForSubmit,
      setFormData,
    ],
  );

  const applyFirstLineTensionToAll = useCallback(() => {
    const first = (linesForSubmit ?? [])[0];
    if (!first) return;
    const main = String(first?.tensionMain ?? "").trim();
    const cross = String(first?.tensionCross ?? "").trim();
    if (!main && !cross) return;
    if (main) setBulkTensionMain(main);
    if (cross) setBulkTensionCross(cross);
    applyBulkToAllLines({ main, cross });
  }, [applyBulkToAllLines, linesForSubmit]);

  return (
    <Accordion
      type="single"
      defaultValue="detail"
      className="overflow-visible rounded-xl border border-border/90 bg-card px-3 py-2 bp-sm:px-4"
    >
      <AccordionItem value="detail" className="border-none">
        <AccordionTrigger
          value="detail"
          className="group rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-left text-sm font-semibold transition-[border-color,background-color] hover:bg-primary/5 bp-sm:px-4"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="inline-flex items-center gap-2 text-foreground">
              <Settings2 className="h-4 w-4 text-primary/80" />
              작업 정보 입력
            </span>
            <span className="break-keep text-xs font-normal leading-relaxed text-muted-foreground">
              라켓명과 텐션은 교체서비스 접수 필수 정보입니다.
            </span>
          </span>
          <Badge
            variant="secondary"
            className="shrink-0 border border-border bg-card text-[11px]"
          >
            필수
          </Badge>
        </AccordionTrigger>
        <AccordionContent value="detail" className="space-y-4 pb-4 pt-4">
          <section className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 bp-sm:p-4">
            <p className="text-sm font-semibold text-foreground">방문 예약</p>
            {isVisit ? (
              <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="checkout-preferred-date"
                    className="text-xs text-muted-foreground"
                  >
                    희망 날짜
                  </Label>
                  <Input
                    id="checkout-preferred-date"
                    type="date"
                    className="h-10"
                    min={new Date().toISOString().slice(0, 10)}
                    value={formData.preferredDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        preferredDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="checkout-preferred-time"
                      className="text-xs font-medium text-foreground"
                    >
                      희망 시간
                    </Label>
                    <p className="break-keep text-xs text-muted-foreground">
                      가능한 시간대 중 한 슬롯을 선택해주세요.
                    </p>
                  </div>
                  <TimeSlotSelector
                    selected={formData.preferredTime}
                    selectedDate={formData.preferredDate}
                    onSelect={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        preferredTime:
                          prev.preferredTime === value ? "" : value,
                      }))
                    }
                    times={timeSlots}
                    disabledTimes={disabledTimes}
                    reservedTimes={reservedTimes}
                    isLoading={slotsLoading && !hasCacheForDate}
                    errorMessage={slotsError}
                  />
                  {formData.preferredDate &&
                    formData.preferredTime &&
                    visitSlotCountUi > 0 &&
                    visitDurationMinutesUi && (
                      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-foreground">
                        <p className="font-medium text-foreground">
                          <Clock3 className="mr-1 inline h-3.5 w-3.5 text-primary" />
                          예상 소요:{" "}
                          {visitTimeRange
                            ? `${visitTimeRange.start}~${visitTimeRange.end}`
                            : `약 ${visitDurationMinutesUi}분`}{" "}
                          ({visitSlotCountUi}슬롯)
                        </p>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <p className="break-keep text-xs text-muted-foreground">
                현재 접수 방식은 방문 예약이 필요하지 않습니다.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  라켓 작업 정보
                </p>
                <p className="break-keep text-xs text-muted-foreground">
                  라켓명, 메인/크로스 텐션을 입력하세요.
                </p>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 border-border text-[11px]"
              >
                {lineCount}자루
              </Badge>
            </div>

            {lineCount >= 2 && (
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="mb-3 flex flex-col gap-2 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary/80" />
                      공통 입력
                    </p>
                    <p className="mt-0.5 break-keep text-xs text-muted-foreground">
                      여러 라켓의 텐션과 메모를 한 번에 채웁니다.
                    </p>
                  </div>
                  <div className="flex flex-nowrap gap-2 overflow-x-auto whitespace-nowrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 border-border px-2 text-xs"
                      onClick={applyFirstLineTensionToAll}
                    >
                      첫 라켓 텐션 → 전체
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-xs"
                      onClick={() => applyBulkToAllLines()}
                    >
                      입력값 → 전체
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2.5 bp-sm:grid-cols-2">
                  <Input
                    className="h-9 px-3 text-sm"
                    value={bulkTensionMain}
                    onChange={(e) =>
                      setBulkTensionMain(toNumberText(e.target.value))
                    }
                    placeholder="공통 메인 텐션"
                  />
                  <Input
                    className="h-9 px-3 text-sm"
                    value={bulkTensionCross}
                    onChange={(e) =>
                      setBulkTensionCross(toNumberText(e.target.value))
                    }
                    placeholder="공통 크로스 텐션"
                  />
                  <div className="bp-sm:col-span-2">
                    <Textarea
                      value={bulkLineNote}
                      onChange={(e) => setBulkLineNote(e.target.value)}
                      placeholder="공통 작업 요청사항"
                      className="min-h-[68px] px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {linesForSubmit.map((line, index) => {
                const racketName = String(line.racketType ?? "").trim();
                const displayTitle = racketName || "라켓 정보";
                const mainTension = String(line.tensionMain ?? "").trim();
                const crossTension = String(line.tensionCross ?? "").trim();
                const note = String(line.note ?? "").trim();
                const lineErrors = lineValidationErrors?.[index] ?? {
                  racketType: "",
                  tensionMain: "",
                  tensionCross: "",
                };
                const isComplete =
                  !!racketName && !!mainTension && !!crossTension;
                const tensionSummary =
                  mainTension && crossTension
                    ? crossTension !== mainTension
                      ? `${mainTension}/${crossTension} lbs`
                      : `${mainTension} lbs`
                    : "텐션 입력 필요";

                return (
                  <div
                    key={line.id}
                    className={cn(
                      "rounded-xl border bg-card p-3 transition-[border-color,box-shadow,background-color] focus-within:border-primary/20 focus-within:bg-primary/5 bp-sm:p-4",
                      isComplete ? "border-border" : "border-destructive/30",
                    )}
                  >
                    <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {displayTitle}
                          </p>
                          {lineCount > 1 && (
                            <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                              {index + 1}번째 라켓
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {line.stringName}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 bp-sm:justify-end">
                        <span className="whitespace-nowrap text-xs font-medium text-foreground">
                          장착비 {formatWon(line.mountingFee)}
                        </span>
                        <Badge
                          variant={isComplete ? "success" : "secondary"}
                          className="whitespace-nowrap border border-border bg-muted/30 text-[11px]"
                        >
                          {isComplete ? "입력 완료" : "필수 정보 미입력"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      <span>
                        {racketName
                          ? previewText(racketName, "")
                          : "라켓명 입력 필요"}
                      </span>
                      <span>{tensionSummary}</span>
                      {note && <span>요청 {previewText(note, "")}</span>}
                    </div>

                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor={`checkout-racket-name-${line.id}`}
                          className="text-xs font-medium text-foreground"
                        >
                          라켓명 <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`checkout-racket-name-${line.id}`}
                          className={cn(
                            "h-10 px-3",
                            lineErrors.racketType &&
                              "border-destructive/30 focus-visible:ring-destructive/20",
                          )}
                          value={line.racketType ?? ""}
                          onChange={(e) =>
                            handleLineFieldChange(
                              index,
                              "racketType",
                              e.target.value,
                            )
                          }
                          placeholder="예: 윌슨 블레이드 98"
                        />
                        {lineErrors.racketType && (
                          <p className="text-xs text-destructive">
                            {lineErrors.racketType}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 bp-sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`checkout-tension-main-${line.id}`}
                            className="text-xs font-medium text-foreground"
                          >
                            메인 텐션{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`checkout-tension-main-${line.id}`}
                            className={cn(
                              "h-10 px-3",
                              lineErrors.tensionMain &&
                                "border-destructive/30 focus-visible:ring-destructive/20",
                            )}
                            value={line.tensionMain ?? ""}
                            onChange={(e) =>
                              handleLineFieldChange(
                                index,
                                "tensionMain",
                                toNumberText(e.target.value),
                              )
                            }
                            placeholder="예: 52"
                            inputMode="decimal"
                          />
                          {lineErrors.tensionMain && (
                            <p className="text-xs text-destructive">
                              {lineErrors.tensionMain}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`checkout-tension-cross-${line.id}`}
                            className="text-xs font-medium text-foreground"
                          >
                            크로스 텐션{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`checkout-tension-cross-${line.id}`}
                            className={cn(
                              "h-10 px-3",
                              lineErrors.tensionCross &&
                                "border-destructive/30 focus-visible:ring-destructive/20",
                            )}
                            value={line.tensionCross ?? ""}
                            onChange={(e) =>
                              handleLineFieldChange(
                                index,
                                "tensionCross",
                                toNumberText(e.target.value),
                              )
                            }
                            placeholder="예: 50"
                            inputMode="decimal"
                          />
                          {lineErrors.tensionCross && (
                            <p className="text-xs text-destructive">
                              {lineErrors.tensionCross}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor={`checkout-line-note-${line.id}`}
                          className="text-xs font-medium text-foreground"
                        >
                          작업 요청사항{" "}
                          <span className="text-muted-foreground">선택</span>
                        </Label>
                        <Textarea
                          id={`checkout-line-note-${line.id}`}
                          value={line.note ?? ""}
                          onChange={(e) =>
                            handleLineFieldChange(index, "note", e.target.value)
                          }
                          placeholder="예: 손목 부담이 적게, 컨트롤 위주로 부탁드립니다."
                          className="min-h-[76px] px-3 py-2.5"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
