import type { ObjectId } from "mongodb";
import type { DonorType } from "./donor.types";
export const donationStatuses = ["draft", "confirmed", "voided"] as const;
export type DonationStatus = (typeof donationStatuses)[number];
export const donationMethods = ["bank_transfer", "cash", "other"] as const;
export type DonationMethod = (typeof donationMethods)[number];
export const donationPurposes = ["general", "designated"] as const;
export type DonationPurpose = (typeof donationPurposes)[number];
export const donationReceiptStatuses = ["not_requested", "requested", "issued"] as const;
export type DonationReceiptStatus = (typeof donationReceiptStatuses)[number];
export const donationStatusLabels: Record<DonationStatus,string> = { draft:"작성 중", confirmed:"확정", voided:"무효" };
export const donationMethodLabels: Record<DonationMethod,string> = { bank_transfer:"계좌이체", cash:"현금", other:"기타" };
export const donationPurposeLabels: Record<DonationPurpose,string> = { general:"일반 후원", designated:"지정 후원" };
export const donationReceiptStatusLabels: Record<DonationReceiptStatus,string> = { not_requested:"미요청", requested:"요청됨", issued:"발급 완료" };
export type DonationDocument = { _id:ObjectId; reference:string; donorId:ObjectId|null; anonymous:boolean; donorReferenceSnapshot:string|null; donorNameSnapshot:string; donorTypeSnapshot:DonorType|null; donatedOn:string; amountWon:number; method:DonationMethod; purpose:DonationPurpose; purposeDescription:string; receiptStatus:DonationReceiptStatus; receiptIssuedOn:string|null; status:DonationStatus; voidReason:string; internalNote:string; createdAt:Date; updatedAt:Date; confirmedAt:Date|null; voidedAt:Date|null };
export const isDonationStatus=(v:unknown):v is DonationStatus=>donationStatuses.includes(v as DonationStatus);
export const isDonationMethod=(v:unknown):v is DonationMethod=>donationMethods.includes(v as DonationMethod);
export const isDonationPurpose=(v:unknown):v is DonationPurpose=>donationPurposes.includes(v as DonationPurpose);
export const isDonationReceiptStatus=(v:unknown):v is DonationReceiptStatus=>donationReceiptStatuses.includes(v as DonationReceiptStatus);
export const isDonationReference=(v:unknown):v is string=>typeof v==="string"&&/^GFT-[A-Z0-9]{12}$/.test(v);
export function isCanonicalDateOnly(value:unknown):value is string { if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const [y,m,d]=value.split("-").map(Number); const date=new Date(Date.UTC(y,m-1,d)); return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d; }
export function isValidDonationDate(value:unknown):value is Date { return value instanceof Date&&!Number.isNaN(value.getTime()); }
