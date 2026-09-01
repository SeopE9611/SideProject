import type { ObjectId } from "mongodb";

export const staffPublicationStatuses = ["draft", "published", "archived"] as const;
export type StaffPublicationStatus = (typeof staffPublicationStatuses)[number];
export type StaffProfileInput = { role: string; responsibility: string; name: string; showName: boolean; nameDisclosureConfirmed: boolean; nameDisclosureReference: string; publicationStatus: StaffPublicationStatus; displayOrder: number };
export type StaffProfileDocument = StaffProfileInput & { _id: ObjectId; nameDisclosureConfirmedAt: Date | null; publishedAt: Date | null; archivedAt: Date | null; createdAt: Date; updatedAt: Date };
export const isStaffPublicationStatus = (value: unknown): value is StaffPublicationStatus => typeof value === "string" && staffPublicationStatuses.includes(value as StaffPublicationStatus);
export const getStaffPublicationStatusLabel = (value: StaffPublicationStatus) => ({ draft: "초안", published: "공개", archived: "보관" })[value];
