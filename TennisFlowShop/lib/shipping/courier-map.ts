export const COURIER_DISPLAY_NAME_MAP: Record<string, string> = {
  cj: "CJ 대한통운",
  hanjin: "한진택배",
  logen: "로젠택배",
  post: "우체국택배",
  etc: "기타",
};

const COURIER_TO_CARRIER_ID_MAP: Record<string, string | null> = {
  cj: "kr.cjlogistics",
  hanjin: "kr.hanjin",
  logen: "kr.logen",
  post: "kr.epost",
  etc: null,
};

export function mapCourierCodeToCarrierId(courier?: string | null): string | null {
  const normalized = String(courier ?? "").trim().toLowerCase();
  if (!normalized) return null;
  return COURIER_TO_CARRIER_ID_MAP[normalized] ?? null;
}

export function getCourierDisplayName(courier?: string | null): string {
  const normalized = String(courier ?? "").trim().toLowerCase();
  if (!normalized) return "미지정";
  return COURIER_DISPLAY_NAME_MAP[normalized] ?? "미지정";
}
