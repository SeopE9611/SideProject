import { handleStringingCancelRequest } from '@/app/features/stringing-applications/api/handlers';
import { canAccessStringingApplicationById } from '@/app/api/applications/stringing/_helpers/access-gate';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const auth = await canAccessStringingApplicationById(resolvedParams.id, { allowGuestOrder: true, allowGuestRental: false });
  if (!auth.ok) return auth.response;

  return handleStringingCancelRequest(req, { params: resolvedParams });
}
