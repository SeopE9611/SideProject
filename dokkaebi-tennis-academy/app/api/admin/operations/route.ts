import { handleAdminOperationsGet } from './lib/operationsGetHandler';

export const dynamic = 'force-dynamic';

/** Responsibility: admin operations API transport 계층(GET 위임)만 담당. */
export async function GET(req: Request) {
  return handleAdminOperationsGet(req);
}
