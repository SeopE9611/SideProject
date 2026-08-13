import { Top } from "@toss/tds-mobile";
import { formatPrice } from "../lib/product-labels";
import { racketBrandLabel, racketConditionLabel } from "../lib/racket-labels";
import type { RacketAvailability, RacketDetail } from "../types/racket";
import type { RentalDays } from "../types/racket-rental";

export default function RacketRentalStepOne({ racket, availability, days, errorMessage = "", onChange, onBack, onContinue }: { racket: RacketDetail; availability: RacketAvailability; days: RentalDays | null; errorMessage?: string; onChange: (days: RentalDays) => void; onBack: () => void; onContinue: () => void }) {
  const fees = [{ days: 7 as const, fee: racket.rental?.fee?.d7 }, { days: 15 as const, fee: racket.rental?.fee?.d15 }, { days: 30 as const, fee: racket.rental?.fee?.d30 }];
  return <main className="min-h-dvh bg-white px-6 pb-8 text-[#191f28]"><section className="pt-[calc(16px+env(safe-area-inset-top))]"><Top title={<Top.TitleParagraph size={22}>라켓 대여</Top.TitleParagraph>} subtitleBottom={<Top.SubtitleParagraph size={17}>1 / 7 · 대여 기간</Top.SubtitleParagraph>} /></section>
    {errorMessage && <p role="alert" className="rounded-2xl bg-[#fff4f2] p-4 text-sm text-[#d92d20]">{errorMessage}</p>}
    <div className="flex gap-4 rounded-[20px] bg-[#f7f8fa] p-4"><div className="h-24 w-24 shrink-0 rounded-xl bg-white">{racket.images?.[0] && <img className="h-full w-full object-contain" src={racket.images[0]} alt="" />}</div><div><b>{racketBrandLabel(racket.brand)} {racket.model}</b><p className="text-sm text-[#6b7684]">{racketConditionLabel(racket.condition)} · 대여 가능 {availability.available}개</p><p className="text-sm font-bold">보증금 {formatPrice(Number(racket.rental?.deposit ?? 0))}</p></div></div>
    <h1 className="mt-6 text-[22px]">대여 기간을 선택해주세요</h1><div className="grid gap-3">{fees.map((item) => { const valid = Number.isInteger(item.fee) && Number(item.fee) >= 0; return <button key={item.days} type="button" disabled={!valid} onClick={() => onChange(item.days)} className={`min-h-[64px] rounded-2xl border px-4 text-left font-bold ${days === item.days ? "border-[#688d00] bg-[#f4f9e8]" : "border-[#d1d6db] bg-white"} disabled:opacity-40`}>{item.days}일 <span className="float-right">{valid ? formatPrice(Number(item.fee)) : "요금 확인 필요"}</span></button>; })}</div>
    <p className="rounded-2xl bg-[#f2f4f6] p-4 text-sm text-[#6b7684]">보증금은 반납 상태 확인 후 운영 정책에 따라 환급됩니다.</p>
    <div className="grid grid-cols-[.72fr_1.28fr] gap-2"><button onClick={onBack} className="min-h-[52px] rounded-2xl border bg-white">상세로</button><button disabled={!days} onClick={onContinue} className="min-h-[52px] rounded-2xl border-0 bg-[#191f28] font-bold text-white disabled:bg-[#e5e8eb]">다음: 스트링 선택</button></div>
  </main>;
}
