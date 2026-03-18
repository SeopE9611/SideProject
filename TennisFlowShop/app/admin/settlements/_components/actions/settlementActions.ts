import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";

export const fetchWithCredentials = <T>(url: string) =>
  authenticatedSWRFetcher<T>(url);
