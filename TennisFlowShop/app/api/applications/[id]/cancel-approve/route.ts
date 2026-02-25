import { handleApplicationCancelApprove } from '@/app/features/stringing-applications/api/handlers';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleApplicationCancelApprove(req, { params: { id } });
}
