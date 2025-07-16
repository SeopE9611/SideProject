import { handleGetStringingApplication, handlePatchStringingApplication } from '@/app/features/stringing-applications/api/handlers';

export async function GET(req: Request, context: { params: { id: string } }) {
  return handleGetStringingApplication(req, context);
}

export async function PATCH(req: Request, context: { params: { id: string } }) {
  return handlePatchStringingApplication(req, context);
}
