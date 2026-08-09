import type {
  StringingApplicantDraft,
  StringingApplicationDraft,
  StringingCollectionMethod,
  StringingShippingDraft,
  StringingWorkDraft,
} from "../types/stringing";

export type ApplicantValidationErrors = Partial<Record<keyof StringingApplicantDraft, string>>;
export type ShippingValidationErrors = Partial<Record<keyof StringingShippingDraft, string>>;
export type WorkValidationErrors = Partial<Record<keyof StringingWorkDraft, string>>;
export type StringingApplicationInvalidStep = 1 | 2 | 3;

const EMAIL_RE = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+\-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const POSTAL_RE = /^\d{5}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isSemanticCalendarDate(value: string) {
  const match = DATE_RE.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;

  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isPastTodaySlot(date: string, time: string, now = new Date()) {
  if (!TIME_RE.test(time)) return false;

  return new Date(`${date}T${time}:00+09:00`).getTime() <= now.getTime();
}

export function validateApplicant(applicant: StringingApplicantDraft): ApplicantValidationErrors {
  const errors: ApplicantValidationErrors = {};
  const name = applicant.name.trim();
  const email = applicant.email.trim();

  if (!name) errors.name = "이름을 입력해주세요.";
  else if (name.length < 2) errors.name = "이름은 2자 이상 입력해주세요.";
  else if (name.length > 100) errors.name = "이름은 100자 이하로 입력해주세요.";

  if (!email) errors.email = "이메일을 입력해주세요.";
  else if (!EMAIL_RE.test(email)) errors.email = "이메일 형식을 확인해주세요.";
  else if (email.length > 254) errors.email = "이메일은 254자 이하로 입력해주세요.";

  if (!applicant.phone.trim()) errors.phone = "연락처를 입력해주세요.";
  else if (applicant.phone.trim().length > 20 || !/^010\d{8}$/.test(onlyDigits(applicant.phone))) {
    errors.phone = "올바른 연락처 형식으로 입력해주세요. (01012345678)";
  }

  return errors;
}

export function validateShipping(
  collectionMethod: StringingCollectionMethod,
  shipping: StringingShippingDraft,
): ShippingValidationErrors {
  const errors: ShippingValidationErrors = {};
  if (collectionMethod !== "self_ship") return errors;

  const postalCode = shipping.postalCode.trim();
  const address = shipping.address.trim();
  const addressDetail = shipping.addressDetail.trim();

  if (!postalCode) errors.postalCode = "우편번호를 입력해주세요.";
  else if (postalCode.length > 5 || !POSTAL_RE.test(postalCode)) errors.postalCode = "우편번호 형식을 확인해주세요. (5자리)";
  if (!address) errors.address = "주소를 입력해주세요.";
  else if (address.length > 200) errors.address = "주소는 200자 이하로 입력해주세요.";
  if (!addressDetail) errors.addressDetail = "상세 주소는 필수입니다.";
  else if (addressDetail.length > 200) errors.addressDetail = "상세 주소는 200자 이하로 입력해주세요.";

  return errors;
}

type WorkValidationOptions = {
  availableTimes?: readonly string[];
  requireAvailableTimes?: boolean;
  now?: Date;
};

export function validateWork(
  collectionMethod: StringingCollectionMethod,
  work: StringingWorkDraft,
  options: WorkValidationOptions = {},
): WorkValidationErrors {
  const errors: WorkValidationErrors = {};
  const racketType = work.racketType.trim();
  const tensionMain = work.tensionMain.trim();
  const tensionCross = work.tensionCross.trim();
  const note = work.note.trim();

  if (!racketType) errors.racketType = "라켓명을 입력해주세요.";
  else if (racketType.length > 100) errors.racketType = "라켓명은 100자 이하로 입력해주세요.";
  if (!tensionMain) errors.tensionMain = "메인 텐션을 입력해주세요.";
  else if (tensionMain.length > 4) errors.tensionMain = "메인 텐션은 4자 이하로 입력해주세요.";
  if (!tensionCross) errors.tensionCross = "크로스 텐션을 입력해주세요.";
  else if (tensionCross.length > 4) errors.tensionCross = "크로스 텐션은 4자 이하로 입력해주세요.";
  if (note.length > 500) errors.note = "작업 요청사항은 500자 이하로 입력해주세요.";

  if (collectionMethod === "visit") {
    const date = work.preferredDate.trim();
    const time = work.preferredTime.trim();
    if (!date) errors.preferredDate = "방문 희망 날짜를 선택해주세요.";
    else if (!isSemanticCalendarDate(date)) errors.preferredDate = "방문 희망 날짜를 다시 선택해주세요.";

    if (!time) errors.preferredTime = "방문 희망 시간을 선택해주세요.";
    else if (!TIME_RE.test(time)) errors.preferredTime = "방문 희망 시간을 다시 선택해주세요.";
    else if (options.requireAvailableTimes && !options.availableTimes?.includes(time)) {
      errors.preferredTime = "선택한 시간은 현재 예약할 수 없습니다.";
    } else if (isPastTodaySlot(date, time, options.now)) {
      errors.preferredTime = "선택한 시간은 현재 예약할 수 없습니다.";
    }
  }

  return errors;
}

export function getFirstInvalidApplicationStep(
  draft: StringingApplicationDraft,
  selection?: { selectedColor: string; selectedGauge: string },
): StringingApplicationInvalidStep | null {
  if (
    (selection && (!selection.selectedColor.trim() || selection.selectedColor.trim().length > 100 || !selection.selectedGauge.trim() || selection.selectedGauge.trim().length > 100)) ||
    Object.keys(validateApplicant(draft.applicant)).length > 0
  ) return 1;
  if (Object.keys(validateShipping(draft.collectionMethod, draft.shipping)).length > 0) return 2;
  if (Object.keys(validateWork(draft.collectionMethod, draft.work)).length > 0) return 3;
  return null;
}
