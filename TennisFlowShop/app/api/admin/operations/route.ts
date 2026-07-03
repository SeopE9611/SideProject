import { createApiPerfLogger } from "@/lib/api/perf";
import { handleAdminOperationsGet } from "./lib/operationsGetHandler";

export const dynamic = "force-dynamic";

/** Responsibility: admin operations API transport 계층(GET 위임)만 담당. */
export async function GET(req: Request) {
  const perf = createApiPerfLogger("GET /api/admin/operations");
  const response = await perf.measure("handler", () =>
    handleAdminOperationsGet(req, {
      measure: (name, work) => perf.measure(name, work),
    }),
  );
  perf.log();
  return response;
}
