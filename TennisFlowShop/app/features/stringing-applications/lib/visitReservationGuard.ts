import type { ClientSession, Db, ObjectId } from "mongodb";
import { computeSlotSpan, generateAllTimesForDay, loadStringingSettings, resolveDaySchedule, validateBookingWindow, findFullyBookedTimesWithSpan } from "./slotEngine";

export async function guardVisitReservation(params: { db: Db; date: string; time: string; slotCount: number; session?: ClientSession; excludeApplicationId?: ObjectId }) {
  const { db, date, time, session, excludeApplicationId } = params;
  if (!session) throw Object.assign(new Error("방문 예약 확정에는 MongoDB transaction이 필요합니다."), { code: "VISIT_TRANSACTION_REQUIRED" });
  const settings = await loadStringingSettings(db, session);
  if (!validateBookingWindow(settings, date).ok) throw Object.assign(new Error("방문 예약 가능 기간이 아닙니다."), { code: "VISIT_SLOT_UNAVAILABLE" });
  const schedule = resolveDaySchedule(settings, date);
  const allTimes = generateAllTimesForDay(schedule);
  const span = computeSlotSpan(allTimes, time, params.slotCount);
  if (!schedule.isOpen || !span) throw Object.assign(new Error("방문 예약 시간이 유효하지 않습니다."), { code: "VISIT_SLOT_UNAVAILABLE" });
  const slots = [...span.slots].sort();
  for (const slot of slots) {
    await db.collection<{ _id: string; date: string; time: string; touchedAt: Date; createdAt: Date }>("stringing_visit_slot_guards").updateOne(
      { _id: `${date}:${slot}` },
      { $set: { date, time: slot, touchedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, session },
    );
  }
  const full = await findFullyBookedTimesWithSpan(db, date, schedule.capacity, allTimes, session, excludeApplicationId);
  if (slots.some((slot) => full.includes(slot))) throw Object.assign(new Error("선택한 방문 시간이 마감되었습니다."), { code: "VISIT_SLOT_UNAVAILABLE" });
  return { slots, durationMinutes: slots.length * schedule.interval, capacity: schedule.capacity };
}
