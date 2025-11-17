import { handleApplicationCancelRequest } from '@/app/features/stringing-applications/api/handlers';

export async function POST(req: Request, context: { params: { id: string } }) {
  return handleApplicationCancelRequest(req, context);
}
