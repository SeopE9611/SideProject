import { DEFAULT_PACKAGE_CONFIGS } from '@/lib/package-settings';
import type { PackageVariant } from '@/app/services/packages/_lib/packageVariant';

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
  10: '테니스를 시작하는 분들에게 적합한 기본 패키지',
  30: '정기적으로 테니스를 즐기는 분들을 위한 인기 패키지',
  50: '진지한 테니스 플레이어를 위한 프리미엄 패키지',
  100: '프로 선수와 열정적인 플레이어를 위한 최고급 패키지',
};

const DEFAULT_VARIANTS: Record<number, PackageVariant> = {
  10: 'primary',
  30: 'accent',
  50: 'primary',
  100: 'primary',
};

const FEATURE_FALLBACK: Record<number, string[]> = Object.fromEntries(DEFAULT_PACKAGE_CONFIGS.map((config) => [config.sessions, config.features]));

export const formatValidityPeriod = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '유효기간 설정 없음';
    if (/^\d+$/.test(trimmed)) return formatValidityPeriod(Number(trimmed));
    return trimmed;
  }

  const days = Number(value ?? 0);
  if (!days || days <= 0) return '유효기간 설정 없음';
  if (days < 30) return `${days}일`;

  const months = Math.floor(days / 30);
  const daysRemainder = days % 30;

  if (daysRemainder === 0) return `${months}개월`;
  return `${months}개월 ${daysRemainder}일`;
};

const calculateDiscount = (price: number, originalPrice?: number): number | undefined => {
  if (!originalPrice || originalPrice <= 0 || price <= 0 || price >= originalPrice) return undefined;
  return Math.round((1 - price / originalPrice) * 100);
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
  const perSession = input.sessions > 0 ? Math.round(input.price / input.sessions) : 0;
  const discount = input.discount ?? calculateDiscount(input.price, input.originalPrice);

  const normalizedBenefits = [
    perSession > 0 ? `회당 ${perSession.toLocaleString()}원` : null,
    discount ? `${discount}% 할인` : null,
    validityPeriod !== '유효기간 설정 없음' ? `유효기간 ${validityPeriod}` : null,
    ...(input.benefits ?? []),
  ].filter((item, index, arr): item is string => !!item && arr.indexOf(item) === index);

  const features = (input.features && input.features.length > 0 ? input.features : FEATURE_FALLBACK[input.sessions] ?? []).slice(0, 5);

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
    variant: input.variant ?? DEFAULT_VARIANTS[input.sessions] ?? 'primary',
    description: input.description || DEFAULT_DESCRIPTIONS[input.sessions] || `${input.sessions}회 스트링 교체 패키지`,
    validityPeriod,
  };
};
