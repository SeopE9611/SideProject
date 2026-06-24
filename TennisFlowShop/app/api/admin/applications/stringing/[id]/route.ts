import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { proxyToLegacyAdminRoute } from "@/lib/admin-route-proxy";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxyResponse = await proxyToLegacyAdminRoute(
    req,
    `/api/applications/stringing/${id}`,
    "GET",
  );
  if (!proxyResponse.ok) return proxyResponse;

  const guard = await requireAdmin(req);
  if (!("ok" in guard) || !guard.ok) return guard.res;
  if (!ObjectId.isValid(id)) return proxyResponse;

  const payload = await proxyResponse.json();
  const doc = await guard.db
    .collection("stringing_applications")
    .findOne({ _id: new ObjectId(id) }, { projection: { stockDeduction: 1, stockRestore: 1 } });

  return NextResponse.json({
    ...payload,
    stockDeduction: payload?.stockDeduction ?? (doc as any)?.stockDeduction ?? null,
    stockRestore: payload?.stockRestore ?? (doc as any)?.stockRestore ?? null,
  });
}
