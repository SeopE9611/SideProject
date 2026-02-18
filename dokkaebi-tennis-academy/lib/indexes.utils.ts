type IndexDocument = {
  name?: string;
  key?: Record<string, unknown>;
  unique?: boolean;
  expireAfterSeconds?: number;
};

type DesiredIndexSpec = {
  keys: Record<string, unknown>;
  name: string;
  options?: Record<string, unknown>;
};

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeExpireAfterSeconds(value: unknown) {
  if (typeof value !== 'number') return undefined;
  return value;
}

function isSameKeys(a: Record<string, unknown> = {}, b: Record<string, unknown> = {}) {
  const aEntries = Object.entries(a);
  const bEntries = Object.entries(b);

  if (aEntries.length !== bEntries.length) return false;

  return aEntries.every(([aKey, aValue], idx) => {
    const [bKey, bValue] = bEntries[idx] ?? [];
    return aKey === bKey && aValue === bValue;
  });
}

/**
 * 이름이 다르더라도 동일한 키/옵션의 인덱스가 이미 있으면 생성을 건너뛴다.
 * MongoDB는 동일 사양 인덱스를 다른 이름으로 만들려고 하면 code 85(IndexOptionsConflict)를 반환한다.
 */
export function hasMatchingIndex(existing: readonly IndexDocument[], spec: DesiredIndexSpec) {
  return existing.some((idx) => {
    if (idx?.name === spec.name) return true;

    const keysMatch = isSameKeys((idx?.key ?? {}) as Record<string, unknown>, spec.keys);
    if (!keysMatch) return false;

    const desiredUnique = normalizeBoolean(spec.options?.unique);
    const existingUnique = normalizeBoolean(idx?.unique);
    if (desiredUnique !== existingUnique) return false;

    const desiredExpireAfterSeconds = normalizeExpireAfterSeconds(spec.options?.expireAfterSeconds);
    const existingExpireAfterSeconds = normalizeExpireAfterSeconds(idx?.expireAfterSeconds);
    return desiredExpireAfterSeconds === existingExpireAfterSeconds;
  });
}
