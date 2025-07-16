import { NextRequest } from 'next/server';
import { handleGetApplicationHistory } from '@/app/features/stringing-applications/api/handlers';

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  return handleGetApplicationHistory(req, context);
}
