import { Db, ObjectId } from 'mongodb';

export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/* stringing_applications 인덱스 보장 */
export async function ensureStringingIndexes(db: Db) {
  const col = db.collection('stringing_applications');
  const idx = await col.listIndexes().toArray();
  const names = idx.map((i: any) => i.name);
  const specs: any[] = [];
  if (!names.includes('by_contactEmail')) {
    specs.push({ name: 'by_contactEmail', key: { contactEmail: 1 } });
  }
  if (!names.includes('by_userId')) {
    specs.push({ name: 'by_userId', key: { userId: 1 } });
  }
  if (specs.length) await col.createIndexes(specs);
}

/* 게스트 스트링 신청서 자동 귀속 */
export async function autoLinkStringingByEmail(db: Db, userId: ObjectId | string, userEmail?: string | null) {
  const email = normalizeEmail(userEmail);
  if (!email) return { matched: 0, modified: 0 };

  await ensureStringingIndexes(db);

  // userId를 문자열로 전달해도 안전하게 ObjectId로 고정
  const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;

  const res = await db.collection('stringing_applications').updateMany(
    {
      // 아직 귀속 안 된 문서(존재하지 않음 OR null OR '')
      $or: [{ userId: { $exists: false } }, { userId: null }, { userId: '' }],
      // 동일 이메일(소문자 정규화)
      contactEmail: email,
      // 유효 상태만
      status: { $nin: ['취소', '환불'] },
    },
    {
      $set: {
        userId: uid,
        claimed: true,
        claimedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
  return { matched: res.matchedCount ?? 0, modified: res.modifiedCount ?? 0 };
}
