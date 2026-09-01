import { inquiryKinds, inquiryStatuses, type InquiryKind, type InquiryStatus } from "./inquiry.types";
type Errors = Record<string, string>;
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const forbidden = /<[^>]*>|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const lineForbidden = /[\r\n\t]/;
export function validatePublicInquiryInput(raw: unknown) {
  const keys = ["kind", "name", "phone", "email", "message", "privacyConsent", "website"];
  const e: Errors = {};
  if (!object(raw) || Object.keys(raw).some((k) => !keys.includes(k)))
    return { ok: false as const, fieldErrors: { form: "허용되지 않은 입력입니다." } };
  const kind = typeof raw.kind === "string" ? raw.kind.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const message = typeof raw.message === "string" ? raw.message.trim() : "";
  const website = typeof raw.website === "string" ? raw.website.trim() : "";
  if (!inquiryKinds.includes(kind as InquiryKind)) e.kind = "문의 종류를 선택해 주세요.";
  if (name.length < 1 || name.length > 80 || forbidden.test(name) || lineForbidden.test(name))
    e.name = "이름은 한 줄로 1~80자 입력해 주세요.";
  if (
    phone &&
    (phone.length < 8 || phone.length > 30 || !/^\+?[0-9 ()-]+$/.test(phone) || (phone.match(/\d/g)?.length ?? 0) < 8)
  )
    e.phone = "전화번호 형식을 확인해 주세요.";
  if (email && (email.length > 254 || lineForbidden.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    e.email = "이메일 형식을 확인해 주세요.";
  if (!phone && !email) e.contact = "전화번호 또는 이메일 중 하나 이상 입력해 주세요.";
  if (message.length < 10 || message.length > 2000 || forbidden.test(message) || /[\r\t]/.test(message))
    e.message = "문의 내용은 10~2000자로 입력해 주세요.";
  if (raw.privacyConsent !== true) e.privacyConsent = "개인정보 수집·이용 동의가 필요합니다.";
  return Object.keys(e).length
    ? { ok: false as const, fieldErrors: e }
    : {
        ok: true as const,
        value: { kind: kind as InquiryKind, name, phone, email, message, privacyConsent: true as const, website },
      };
}
export function validateAdminInquiryUpdate(raw: unknown) {
  const e: Errors = {};
  const keys = ["expectedUpdatedAt", "updateConfirmed", "status", "internalNote"];
  if (!object(raw) || Object.keys(raw).some((k) => !keys.includes(k)))
    return { ok: false as const, fieldErrors: { form: "허용되지 않은 입력입니다." } };
  const status = typeof raw.status === "string" ? raw.status : "";
  const note = typeof raw.internalNote === "string" ? raw.internalNote.trim() : "";
  let expected: Date | undefined;
  if (!inquiryStatuses.includes(status as InquiryStatus)) e.status = "처리 상태를 선택해 주세요.";
  if (note.length > 2000 || forbidden.test(note) || /[\r\t]/.test(note))
    e.internalNote = "내부 메모는 2000자 이내의 평문으로 입력해 주세요.";
  if (typeof raw.expectedUpdatedAt !== "string") e.expectedUpdatedAt = "수정 시각이 유효하지 않습니다.";
  else {
    const candidate = new Date(raw.expectedUpdatedAt);
    if (Number.isNaN(candidate.getTime()) || candidate.toISOString() !== raw.expectedUpdatedAt)
      e.expectedUpdatedAt = "수정 시각이 유효하지 않습니다.";
    else expected = candidate;
  }
  if (raw.updateConfirmed !== true) e.updateConfirmed = "처리 내용을 확인해 주세요.";
  return Object.keys(e).length || !expected
    ? { ok: false as const, fieldErrors: e }
    : {
        ok: true as const,
        value: {
          expectedUpdatedAt: expected,
          updateConfirmed: true as const,
          status: status as InquiryStatus,
          internalNote: note,
        },
      };
}
