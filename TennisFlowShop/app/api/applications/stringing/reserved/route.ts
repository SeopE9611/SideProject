import { handleGetReservedTimeSlots } from "@/app/features/stringing-applications/api/handlers";
import { applyAppsInTossCors, createAppsInTossPreflightResponse } from "@/lib/apps-in-toss";
import { NextRequest } from "next/server";

export function OPTIONS(req: NextRequest) {
  return createAppsInTossPreflightResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  const response = await handleGetReservedTimeSlots(req);

  return applyAppsInTossCors(response, origin);
}
