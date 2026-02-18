import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';

type ReporterPayload = {
  sub?: string;
  email?: string;
  nickname?: string;
  name?: string;
};

function toEmailLocalPart(email?: string | null) {
  if (!email) return '';
  const [local] = String(email).split('@');
  return local?.trim() ? local.trim() : '';
}

function pickFirstLabel(...candidates: Array<string | null | undefined>) {
  return candidates.map((value) => String(value ?? '').trim()).find((value) => value.length > 0) ?? '';
}

/**
 * 신고자 닉네임 저장 정책:
 * 1) users 컬렉션 nickname
 * 2) users 컬렉션 name
 * 3) JWT payload nickname
 * 4) JWT payload name
 * 5) 이메일 local-part
 * 6) 최종 기본값 "회원"
 *
 * 위 정책을 게시글/댓글 신고 라우트에서 공통으로 사용해 저장 기준을 통일한다.
 */
export async function resolveReporterSnapshot(db: Db, payload: ReporterPayload) {
  const reporterUserId = String(payload?.sub ?? '');

  let dbNickname = '';
  let dbName = '';
  let dbEmail = '';

  if (ObjectId.isValid(reporterUserId)) {
    const user = (await db.collection('users').findOne(
      { _id: new ObjectId(reporterUserId) },
      { projection: { nickname: 1, name: 1, email: 1 } },
    )) as { nickname?: string; name?: string; email?: string } | null;

    dbNickname = String(user?.nickname ?? '').trim();
    dbName = String(user?.name ?? '').trim();
    dbEmail = String(user?.email ?? '').trim();
  }

  const reporterNickname =
    pickFirstLabel(dbNickname, dbName, payload?.nickname, payload?.name, toEmailLocalPart(payload?.email), toEmailLocalPart(dbEmail)) || '회원';

  return {
    reporterUserId,
    reporterEmail: payload?.email ? String(payload.email) : null,
    reporterNickname,
  };
}

