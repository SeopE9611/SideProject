import type { ObjectId } from "mongodb";

export const donorTypes = ["individual", "organization"] as const;
export type DonorType = (typeof donorTypes)[number];
export const donorStatuses = ["active", "archived"] as const;
export type DonorStatus = (typeof donorStatuses)[number];
export const donorTypeLabels: Record<DonorType, string> = { individual: "개인", organization: "단체·법인" };
export const donorStatusLabels: Record<DonorStatus, string> = { active: "이용 중", archived: "보관" };
export type DonorDocument = { _id: ObjectId; reference: string; type: DonorType; status: DonorStatus; displayName: string; phone: string; email: string; internalNote: string; createdAt: Date; updatedAt: Date; archivedAt: Date | null };
export const isDonorType = (v: unknown): v is DonorType => donorTypes.includes(v as DonorType);
export const isDonorStatus = (v: unknown): v is DonorStatus => donorStatuses.includes(v as DonorStatus);
export const isDonorReference = (v: unknown): v is string => typeof v === "string" && /^DNR-[A-Z0-9]{12}$/.test(v);
