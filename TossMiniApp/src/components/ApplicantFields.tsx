import { useEffect, useMemo, useState } from "react";

import { validateApplicant } from "../lib/stringing-application-validation";
import type { StringingApplicantDraft } from "../types/stringing";

type Props = {
  applicant: StringingApplicantDraft;
  onChange: (applicant: StringingApplicantDraft) => void;
  showValidationErrors?: boolean;
  validationRequest?: number;
  onValidityChange?: (valid: boolean) => void;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function format010Phone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
}

export default function ApplicantFields({
  applicant,
  onChange,
  showValidationErrors = false,
  validationRequest = 0,
  onValidityChange,
}: Props) {
  const [touched, setTouched] = useState<Record<keyof StringingApplicantDraft, boolean>>({
    name: false,
    email: false,
    phone: false,
  });
  const errors = useMemo(() => validateApplicant(applicant), [applicant]);
  const valid = Object.keys(errors).length === 0;

  useEffect(() => {
    onValidityChange?.(valid);
  }, [onValidityChange, valid]);

  useEffect(() => {
    if (!showValidationErrors && validationRequest === 0) return;
    if (validationRequest > 0) setTouched({ name: true, email: true, phone: true });
    const field = (["name", "email", "phone"] as const).find((key) => errors[key]);
    if (field) requestAnimationFrame(() => document.getElementById(`applicant-${field}`)?.focus());
  }, [errors, showValidationErrors, validationRequest]);

  const update = (field: keyof StringingApplicantDraft, value: string) => {
    onChange({ ...applicant, [field]: value });
  };

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-[#e5e8eb] p-[18px]">
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-[#333d4b]">신청인 이름 *</span>
        <input
          id="applicant-name"
          className={`min-h-12 w-full rounded-xl border bg-white px-3.5 text-base text-[#191f28] outline-none transition placeholder:text-[#b0b8c1] focus:ring-2 focus:ring-[#dcebba] ${
            (touched.name || showValidationErrors) && errors.name ? "border-[#d92d20]" : "border-[#d1d6db] focus:border-[#688d00]"
          }`}
          type="text"
          maxLength={100}
          value={applicant.name}
          autoComplete="name"
          placeholder="이름을 입력해주세요"
          onChange={(event) => update("name", event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, name: true }))}
        />
        {(touched.name || showValidationErrors) && errors.name ? <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.name}</span> : null}
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-[#333d4b]">이메일 *</span>
        <input
          id="applicant-email"
          className={`min-h-12 w-full rounded-xl border bg-white px-3.5 text-base text-[#191f28] outline-none transition placeholder:text-[#b0b8c1] focus:ring-2 focus:ring-[#dcebba] ${
            (touched.email || showValidationErrors) && errors.email ? "border-[#d92d20]" : "border-[#d1d6db] focus:border-[#688d00]"
          }`}
          type="email"
          maxLength={254}
          value={applicant.email}
          autoComplete="email"
          placeholder="이메일을 입력해주세요"
          onChange={(event) => update("email", event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
        />
        {(touched.email || showValidationErrors) && errors.email ? <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.email}</span> : null}
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-[#333d4b]">연락처 *</span>
        <input
          id="applicant-phone"
          className={`min-h-12 w-full rounded-xl border bg-white px-3.5 text-base text-[#191f28] outline-none transition placeholder:text-[#b0b8c1] focus:ring-2 focus:ring-[#dcebba] ${
            (touched.phone || showValidationErrors) && errors.phone ? "border-[#d92d20]" : "border-[#d1d6db] focus:border-[#688d00]"
          }`}
          type="tel"
          maxLength={20}
          inputMode="numeric"
          value={applicant.phone}
          autoComplete="tel"
          placeholder="01012345678"
          onChange={(event) => update("phone", format010Phone(event.target.value))}
          onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
        />
        {(touched.phone || showValidationErrors) && errors.phone ? <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.phone}</span> : null}
      </label>
    </div>
  );
}
