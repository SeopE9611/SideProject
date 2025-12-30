import { NextRequest, NextResponse } from 'next/server';
import type { Filter, SortDirection } from 'mongodb';

import { requireAdmin } from '@/lib/admin.guard';

type OutboxStatus = 'queued' | 'failed' | 'sent';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toIso(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return null;
}

function pickTo(doc: any): string | null {
  const emailTo = doc?.rendered?.email?.to;
  if (typeof emailTo === 'string' && emailTo.trim()) return emailTo.trim();

  const smsTo = doc?.rendered?.sms?.to;
  if (typeof smsTo === 'string' && smsTo.trim()) return smsTo.trim();

  const slackCh = doc?.rendered?.slack?.channel;
  if (typeof slackCh === 'string' && slackCh.trim()) return slackCh.trim();

  return null;
}

function pickSubject(doc: any): string | null {
  const sub = doc?.rendered?.email?.subject;
  return typeof sub === 'string' && sub.trim() ? sub.trim() : null;
}

function pickIds(doc: any) {
  const applicationId = doc?.payload?.application?.applicationId;
  const orderId = doc?.payload?.application?.orderId;

  return {
    applicationId: typeof applicationId === 'string' ? applicationId : null,
    orderId: typeof orderId === 'string' ? orderId : null,
  };
}

export async function GET(req: NextRequest) {
  // --- 관리자 인증 (공용 가드) ---
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limitRaw = parseInt(searchParams.get('limit') || '10', 10);
  const limit = Math.max(1, Math.min(50, Number.isFinite(limitRaw) ? limitRaw : 10));

  const statusParam = (searchParams.get('status') || '').trim();
  const qRaw = (searchParams.get('q') || '').trim();

  const filter: Filter<any> = {};

  if (statusParam === 'queued' || statusParam === 'failed' || statusParam === 'sent') {
    filter.status = statusParam as OutboxStatus;
  }

  if (qRaw) {
    const rx = new RegExp(escapeRegExp(qRaw), 'i');
    filter.$or = [
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
  }

  const coll = db.collection('notifications_outbox');

  const sort: Record<string, SortDirection> = { createdAt: -1, _id: -1 };
  const total = await coll.countDocuments(filter);

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
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  const items = docs.map((d: any) => {
    const { applicationId, orderId } = pickIds(d);

    return {
      id: String(d._id),
      eventType: typeof d?.eventType === 'string' ? d.eventType : '-',
      status: d?.status as OutboxStatus,
      channels: Array.isArray(d?.channels) ? d.channels : [],
      to: pickTo(d),
      subject: pickSubject(d),
      retries: Number(d?.retries || 0),
      createdAt: toIso(d?.createdAt) || new Date().toISOString(),
      sentAt: toIso(d?.sentAt),
      error: typeof d?.error === 'string' ? d.error : null,
      applicationId,
      orderId,
    };
  });

  return NextResponse.json({ items, total });
}
