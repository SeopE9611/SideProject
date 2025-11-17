import { handleApplicationCancelRequestWithdraw } from '@/app/features/stringing-applications/api/handlers';

export async function POST(req: Request, context: { params: { id: string } }) {
  return handleApplicationCancelRequestWithdraw(req, context);
}
