export const PACKAGE_VARIANTS = ['primary', 'accent', 'muted', 'success'] as const;

export type PackageVariant = (typeof PACKAGE_VARIANTS)[number];

export const DEFAULT_PACKAGE_VARIANT: PackageVariant = 'primary';

const PACKAGE_VARIANTS_BY_INDEX: readonly PackageVariant[] = ['primary', 'accent', 'muted', 'success'];

export const isPackageVariant = (value: unknown): value is PackageVariant => {
  return typeof value === 'string' && PACKAGE_VARIANTS.includes(value as PackageVariant);
};

export const toPackageVariant = (value: unknown, fallback: PackageVariant = DEFAULT_PACKAGE_VARIANT): PackageVariant => {
  return isPackageVariant(value) ? value : fallback;
};

export const getPackageVariantByIndex = (index: number): PackageVariant => {
  return PACKAGE_VARIANTS_BY_INDEX[index] ?? DEFAULT_PACKAGE_VARIANT;
};

export const PACKAGE_VARIANT_TONE_CLASS: Record<PackageVariant, string> = {
  primary: 'bg-primary text-primary-foreground',
  accent: 'bg-accent text-accent-foreground',
  muted: 'bg-muted text-muted-foreground',
  success: 'bg-success text-success-foreground',
};
