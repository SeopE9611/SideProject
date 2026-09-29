import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { proxyToLegacyAdminRoute } from "@/lib/admin-route-proxy";
import { classifyPortfolioDemoData } from "@/lib/portfolio-demo/data-kind.server";
import { getVerifiedPortfolioDemoTourContext } from "@/lib/portfolio-demo/tour.server";

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
    .findOne({ _id: new ObjectId(id) }, { projection: { stockDeduction: 1, stockRestore: 1, userId: 1, isDemoData: 1, demoSeedKey: 1, isDemoInteraction: 1, demoSessionId: 1 } });

  return NextResponse.json({
    ...payload,
    portfolioDemoDataKind: classifyPortfolioDemoData({ marker: doc ?? {}, tourContext: await getVerifiedPortfolioDemoTourContext(), ownerId: doc?.userId }),
    stockDeduction: payload?.stockDeduction ?? (doc as any)?.stockDeduction ?? null,
    stockRestore: payload?.stockRestore ?? (doc as any)?.stockRestore ?? null,
  });
}
