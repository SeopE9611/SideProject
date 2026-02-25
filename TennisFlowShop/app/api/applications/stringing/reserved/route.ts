import { handleGetReservedTimeSlots } from '@/app/features/stringing-applications/api/handlers';

export async function GET(req: Request) {
  return handleGetReservedTimeSlots(req);
}
