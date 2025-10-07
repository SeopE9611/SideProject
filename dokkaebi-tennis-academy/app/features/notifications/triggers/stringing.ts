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
  await fire('stringing.application_submitted', { ...params, dedupeKey, channels: ['email', 'slack'] });
}

export async function onStatusUpdated(params: { user: UserCtx; application: ApplicationCtx; adminDetailUrl: string }) {
  const key = `${params.application.applicationId}:status:${params.application.status}`;
  await fire('stringing.status_updated', { ...params, dedupeKey: key, channels: ['email', 'slack'] });
}

export async function onScheduleConfirmed(params: { user: UserCtx; application: ApplicationCtx }) {
  const app = params.application;
  const key = `${app.applicationId}:schedule:${app.stringDetails?.preferredDate}T${app.stringDetails?.preferredTime}`;
  await fire('stringing.schedule_confirmed', { ...params, adminDetailUrl: undefined, dedupeKey: key, channels: ['email'] });
}

export async function onScheduleUpdated(params: { user: UserCtx; application: ApplicationCtx }) {
  const key = `${params.application.applicationId}:schedule-updated:${params.application.stringDetails?.preferredDate}T${params.application.stringDetails?.preferredTime}`;
  await fire('stringing.schedule_updated', {
    ...params,
    adminDetailUrl: undefined,
    dedupeKey: key,
    channels: ['email'],
  });
}

export async function onApplicationCanceled(params: { user: UserCtx; application: ApplicationCtx }) {
  const key = `${params.application.applicationId}:application-canceled`;
  await fire('stringing.application_canceled', {
    ...params,
    adminDetailUrl: undefined,
    dedupeKey: key,
    channels: ['email'],
  });
}

export async function onScheduleCanceled(params: { user: UserCtx; application: ApplicationCtx }) {
  const key = `${params.application.applicationId}:schedule-canceled:${params.application.stringDetails?.preferredDate}T${params.application.stringDetails?.preferredTime}`;
  await fire('stringing.schedule_canceled', {
    ...params,
    adminDetailUrl: undefined,
    dedupeKey: key,
    channels: ['email'],
  });
}
