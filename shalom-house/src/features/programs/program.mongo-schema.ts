import type { ObjectId } from "mongodb";
import type { ProgramApprovalStatus, ProgramPublicationStatus } from "./program.types";
export const PROGRAM_COLLECTION_NAME = "program_posts";
export type MongoProgramDocument = {
  _id: ObjectId; slug: string; category: string; title: string; summary: string;
  purpose: string; body: string[]; operationStatusLabel: string | null; sortOrder: number;
  publicationStatus: ProgramPublicationStatus; approvalStatus: ProgramApprovalStatus;
  publishedAt: Date | null; createdAt: Date; updatedAt: Date; deletedAt?: Date | null;
};
