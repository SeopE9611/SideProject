import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { shapeAdminReview } from "@/lib/reviews/admin-review-shape";
import { buildAdminReviewRelationStages } from "@/lib/reviews/admin-review-relations.server";
import { buildResolvedReviewContextExpression } from "@/lib/reviews/review-context.server";
import type { AdminReviewListItemDto, AdminReviewsListResponseDto } from "@/types/admin/reviews";

function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["all", "visible", "hidden"]).default("all"),
  context: z.enum(["all", "product", "product_stringing", "standalone_stringing", "rental", "rental_stringing"]).default("all"),
  type: z.enum(["all", "product", "service"]).optional(),
  q: z.string().trim().default(""),
  withDeleted: z.enum(["0", "1", "false", "true"]).optional(),
});

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const parsed = querySchema.parse({
    page: parseIntParam(url.searchParams.get("page"), { defaultValue: 1, min: 1, max: 10_000 }),
    limit: parseIntParam(url.searchParams.get("limit"), { defaultValue: 10, min: 1, max: 50 }),
    status: url.searchParams.get("status") ?? "all",
    context: url.searchParams.get("context") ?? "all",
    type: url.searchParams.get("type") ?? undefined,
    q: url.searchParams.get("q") ?? "",
    withDeleted: url.searchParams.get("withDeleted") ?? undefined,
  });

  const db = await getDb();
  const col = db.collection("reviews");
  const match: Record<string, unknown> = { isDeleted: { $ne: true } };
  if (parsed.withDeleted === "1" || parsed.withDeleted === "true") delete match.isDeleted;
  if (parsed.status === "visible") match.moderationStatus = { $ne: "hidden" };
  if (parsed.status === "hidden") match.moderationStatus = "hidden";
  if (parsed.q) match.content = { $regex: parsed.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const basePipeline: Record<string, unknown>[] = [
    { $match: match },
    { $addFields: { resolvedReviewContext: buildResolvedReviewContextExpression() } },
    ...(parsed.context === "all" ? [] : [{ $match: { resolvedReviewContext: parsed.context } }]),
  ];

  const lookups = buildAdminReviewRelationStages();

  const [items, totalRows] = await Promise.all([
    col.aggregate([...basePipeline, { $sort: { createdAt: -1 } }, { $skip: (parsed.page - 1) * parsed.limit }, { $limit: parsed.limit }, ...lookups]).toArray(),
    col.aggregate([...basePipeline, { $count: "total" }]).toArray(),
  ]);

  const shaped: AdminReviewListItemDto[] = items.map((d) => shapeAdminReview(d, 200));
  const response: AdminReviewsListResponseDto = { items: shaped, total: Number(totalRows[0]?.total ?? 0) };
  return NextResponse.json(response);
}
