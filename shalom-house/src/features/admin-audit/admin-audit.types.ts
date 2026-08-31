export type AdminAuditHistoryItem = {
  id: string;
  actionLabel: string;
  actorDisplayName: string;
  occurredAt: string;
  changedFieldLabels: readonly string[];
};
