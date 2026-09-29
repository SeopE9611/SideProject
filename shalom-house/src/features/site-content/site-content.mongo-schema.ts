import type { ObjectId } from "mongodb";
import type {
  ContactInformationDocument,
  DonationGuidanceDocument,
  FacilityOverviewDocument,
  GreetingDocument,
} from "./site-content.types";

export const SITE_CONTENT_COLLECTION_NAME = "site_content_documents";
export type MongoFacilityOverviewDocument = FacilityOverviewDocument & {
  _id: ObjectId;
};
export type MongoGreetingDocument = GreetingDocument & { _id: ObjectId };
export type MongoContactInformationDocument = ContactInformationDocument & { _id: ObjectId };
export type MongoDonationGuidanceDocument = DonationGuidanceDocument & { _id: ObjectId };
export type MongoSiteContentDocument =
  | MongoFacilityOverviewDocument
  | MongoGreetingDocument
  | MongoContactInformationDocument
  | MongoDonationGuidanceDocument;
