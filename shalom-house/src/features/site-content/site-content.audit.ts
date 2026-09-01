import type {
  ContactInformationContent,
  FacilityOverviewContent,
  GreetingContent,
  SiteContentKey,
} from "./site-content.types";

export const siteContentAuditActions = ["created", "updated"] as const;
export type SiteContentAuditAction = (typeof siteContentAuditActions)[number];
export const siteContentAuditChangedFields = [
  "pageDescription", "facts", "principles", "scenes", "policy", "notice", "statusLabel", "title", "paragraphs",
  "signerRole", "signerName", "showSignerName", "directionsPageDescription", "address", "phone", "visitGuidance",
  "contactPageDescription", "contactIntroduction", "instagram",
] as const;
export type SiteContentAuditChangedField = (typeof siteContentAuditChangedFields)[number];
type Content = FacilityOverviewContent | GreetingContent | ContactInformationContent;

function sections(key: SiteContentKey, content: Content): Partial<Record<SiteContentAuditChangedField, unknown>> {
  if (key === "facility-overview") {
    const value = content as FacilityOverviewContent;
    return {
      pageDescription: value.pageDescription,
      facts: value.facts,
      principles: [value.principlesEyebrow, value.principlesTitle, value.principlesDescription, value.principles],
      scenes: [value.scenesEyebrow, value.scenesTitle, value.scenesDescription, value.scenes],
      policy: [value.policyEyebrow, value.policyTitle, value.policyItems],
    };
  }
  if (key === "greeting") return content as GreetingContent;
  const value = content as ContactInformationContent;
  return {
    directionsPageDescription: value.directionsPageDescription,
    address: value.address,
    phone: value.phone,
    visitGuidance: [value.visitInquiryTitle, value.visitInquiryDescription],
    contactPageDescription: value.contactPageDescription,
    contactIntroduction: value.contactIntroduction,
    instagram: [value.instagramUrl, value.showInstagram],
  };
}

export function getSiteContentChangedFields(
  key: SiteContentKey,
  before: Content | null,
  after: Content,
): SiteContentAuditChangedField[] {
  const next = sections(key, after);
  const previous = before ? sections(key, before) : {};
  return (Object.keys(next) as SiteContentAuditChangedField[]).filter(
    (field) => !before || JSON.stringify(previous[field]) !== JSON.stringify(next[field]),
  );
}
