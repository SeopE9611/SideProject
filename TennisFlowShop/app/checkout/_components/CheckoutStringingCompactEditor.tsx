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
import { useCallback, useState } from "react";

const toNumberText = (raw: string) => raw.replace(/[^0-9.]/g, "").slice(0, 4);

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
  const [bulkTensionMain, setBulkTensionMain] = useState<string>(
    () => String(formData?.defaultMainTension ?? ""),
  );
  const [bulkTensionCross, setBulkTensionCross] = useState<string>(
    () => String(formData?.defaultCrossTension ?? ""),
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
    [bulkTensionCross, bulkTensionMain, bulkLineNote, linesForSubmit, setFormData],
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
      defaultValue=""
      className="rounded-lg border border-border bg-background/80 px-4 py-1"
    >
      <AccordionItem value="detail" className="border-none">
        <AccordionTrigger value="detail" className="py-3.5 text-sm">
          상세 설정 열기
        </AccordionTrigger>
        <AccordionContent value="detail" className="space-y-7 pb-4">
          <section className="space-y-4">
            <p className="text-sm font-medium text-foreground">기본 설정</p>
            {isVisit ? (
              <div className="grid grid-cols-1 gap-4 bp-sm:grid-cols-2">
                <div className="space-y-2.5">
                  <Label htmlFor="checkout-preferred-date" className="text-xs text-muted-foreground">희망 날짜</Label>
                  <Input
                    id="checkout-preferred-date"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={formData.preferredDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, preferredDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="checkout-preferred-time" className="text-xs text-muted-foreground">희망 시간</Label>
                  <TimeSlotSelector
                    selected={formData.preferredTime}
                    selectedDate={formData.preferredDate}
                    onSelect={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        preferredTime: prev.preferredTime === value ? "" : value,
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
                      <div className="mt-4 rounded-lg border border-border bg-muted/20 px-3.5 py-3 text-xs text-foreground">
                        <p className="font-medium text-foreground">
                          이번 방문 예상 소요 시간:{" "}
                          {visitTimeRange
                            ? `${visitTimeRange.start} ~ ${visitTimeRange.end}`
                            : `약 ${visitDurationMinutesUi}분`}{" "}
                          ({visitSlotCountUi}슬롯)
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          선택 시간부터 연속 작업이 진행되며, 해당 구간은 다른 예약이 자동 차단됩니다.
                        </p>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">현재 접수 방식은 방문 예약이 필요하지 않습니다.</p>
            )}
          </section>

          <section className="space-y-4">
            <p className="text-sm font-semibold text-foreground">라켓별 세부 설정</p>
            {lineCount >= 2 && (
              <div className="rounded-lg border border-border bg-muted/15 p-3.5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-foreground">빠른 설정 (일괄 입력)</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      동일한 텐션/메모를 모든 라켓에 한 번에 적용합니다.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
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
                <div className="grid grid-cols-1 gap-2.5 bp-sm:grid-cols-2">
                  <Input
                    className="h-10 px-3"
                    value={bulkTensionMain}
                    onChange={(e) => setBulkTensionMain(toNumberText(e.target.value))}
                    placeholder="공통 메인 텐션"
                  />
                  <Input
                    className="h-10 px-3"
                    value={bulkTensionCross}
                    onChange={(e) => setBulkTensionCross(toNumberText(e.target.value))}
                    placeholder="공통 크로스 텐션"
                  />
                  <div className="bp-sm:col-span-2">
                    <Textarea
                      value={bulkLineNote}
                      onChange={(e) => setBulkLineNote(e.target.value)}
                      placeholder="공통 메모"
                      className="min-h-[84px] px-3 py-2.5"
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {linesForSubmit.map((line, index) => (
                <div key={line.id} className="space-y-3 rounded-lg border border-border p-3.5">
                  <p className="text-xs font-medium text-foreground">라켓 {index + 1} · {line.stringName}</p>
                  <div className="grid grid-cols-1 gap-2.5 bp-sm:grid-cols-3">
                    <Input
                      className="h-10 px-3"
                      value={line.racketType ?? ""}
                      onChange={(e) => handleLineFieldChange(index, "racketType", e.target.value)}
                      placeholder="라켓명"
                    />
                    <Input
                      className="h-10 px-3"
                      value={line.tensionMain ?? ""}
                      onChange={(e) =>
                        handleLineFieldChange(index, "tensionMain", toNumberText(e.target.value))
                      }
                      placeholder="메인 텐션"
                    />
                    <Input
                      className="h-10 px-3"
                      value={line.tensionCross ?? ""}
                      onChange={(e) =>
                        handleLineFieldChange(index, "tensionCross", toNumberText(e.target.value))
                      }
                      placeholder="크로스 텐션"
                    />
                  </div>
                  <Textarea
                    value={line.note ?? ""}
                    onChange={(e) => handleLineFieldChange(index, "note", e.target.value)}
                    placeholder="라켓별 메모 (선택)"
                    className="min-h-[84px] px-3 py-2.5"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="text-sm font-medium text-foreground">추가 요청</p>
            <Textarea
              id="checkout-stringing-requirements"
              value={formData.requirements ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, requirements: e.target.value }))
              }
              placeholder="예: 선호 텐션 느낌, 작업 시 확인할 요청사항"
              className="min-h-[98px] px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">작업 시 참고할 내용을 간단히 남겨주세요.</p>
          </section>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
