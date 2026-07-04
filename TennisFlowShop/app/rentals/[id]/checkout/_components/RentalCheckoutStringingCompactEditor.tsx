"use client";

import type useRentalCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useRentalCheckoutStringingServiceAdapter";
import TimeSlotSelector from "@/app/services/_components/TimeSlotSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock3, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

const toNumberText = (raw: string) => raw.replace(/[^0-9.]/g, "").slice(0, 4);

type RentalCheckoutStringingServiceAdapter = ReturnType<
  typeof useRentalCheckoutStringingServiceAdapter
>;

type Props = {
  adapter: RentalCheckoutStringingServiceAdapter;
};

export default function RentalCheckoutStringingCompactEditor({ adapter }: Props) {
  const {
    formData,
    setFormData,
    lineCount,
    linesForSubmit,
    handleLineFieldChange,
    timeSlots,
    disabledTimes,
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
          Array.isArray(prev?.lines) && prev.lines.length > 0 ? prev.lines : (linesForSubmit ?? []);
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
    [bulkLineNote, bulkTensionCross, bulkTensionMain, linesForSubmit, setFormData],
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
    <div className="space-y-4">
      <section className="space-y-3 border-b border-border/60 pb-4">
        <p className="text-ui-body-sm font-medium text-foreground">기본 설정</p>
        {isVisit ? (
          <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rental-preferred-date" className="text-ui-label text-muted-foreground">
                희망 날짜
              </Label>
              <Input
                id="rental-preferred-date"
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
            <div className="space-y-2">
              <div className="space-y-1">
                <Label
                  htmlFor="rental-preferred-time"
                  className="text-ui-label font-medium text-foreground"
                >
                  희망 시간
                </Label>
                <p className="break-keep text-ui-label text-muted-foreground">
                  가능한 시간대 중 한 슬롯을 선택해주세요.
                </p>
              </div>
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
                isLoading={slotsLoading && !hasCacheForDate}
                errorMessage={slotsError}
              />
              {formData.preferredDate &&
                formData.preferredTime &&
                visitSlotCountUi > 0 &&
                visitDurationMinutesUi && (
                  <div className="mt-3 border-l-2 border-primary/40 bg-primary/5 px-3 py-2 text-ui-label text-foreground">
                    <p className="font-medium text-foreground">
                      <Clock3 className="mr-1 inline h-3.5 w-3.5 text-primary" />
                      이번 방문 예상 소요 시간:{" "}
                      {visitTimeRange
                        ? `${visitTimeRange.start} ~ ${visitTimeRange.end}`
                        : `약 ${visitDurationMinutesUi}분`}{" "}
                      ({visitSlotCountUi}슬롯)
                    </p>
                    <p className="mt-1 text-ui-label text-muted-foreground">
                      선택한 시간부터 연속 작업이 진행됩니다.
                    </p>
                  </div>
                )}
            </div>
          </div>
        ) : (
          <p className="break-keep text-ui-label text-muted-foreground">
            현재 접수 방식은 방문 예약이 필요하지 않습니다.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-ui-body-sm font-medium text-foreground">텐션 및 요청사항</p>
        {lineCount >= 2 && (
          <div className="border-y border-border/60 bg-muted/20 py-3">
            <div className="mb-3 flex flex-col gap-2 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-1.5 text-ui-label font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary/80" />
                  빠른 설정
                </p>
                <p className="mt-0.5 break-keep text-ui-label text-muted-foreground">
                  여러{"\u00A0"}자루에 동일한 텐션/메모를 한{"\u00A0"}번에 적용합니다.
                </p>
              </div>
              <div className="flex flex-nowrap gap-2 overflow-x-auto whitespace-nowrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 border-border px-2 text-ui-label"
                  onClick={applyFirstLineTensionToAll}
                >
                  1번 텐션 → 전체
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-ui-label"
                  onClick={() => applyBulkToAllLines()}
                >
                  입력값 → 전체
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2.5 bp-sm:grid-cols-2">
              <Input
                className="h-9 px-3 text-ui-body-sm"
                value={bulkTensionMain}
                onChange={(e) => setBulkTensionMain(toNumberText(e.target.value))}
                placeholder="공통 메인 텐션"
              />
              <Input
                className="h-9 px-3 text-ui-body-sm"
                value={bulkTensionCross}
                onChange={(e) => setBulkTensionCross(toNumberText(e.target.value))}
                placeholder="공통 크로스 텐션"
              />
              <div className="bp-sm:col-span-2">
                <Textarea
                  value={bulkLineNote}
                  onChange={(e) => setBulkLineNote(e.target.value)}
                  placeholder="공통 메모"
                  className="min-h-[68px] px-3 py-2.5 text-ui-body-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {linesForSubmit.map((line, index) => (
            <div
              key={line.id}
              className={lineCount === 1 ? "space-y-3.5" : "space-y-3.5 border-b border-border/60 pb-4 last:border-b-0 last:pb-0"}
            >
              <div className="space-y-1">
                <p className="text-ui-label font-medium text-foreground">장착 대상 라켓</p>
                <p className="text-ui-body-sm font-medium text-foreground">{line.racketType}</p>
                <p className="break-keep text-ui-label text-muted-foreground">
                  대여 상품 기준으로 자동 반영 · 구매 스트링: {line.stringName}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 bp-sm:grid-cols-2">
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
                placeholder="장착 요청사항 (선택)"
                className="min-h-[84px] px-3 py-2.5"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2.5 border-t border-border/60 pt-4">
        <p className="text-ui-body-sm font-medium text-foreground">추가 요청</p>
        <Textarea
          id="rental-stringing-requirements"
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
        <p className="text-ui-label text-muted-foreground">필요한 경우에만 간단히 남겨주세요.</p>
      </section>
    </div>
  );
}
