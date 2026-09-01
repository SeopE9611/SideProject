export const siteContentKeys = ["facility-overview", "greeting"] as const;

export type SiteContentKey = (typeof siteContentKeys)[number];

export function isSiteContentKey(value: unknown): value is SiteContentKey {
  return typeof value === "string" && siteContentKeys.some((key) => key === value);
}

export type FacilityFact = { label: string; value: string };
export type FacilityPrinciple = { title: string; description: string };
export type FacilityScene = {
  label: string;
  title: string;
  description: string;
};
export type FacilityPolicyItem = { title: string; description: string };

export type FacilityOverviewContent = {
  pageDescription: string;
  facts: readonly [FacilityFact, FacilityFact, FacilityFact];
  principlesEyebrow: string;
  principlesTitle: string;
  principlesDescription: string;
  principles: readonly [FacilityPrinciple, FacilityPrinciple, FacilityPrinciple];
  scenesEyebrow: string;
  scenesTitle: string;
  scenesDescription: string;
  scenes: readonly [FacilityScene, FacilityScene, FacilityScene];
  policyEyebrow: string;
  policyTitle: string;
  policyItems: readonly [FacilityPolicyItem, FacilityPolicyItem];
};

export type GreetingContent = {
  pageDescription: string;
  notice: string;
  statusLabel: string;
  title: string;
  paragraphs: readonly string[];
  signerRole: string;
  signerName: string;
  showSignerName: boolean;
};

export type SiteContentDocumentBase = {
  key: SiteContentKey;
  createdAt: Date;
  updatedAt: Date;
};
export type FacilityOverviewDocument = SiteContentDocumentBase & {
  key: "facility-overview";
  content: FacilityOverviewContent;
};
export type GreetingDocument = SiteContentDocumentBase & {
  key: "greeting";
  content: GreetingContent;
};
