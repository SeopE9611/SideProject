import { handleGetApplicationList } from '@/app/features/stringing-applications/api/handlers';

export async function GET() {
  return handleGetApplicationList();
}
