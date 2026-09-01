import type { FacilityOverviewContent, GreetingContent, SiteContentKey } from "./site-content.types";

export const siteContentAuditActions = ["created", "updated"] as const;
export type SiteContentAuditAction = (typeof siteContentAuditActions)[number];
export const siteContentAuditChangedFields = ["pageDescription", "facts", "principles", "scenes", "policy", "notice", "statusLabel", "title", "paragraphs", "signerRole", "signerName", "showSignerName"] as const;
export type SiteContentAuditChangedField = (typeof siteContentAuditChangedFields)[number];

const facilityFields: readonly SiteContentAuditChangedField[] = ["pageDescription", "facts", "principles", "scenes", "policy"];
const greetingFields: readonly SiteContentAuditChangedField[] = ["pageDescription", "notice", "statusLabel", "title", "paragraphs", "signerRole", "signerName", "showSignerName"];

export function getSiteContentChangedFields(key: SiteContentKey, before: FacilityOverviewContent | GreetingContent | null, after: FacilityOverviewContent | GreetingContent): SiteContentAuditChangedField[] {
  const fields = key === "facility-overview" ? facilityFields : greetingFields;
  if (!before) return [...fields];
  const sections: Record<SiteContentAuditChangedField, unknown> = key === "facility-overview"
    ? { pageDescription: (after as FacilityOverviewContent).pageDescription, facts: (after as FacilityOverviewContent).facts, principles: { eyebrow: (after as FacilityOverviewContent).principlesEyebrow, title: (after as FacilityOverviewContent).principlesTitle, description: (after as FacilityOverviewContent).principlesDescription, items: (after as FacilityOverviewContent).principles }, scenes: { eyebrow: (after as FacilityOverviewContent).scenesEyebrow, title: (after as FacilityOverviewContent).scenesTitle, description: (after as FacilityOverviewContent).scenesDescription, items: (after as FacilityOverviewContent).scenes }, policy: { eyebrow: (after as FacilityOverviewContent).policyEyebrow, title: (after as FacilityOverviewContent).policyTitle, items: (after as FacilityOverviewContent).policyItems }, notice: null, statusLabel: null, title: null, paragraphs: null, signerRole: null, signerName: null, showSignerName: null }
    : { ...(after as GreetingContent), facts: null, principles: null, scenes: null, policy: null };
  const previous = key === "facility-overview" ? getSiteContentChangedFields(key, null, before).reduce<Record<string, unknown>>((result, field) => ({ ...result, [field]: field === "pageDescription" ? (before as FacilityOverviewContent).pageDescription : field === "facts" ? (before as FacilityOverviewContent).facts : field === "principles" ? { eyebrow: (before as FacilityOverviewContent).principlesEyebrow, title: (before as FacilityOverviewContent).principlesTitle, description: (before as FacilityOverviewContent).principlesDescription, items: (before as FacilityOverviewContent).principles } : field === "scenes" ? { eyebrow: (before as FacilityOverviewContent).scenesEyebrow, title: (before as FacilityOverviewContent).scenesTitle, description: (before as FacilityOverviewContent).scenesDescription, items: (before as FacilityOverviewContent).scenes } : { eyebrow: (before as FacilityOverviewContent).policyEyebrow, title: (before as FacilityOverviewContent).policyTitle, items: (before as FacilityOverviewContent).policyItems } }), {}) : before as unknown as Record<string, unknown>;
  return fields.filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(sections[field]));
}
