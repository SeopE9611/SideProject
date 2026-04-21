import type { Db, IndexDirection } from 'mongodb';
import { hasMatchingIndex } from '@/lib/indexes.utils';

type Keys = Record<string, IndexDirection>;

type IndexSpec = {
  readonly keys: Keys;
  readonly options?: Record<string, unknown>;
  readonly name: string;
};

const RISK_INDEX_SPECS: readonly IndexSpec[] = [
  {
    name: 'cancel_refund_risk_subject_event_unique',
    keys: { category: 1, subjectKey: 1, eventType: 1 },
    options: { unique: true },
  },
  {
    name: 'cancel_refund_risk_lastAt_desc',
    keys: { lastAt: -1 },
  },
  {
    name: 'cancel_refund_risk_target_lastAt_desc',
    keys: { targetType: 1, targetId: 1, lastAt: -1 },
  },
];

export async function ensureRiskIndexes(db: Db) {
  const col = db.collection('cancel_refund_risk_signals');
  const existing = await col
    .listIndexes()
    .toArray()
    .catch(() => [] as any[]);

  for (const spec of RISK_INDEX_SPECS) {
    if (hasMatchingIndex(existing as any[], spec)) continue;

    await col.createIndex(spec.keys, {
      name: spec.name,
      ...(spec.options ?? {}),
    });
  }
}

export { RISK_INDEX_SPECS };
