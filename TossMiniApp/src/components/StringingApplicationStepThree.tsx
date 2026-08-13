import { Top } from "@toss/tds-mobile";
import { useEffect, useMemo, useState } from "react";

import { getStringingReservedSlots } from "../api/stringing";
import { isPastTodaySlot, validateWork } from "../lib/stringing-application-validation";
import type { StringingCollectionMethod, StringingSlotSummary, StringingWorkDraft } from "../types/stringing";

type SlotLoadState = "idle" | "loading" | "success" | "error";

type StringingApplicationStepThreeProps = {
  mode?: "stringing" | "racket-purchase";
  quantity?: number;
  errorMessage?: string;
  collectionMethod: StringingCollectionMethod;
  work: StringingWorkDraft;
  onWorkChange: (work: StringingWorkDraft) => void;
  showValidationErrors?: boolean;
  onBack: () => void;
  onContinue: () => void;
};

type TouchedFields = {
  racketType: boolean;
  tensionMain: boolean;
  tensionCross: boolean;
  note: boolean;
  preferredDate: boolean;
  preferredTime: boolean;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function toNumberText(raw: string) {
  return raw.replace(/[^0-9.]/g, "").slice(0, 4);
}

function getTodayLocalDate() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function StringingApplicationStepThree({
  mode = "stringing",
  quantity = 1,
  errorMessage = "",
  collectionMethod,
  work,
  onWorkChange,
  showValidationErrors = false,
  onBack,
  onContinue,
}: StringingApplicationStepThreeProps) {
  const [slotLoadState, setSlotLoadState] = useState<SlotLoadState>("idle");

  const [slotSummary, setSlotSummary] = useState<StringingSlotSummary | null>(null);

  const [slotError, setSlotError] = useState("");

  const [touched, setTouched] = useState<TouchedFields>({
    racketType: false,
    tensionMain: false,
    tensionCross: false,
    note: false,
    preferredDate: false,
    preferredTime: false,
  });

  const isVisit = collectionMethod === "visit";
  const isRacketPurchase = mode === "racket-purchase";

  useEffect(() => {
    if (!isVisit || !work.preferredDate) {
      setSlotLoadState("idle");
      setSlotSummary(null);
      setSlotError("");
      return;
    }

    const controller = new AbortController();

    setSlotLoadState("loading");
    setSlotSummary(null);
    setSlotError("");

    void getStringingReservedSlots(work.preferredDate, Math.max(1, quantity), controller.signal)
      .then((summary) => {
        if (controller.signal.aborted) {
          return;
        }

        setSlotSummary(summary);
        setSlotLoadState("success");
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("[교체서비스 방문 예약 시간 조회 실패]", error);

        setSlotSummary(null);

        setSlotError(error instanceof Error ? error.message : "예약 시간을 불러오지 못했습니다.");

        setSlotLoadState("error");
      });

    return () => {
      controller.abort();
    };
  }, [isVisit, quantity, work.preferredDate]);

  const errors = useMemo(
    () => validateWork(collectionMethod, work, {
      availableTimes: slotSummary?.availableTimes,
      requireAvailableTimes: isVisit,
    }),
    [collectionMethod, isVisit, slotSummary, work],
  );

  useEffect(() => {
    if (!showValidationErrors) return;
    const field = (["racketType", "tensionMain", "tensionCross", "note", "preferredDate", "preferredTime"] as const).find((key) => errors[key]);
    if (field) requestAnimationFrame(() => document.getElementById(`work-${field}`)?.focus());
  }, [errors, showValidationErrors]);

  const updateWork = (field: keyof StringingWorkDraft, value: string) => {
    onWorkChange({
      ...work,
      [field]: value,
    });
  };

  const handleDateChange = (value: string) => {
    onWorkChange({
      ...work,
      preferredDate: value,
      preferredTime: "",
    });

    setTouched((current) => ({
      ...current,
      preferredDate: true,
      preferredTime: false,
    }));
  };

  const handleConfirm = () => {
    setTouched({
      racketType: !isRacketPurchase,
      tensionMain: true,
      tensionCross: true,
      note: true,
      preferredDate: isVisit,
      preferredTime: isVisit,
    });

    if (Object.keys(errors).length > 0) {
      const firstInvalidField = (["racketType", "tensionMain", "tensionCross", "note", "preferredDate", "preferredTime"] as const).find((field) => errors[field]);
      if (firstInvalidField) {
        requestAnimationFrame(() => document.getElementById(`work-${firstInvalidField}`)?.focus());
      }
      return;
    }

    if (isVisit) {
      if (slotLoadState !== "success" || !slotSummary) {
        return;
      }

      if (!slotSummary.availableTimes.includes(work.preferredTime)) {
        return;
      }

      if (isPastTodaySlot(work.preferredDate, work.preferredTime)) {
        return;
      }
    }

    onContinue();
  };

  return (
    <main className="min-h-dvh w-full bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
      <section className="pt-[calc(16px+env(safe-area-inset-top))]">
        <Top
          title={<Top.TitleParagraph size={22}>{isRacketPurchase ? "라켓 구매" : "교체서비스 포함 주문"}</Top.TitleParagraph>}
          subtitleBottom={<Top.SubtitleParagraph size={17}>{isRacketPurchase ? "4 / 6 · 장력·작업·방문예약" : "3 / 5 · 라켓·텐션 정보"}</Top.SubtitleParagraph>}
        />
      </section>

      <section className="px-6 max-[359px]:px-5" aria-labelledby="work-info-title">
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">STEP 03</p>

          <h1 id="work-info-title" className="m-0 text-[22px] leading-[1.35] font-extrabold tracking-[-0.02em]">
            {isRacketPurchase ? "장력·작업 요청" : "라켓·텐션 정보"}
          </h1>

          <p className="mt-2 mb-0 break-keep text-sm leading-[1.6] text-[#6b7684]">
            {isRacketPurchase ? "메인·크로스 장력과 작업 요청을 입력해주세요." : "장착할 라켓명과 메인·크로스 텐션을 입력해주세요."}
          </p>
        </div>

        {errorMessage ? <p role="alert" className="rounded-2xl bg-[#fff4f2] p-4 text-sm font-semibold text-[#d92d20]">{errorMessage}</p> : null}

        {isVisit && (
          <div className="mb-4 rounded-[20px] border border-[#e5e8eb] p-[18px]">
            <div className="mb-4">
              <strong className="block text-base font-extrabold text-[#191f28]">방문 예약</strong>

              <p className="mt-1.5 mb-0 break-keep text-[13px] leading-[1.55] text-[#6b7684]">
                방문 희망 날짜를 선택하면 현재 예약 가능한 시간을 조회합니다.
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#333d4b]">희망 날짜 *</span>

              <input
                id="work-preferredDate"
                className={`min-h-12 w-full rounded-xl border bg-white px-3.5 text-base text-[#191f28] outline-none transition focus:ring-2 focus:ring-[#dcebba] ${
                  (touched.preferredDate || showValidationErrors) && errors.preferredDate
                    ? "border-[#d92d20]"
                    : "border-[#d1d6db] focus:border-[#688d00]"
                }`}
                type="date"
                min={getTodayLocalDate()}
                value={work.preferredDate}
                onChange={(event) => handleDateChange(event.target.value)}
                onBlur={() =>
                  setTouched((current) => ({
                    ...current,
                    preferredDate: true,
                  }))
                }
              />

              {(touched.preferredDate || showValidationErrors) && errors.preferredDate && (
                <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.preferredDate}</span>
              )}
            </label>

            <div id="work-preferredTime" className="mt-4" tabIndex={-1}>
              <span className="mb-2 block text-sm font-bold text-[#333d4b]">희망 시간 *</span>

              {!work.preferredDate && (
                <div className="rounded-xl bg-[#f7f8fa] px-4 py-3 text-[13px] leading-[1.55] text-[#6b7684]">
                  먼저 방문 희망 날짜를 선택해주세요.
                </div>
              )}

              {work.preferredDate && slotLoadState === "loading" && (
                <div className="rounded-xl bg-[#f7f8fa] px-4 py-4 text-center text-sm text-[#6b7684]" role="status">
                  예약 가능한 시간을 불러오고 있어요.
                </div>
              )}

              {work.preferredDate && slotLoadState === "error" && (
                <div className="rounded-xl bg-[#fff4f2] px-4 py-3" role="alert">
                  <strong className="block text-sm font-bold text-[#d92d20]">예약 시간을 불러오지 못했어요.</strong>

                  <p className="mt-1.5 mb-0 break-keep text-[13px] leading-[1.55] text-[#6b7684]">{slotError}</p>
                </div>
              )}

              {work.preferredDate &&
                slotLoadState === "success" &&
                slotSummary &&
                (slotSummary.closed || slotSummary.allTimes.length === 0) && (
                  <div className="rounded-xl bg-[#f7f8fa] px-4 py-3 text-[13px] leading-[1.55] text-[#6b7684]">
                    해당 날짜는 예약 가능한 시간이 없습니다(휴무/ 영업시간 없음). 다른 날짜를 선택해주세요.
                  </div>
                )}

              {work.preferredDate &&
                slotLoadState === "success" &&
                slotSummary &&
                !slotSummary.closed &&
                slotSummary.allTimes.length > 0 && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {slotSummary.allTimes.map((time) => {
                      const isPast = isPastTodaySlot(work.preferredDate, time);

                      const isReserved = slotSummary.reservedTimes.includes(time);

                      const isBlocked = slotSummary.blockedTimes.includes(time);

                      const disabled = isPast || isBlocked;

                      const isSelected = work.preferredTime === time;

                      const reason = isPast ? "종료" : isReserved ? "예약됨" : isBlocked ? "연속 불가" : "";

                      return (
                        <button
                          key={time}
                          className={`min-h-12 rounded-xl border px-2 py-2 text-[13px] font-bold outline-none transition focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#688d00] ${
                            disabled
                              ? "cursor-not-allowed border-[#e5e8eb] bg-[#f2f4f6] text-[#8b95a1]"
                              : isSelected
                                ? "border-[#688d00] bg-[#f4f9e8] text-[#344700] ring-1 ring-[#dcebba]"
                                : "border-[#d1d6db] bg-white text-[#333d4b]"
                          }`}
                          type="button"
                          disabled={disabled}
                          aria-pressed={isSelected}
                          onClick={() => {
                            updateWork("preferredTime", isSelected ? "" : time);

                            setTouched((current) => ({
                              ...current,
                              preferredTime: true,
                            }));
                          }}
                        >
                          <span className="block">{time}</span>

                          {reason && <span className="mt-0.5 block text-[10px] font-semibold">{reason}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

              {(touched.preferredTime || showValidationErrors) && errors.preferredTime && (
                <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.preferredTime}</span>
              )}
            </div>
          </div>
        )}

        <div className="rounded-[20px] border border-[#e5e8eb] p-[18px]">
          <div className="mb-4">
            <strong className="block text-base font-extrabold text-[#191f28]">라켓 작업 정보</strong>

            <p className="mt-1.5 mb-0 break-keep text-[13px] leading-[1.55] text-[#6b7684]">
              {isRacketPurchase && quantity > 1
                ? "선택한 모든 라켓에 동일한 스트링과 장력 설정이 적용됩니다."
                : "현재 주문은 라켓 1자루 기준으로 작업 정보를 입력합니다."}
            </p>
          </div>

          {!isRacketPurchase && <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#333d4b]">라켓명 *</span>

            <input
              id="work-racketType"
              className={`min-h-12 w-full rounded-xl border bg-white px-3.5 text-base text-[#191f28] outline-none transition placeholder:text-[#b0b8c1] focus:ring-2 focus:ring-[#dcebba] ${
                (touched.racketType || showValidationErrors) && errors.racketType ? "border-[#d92d20]" : "border-[#d1d6db] focus:border-[#688d00]"
              }`}
              type="text"
              maxLength={100}
              value={work.racketType}
              placeholder="라켓명 또는 구분할 이름"
              onChange={(event) => updateWork("racketType", event.target.value)}
              onBlur={() =>
                setTouched((current) => ({
                  ...current,
                  racketType: true,
                }))
              }
            />

            {(touched.racketType || showValidationErrors) && errors.racketType && (
              <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.racketType}</span>
            )}
          </label>}

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-bold text-[#333d4b]">메인 텐션(LB) *</span>

              <input
                id="work-tensionMain"
                className={`min-h-12 w-full rounded-xl border bg-white px-3.5 text-base text-[#191f28] outline-none transition placeholder:text-[#b0b8c1] focus:ring-2 focus:ring-[#dcebba] ${
                  (touched.tensionMain || showValidationErrors) && errors.tensionMain
                    ? "border-[#d92d20]"
                    : "border-[#d1d6db] focus:border-[#688d00]"
                }`}
                type="text"
                inputMode="decimal"
                maxLength={4}
                value={work.tensionMain}
                placeholder="53"
                onChange={(event) => updateWork("tensionMain", toNumberText(event.target.value))}
                onBlur={() =>
                  setTouched((current) => ({
                    ...current,
                    tensionMain: true,
                  }))
                }
              />

              {(touched.tensionMain || showValidationErrors) && errors.tensionMain && (
                <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.tensionMain}</span>
              )}
            </label>

            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-bold text-[#333d4b]">크로스 텐션(LB) *</span>

              <input
                id="work-tensionCross"
                className={`min-h-12 w-full rounded-xl border bg-white px-3.5 text-base text-[#191f28] outline-none transition placeholder:text-[#b0b8c1] focus:ring-2 focus:ring-[#dcebba] ${
                  (touched.tensionCross || showValidationErrors) && errors.tensionCross
                    ? "border-[#d92d20]"
                    : "border-[#d1d6db] focus:border-[#688d00]"
                }`}
                type="text"
                inputMode="decimal"
                maxLength={4}
                value={work.tensionCross}
                placeholder="51"
                onChange={(event) => updateWork("tensionCross", toNumberText(event.target.value))}
                onBlur={() =>
                  setTouched((current) => ({
                    ...current,
                    tensionCross: true,
                  }))
                }
              />

              {(touched.tensionCross || showValidationErrors) && errors.tensionCross && (
                <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.tensionCross}</span>
              )}
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold text-[#333d4b]">작업 요청사항</span>

            <textarea
              id="work-note"
              className="min-h-24 w-full resize-none rounded-xl border border-[#d1d6db] bg-white px-3.5 py-3 text-base text-[#191f28] outline-none transition placeholder:text-[#b0b8c1] focus:border-[#688d00] focus:ring-2 focus:ring-[#dcebba]"
              value={work.note}
              maxLength={500}
              placeholder="작업 시 참고할 요청사항을 입력해주세요"
              onChange={(event) => updateWork("note", event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, note: true }))}
            />
            {(touched.note || showValidationErrors) && errors.note && (
              <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.note}</span>
            )}
          </label>
        </div>
      </section>

      <section className="mt-6 px-6 max-[359px]:px-5">
        <div className="grid grid-cols-[0.72fr_1.28fr] gap-2.5">
          <button
            className="min-h-[52px] rounded-2xl border border-[#d1d6db] bg-white px-4 text-base font-bold text-[#4e5968] outline-none transition active:scale-[0.99] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#688d00]"
            type="button"
            onClick={onBack}
          >
            이전
          </button>

          <button
            className="min-h-[52px] rounded-2xl bg-[#191f28] px-4 text-base font-extrabold text-white outline-none transition active:scale-[0.99] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#688d00]"
            type="button"
            onClick={handleConfirm}
          >
            {isRacketPurchase ? "다음: 최종 구성 확인" : "다음: 주문 내용 확인"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default StringingApplicationStepThree;
