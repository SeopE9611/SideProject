import { getMongoDatabase } from "@/lib/mongodb";
import { cache } from "react";
import {
  defaultContactInformationContent,
  defaultDonationGuidanceContent,
  defaultFacilityOverviewContent,
  defaultGreetingContent,
} from "./site-content.defaults";
import { SITE_CONTENT_COLLECTION_NAME } from "./site-content.mongo-schema";
import type {
  ContactInformationContent,
  DonationGuidanceContent,
  FacilityOverviewContent,
  GreetingContent,
  SiteContentKey,
} from "./site-content.types";
import {
  validateContactInformationInput,
  validateDonationGuidanceInput,
  validateFacilityOverviewInput,
  validateGreetingInput,
} from "./site-content.validation";

function source(): "mongodb" | "fixture" | "empty" {
  const value = (process.env.SHALOM_CONTENT_SOURCE ?? "fixture").trim().toLowerCase();
  if (value === "mongodb" || value === "fixture" || value === "empty") return value;
  throw new Error(`지원하지 않는 SHALOM_CONTENT_SOURCE 설정입니다: ${value}`);
}

async function getContent<
  T extends FacilityOverviewContent | GreetingContent | ContactInformationContent | DonationGuidanceContent,
>(
  key: SiteContentKey,
  fallback: T,
): Promise<T> {
  if (source() !== "mongodb") return fallback;
  const document = await (
    await getMongoDatabase()
  )
    .collection(SITE_CONTENT_COLLECTION_NAME)
    .findOne({ key }, { projection: { content: 1 } });
  if (!document) return fallback;
  const result = (() => {
    switch (key) {
      case "facility-overview":
        return validateFacilityOverviewInput(document.content);
      case "greeting":
        return validateGreetingInput(document.content);
      case "contact-information":
        return validateContactInformationInput(document.content);
      case "donation-guidance":
        return validateDonationGuidanceInput(document.content);
    }
  })();
  if (!result.ok) {
    console.error("공식 콘텐츠 문서 검증 실패", {
      siteContentKey: key,
      errorName: "InvalidSiteContentDocument",
    });
    return fallback;
  }
  return result.value as T;
}

export async function getPublicFacilityOverview(): Promise<FacilityOverviewContent> {
  return getContent("facility-overview", defaultFacilityOverviewContent);
}

export async function getPublicGreeting(): Promise<GreetingContent> {
  const content = await getContent("greeting", defaultGreetingContent);
  return content.showSignerName ? content : { ...content, signerName: "" };
}

export const getPublicContactInformation = cache(async (): Promise<ContactInformationContent> => {
  const content = await getContent("contact-information", defaultContactInformationContent);
  return content.showInstagram ? content : { ...content, instagramUrl: "" };
});

export async function getPublicDonationGuidance(): Promise<DonationGuidanceContent> {
  return getContent("donation-guidance", defaultDonationGuidanceContent);
}
