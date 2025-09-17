import { Db, ObjectId } from 'mongodb';

export function parseClientMeta(req?: Request) {
  const xf = req?.headers.get('x-forwarded-for') ?? '';
  const ip = xf.split(',')[0]?.trim() || req?.headers.get('x-real-ip') || null;
  const ua = req?.headers.get('user-agent') ?? null;
  return { ip, ua };
}

type AuditBase = {
  type: string; // 예: 'user_password_reset', 'user_delete', 'sessions_cleanup'
  actorId?: ObjectId | string; // 실행 주체(관리자)
  targetId?: ObjectId | string; // 대상 리소스
  message?: string; // 자유서술
  diff?: any; // 변경 전/후 스냅샷 일부(옵션)
};

export async function appendAudit(db: Db, entry: AuditBase, req?: Request) {
  const { ip, ua } = parseClientMeta(req);
  const toId = (v: any) => (typeof v === 'string' ? new ObjectId(v) : v);
  await db.collection('audits').insertOne({
    type: entry.type,
    actorId: entry.actorId ? toId(entry.actorId) : null,
    targetId: entry.targetId ? toId(entry.targetId) : null,
    message: entry.message ?? null,
    diff: entry.diff ?? null,
    ip,
    ua,
    createdAt: new Date(),
  });
}
