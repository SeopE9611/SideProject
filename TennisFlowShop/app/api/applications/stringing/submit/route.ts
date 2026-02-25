import { handleSubmitStringingApplication } from '@/app/features/stringing-applications/api/handlers';

export async function POST(req: Request) {
  return handleSubmitStringingApplication(req);
}
