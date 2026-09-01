import type {
  ContactInformationContent,
  FacilityOverviewContent,
  GreetingContent,
  SiteContentKey,
} from "./site-content.types";

export type SiteContentValidationResult<T> =
  { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string>; formError?: string };

const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const ownKeys = (value: object) => Object.keys(value).sort();
const exactObject = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  JSON.stringify(ownKeys(value)) === JSON.stringify([...keys].sort());

function text(
  value: unknown,
  path: string,
  errors: Record<string, string>,
  min: number,
  max: number,
  allowEmpty = false,
): string {
  if (typeof value !== "string") {
    errors[path] = "문자열로 입력해 주세요.";
    return "";
  }
  const trimmed = value.trim();
  if ((!allowEmpty && trimmed.length < min) || trimmed.length > max || controlCharacters.test(trimmed)) {
    errors[path] = allowEmpty
      ? `${max}자 이하의 제어문자 없는 텍스트를 입력해 주세요.`
      : `${min}~${max}자의 제어문자 없는 텍스트를 입력해 주세요.`;
  }
  return trimmed;
}

function objectArray<T>(
  value: unknown,
  path: string,
  count: number,
  keys: readonly string[],
  parse: (item: Record<string, unknown>, path: string) => T,
  errors: Record<string, string>,
): T[] {
  if (!Array.isArray(value) || value.length !== count) {
    errors[path] = `${count}개 항목이 필요합니다.`;
    return [];
  }
  return value.map((item, index) => {
    if (!exactObject(item, keys)) {
      errors[`${path}.${index}`] = "허용되지 않은 항목 구조입니다.";
      return parse({}, `${path}.${index}`);
    }
    return parse(item, `${path}.${index}`);
  });
}

export function validateFacilityOverviewInput(value: unknown): SiteContentValidationResult<FacilityOverviewContent> {
  const errors: Record<string, string> = {};
  const keys = [
    "pageDescription",
    "facts",
    "principlesEyebrow",
    "principlesTitle",
    "principlesDescription",
    "principles",
    "scenesEyebrow",
    "scenesTitle",
    "scenesDescription",
    "scenes",
    "policyEyebrow",
    "policyTitle",
    "policyItems",
  ];
  if (!exactObject(value, keys))
    return {
      ok: false,
      fieldErrors: { content: "허용되지 않은 콘텐츠 구조입니다." },
    };
  const fact = (item: Record<string, unknown>, path: string) => ({
    label: text(item.label, `${path}.label`, errors, 1, 40),
    value: text(item.value, `${path}.value`, errors, 1, 200),
  });
  const principle = (item: Record<string, unknown>, path: string) => ({
    title: text(item.title, `${path}.title`, errors, 1, 100),
    description: text(item.description, `${path}.description`, errors, 1, 400),
  });
  const scene = (item: Record<string, unknown>, path: string) => ({
    label: text(item.label, `${path}.label`, errors, 1, 40),
    title: text(item.title, `${path}.title`, errors, 1, 100),
    description: text(item.description, `${path}.description`, errors, 1, 400),
  });
  const content: FacilityOverviewContent = {
    pageDescription: text(value.pageDescription, "pageDescription", errors, 10, 400),
    facts: objectArray(
      value.facts,
      "facts",
      3,
      ["label", "value"],
      fact,
      errors,
    ) as unknown as FacilityOverviewContent["facts"],
    principlesEyebrow: text(value.principlesEyebrow, "principlesEyebrow", errors, 1, 40),
    principlesTitle: text(value.principlesTitle, "principlesTitle", errors, 1, 140),
    principlesDescription: text(value.principlesDescription, "principlesDescription", errors, 1, 500),
    principles: objectArray(
      value.principles,
      "principles",
      3,
      ["title", "description"],
      principle,
      errors,
    ) as unknown as FacilityOverviewContent["principles"],
    scenesEyebrow: text(value.scenesEyebrow, "scenesEyebrow", errors, 1, 40),
    scenesTitle: text(value.scenesTitle, "scenesTitle", errors, 1, 140),
    scenesDescription: text(value.scenesDescription, "scenesDescription", errors, 1, 500),
    scenes: objectArray(
      value.scenes,
      "scenes",
      3,
      ["label", "title", "description"],
      scene,
      errors,
    ) as unknown as FacilityOverviewContent["scenes"],
    policyEyebrow: text(value.policyEyebrow, "policyEyebrow", errors, 1, 40),
    policyTitle: text(value.policyTitle, "policyTitle", errors, 1, 140),
    policyItems: objectArray(
      value.policyItems,
      "policyItems",
      2,
      ["title", "description"],
      principle,
      errors,
    ) as unknown as FacilityOverviewContent["policyItems"],
  };
  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, value: content };
}

export function validateGreetingInput(value: unknown): SiteContentValidationResult<GreetingContent> {
  const errors: Record<string, string> = {};
  const keys = [
    "pageDescription",
    "notice",
    "statusLabel",
    "title",
    "paragraphs",
    "signerRole",
    "signerName",
    "showSignerName",
  ];
  if (!exactObject(value, keys))
    return {
      ok: false,
      fieldErrors: { content: "허용되지 않은 콘텐츠 구조입니다." },
    };
  const paragraphs =
    Array.isArray(value.paragraphs) && value.paragraphs.length >= 1 && value.paragraphs.length <= 8
      ? value.paragraphs.map((item, index) => text(item, `paragraphs.${index}`, errors, 1, 1200))
      : ((errors.paragraphs = "본문 문단은 1~8개여야 합니다."), []);
  if (typeof value.showSignerName !== "boolean") errors.showSignerName = "이름 공개 여부를 선택해 주세요.";
  const signerName = text(value.signerName, "signerName", errors, 0, 80, true);
  if (value.showSignerName === true && signerName.length === 0)
    errors.signerName = "이름을 공개하려면 서명 이름을 입력해 주세요.";
  const content: GreetingContent = {
    pageDescription: text(value.pageDescription, "pageDescription", errors, 10, 400),
    notice: text(value.notice, "notice", errors, 1, 400),
    statusLabel: text(value.statusLabel, "statusLabel", errors, 1, 60),
    title: text(value.title, "title", errors, 1, 160),
    paragraphs,
    signerRole: text(value.signerRole, "signerRole", errors, 0, 80, true),
    signerName,
    showSignerName: value.showSignerName === true,
  };
  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, value: content };
}

export function validateContactInformationInput(
  value: unknown,
): SiteContentValidationResult<ContactInformationContent> {
  const errors: Record<string, string> = {};
  const keys = [
    "directionsPageDescription",
    "address",
    "phone",
    "visitInquiryTitle",
    "visitInquiryDescription",
    "contactPageDescription",
    "contactIntroduction",
    "instagramUrl",
    "showInstagram",
  ];
  if (!exactObject(value, keys)) return { ok: false, fieldErrors: { content: "허용되지 않은 콘텐츠 구조입니다." } };

  const safeText = (input: unknown, path: string, min: number, max: number, allowEmpty = false) => {
    const result = text(input, path, errors, min, max, allowEmpty);
    if (/[<>]/.test(result) || /[\u0000-\u001F\u007F]/.test(result))
      errors[path] = "HTML과 제어문자 없이 입력해 주세요.";
    return result;
  };
  const address = safeText(value.address, "address", 5, 200);
  const phone = safeText(value.phone, "phone", 8, 30);
  if (!/^\+?[0-9 ()-]+$/.test(phone) || (phone.match(/\d/g)?.length ?? 0) < 8)
    errors.phone = "숫자, 공백, 하이픈, 괄호와 맨 앞의 +만 사용해 숫자 8개 이상을 입력해 주세요.";
  if (typeof value.showInstagram !== "boolean") errors.showInstagram = "인스타그램 공개 여부를 선택해 주세요.";
  const instagramUrl = safeText(value.instagramUrl, "instagramUrl", 0, 500, true);
  if (value.showInstagram === true && !instagramUrl) errors.instagramUrl = "공개할 인스타그램 URL을 입력해 주세요.";
  if (instagramUrl) {
    try {
      const url = new URL(instagramUrl);
      if (
        url.protocol !== "https:" ||
        !["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase()) ||
        url.username ||
        url.password
      )
        errors.instagramUrl = "Instagram 공식 HTTPS URL을 입력해 주세요.";
    } catch {
      errors.instagramUrl = "유효한 Instagram URL을 입력해 주세요.";
    }
  }
  const content: ContactInformationContent = {
    directionsPageDescription: safeText(value.directionsPageDescription, "directionsPageDescription", 10, 400),
    address,
    phone,
    visitInquiryTitle: safeText(value.visitInquiryTitle, "visitInquiryTitle", 1, 100),
    visitInquiryDescription: safeText(value.visitInquiryDescription, "visitInquiryDescription", 10, 500),
    contactPageDescription: safeText(value.contactPageDescription, "contactPageDescription", 10, 400),
    contactIntroduction: safeText(value.contactIntroduction, "contactIntroduction", 10, 500),
    instagramUrl,
    showInstagram: value.showInstagram === true,
  };
  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, value: content };
}

export function validateSiteContentSaveInput(
  key: SiteContentKey,
  value: unknown,
): SiteContentValidationResult<{
  expectedUpdatedAt: Date | null;
  content: FacilityOverviewContent | GreetingContent | ContactInformationContent;
}> {
  if (!exactObject(value, ["expectedUpdatedAt", "saveConfirmed", "content"]))
    return {
      ok: false,
      fieldErrors: { form: "허용되지 않은 요청 구조입니다." },
    };
  if (value.saveConfirmed !== true)
    return {
      ok: false,
      fieldErrors: { saveConfirmed: "공개 즉시 반영을 확인해 주세요." },
    };
  let expectedUpdatedAt: Date | null = null;
  if (value.expectedUpdatedAt !== null) {
    if (typeof value.expectedUpdatedAt !== "string")
      return { ok: false, fieldErrors: {}, formError: "invalid_version" };
    expectedUpdatedAt = new Date(value.expectedUpdatedAt);
    if (Number.isNaN(expectedUpdatedAt.getTime()) || expectedUpdatedAt.toISOString() !== value.expectedUpdatedAt)
      return { ok: false, fieldErrors: {}, formError: "invalid_version" };
  }
  const validated = (() => {
    switch (key) {
      case "facility-overview":
        return validateFacilityOverviewInput(value.content);
      case "greeting":
        return validateGreetingInput(value.content);
      case "contact-information":
        return validateContactInformationInput(value.content);
    }
  })();
  return validated.ok ? { ok: true, value: { expectedUpdatedAt, content: validated.value } } : validated;
}
