export type PackageUsageInput = {
  hasPackage: boolean;
  packageRemaining: number;
  requiredPassCount: number;
  packageOptOut: boolean;
};

export type PackageUsageResult = {
  canApplyPackage: boolean;
  packageInsufficient: boolean;
  usingPackage: boolean;
};

const toSafeInt = (value: unknown) => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
};

export function resolvePackageUsage({ hasPackage, packageRemaining, requiredPassCount, packageOptOut }: PackageUsageInput): PackageUsageResult {
  const required = toSafeInt(requiredPassCount);
  const remaining = toSafeInt(packageRemaining);

  const canApplyPackage = Boolean(hasPackage && required > 0 && remaining >= required);
  const packageInsufficient = Boolean(hasPackage && required > 0 && remaining < required);
  const usingPackage = Boolean(canApplyPackage && !packageOptOut);

  return {
    canApplyPackage,
    packageInsufficient,
    usingPackage,
  };
}

export function applyPackageToServiceFee(baseServiceFee: number, packageUsage: Pick<PackageUsageResult, 'usingPackage'>): number {
  const base = toSafeInt(baseServiceFee);
  return packageUsage.usingPackage ? 0 : base;
}

export function resolveRequiredPassCountFromInput(input: {
  lines?: Array<{ stringProductId?: string | null }> | null;
  stringTypes?: string[] | null;
}): number {
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (lines.length > 0) {
    return lines.reduce((sum, line) => (line?.stringProductId ? sum + 1 : sum), 0);
  }

  const types = Array.isArray(input.stringTypes) ? input.stringTypes.filter(Boolean) : [];
  return Math.max(0, types.length);
}
