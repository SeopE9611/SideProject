import { NextRequest } from "next/server";
import { handleGetApplicationHistory } from "@/app/features/stringing-applications/api/handlers";
import { canAccessStringingApplicationById } from "@/app/api/applications/stringing/_helpers/access-gate";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await canAccessStringingApplicationById(id, {
    allowGuestOrder: true,
    allowGuestRental: true,
  });
  if (!auth.ok) return auth.response;

  return handleGetApplicationHistory(req, { params: { id } });
}
