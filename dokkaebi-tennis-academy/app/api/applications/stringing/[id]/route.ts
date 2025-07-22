import { handleGetStringingApplication, handlePatchStringingApplication } from '@/app/features/stringing-applications/api/handlers';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleGetStringingApplication(req, id);
}

export async function PATCH(req: Request, context: { params: { id: string } }) {
  return handlePatchStringingApplication(req, context);
}
