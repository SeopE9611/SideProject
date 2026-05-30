"use client";

import type useCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter";
import TimeSlotSelector from "@/app/services/_components/TimeSlotSelector";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock3, Settings2, Sparkles } from "lucide-react";
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
      className="overflow-visible rounded-xl border border-border/90 bg-card px-4 py-2"
    >
      <AccordionItem value="detail" className="border-none">
        <AccordionTrigger
          value="detail"
          className="group rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5 text-left text-sm font-semibold transition-[border-color,background-color] hover:bg-primary/5"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="inline-flex items-center gap-2 text-foreground">
              <Settings2 className="h-4 w-4 text-primary/80" />
              작업할 라켓
            </span>
            <span className="text-xs font-normal leading-relaxed text-muted-foreground">
              선택한 스트링을 장착할 라켓과 요청사항을 입력하세요. 필요한 항목만
              작성해도 됩니다.
            </span>
          </span>
          <span className="text-xs text-muted-foreground">선택 입력</span>
        </AccordionTrigger>
        <AccordionContent value="detail" className="space-y-6 pb-5 pt-4">
          <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-semibold text-foreground">방문 예약</p>
            {isVisit ? (
              <div className="grid grid-cols-1 gap-4 bp-sm:grid-cols-2">
                <div className="space-y-2.5">
                  <Label
                    htmlFor="checkout-preferred-date"
                    className="text-xs text-muted-foreground"
                  >
                    희망 날짜
                  </Label>
                  <Input
                    id="checkout-preferred-date"
                    type="date"
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
                <div className="space-y-2.5 rounded-lg border border-border bg-card p-3.5">
                  <div className="space-y-1">
                    <Label
                      htmlFor="checkout-preferred-time"
                      className="text-xs font-medium text-foreground"
                    >
                      희망 시간
                    </Label>
                    <p className="text-xs text-muted-foreground">
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
                      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-3 text-xs text-foreground">
                        <p className="font-medium text-foreground">
                          <Clock3 className="mr-1 inline h-3.5 w-3.5 text-primary" />
                          이번 방문 예상 소요 시간:{" "}
                          {visitTimeRange
                            ? `${visitTimeRange.start} ~ ${visitTimeRange.end}`
                            : `약 ${visitDurationMinutesUi}분`}{" "}
                          ({visitSlotCountUi}슬롯)
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          선택한 시간부터 연속 작업이 진행됩니다.
                        </p>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                현재 접수 방식은 방문 예약이 필요하지 않습니다.
              </p>
            )}
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                라켓별 작업 정보
              </p>
              <p className="text-xs text-muted-foreground">
                라켓 번호는 구분용이며, 입력하지 않아도 주문은 진행할 수
                있습니다.
              </p>
            </div>
            {lineCount >= 2 && (
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary/80" />
                      여러 라켓에 한 번에 적용
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      공통 텐션과 메모를 빠르게 채웁니다.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 border-border px-2 text-xs"
                      onClick={applyFirstLineTensionToAll}
                    >
                      1번 텐션 → 전체
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => applyBulkToAllLines()}
                    >
                      입력값 → 전체
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2">
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
                      placeholder="공통 메모"
                      className="min-h-[72px] px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {linesForSubmit.map((line, index) => {
                const racketName = String(line.racketType ?? "").trim();
                const displayRacketName = racketName || `라켓 ${index + 1}`;
                const mainTension = String(line.tensionMain ?? "").trim();
                const crossTension = String(line.tensionCross ?? "").trim();
                const tensionSummary =
                  mainTension || crossTension
                    ? crossTension && crossTension !== mainTension
                      ? `${mainTension || "-"}/${crossTension} lbs`
                      : `${mainTension || crossTension} lbs`
                    : "텐션 미입력";
                const note = String(line.note ?? "").trim();
                const summaryTension =
                  tensionSummary === "텐션 미입력" ? "미입력" : tensionSummary;
                const hasLineInput =
                  !!racketName || !!mainTension || !!crossTension || !!note;

                return (
                  <div
                    key={line.id}
                    className="rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow,background-color] focus-within:border-primary/20 focus-within:bg-primary/5 bp-sm:p-5"
                  >
                    <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                      <div className="min-w-0 space-y-1.5">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {displayRacketName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {line.stringName}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 bp-sm:flex-col bp-sm:items-end">
                        <span className="text-xs font-medium text-foreground">
                          장착비 {formatWon(line.mountingFee)}
                        </span>
                        <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {hasLineInput ? "입력됨" : "선택 입력"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      <span>라켓명 {previewText(racketName, "미입력")}</span>
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span>텐션 {summaryTension}</span>
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span>요청 {previewText(note, "없음")}</span>
                    </div>

                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor={`checkout-racket-name-${line.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          라켓
                        </Label>
                        <Input
                          id={`checkout-racket-name-${line.id}`}
                          className="h-10 px-3"
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
                      </div>

                      <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`checkout-tension-main-${line.id}`}
                            className="text-xs text-muted-foreground"
                          >
                            메인 텐션
                          </Label>
                          <Input
                            id={`checkout-tension-main-${line.id}`}
                            className="h-10 px-3"
                            value={line.tensionMain ?? ""}
                            onChange={(e) =>
                              handleLineFieldChange(
                                index,
                                "tensionMain",
                                toNumberText(e.target.value),
                              )
                            }
                            placeholder="예: 52"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`checkout-tension-cross-${line.id}`}
                            className="text-xs text-muted-foreground"
                          >
                            크로스 텐션
                          </Label>
                          <Input
                            id={`checkout-tension-cross-${line.id}`}
                            className="h-10 px-3"
                            value={line.tensionCross ?? ""}
                            onChange={(e) =>
                              handleLineFieldChange(
                                index,
                                "tensionCross",
                                toNumberText(e.target.value),
                              )
                            }
                            placeholder="예: 50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor={`checkout-line-note-${line.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          요청 메모
                        </Label>
                        <Textarea
                          id={`checkout-line-note-${line.id}`}
                          value={line.note ?? ""}
                          onChange={(e) =>
                            handleLineFieldChange(index, "note", e.target.value)
                          }
                          placeholder="예: 가로/세로 텐션을 다르게 요청하고 싶어요"
                          className="min-h-[82px] px-3 py-2.5"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-2.5 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">전체 요청사항</p>
            <Textarea
              id="checkout-stringing-requirements"
              value={formData.requirements ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  requirements: e.target.value,
                }))
              }
              placeholder="예: 선호 텐션 느낌, 작업 시 확인할 사항"
              className="min-h-[98px] px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">
              필요한 경우에만 간단히 남겨주세요.
            </p>
          </section>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
