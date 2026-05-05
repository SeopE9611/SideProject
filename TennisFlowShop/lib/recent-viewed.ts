export type RecentViewedType = "product" | "racket";

export type RecentViewedItem = {
  type: RecentViewedType;
  id: string;
  name: string;
  subtitle?: string;
  image?: string;
  href: string;
  price?: number | null;
  viewedAt: number;
};

const STORAGE_KEY = "tennisflow.recent-viewed.v1";
const MAX_ITEMS = 12;

const isRecentViewedType = (value: unknown): value is RecentViewedType => value === "product" || value === "racket";

const normalizeRecentViewedItem = (value: unknown): RecentViewedItem | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<RecentViewedItem>;
  const type = raw.type;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const href = typeof raw.href === "string" ? raw.href.trim() : "";
  const viewedAt = Number(raw.viewedAt);

  if (!isRecentViewedType(type) || !id || !name || !href || !Number.isFinite(viewedAt)) return null;

  return {
    type,
    id,
    name,
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : undefined,
    image: typeof raw.image === "string" ? raw.image : undefined,
    href,
    price: raw.price == null ? null : Number.isFinite(Number(raw.price)) ? Number(raw.price) : null,
    viewedAt,
  };
};

export function getRecentViewedItems(): RecentViewedItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeRecentViewedItem)
      .filter((item): item is RecentViewedItem => item !== null)
      .sort((a, b) => b.viewedAt - a.viewedAt)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addRecentViewedItem(item: Omit<RecentViewedItem, "viewedAt">): void {
  if (typeof window === "undefined") return;
  if (!item || !item.id?.trim() || !item.name?.trim() || !item.href?.trim()) return;

  const nextItem: RecentViewedItem = {
    ...item,
    id: item.id.trim(),
    name: item.name.trim(),
    href: item.href.trim(),
    viewedAt: Date.now(),
  };

  const current = getRecentViewedItems();
  const deduped = current.filter((it) => !(it.type === nextItem.type && it.id === nextItem.id));
  const next = [nextItem, ...deduped].sort((a, b) => b.viewedAt - a.viewedAt).slice(0, MAX_ITEMS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // noop
  }
}

export function clearRecentViewedItems(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
