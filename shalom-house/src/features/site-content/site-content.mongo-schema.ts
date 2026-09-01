import type { ObjectId } from "mongodb";
import type { FacilityOverviewDocument, GreetingDocument } from "./site-content.types";

export const SITE_CONTENT_COLLECTION_NAME = "site_content_documents";
export type MongoFacilityOverviewDocument = FacilityOverviewDocument & { _id: ObjectId };
export type MongoGreetingDocument = GreetingDocument & { _id: ObjectId };
export type MongoSiteContentDocument = MongoFacilityOverviewDocument | MongoGreetingDocument;
