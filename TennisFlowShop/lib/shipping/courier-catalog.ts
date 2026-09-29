export type CourierCatalogItem = {
  code: string;
  label: string;
  keywords: string[];
  trackerCarrierId: string | null;
  supportsTracking: boolean;
};

export const COURIER_CATALOG: readonly CourierCatalogItem[] = [
  {
    code: "cj",
    label: "CJ대한통운",
    keywords: ["CJ대한통운", "CJ 대한통운", "cj", "cjlogistics", "대한통운"],
    trackerCarrierId: "kr.cjlogistics",
    supportsTracking: true,
  },
  {
    code: "post",
    label: "우체국택배",
    keywords: ["우체국택배", "우체국", "epost", "post"],
    trackerCarrierId: "kr.epost",
    supportsTracking: true,
  },
  {
    code: "hanjin",
    label: "한진택배",
    keywords: ["한진택배", "한진", "hanjin"],
    trackerCarrierId: "kr.hanjin",
    supportsTracking: true,
  },
  {
    code: "logen",
    label: "로젠택배",
    keywords: ["로젠택배", "로젠", "logen", "ilogen"],
    trackerCarrierId: "kr.logen",
    supportsTracking: true,
  },
  {
    code: "lotte",
    label: "롯데택배",
    keywords: ["롯데택배", "롯데", "lotte"],
    trackerCarrierId: null,
    supportsTracking: false,
  },
  {
    code: "kdexp",
    label: "경동택배",
    keywords: ["경동택배", "경동", "kdexp"],
    trackerCarrierId: null,
    supportsTracking: false,
  },
  {
    code: "daesin",
    label: "대신택배",
    keywords: ["대신택배", "대신", "daesin"],
    trackerCarrierId: null,
    supportsTracking: false,
  },
  {
    code: "ilyang",
    label: "일양로지스",
    keywords: ["일양로지스", "일양", "ilyang"],
    trackerCarrierId: null,
    supportsTracking: false,
  },
  {
    code: "cu",
    label: "CU 편의점택배",
    keywords: ["CU 편의점택배", "CU택배", "cu"],
    trackerCarrierId: null,
    supportsTracking: false,
  },
  {
    code: "gspostbox",
    label: "GS Postbox",
    keywords: ["GS Postbox", "GS편의점택배", "GS택배", "postbox"],
    trackerCarrierId: null,
    supportsTracking: false,
  },
  {
    code: "ems",
    label: "EMS",
    keywords: ["EMS", "국제우편"],
    trackerCarrierId: null,
    supportsTracking: false,
  },
  {
    code: "etc",
    label: "기타",
    keywords: ["기타", "etc"],
    trackerCarrierId: null,
    supportsTracking: false,
  },
];

function compactCourierValue(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/택배$/u, "");
}

export function normalizeCourierCode(courier?: string | null): string {
  const normalized = compactCourierValue(courier);
  if (!normalized) return "";

  for (const item of COURIER_CATALOG) {
    if (compactCourierValue(item.code) === normalized) return item.code;
    if (compactCourierValue(item.label) === normalized) return item.code;
    if (item.keywords.some((keyword) => compactCourierValue(keyword) === normalized)) {
      return item.code;
    }
  }

  return normalized;
}

export function getSelectableCourierCatalog(): readonly CourierCatalogItem[] {
  return COURIER_CATALOG.filter((item) => item.code !== "ems");
}

export function findCourierCatalogItem(courier?: string | null): CourierCatalogItem | null {
  const code = normalizeCourierCode(courier);
  if (!code) return null;
  return COURIER_CATALOG.find((item) => item.code === code) ?? null;
}

export function getCourierDisplayName(courier?: string | null): string {
  if (!courier) return "미지정";
  return (findCourierCatalogItem(courier)?.label ?? String(courier).trim()) || "미지정";
}

export function mapCourierCodeToCarrierId(courier?: string | null): string | null {
  const item = findCourierCatalogItem(courier);
  return item?.supportsTracking ? item.trackerCarrierId : null;
}
