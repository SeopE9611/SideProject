import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";

function encodeCursor(item: { usedAt: Date; _id: ObjectId }) {
  return Buffer.from(
    JSON.stringify({ usedAt: item.usedAt.toISOString(), id: item._id.toHexString() }),
  ).toString("base64");
}

function decodeCursor(cursor?: string | null): { usedAt: Date; id: ObjectId } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    if (!parsed?.usedAt || !ObjectId.isValid(parsed?.id)) return null;
    return { usedAt: new Date(parsed.usedAt), id: new ObjectId(parsed.id) };
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.res;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(String(id))) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "10")));
    const cursor = decodeCursor(url.searchParams.get("cursor"));

    const db = (await clientPromise).db();
    const orderId = new ObjectId(id);
    const pass = await db
      .collection("service_passes")
      .findOne({ orderId }, { projection: { _id: 1 } as any });
    if (!pass) {
      return NextResponse.json({ items: [], total: 0, hasMore: false, nextCursor: null });
    }

    const match: any = { passId: pass._id };
    if (cursor) {
      match.$or = [
        { usedAt: { $lt: cursor.usedAt } },
        { usedAt: cursor.usedAt, _id: { $lt: cursor.id } },
      ];
    }

    const [rows, total] = await Promise.all([
      db
        .collection("service_pass_consumptions")
        .aggregate([
          { $match: match },
          { $sort: { usedAt: -1, _id: -1 } },
          { $limit: limit + 1 },
          {
            $lookup: {
              from: "stringing_applications",
              let: { appId: "$applicationId" },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$appId"] } } },
                { $project: { _id: 1, status: 1, preferredDate: 1, racketType: 1 } },
              ],
              as: "appDoc",
            },
          },
          { $addFields: { app: { $first: "$appDoc" } } },
          {
            $project: {
              _id: 0,
              id: { $toString: "$_id" },
              applicationId: { $toString: "$applicationId" },
              date: "$usedAt",
              sessionsUsed: { $ifNull: ["$count", 1] },
              summary: {
                $concat: [
                  {
                    $dateToString: {
                      date: "$usedAt",
                      format: "%Y.%m.%d %H:%M",
                      timezone: "Asia/Seoul",
                    },
                  },
                  " · -",
                  { $toString: { $ifNull: ["$count", 1] } },
                  "회 차감",
                ],
              },
              applicationSummary: {
                $concat: [
                  "신청서 #",
                  { $substrBytes: [{ $toString: "$applicationId" }, 18, 6] },
                  {
                    $cond: [
                      { $gt: [{ $strLenCP: { $ifNull: ["$app.status", ""] } }, 0] },
                      { $concat: [" · ", "$app.status"] },
                      "",
                    ],
                  },
                ],
              },
              adminNote: {
                $cond: [{ $eq: ["$reverted", true] }, "취소/복원됨", ""],
              },
            },
          },
        ])
        .toArray(),
      db.collection("service_pass_consumptions").countDocuments({ passId: pass._id }),
    ]);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1] as any;

    return NextResponse.json({
      items,
      total,
      hasMore,
      nextCursor:
        hasMore && last?.date && last?.id
          ? encodeCursor({ usedAt: new Date(last.date), _id: new ObjectId(last.id) })
          : null,
    });
  } catch (e) {
    console.error("[GET /api/admin/package-orders/[id]/usage-history] error", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
