import { NextRequest } from 'next/server';
import { handleGetApplicationHistory } from '@/app/features/stringing-applications/api/handlers';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleGetApplicationHistory(req, { params: { id } });
}
