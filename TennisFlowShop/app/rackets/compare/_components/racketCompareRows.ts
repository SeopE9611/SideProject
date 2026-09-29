import type { CompareRacketItem } from "@/app/store/racketCompareStore";
import { gripSizeLabel, racketBrandLabel, stringPatternLabel } from "@/lib/constants";
import { racketConditionLabel } from "@/lib/racket-condition";

export type RacketCompareRow =
  | {
      key: string;
      label: string;
      hint?: string;
      kind: "text";
      getValue: (item: CompareRacketItem) => string;
    }
  | {
      key: string;
      label: string;
      hint?: string;
      kind: "number";
      unit?: string;
      decimals?: number;
      isPrice?: boolean;
      getValue: (item: CompareRacketItem) => number | null | undefined;
    };

export type RacketCompareRowCategory = { title: string; rowKeys: string[] };

export function formatRacketCondition(condition?: string | null): string {
  const code = String(condition ?? "")
    .trim()
    .toUpperCase();
  if (!code) return "-";
  const label = racketConditionLabel(code);
  if (!label || label === code) return code;
  return `${code} (${label})`;
}

export function formatNumberValue(
  value: number | null | undefined,
  row: Extract<RacketCompareRow, { kind: "number" }>,
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  if (row.isPrice) return `${Math.round(value).toLocaleString()}원`;
  const decimals = row.decimals ?? 0;
  const formatted = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  return `${formatted}${row.unit ?? ""}`;
}

export function toCompareNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export const racketCompareRows: RacketCompareRow[] = [
  {
    key: "brand",
    label: "브랜드",
    kind: "text",
    getValue: (item) => racketBrandLabel(item.brand) || "-",
  },
  { key: "model", label: "모델", kind: "text", getValue: (item) => item.model || "-" },
  {
    key: "year",
    label: "연식",
    kind: "text",
    getValue: (item) => (item.year ? `${item.year}년` : "-"),
  },
  {
    key: "condition",
    label: "상태",
    kind: "text",
    getValue: (item) => formatRacketCondition(item.condition),
  },
  {
    key: "price",
    label: "가격",
    kind: "number",
    isPrice: true,
    getValue: (item) => item.price,
    hint: "가격 차이는 현재 비교 목록 안에서의 방향 정보입니다.",
  },
  {
    key: "head",
    label: "헤드 크기",
    kind: "number",
    unit: " sq.in",
    getValue: (item) => item.spec?.headSize,
    hint: "헤드가 클수록 관용성·파워 경향이 커질 수 있습니다.",
  },
  {
    key: "weight",
    label: "무게",
    kind: "number",
    unit: "g",
    getValue: (item) => item.spec?.weight,
    hint: "무거울수록 안정감·파워, 가벼울수록 조작성 경향이 있습니다.",
  },
  {
    key: "balance",
    label: "밸런스",
    kind: "number",
    unit: "mm",
    getValue: (item) => item.spec?.balance,
    hint: "수치가 높을수록 헤드 쪽으로 무게가 실린 경향입니다.",
  },
  {
    key: "length",
    label: "길이",
    kind: "number",
    unit: "in",
    decimals: 1,
    getValue: (item) => item.spec?.lengthIn,
    hint: "길이가 길수록 리치가 늘고 스윙감이 달라질 수 있습니다.",
  },
  {
    key: "sw",
    label: "스윙웨이트",
    kind: "number",
    getValue: (item) => item.spec?.swingWeight,
    hint: "스윙 중 체감되는 무게와 안정감의 참고 지표입니다.",
  },
  {
    key: "ra",
    label: "강성(RA)",
    kind: "number",
    getValue: (item) => item.spec?.stiffnessRa,
    hint: "수치가 높을수록 단단한 타구감 경향이 있습니다.",
  },
  {
    key: "pattern",
    label: "스트링 패턴",
    kind: "text",
    getValue: (item) => (item.spec?.pattern ? stringPatternLabel(String(item.spec.pattern)) : "-"),
    hint: "오픈 패턴은 스핀, 덴스 패턴은 컨트롤 경향의 참고 정보입니다.",
  },
  {
    key: "gripSize",
    label: "그립 사이즈",
    kind: "text",
    getValue: (item) => (item.spec?.gripSize ? gripSizeLabel(String(item.spec.gripSize)) : "-"),
    hint: "손 크기와 선호 그립감에 맞춰 확인하세요.",
  },
];

export const racketCompareRowCategories: RacketCompareRowCategory[] = [
  { title: "기본 정보", rowKeys: ["brand", "model", "year", "condition", "price"] },
  { title: "프레임·스윙", rowKeys: ["head", "weight", "balance", "length", "sw", "ra"] },
  { title: "스트링·그립", rowKeys: ["pattern", "gripSize"] },
];
