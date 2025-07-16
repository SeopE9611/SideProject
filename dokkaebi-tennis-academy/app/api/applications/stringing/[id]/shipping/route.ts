import { handleUpdateShippingInfo } from '@/app/features/stringing-applications/api/handlers';

export async function PATCH(req: Request, context: { params: { id: string } }) {
  return handleUpdateShippingInfo(req, context);
}
