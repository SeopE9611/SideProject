import { NextRequest, NextResponse } from 'next/server';
import type { Document, Filter, SortDirection } from 'mongodb';
import { z } from 'zod';

import { requireAdmin } from '@/lib/admin.guard';
import type { AdminOutboxListItemDto, AdminOutboxListResponseDto, AdminOutboxStatus } from '@/types/admin/notifications';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toIso(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return null;
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

function pickTo(doc: Record<string, unknown>): string | null {
  const rendered = asRecord(doc.rendered);
  const email = asRecord(rendered.email);
  const sms = asRecord(rendered.sms);
  const slack = asRecord(rendered.slack);

  const emailTo = email.to;
  if (typeof emailTo === 'string' && emailTo.trim()) return emailTo.trim();

  const smsTo = sms.to;
  if (typeof smsTo === 'string' && smsTo.trim()) return smsTo.trim();

  const slackCh = slack.channel;
  if (typeof slackCh === 'string' && slackCh.trim()) return slackCh.trim();

  return null;
}

function pickSubject(doc: Record<string, unknown>): string | null {
  const rendered = asRecord(doc.rendered);
  const email = asRecord(rendered.email);
  const sub = email.subject;
  return typeof sub === 'string' && sub.trim() ? sub.trim() : null;
}

function pickIds(doc: Record<string, unknown>) {
  const payload = asRecord(doc.payload);
  const application = asRecord(payload.application);
  const applicationId = application.applicationId;
  const orderId = application.orderId;

  return {
    applicationId: typeof applicationId === 'string' ? applicationId : null,
    orderId: typeof orderId === 'string' ? orderId : null,
  };
}

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['all', 'queued', 'failed', 'sent']).default('all'),
  q: z.string().trim().default(''),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const parsed = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams.entries()));

  const filter: Filter<Document> = {};
  const baseFilter: Filter<Document> = {};
  if (parsed.status !== 'all') {
    filter.status = parsed.status as AdminOutboxStatus;
  }

  if (parsed.q) {
    const rx = new RegExp(escapeRegExp(parsed.q), 'i');
    const keywordFilter: NonNullable<Filter<Document>['$or']> = [
      { eventType: rx },
      { 'rendered.email.to': rx },
      { 'rendered.email.subject': rx },
      { 'rendered.sms.to': rx },
      { 'rendered.sms.text': rx },
      { 'rendered.slack.channel': rx },
      { 'rendered.slack.text': rx },
      { 'payload.user.email': rx },
      { 'payload.user.name': rx },
      { 'payload.application.applicationId': rx },
      { 'payload.application.orderId': rx },
    ];
    filter.$or = keywordFilter;
    baseFilter.$or = keywordFilter;
  }

  const coll = db.collection('notifications_outbox');
  const sort: Record<string, SortDirection> = { createdAt: -1, _id: -1 };
  const [total, queued, failed, sent] = await Promise.all([
    coll.countDocuments(filter),
    coll.countDocuments({ ...baseFilter, status: 'queued' }),
    coll.countDocuments({ ...baseFilter, status: 'failed' }),
    coll.countDocuments({ ...baseFilter, status: 'sent' }),
  ]);

  const docs = await coll
    .find(filter, {
      projection: {
        eventType: 1,
        status: 1,
        channels: 1,
        retries: 1,
        createdAt: 1,
        sentAt: 1,
        error: 1,
        'rendered.email.to': 1,
        'rendered.email.subject': 1,
        'rendered.sms.to': 1,
        'rendered.sms.text': 1,
        'rendered.slack.channel': 1,
        'payload.application.applicationId': 1,
        'payload.application.orderId': 1,
      },
    })
    .sort(sort)
    .skip((parsed.page - 1) * parsed.limit)
    .limit(parsed.limit)
    .toArray();

  const items: AdminOutboxListItemDto[] = docs.map((rawDoc) => {
    const doc = asRecord(rawDoc);
    const { applicationId, orderId } = pickIds(doc);
    const channels = Array.isArray(doc.channels) ? doc.channels.filter((c): c is 'email' | 'slack' | 'sms' => c === 'email' || c === 'slack' || c === 'sms') : [];
    const status = doc.status;

    return {
      id: String(doc._id ?? ''),
      eventType: typeof doc.eventType === 'string' ? doc.eventType : '-',
      status: status === 'queued' || status === 'failed' || status === 'sent' ? status : 'queued',
      channels,
      to: pickTo(doc),
      subject: pickSubject(doc),
      retries: Number(doc.retries || 0),
      createdAt: toIso(doc.createdAt) || new Date().toISOString(),
      sentAt: toIso(doc.sentAt),
      error: typeof doc.error === 'string' ? doc.error : null,
      applicationId,
      orderId,
    };
  });

  const response: AdminOutboxListResponseDto = {
    items,
    total,
    counts: {
      queued,
      failed,
      sent,
    },
  };
  return NextResponse.json(response);
}
