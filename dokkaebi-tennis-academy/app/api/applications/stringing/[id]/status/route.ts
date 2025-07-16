import { handleUpdateApplicationStatus } from '@/app/features/stringing-applications/api/handlers';

export async function PATCH(req: Request, context: { params: { id: string } }) {
  return handleUpdateApplicationStatus(req, context);
}
