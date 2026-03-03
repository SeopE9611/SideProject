export const PACKAGE_VARIANTS = ['primary', 'accent', 'muted', 'success'] as const;

export type PackageVariant = (typeof PACKAGE_VARIANTS)[number];

export const DEFAULT_PACKAGE_VARIANT: PackageVariant = 'primary';

const PACKAGE_VARIANTS_BY_INDEX: readonly PackageVariant[] = ['primary', 'accent', 'primary', 'primary'];

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
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-primary/15 text-primary',
  muted: 'bg-muted text-foreground',
  success: 'bg-primary/20 text-primary',
};

export const PACKAGE_VARIANT_TOP_BAR_CLASS: Record<PackageVariant, string> = {
  primary: 'bg-primary/70',
  accent: 'bg-primary',
  muted: 'bg-primary/60',
  success: 'bg-primary/80',
};

export const PACKAGE_VARIANT_ICON_CLASS: Record<PackageVariant, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-primary/15 text-primary',
  muted: 'bg-muted text-foreground',
  success: 'bg-primary/20 text-primary',
};

export const PACKAGE_VARIANT_DOT_CLASS: Record<PackageVariant, string> = {
  primary: 'bg-primary/80',
  accent: 'bg-primary',
  muted: 'bg-primary/70',
  success: 'bg-primary/90',
};

export const PACKAGE_VARIANT_BUTTON_CLASS: Record<PackageVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  accent: 'bg-primary text-primary-foreground hover:bg-primary/90',
  muted: 'bg-primary text-primary-foreground hover:bg-primary/90',
  success: 'bg-primary text-primary-foreground hover:bg-primary/90',
};
