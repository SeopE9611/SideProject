import { handleApplicationCancelRequestWithdraw } from '@/app/features/stringing-applications/api/handlers';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;

  return handleApplicationCancelRequestWithdraw(req, { params: resolvedParams });
}
