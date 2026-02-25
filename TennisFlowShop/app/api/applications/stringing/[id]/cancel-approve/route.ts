import { handleStringingCancelApprove } from '@/app/features/stringing-applications/api/handlers';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return handleStringingCancelApprove(req, { params: resolvedParams });
}
