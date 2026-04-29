import type { RecommendableProduct } from "@/app/products/recommend/_types";

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function pickImage(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.image === "string" && raw.image) return raw.image;
  if (Array.isArray(raw.images) && typeof raw.images[0] === "string") return raw.images[0];
  return undefined;
}

export function normalizeRecommendableProduct(raw: Record<string, unknown>): RecommendableProduct | null {
  const id = String(raw._id ?? raw.id ?? "").trim();
  const name = String(raw.name ?? "").trim();
  if (!id || !name) return null;

  const brandRaw = raw.brand;
  const brand =
    typeof brandRaw === "string"
      ? brandRaw
      : brandRaw && typeof brandRaw === "object"
        ? String((brandRaw as Record<string, unknown>).name ?? (brandRaw as Record<string, unknown>).label ?? "").trim() || undefined
        : undefined;

  const featuresRaw = (raw.features as Record<string, unknown> | undefined) ?? {};
  const tagsRaw = (raw.tags as Record<string, unknown> | undefined) ?? {};
  const inventoryRaw = (raw.inventory as Record<string, unknown> | undefined) ?? {};

  return {
    id,
    name,
    brand,
    price: toNumber(raw.price, 0),
    image: pickImage(raw),
    material: typeof raw.material === "string" ? raw.material : undefined,
    gauge: typeof raw.gauge === "string" ? raw.gauge : undefined,
    mountingFee: toNumber(raw.mountingFee, 0),
    shippingFee: toNumber(raw.shippingFee, 0),
    features: {
      power: toNumber(featuresRaw.power, 0),
      control: toNumber(featuresRaw.control, 0),
      spin: toNumber(featuresRaw.spin, 0),
      durability: toNumber(featuresRaw.durability, 0),
      comfort: toNumber(featuresRaw.comfort, 0),
    },
    tags: {
      beginner: toBoolean(tagsRaw.beginner),
      intermediate: toBoolean(tagsRaw.intermediate),
      advanced: toBoolean(tagsRaw.advanced),
      baseline: toBoolean(tagsRaw.baseline),
      serveVolley: toBoolean(tagsRaw.serveVolley),
      allCourt: toBoolean(tagsRaw.allCourt),
      power: toBoolean(tagsRaw.power),
    },
    inventory: {
      stock: toNumber(inventoryRaw.stock, 0),
      status: typeof inventoryRaw.status === "string" ? inventoryRaw.status : undefined,
      manageStock: toBoolean(inventoryRaw.manageStock),
      allowBackorder: toBoolean(inventoryRaw.allowBackorder),
    },
  };
}
