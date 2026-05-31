export type ActivityTodoApplicationLike = {
  status?: string | null;
  hasTracking?: boolean | null;
  needsInboundTracking?: boolean | null;
  userConfirmedAt?: string | null;
};

export function normalizeMypageTodoStatus(status?: string | null): string {
  const raw = String(status ?? '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();

  if (['pending', '대기중'].includes(lower)) return '대기중';
  if (['paid', '결제완료'].includes(lower)) return '결제완료';
  if (['delivered', '배송완료'].includes(lower)) return '배송완료';
  if (['requested', '접수완료', 'received'].includes(lower)) return '접수완료';
  if (['reviewing', '검토중', '검토 중'].includes(lower)) return '검토 중';
  if (['completed', '완료', '교체완료'].includes(lower)) return '교체완료';

  return raw;
}

export function isApplicationTodoActionable(app?: ActivityTodoApplicationLike | null): boolean {
  if (!app) return false;
  const status = normalizeMypageTodoStatus(app.status);
  return Boolean((app.needsInboundTracking && !app.hasTracking) || (status === '교체완료' && !app.userConfirmedAt));
}

export function isOrderTodoActionable(params: {
  status?: string | null;
  userConfirmedAt?: string | null;
  reviewPendingCount?: number | null;
  linkedApplications?: Array<ActivityTodoApplicationLike | null | undefined>;
  primaryApplication?: ActivityTodoApplicationLike | null;
}): boolean {
  const status = normalizeMypageTodoStatus(params.status);
  const isConfirmed = Boolean(params.userConfirmedAt) || status === '구매확정';
  const hasPendingReview = (params.reviewPendingCount ?? 0) > 0;
  const hasActionableLinkedApplication = (params.linkedApplications ?? []).some((app) => isApplicationTodoActionable(app));

  return Boolean(status === '배송완료' || hasActionableLinkedApplication || (isConfirmed && hasPendingReview) || isApplicationTodoActionable(params.primaryApplication));
}

export function isRentalTodoActionable(params: {
  linkedApplications?: Array<ActivityTodoApplicationLike | null | undefined>;
  primaryApplication?: ActivityTodoApplicationLike | null;
  stringingApplicationId?: string | null;
  withStringService?: boolean | null;
}): boolean {
  const hasActionableLinkedApplication = (params.linkedApplications ?? []).some((app) => isApplicationTodoActionable(app));
  return Boolean(
    hasActionableLinkedApplication ||
      isApplicationTodoActionable(params.primaryApplication) ||
      (!params.stringingApplicationId && params.withStringService),
  );
}
