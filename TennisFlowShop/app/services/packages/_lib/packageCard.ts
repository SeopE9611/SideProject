import type { PackageVariant } from "@/app/services/packages/_lib/packageVariant";
import { DEFAULT_PACKAGE_CONFIGS } from "@/lib/package-settings";

export interface PackageCardData {
  id: string;
  title: string;
  sessions: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  popular?: boolean;
  features: string[];
  benefits: string[];
  variant: PackageVariant;
  description: string;
  validityPeriod: string;
}

const DEFAULT_DESCRIPTIONS: Record<number, string> = {
  10: "테니스를 시작하는 분들에게 적합한 기본 패키지",
  30: "정기적으로 테니스를 즐기는 분들을 위한 추천 패키지",
  50: "진지한 테니스 플레이어를 위한 프리미엄 패키지",
  100: "프로 선수와 열정적인 플레이어를 위한 최고급 패키지",
};

const DEFAULT_VARIANTS: Record<number, PackageVariant> = {
  10: "primary",
  30: "accent",
  50: "primary",
  100: "primary",
};

const FEATURE_FALLBACK: Record<number, string[]> = Object.fromEntries(DEFAULT_PACKAGE_CONFIGS.map((config) => [config.sessions, config.features]));

export function getPackagePricingMeta(pkg: { sessions: number; price: number; originalPrice?: number }) {
  const toSafeNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const sessions = toSafeNumber(pkg.sessions);
  const price = toSafeNumber(pkg.price);
  const originalPrice = toSafeNumber(pkg.originalPrice);
  const perSession = sessions > 0 ? Math.round(price / sessions) : 0;
  const originalPerSession = sessions > 0 && originalPrice > 0 ? Math.round(originalPrice / sessions) : 0;
  const rawDiscountRate = originalPrice > price && originalPrice > 0 ? (1 - price / originalPrice) * 100 : 0;
  const discountRate = rawDiscountRate > 0 ? Number(rawDiscountRate.toFixed(1)) : 0;
  const savingAmount = originalPrice > price ? originalPrice - price : 0;

  return { perSession, originalPerSession, discountRate, savingAmount };
}

export const formatValidityPeriod = (value: unknown): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "유효기간 설정 없음";
    if (/^\d+$/.test(trimmed)) return formatValidityPeriod(Number(trimmed));
    return trimmed;
  }

  const days = Number(value ?? 0);
  if (!days || days <= 0) return "유효기간 설정 없음";
  if (days < 30) return `${days}일`;

  const months = Math.floor(days / 30);
  const daysRemainder = days % 30;

  if (daysRemainder === 0) return `${months}개월`;
  return `${months}개월 ${daysRemainder}일`;
};

const calculateDiscount = (price: number, originalPrice?: number): number | undefined => {
  if (!originalPrice || originalPrice <= 0 || price <= 0 || price >= originalPrice) return undefined;
  return Number(((1 - price / originalPrice) * 100).toFixed(1));
};

export const normalizePackageCardData = (input: {
  id: string;
  title?: string;
  sessions: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  popular?: boolean;
  features?: string[];
  benefits?: string[];
  variant: PackageVariant;
  description?: string;
  validityPeriod: unknown;
}): PackageCardData => {
  const validityPeriod = formatValidityPeriod(input.validityPeriod);
  const { discountRate } = getPackagePricingMeta(input);
  const discount = input.discount ?? discountRate ?? calculateDiscount(input.price, input.originalPrice);

  const normalizedBenefits = [validityPeriod !== "유효기간 설정 없음" ? `유효기간 ${validityPeriod}` : null, ...(input.benefits ?? [])].filter((item, index, arr): item is string => !!item && arr.indexOf(item) === index);

  const features = (input.features && input.features.length > 0 ? input.features : (FEATURE_FALLBACK[input.sessions] ?? [])).slice(0, 5);

  return {
    id: input.id,
    title: input.title || `${input.sessions}회 패키지`,
    sessions: input.sessions,
    price: input.price,
    originalPrice: input.originalPrice,
    discount,
    popular: input.popular ?? input.sessions === 30,
    features,
    benefits: normalizedBenefits,
    variant: input.variant ?? DEFAULT_VARIANTS[input.sessions] ?? "primary",
    description: input.description || DEFAULT_DESCRIPTIONS[input.sessions] || `${input.sessions}회 스트링 교체 패키지`,
    validityPeriod,
  };
};
