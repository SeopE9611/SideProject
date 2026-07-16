"use client";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import FinderRacketCard, {
  type FinderRacket,
} from "@/app/rackets/finder/_components/FinderRacketCard";
import FinderRacketCardSkeleton from "@/app/rackets/finder/_components/FinderRacketCardSkeleton";
import RacketCompareTray from "@/app/rackets/finder/_components/RacketCompareTray";
import RacketFinderHeader from "@/app/rackets/finder/_components/RacketFinderHeader";
import RacketFinderToolbar from "@/app/rackets/finder/_components/RacketFinderToolbar";
import { ActiveFilterBar, CatalogFilterPanelShell, type ActiveFilterItem } from "@/components/commerce";
import StickyAside from "@/components/layout/StickyAside";
import { EmptyState } from "@/components/public/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import {
  GRIP_SIZE_OPTIONS,
  RACKET_BRANDS,
  racketBrandLabel,
  STRING_PATTERN_OPTIONS,
  gripSizeLabel,
  normalizeAndValidateGripSize,
  normalizeAndValidateStringPattern,
  stringPatternLabel,
} from "@/lib/constants";
import { racketConditionLabel } from "@/lib/racket-condition";
import { cn } from "@/lib/utils";
import {
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

type Range = [number, number];
type SortKey =
  | "createdAt_desc"
  | "price_asc"
  | "price_desc"
  | "swingWeight_asc"
  | "swingWeight_desc"
  | "weight_asc"
  | "weight_desc"
  | "stiffnessRa_asc"
  | "stiffnessRa_desc";

type Filters = {
  q: string;
  brand: string;
  condition: string;
  sort: SortKey;
  price: Range;
  headSize: Range;
  weight: Range;
  patterns: string[];
  gripSizes: string[];
  balance: Range;
  lengthIn: Range;
  stiffnessRa: Range;
  swingWeight: Range;
  strict: boolean;
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "createdAt_desc", label: "최신순" },
  { value: "price_asc", label: "가격 낮은순" },
  { value: "price_desc", label: "가격 높은순" },
  { value: "swingWeight_desc", label: "스윙웨이트 높은순" },
  { value: "swingWeight_asc", label: "스윙웨이트 낮은순" },
  { value: "weight_desc", label: "무게 높은순" },
  { value: "weight_asc", label: "무게 낮은순" },
  { value: "stiffnessRa_desc", label: "강성(RA) 높은순" },
  { value: "stiffnessRa_asc", label: "강성(RA) 낮은순" },
];

const DEFAULT: Filters = {
  q: "",
  brand: "",
  condition: "",
  sort: "createdAt_desc",
  price: [0, 600000],
  headSize: [80, 120],
  weight: [200, 380],
  patterns: [],
  gripSizes: [],
  balance: [280, 380],
  lengthIn: [25, 29],
  stiffnessRa: [45, 80],
  swingWeight: [250, 390],
  strict: false,
};

function rangeEq(a: Range, b: Range) {
  return a[0] === b[0] && a[1] === b[1];
}

function getFinderConditionFilterLabel(condition: string): string {
  const code = String(condition ?? "").trim().toUpperCase();
  const label = racketConditionLabel(code);

  if (!code) return "";
  if (!label || label === code) return code;

  return `${code} (${label})`;
}

function countActiveFinderFilters(filters: Filters) {
  let count = 0;
  if (filters.q.trim()) count += 1;
  if (filters.brand) count += 1;
  if (filters.condition) count += 1;
  if (filters.strict) count += 1;
  if (!rangeEq(filters.price, DEFAULT.price)) count += 1;
  if (!rangeEq(filters.headSize, DEFAULT.headSize)) count += 1;
  if (!rangeEq(filters.weight, DEFAULT.weight)) count += 1;
  if (!rangeEq(filters.balance, DEFAULT.balance)) count += 1;
  if (!rangeEq(filters.lengthIn, DEFAULT.lengthIn)) count += 1;
  if (!rangeEq(filters.stiffnessRa, DEFAULT.stiffnessRa)) count += 1;
  if (!rangeEq(filters.swingWeight, DEFAULT.swingWeight)) count += 1;
  count += filters.patterns.length;
  count += filters.gripSizes.length;
  return count;
}

// --- Finder 상태 복원(세션 단위) ---
const FINDER_STATE_KEY = "racketFinder.state.v1";
const FINDER_LAST_URL_KEY = "racketFinder.lastUrl.v1";

type PersistedFinderState = {
  draft: Filters;
  applied: Filters;
  page: number;
  hasSearched: boolean;
};

const readFinderState = (): PersistedFinderState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(FINDER_STATE_KEY);
    return raw ? (JSON.parse(raw) as PersistedFinderState) : null;
  } catch {
    return null;
  }
};

const writeFinderState = (state: PersistedFinderState) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FINDER_STATE_KEY, JSON.stringify(state));
  } catch {}
};

const writeFinderLastUrl = (url: string) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FINDER_LAST_URL_KEY, url);
  } catch {}
};

const readFinderLastUrl = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(FINDER_LAST_URL_KEY);
};

const clearFinderPersist = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FINDER_STATE_KEY);
    window.sessionStorage.removeItem(FINDER_LAST_URL_KEY);
  } catch {}
};

function normalizePattern(p: string) {
  return p.replace(/\s+/g, "").replace(/×/g, "x").toLowerCase();
}

function buildQuery(f: Filters, page: number, pageSize: number) {
  const sp = new URLSearchParams();
  sp.set("page", String(page));
  sp.set("pageSize", String(pageSize));

  if (f.q?.trim()) sp.set("q", f.q.trim());
  if (f.brand) sp.set("brand", f.brand);
  if (f.condition) sp.set("condition", f.condition);
  if (f.strict) sp.set("strict", "1");

  if (f.sort && f.sort !== DEFAULT.sort) sp.set("sort", f.sort);

  sp.set("minPrice", String(f.price[0]));
  sp.set("maxPrice", String(f.price[1]));

  sp.set("minHeadSize", String(f.headSize[0]));
  sp.set("maxHeadSize", String(f.headSize[1]));

  sp.set("minWeight", String(f.weight[0]));
  sp.set("maxWeight", String(f.weight[1]));

  sp.set("minBalance", String(f.balance[0]));
  sp.set("maxBalance", String(f.balance[1]));

  sp.set("minLengthIn", String(f.lengthIn[0]));
  sp.set("maxLengthIn", String(f.lengthIn[1]));

  sp.set("minStiffnessRa", String(f.stiffnessRa[0]));
  sp.set("maxStiffnessRa", String(f.stiffnessRa[1]));

  sp.set("minSwingWeight", String(f.swingWeight[0]));
  sp.set("maxSwingWeight", String(f.swingWeight[1]));

  for (const p of f.patterns) sp.append("pattern", normalizePattern(p));
  for (const gripSize of f.gripSizes) {
    const normalizedGrip = normalizeAndValidateGripSize(gripSize);
    if (normalizedGrip) sp.append("gripSize", normalizedGrip);
  }
  return sp.toString();
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: Range;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: Range) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-ui-body-sm font-medium text-foreground">{label}</span>
        <span className="ml-auto text-right text-ui-body-sm font-semibold text-primary tabular-nums">
          {value[0].toLocaleString()}
          {suffix ?? ""} ~ {value[1].toLocaleString()}
          {suffix ?? ""}
        </span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange([v[0], v[1]])}
        className="py-2"
      />
    </div>
  );
}

function SectionLabel({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2 pb-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <span className="text-ui-label font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

export default function RacketFinderClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const didInitFromQueryRef = useRef(false);
  const [draft, setDraft] = useState<Filters>(DEFAULT);
  const [applied, setApplied] = useState<Filters>(DEFAULT);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [hasSearched, setHasSearched] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const ALL = "__all__";

  const syncUrl = (f: Filters, nextPage: number) => {
    const nextQs = buildQuery(f, nextPage, pageSize);
    const nextUrl = `${pathname}?${nextQs}`;
    writeFinderLastUrl(nextUrl);
    router.replace(nextUrl, { scroll: false });
  };

  useEffect(() => {
    if (didInitFromQueryRef.current) return;
    didInitFromQueryRef.current = true;

    const sp = searchParams;
    const hasAnyQuery = sp.toString().length > 0;
    // 1) URL 쿼리 없는 경우: 세션에 저장된 Finder 상태 복원
    if (!hasAnyQuery) {
      const persisted = readFinderState();
      if (!persisted) return;

      setDraft(persisted.draft);
      setApplied(persisted.applied);
      const nextPage = Math.max(1, persisted.page || 1);
      setPage(nextPage);
      setHasSearched(!!persisted.hasSearched);

      // 마지막 검색 결과가 있었던 경우엔 URL도 복원(공유 가능한 형태)
      if (persisted.hasSearched) {
        const nextUrl = `${pathname}?${buildQuery(persisted.applied, nextPage, pageSize)}`;
        writeFinderLastUrl(nextUrl);
        router.replace(nextUrl, { scroll: false });
      }
      return;
    }

    const readNum = (k: string): number | null => {
      const v = sp.get(k);
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const readRange = (minK: string, maxK: string, fallback: Range): Range => {
      const min = readNum(minK);
      const max = readNum(maxK);
      return [min ?? fallback[0], max ?? fallback[1]];
    };

    const next: Filters = { ...DEFAULT };

    const brand = sp.get("brand");
    if (brand) next.brand = brand.toLowerCase();

    const condition = sp.get("condition") ?? sp.get("cond");
    if (condition) next.condition = condition.toUpperCase();
    const q = sp.get("q");
    if (q) next.q = q;

    // URL 쿼리값도 서버 저장 형식(value) 기준으로 정규화해서 복구
    const patterns = sp
      .getAll("pattern")
      .map((pattern) => normalizeAndValidateStringPattern(pattern))
      .filter(Boolean);
    if (patterns.length) next.patterns = patterns;

    const gripSizes = sp
      .getAll("gripSize")
      .map((gripSize) => normalizeAndValidateGripSize(gripSize))
      .filter(Boolean);
    if (gripSizes.length) next.gripSizes = gripSizes;

    const sort = sp.get("sort");
    if (sort) {
      const ok = SORT_OPTIONS.some((o) => o.value === (sort as SortKey));
      if (ok) next.sort = sort as SortKey;
    }

    const strict = sp.get("strict");
    if (strict === "1") next.strict = true;
    if (strict === "0") next.strict = false;

    next.price = readRange("minPrice", "maxPrice", next.price);
    next.headSize = readRange("minHeadSize", "maxHeadSize", next.headSize);
    next.weight = readRange("minWeight", "maxWeight", next.weight);
    next.balance = readRange("minBalance", "maxBalance", next.balance);
    next.lengthIn = readRange("minLengthIn", "maxLengthIn", next.lengthIn);
    next.stiffnessRa = readRange("minStiffnessRa", "maxStiffnessRa", next.stiffnessRa);
    next.swingWeight = readRange("minSwingWeight", "maxSwingWeight", next.swingWeight);

    const p = readNum("page");
    const nextPage = p && p > 0 ? Math.floor(p) : 1;
    setPage(nextPage);

    setDraft(next);
    setApplied(next);
    setHasSearched(true);
    // compare 페이지에서 돌아올 때를 대비해, 마지막 Finder URL도 업데이트
    writeFinderLastUrl(`${pathname}?${buildQuery(next, nextPage, pageSize)}`);
  }, [searchParams, pathname, router]);

  // URL이 비어도(= /rackets/finder) 이전 상태를 복구할 수 있도록 sessionStorage에 저장
  useEffect(() => {
    if (!didInitFromQueryRef.current) return;
    writeFinderState({ draft, applied, page, hasSearched });
  }, [draft, applied, page, hasSearched]);

  const qs = useMemo(() => buildQuery(applied, page, pageSize), [applied, page, pageSize]);
  const swrKey = hasSearched ? `/api/rackets/finder?${qs}` : null;
  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher);

  // 검색 이후에도 loading/error/success를 분리해서 헤더 요약이 0개/1페이지로 먼저 보이지 않게 처리
  const hasDataError = hasSearched && Boolean(error);
  const hasResolvedData = hasSearched && !isLoading && !hasDataError && Boolean(data);
  const hasResolvedTotal = hasResolvedData && typeof data?.total === "number";
  const hasResolvedTotalPages = hasResolvedTotal;

  const items = (hasResolvedData ? (data?.items ?? []) : []) as FinderRacket[];
  const total = hasResolvedTotal ? Number(data?.total ?? 0) : null;
  // total이 확정되지 않은 상태에서는 내부 보수값(1)만 사용하고, UI 표기는 분기해서 '-' 처리
  const totalPages = hasResolvedTotalPages ? Math.max(1, Math.ceil((total ?? 0) / pageSize)) : 1;

  const apply = () => {
    const next = draft;
    setApplied(next);
    setPage(1);
    setHasSearched(true);
    syncUrl(next, 1);
    setFilterSheetOpen(false);
  };
  const reset = () => {
    setDraft(DEFAULT);
    setApplied(DEFAULT);
    setPage(1);
    setHasSearched(false);
    clearFinderPersist();
    setFilterSheetOpen(false);
    router.replace(pathname, { scroll: false });
  };

  const applyNow = useCallback(
    (next: Filters) => {
      setDraft(next);
      setApplied(next);
      setPage(1);
      setHasSearched(true);
      syncUrl(next, 1);
    },
    [syncUrl],
  );

  const chips = useMemo(() => {
    if (!hasSearched) return [];

    const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1))));
    const fmtWon = (n: number) => `${n.toLocaleString()}원`;

    const list: ActiveFilterItem[] = [];
    const add = (id: string, label: string, next: Filters) => {
      list.push({ id, label, removeLabel: `${label} 필터 제거`, onRemove: () => applyNow(next) });
    };

    if (applied.q.trim()) add("q", `키워드: ${applied.q.trim()}`, { ...applied, q: "" });
    if (applied.brand)
      add("brand", `브랜드: ${racketBrandLabel(applied.brand)}`, {
        ...applied,
        brand: "",
      });
    if (applied.condition)
      add("condition", `컨디션: ${getFinderConditionFilterLabel(applied.condition)}`, {
        ...applied,
        condition: "",
      });
    if (applied.strict) add("strict", "정확도 모드: ON", { ...applied, strict: false });

    if (!rangeEq(applied.price, DEFAULT.price))
      add("price", `가격: ${fmtWon(applied.price[0])} ~ ${fmtWon(applied.price[1])}`, {
        ...applied,
        price: DEFAULT.price,
      });
    if (!rangeEq(applied.headSize, DEFAULT.headSize))
      add("head", `헤드: ${applied.headSize[0]} ~ ${applied.headSize[1]} sq.in`, {
        ...applied,
        headSize: DEFAULT.headSize,
      });
    if (!rangeEq(applied.weight, DEFAULT.weight))
      add("weight", `무게: ${applied.weight[0]} ~ ${applied.weight[1]} g`, {
        ...applied,
        weight: DEFAULT.weight,
      });
    if (!rangeEq(applied.balance, DEFAULT.balance))
      add("balance", `밸런스: ${applied.balance[0]} ~ ${applied.balance[1]} mm`, {
        ...applied,
        balance: DEFAULT.balance,
      });
    if (!rangeEq(applied.lengthIn, DEFAULT.lengthIn))
      add("length", `길이: ${fmtNum(applied.lengthIn[0])} ~ ${fmtNum(applied.lengthIn[1])} in`, {
        ...applied,
        lengthIn: DEFAULT.lengthIn,
      });
    if (!rangeEq(applied.stiffnessRa, DEFAULT.stiffnessRa))
      add("ra", `강성(RA): ${applied.stiffnessRa[0]} ~ ${applied.stiffnessRa[1]}`, {
        ...applied,
        stiffnessRa: DEFAULT.stiffnessRa,
      });
    if (!rangeEq(applied.swingWeight, DEFAULT.swingWeight))
      add("sw", `스윙웨이트(SW): ${applied.swingWeight[0]} ~ ${applied.swingWeight[1]}`, {
        ...applied,
        swingWeight: DEFAULT.swingWeight,
      });

    for (const p of applied.patterns) {
      const display = stringPatternLabel(p);
      add(`pattern:${p}`, `패턴: ${display}`, {
        ...applied,
        patterns: applied.patterns.filter((x) => x !== p),
      });
    }

    for (const gripSize of applied.gripSizes) {
      add(`gripSize:${gripSize}`, `그립: ${gripSizeLabel(gripSize)}`, {
        ...applied,
        gripSizes: applied.gripSizes.filter((x) => x !== gripSize),
      });
    }

    return list;
  }, [applied, hasSearched, applyNow]);

  const renderFilterControls = () => (
    <div className="space-y-6">
      {/* 검색어 */}
      <div className="space-y-2">
        <SectionLabel>모델/키워드 검색</SectionLabel>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={draft.q}
            onChange={(e) => setDraft((p) => ({ ...p, q: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
            placeholder="예) ezone, vcore, blade..."
            className="min-h-11 rounded-control pl-9 bg-background/50 dark:bg-background/30 focus-visible:ring-primary/50" aria-label="모델 또는 키워드 검색"
          />
        </div>
      </div>

      {/* 브랜드 & 컨디션 */}
      <div className="space-y-3">
        <SectionLabel>브랜드 / 컨디션</SectionLabel>
        <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2">
          <Select
            value={draft.brand || undefined}
            onValueChange={(v) => setDraft((p) => ({ ...p, brand: v === ALL ? "" : v }))}
          >
            <SelectTrigger className="min-h-11 rounded-control bg-background/50 dark:bg-background/30 focus:ring-primary/50">
              <SelectValue placeholder="전체 브랜드" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체</SelectItem>
              {RACKET_BRANDS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={draft.condition || undefined}
            onValueChange={(v) => setDraft((p) => ({ ...p, condition: v === ALL ? "" : v }))}
          >
            <SelectTrigger className="min-h-11 rounded-control bg-background/50 dark:bg-background/30 focus:ring-primary/50">
              <SelectValue placeholder="전체 컨디션" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체</SelectItem>
              <SelectItem value="A">A (최상급)</SelectItem>
              <SelectItem value="B">B (양호)</SelectItem>
              <SelectItem value="C">C (보통)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 기본 스펙 슬라이더 */}
      <div className="space-y-4">
        <SectionLabel>기본 스펙</SectionLabel>
        <RangeField
          label="가격"
          value={draft.price}
          min={0}
          max={600000}
          step={10000}
          suffix="원"
          onChange={(v) => setDraft((p) => ({ ...p, price: v }))}
        />
        <RangeField
          label="헤드 사이즈"
          value={draft.headSize}
          min={80}
          max={120}
          step={1}
          suffix=" sq.in"
          onChange={(v) => setDraft((p) => ({ ...p, headSize: v }))}
        />
        <RangeField
          label="무게"
          value={draft.weight}
          min={200}
          max={380}
          step={1}
          suffix="g"
          onChange={(v) => setDraft((p) => ({ ...p, weight: v }))}
        />
      </div>
      <div className="space-y-4">
        <RangeField
          label="밸런스"
          value={draft.balance}
          min={280}
          max={380}
          step={1}
          suffix="mm"
          onChange={(v) => setDraft((p) => ({ ...p, balance: v }))}
        />
        <RangeField
          label="길이"
          value={draft.lengthIn}
          min={25}
          max={29}
          step={0.1}
          suffix="in"
          onChange={(v) => setDraft((p) => ({ ...p, lengthIn: v }))}
        />
        <RangeField
          label="강성 (RA)"
          value={draft.stiffnessRa}
          min={45}
          max={80}
          step={1}
          suffix=""
          onChange={(v) => setDraft((p) => ({ ...p, stiffnessRa: v }))}
        />
        <RangeField
          label="스윙웨이트 (SW)"
          value={draft.swingWeight}
          min={250}
          max={390}
          step={1}
          suffix=""
          onChange={(v) => setDraft((p) => ({ ...p, swingWeight: v }))}
        />
      </div>

      {/* 스트링 패턴 */}
      <div className="space-y-3">
        <SectionLabel>스트링 패턴</SectionLabel>
        <div className="grid grid-cols-1 gap-2 bp-sm:grid-cols-2">
          {STRING_PATTERN_OPTIONS.map((patternOption) => {
            const key = normalizePattern(patternOption.value);
            const checked = draft.patterns.includes(key);
            return (
              <label
                key={patternOption.value}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-ui-body-sm min-h-11 leading-snug transition-[background-color,color,border-color,box-shadow,opacity] duration-200",
                  "bg-background/50 dark:bg-background/30 hover:bg-background/80 dark:hover:bg-background/50",
                  checked && "bg-secondary ring-1 ring-border",
                )}
              >
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={checked}
                  onCheckedChange={(v) => {
                    setDraft((prev) => {
                      const set = new Set(prev.patterns);
                      if (v) set.add(key);
                      else set.delete(key);
                      return { ...prev, patterns: Array.from(set) };
                    });
                  }}
                />
                <span className={cn("min-w-0 leading-snug", checked && "font-medium text-primary")}>
                  {patternOption.label.includes("(") ? (
                    <>
                      <span className="block">{patternOption.label.split(" (")[0]}</span>
                      <span className="block text-ui-label text-muted-foreground">
                        {patternOption.label.split(" (")[1]?.replace(")", "")}
                      </span>
                    </>
                  ) : (
                    patternOption.label
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 그립 사이즈 */}
      <div className="space-y-3">
        <SectionLabel>그립 사이즈</SectionLabel>
        <div className="grid grid-cols-1 gap-2">
          {GRIP_SIZE_OPTIONS.map((gripOption) => {
            const checked = draft.gripSizes.includes(gripOption.value);
            return (
              <label
                key={gripOption.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-ui-body-sm min-h-11 transition-[background-color,color,border-color,box-shadow,opacity] duration-200",
                  "bg-background/50 dark:bg-background/30 hover:bg-background/80 dark:hover:bg-background/50",
                  checked && "bg-secondary ring-1 ring-border",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    setDraft((prev) => {
                      const set = new Set(prev.gripSizes);
                      if (v) set.add(gripOption.value);
                      else set.delete(gripOption.value);
                      return { ...prev, gripSizes: Array.from(set) };
                    });
                  }}
                />
                <span className={cn(checked && "font-medium text-primary")}>
                  {gripOption.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 상세 검색 */}
      <div className="space-y-4 pt-4 border-t border-muted/50">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-ui-label font-semibold uppercase tracking-wider text-muted-foreground">
            상세 검색
          </span>
        </div>

        <label
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 min-h-11 transition-[background-color,color,border-color,box-shadow,opacity] duration-200",
            "bg-background/50 dark:bg-background/30 hover:bg-background/80 dark:hover:bg-background/50",
            draft.strict && "bg-muted ring-1 ring-ring",
          )}
        >
          <Checkbox
            checked={draft.strict}
            onCheckedChange={(v) => setDraft((p) => ({ ...p, strict: !!v }))}
          />
          <div className="flex-1">
            <div className={cn("text-ui-body-sm font-medium", draft.strict && "text-primary")}>
              정확도 모드
            </div>
            <div className="text-ui-label text-muted-foreground">스펙 누락 상품 제외</div>
          </div>
          {draft.strict && <Sparkles className="h-4 w-4 text-primary" />}
        </label>
      </div>

    </div>
  );

  const draftActiveCount = countActiveFinderFilters(draft);
  const canGoPrevious = hasSearched && !isLoading && !hasDataError && hasResolvedTotalPages && page > 1;
  const canGoNext = hasSearched && !isLoading && !hasDataError && hasResolvedTotalPages && page < totalPages;
  const handlePrevious = () => {
    const nextPage = Math.max(1, page - 1);
    setPage(nextPage);
    syncUrl(applied, nextPage);
  };
  const handleNext = () => {
    const nextPage = Math.min(totalPages, page + 1);
    setPage(nextPage);
    syncUrl(applied, nextPage);
  };
  const handleSortChange = (value: SortKey) => {
    const ok = SORT_OPTIONS.some((o) => o.value === value);
    if (!ok) return;
    applyNow({ ...applied, sort: value });
  };

  const filterControls = renderFilterControls();
  const filterTrigger = (
    <Button type="button" variant="outline" onClick={() => setFilterSheetOpen(true)} className="h-10 min-h-10 justify-center whitespace-nowrap rounded-control px-3">
      <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
      필터 {draftActiveCount > 0 ? draftActiveCount : ""}
    </Button>
  );

  return (
    <div className="space-y-5 bp-md:space-y-6">
      <RacketFinderHeader />

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="h-[88dvh] max-h-[88dvh] overflow-hidden rounded-t-3xl p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>라켓 필터</SheetTitle>
            <SheetDescription>원하는 조건을 선택한 뒤 검색하기를 눌러주세요.</SheetDescription>
          </SheetHeader>
          <div className="h-full min-h-0 [&>div]:!h-full [&>div]:!max-h-full">
            <CatalogFilterPanelShell
              title="라켓 필터"
              activeCount={draftActiveCount}
              description="가격과 스펙 조건을 선택한 뒤 검색하기를 누르면 결과에 반영됩니다."
              onReset={reset}
              onApply={apply}
              applyLabel="검색하기"
            >
              {filterControls}
            </CatalogFilterPanelShell>
          </div>
        </SheetContent>
      </Sheet>

      <RacketFinderToolbar
        filterTrigger={filterTrigger}
        hasSearched={hasSearched}
        total={total}
        page={page}
        totalPages={hasResolvedTotalPages ? totalPages : null}
        isLoading={isLoading}
        hasError={hasDataError}
        sort={applied.sort}
        sortOptions={SORT_OPTIONS}
        onSortChange={handleSortChange}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />

      {hasSearched && chips.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <ActiveFilterBar items={chips} onResetAll={reset} resetLabel="필터 초기화" />
        </div>
      ) : null}

      <div className="bp-lg:grid bp-lg:grid-cols-[320px_minmax(0,1fr)] bp-lg:gap-8">
        <div className="hidden bp-lg:block">
          <StickyAside>
            <section className="overflow-hidden rounded-panel border border-border bg-card shadow-sm">
              <header className="flex items-center justify-between gap-3 border-b border-border p-4">
                <div>
                  <h2 className="text-ui-section-title font-semibold text-foreground">라켓 필터</h2>
                  <p className="text-ui-label text-muted-foreground">적용 조건 {draftActiveCount}개</p>
                </div>
                <Filter className="h-4 w-4 text-primary" aria-hidden="true" />
              </header>
              <div className="p-4">{filterControls}</div>
              <footer className="sticky bottom-0 flex gap-2 border-t border-border bg-card/95 p-4 backdrop-blur">
                <Button type="button" variant="outline" onClick={reset} className="h-11 min-h-11 flex-1 rounded-control whitespace-nowrap">
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                  초기화
                </Button>
                <Button type="button" variant="highlight_soft" onClick={apply} className="h-11 min-h-11 flex-1 rounded-control whitespace-nowrap">
                  <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                  검색하기
                </Button>
              </footer>
            </section>
          </StickyAside>
        </div>

        <main className="min-w-0 space-y-5">
          {!hasSearched ? (
            <EmptyState
              icon={<Search className="h-8 w-8" />}
              title="라켓 검색을 시작해보세요"
              description={<>가격과 원하는 스펙을 선택한 뒤 검색하기를 눌러주세요.<br />정확도 모드를 켜면 스펙 정보가 없는 라켓은 제외됩니다.</>}
              action={<Button type="button" variant="outline" onClick={() => setFilterSheetOpen(true)} className="bp-lg:hidden">필터 열기</Button>}
            />
          ) : isLoading ? (
            <FinderRacketCardSkeleton count={6} />
          ) : error ? (
            <EmptyState
              icon={<Search className="h-8 w-8" />}
              title="라켓 목록을 불러오지 못했습니다"
              description="잠시 후 다시 시도해주세요."
              action={<Button type="button" variant="outline" onClick={() => void mutate()}>다시 시도</Button>}
              className="border-destructive/30 bg-destructive/10 dark:bg-destructive/15"
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Search className="h-8 w-8" />}
              title="조건에 맞는 라켓이 없습니다"
              description="가격이나 스펙 범위를 넓히거나 정확도 모드를 해제해보세요."
              action={<Button type="button" variant="outline" onClick={reset}>필터 초기화</Button>}
            />
          ) : (
            <div className="space-y-4">
              {items.map((r) => (
                <FinderRacketCard key={r.id} racket={r} />
              ))}
            </div>
          )}
        </main>
      </div>
      <RacketCompareTray />
    </div>
  );
}
