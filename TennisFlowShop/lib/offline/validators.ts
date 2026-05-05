import { z } from "zod";

export const offlineCustomerCreateSchema = z.object({
  linkedUserId: z.string().optional().nullable(),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().max(254).optional().nullable(),
  memo: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
});

export const offlineCustomerPatchSchema = offlineCustomerCreateSchema.partial();

export const offlineRecordCreateSchema = z.object({
  offlineCustomerId: z.string().trim().min(1),
  userId: z.string().optional().nullable(),
  kind: z.enum(["stringing", "package_sale", "etc"]),
  occurredAt: z.string().datetime().optional(),
  status: z.enum(["received", "in_progress", "completed", "picked_up", "canceled"]),
  customerSnapshot: z.object({
    name: z.string().trim().min(1).max(80),
    phone: z.string().trim().min(7).max(30),
    email: z.string().trim().email().max(254).optional().nullable(),
  }),
  lines: z.array(z.object({
    racketName: z.string().optional(),
    stringProductId: z.string().optional(),
    stringName: z.string().optional(),
    tensionMain: z.string().optional(),
    tensionCross: z.string().optional(),
    note: z.string().optional(),
    mountingFee: z.number().finite().optional(),
  })).default([]),
  payment: z.object({
    status: z.enum(["pending", "paid", "refunded"]),
    method: z.enum(["cash", "card", "bank_transfer", "etc"]),
    amount: z.number().finite().min(0),
    paidAt: z.string().datetime().optional(),
  }),
  points: z.object({ earn: z.number().optional(), use: z.number().optional(), grantTxId: z.string().optional(), deductTxId: z.string().optional() }).optional(),
  packageUsage: z.object({ passId: z.string().optional(), usedCount: z.number().optional(), consumptionId: z.string().optional() }).optional(),
  memo: z.string().max(2000).optional(),
});

export const offlineRecordPatchSchema = offlineRecordCreateSchema.partial().omit({ offlineCustomerId: true });
