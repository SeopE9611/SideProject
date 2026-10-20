import type { ClientSession, Db, ObjectId } from "mongodb";
import { computeSlotSpan, generateAllTimesForDay, loadStringingSettings, resolveDaySchedule, validateBookingWindow, findFullyBookedTimesWithSpan } from "./slotEngine";

const unavailable = (message: string) => Object.assign(new Error(message), { code: "VISIT_SLOT_UNAVAILABLE", status: 409 });

export async function guardVisitReservation(params: { db: Db; date: string; time: string; slotCount: number; session?: ClientSession; excludeApplicationId?: ObjectId }) {
  const { db, date, time, session, excludeApplicationId } = params;
  if (!session?.inTransaction()) throw Object.assign(new Error("방문 예약 확정에는 MongoDB transaction이 필요합니다."), { code: "VISIT_TRANSACTION_REQUIRED" });
  const settings = await loadStringingSettings(db, session);
  if (!validateBookingWindow(settings, date).ok) throw unavailable("방문 예약 가능 기간이 아닙니다.");
  const schedule = resolveDaySchedule(settings, date);
  const allTimes = generateAllTimesForDay(schedule);
  const span = computeSlotSpan(allTimes, time, params.slotCount);
  if (!schedule.isOpen || !span) throw unavailable("방문 예약 시간이 유효하지 않습니다.");
  const slots = [...span.slots].sort();
  const guards = db.collection<{ _id: string; date: string; time: string; touchedAt: Date; createdAt: Date }>("stringing_visit_slot_guards");
  for (const slot of slots) {
    const _id = `${date}:${slot}`;
    const previous = await guards.findOne({ _id }, { session });
    if (!previous) {
      try {
        const now = new Date();
        const inserted = await guards.insertOne({ _id, date, time: slot, touchedAt: now, createdAt: now }, { session });
        if (!inserted.acknowledged) throw unavailable("방문 슬롯 확보에 실패했습니다.");
      } catch (error) {
        // 중복 삽입으로 중단된 트랜잭션 안에서는 재조회하지 않는다.
        if (error instanceof Error && "code" in error && error.code === 11000) throw unavailable("방문 슬롯이 변경되었습니다. 다시 시도해주세요.");
        throw error;
      }
      continue;
    }
    if (!(previous.touchedAt instanceof Date) || !Number.isFinite(previous.touchedAt.getTime()) || previous.date !== date || previous.time !== slot) {
      throw unavailable("기존 방문 슬롯 정보를 확인해야 합니다.");
    }
    const touchedAt = new Date(Math.max(Date.now(), previous.touchedAt.getTime() + 1));
    if (!Number.isFinite(touchedAt.getTime())) throw unavailable("방문 슬롯 시각을 확인해야 합니다.");
    const saved = await guards.updateOne({ _id, touchedAt: previous.touchedAt }, { $set: { touchedAt } }, { session });
    if (!saved.acknowledged || saved.matchedCount !== 1 || saved.modifiedCount !== 1) throw unavailable("방문 슬롯이 변경되었습니다. 다시 시도해주세요.");
  }
  const full = await findFullyBookedTimesWithSpan(db, date, schedule.capacity, allTimes, session, excludeApplicationId);
  if (slots.some((slot) => full.includes(slot))) throw unavailable("선택한 방문 시간이 마감되었습니다.");
  return { slots, durationMinutes: slots.length * schedule.interval, capacity: schedule.capacity };
}
