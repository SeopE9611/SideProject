import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getPublicReviewSurface } from "@/lib/reviews/public-review-surface.server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ reviews: [], summary: { count: 0, avg: 0 } });
  }

  const db = await getDb();
  const url = new URL(req.url);
  const surface = await getPublicReviewSurface(db, {
    target: { type: "product", id },
    limit: Number(url.searchParams.get("limit") ?? 10),
  });

  return NextResponse.json({
    reviews: surface.items,
    summary: { count: surface.summary.count, avg: surface.summary.average },
  });
}
