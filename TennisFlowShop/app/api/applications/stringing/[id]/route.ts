import {
  handleGetStringingApplication,
  handlePatchStringingApplication,
} from "@/app/features/stringing-applications/api/handlers";
import { canAccessStringingApplicationById } from "@/app/api/applications/stringing/_helpers/access-gate";
import { NextRequest } from "next/server";
import { getPortfolioDemoAdminMutationBlock } from "@/lib/admin/portfolio-demo-readonly.server";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await canAccessStringingApplicationById(id, {
    allowGuestOrder: true,
    allowGuestRental: true,
  });
  if (!auth.ok) return auth.response;

  return handleGetStringingApplication(req, id);
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await canAccessStringingApplicationById(id, {
    allowGuestOrder: true,
    allowGuestRental: true,
  });
  if (!auth.ok) return auth.response;

  if (auth.isAdmin) {
    const demoMutationBlock = getPortfolioDemoAdminMutationBlock(req);
    if (demoMutationBlock) return demoMutationBlock;
  }

  return handlePatchStringingApplication(req, id);
}
