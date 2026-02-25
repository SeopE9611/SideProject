import { handleUpdateApplicationStatus } from '@/app/features/stringing-applications/api/handlers';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;

  return handleUpdateApplicationStatus(req, { params: resolvedParams });
}
