import type { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import type { MessageDetail, MessageListItem } from '@/lib/types/message';
import type { Filter, Document } from 'mongodb';

export function parseListQuery(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const pageRaw = Number(searchParams.get('page') ?? '1');
  const limitRaw = Number(searchParams.get('limit') ?? '20');

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 50 ? limitRaw : 20;

  return { page, limit };
}

/** 만료(expiresAt)된 메시지는 목록/상세에서 제외 */

export function notExpiredClause(now: Date): Filter<Document> {
  return {
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
  };
}

function oidToString(v: any): string | null {
  if (!v) return null;
  if (v instanceof ObjectId) return v.toString();
  return String(v);
}

function dateToIso(v: any): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export function mapMessageListItem(d: any): MessageListItem {
  const body = String(d.body ?? '');
  const snippet = body.length > 80 ? `${body.slice(0, 80)}…` : body;

  return {
    id: String(d._id),
    fromUserId: oidToString(d.fromUserId),
    fromName: String(d.fromName ?? '회원'),
    toUserId: oidToString(d.toUserId),
    toName: String(d.toName ?? '회원'),

    title: String(d.title ?? ''),
    snippet,

    isRead: !!d.readAt,
    createdAt: dateToIso(d.createdAt) ?? new Date().toISOString(),

    isAdmin: d.isAdmin ?? false,
    isBroadcast: d.isBroadcast ?? false,
    broadcastId: d.broadcastId ? String(d.broadcastId) : undefined,
    expiresAt: dateToIso(d.expiresAt),
  };
}

export function mapMessageDetail(d: any): MessageDetail {
  return {
    id: String(d._id),

    fromUserId: oidToString(d.fromUserId),
    fromName: String(d.fromName ?? '회원'),
    toUserId: oidToString(d.toUserId),
    toName: String(d.toName ?? '회원'),

    title: String(d.title ?? ''),
    body: String(d.body ?? ''),

    createdAt: dateToIso(d.createdAt) ?? new Date().toISOString(),
    readAt: d.readAt ? (d.readAt instanceof Date ? d.readAt.toISOString() : String(d.readAt)) : null,

    isAdmin: d.isAdmin ?? false,
    isBroadcast: d.isBroadcast ?? false,
    broadcastId: d.broadcastId ? String(d.broadcastId) : undefined,
    expiresAt: dateToIso(d.expiresAt),
  };
}
