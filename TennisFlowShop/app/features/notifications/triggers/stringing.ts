import { upsertOutbox } from '../core/outbox.repo';
import { renderForEvent } from '../core/render';
import { dispatchOutbox } from '../core/dispatch';
import { ApplicationCtx, EventType, UserCtx } from '@/app/features/notifications/core/type';

async function fire(eventType: EventType, ctx: { user: UserCtx; application: ApplicationCtx; adminDetailUrl?: string; dedupeKey: string; channels: ('email' | 'slack' | 'sms')[] }) {
  const rendered = await renderForEvent(eventType, { user: ctx.user, application: ctx.application, adminDetailUrl: ctx.adminDetailUrl });
  const outboxId = await upsertOutbox({ eventType, channels: ctx.channels, payload: { user: ctx.user, application: ctx.application }, rendered, dedupeKey: ctx.dedupeKey });
  await dispatchOutbox(outboxId, rendered, ctx.channels);
}

export async function onApplicationSubmitted(params: { user: UserCtx; application: ApplicationCtx; adminDetailUrl: string }) {
  const dedupeKey = `${params.application.applicationId}:submitted`;
  await fire('stringing.application_submitted', { ...params, dedupeKey, channels: ['email', 'slack', 'sms'] });
}

export async function onStatusUpdated(params: { user: UserCtx; application: ApplicationCtx; adminDetailUrl: string }) {
  const app = params.application;
  const key = `${app.applicationId}:status:${app.status}`;

  // 상태별로 알맞은 이벤트/채널 전송
  if (app.status === '교체완료') {
    // 작업 완료는 문자도 보냄
    await fire('stringing.service_completed', {
      ...params,
      dedupeKey: key,
      channels: ['email', 'sms'],
    });
    return;
  }

  if (app.status === '작업 중') {
    // 작업 시작 알림도 원하면 문자 포함(원치 않으면 ['email']만)
    await fire('stringing.service_in_progress', {
      ...params,
      dedupeKey: key,
      channels: ['email', 'sms'],
    });
    return;
  }

  // 그 외(검토 중/접수완료 등): 이메일만 간단 공지
  await fire('stringing.status_updated', {
    ...params,
    dedupeKey: key,
    channels: ['email'],
  });
}
export async function onScheduleConfirmed(params: { user: UserCtx; application: ApplicationCtx }) {
  const app = params.application;
  const key = `${app.applicationId}:schedule:${app.stringDetails?.preferredDate}T${app.stringDetails?.preferredTime}`;
  await fire('stringing.schedule_confirmed', { ...params, adminDetailUrl: undefined, dedupeKey: key, channels: ['email', 'sms'] });
}

export async function onScheduleUpdated(params: { user: UserCtx; application: ApplicationCtx }) {
  const key = `${params.application.applicationId}:schedule-updated:${params.application.stringDetails?.preferredDate}T${params.application.stringDetails?.preferredTime}`;
  await fire('stringing.schedule_updated', {
    ...params,
    adminDetailUrl: undefined,
    dedupeKey: key,
    channels: ['email', 'sms'],
  });
}

export async function onApplicationCanceled(params: { user: UserCtx; application: ApplicationCtx }) {
  const key = `${params.application.applicationId}:application-canceled`;
  await fire('stringing.application_canceled', {
    ...params,
    adminDetailUrl: undefined,
    dedupeKey: key,
    channels: ['email', 'sms'],
  });
}

export async function onScheduleCanceled(params: { user: UserCtx; application: ApplicationCtx }) {
  const key = `${params.application.applicationId}:schedule-canceled:${params.application.stringDetails?.preferredDate}T${params.application.stringDetails?.preferredTime}`;
  await fire('stringing.schedule_canceled', {
    ...params,
    adminDetailUrl: undefined,
    dedupeKey: key,
    channels: ['email', 'sms'],
  });
}
