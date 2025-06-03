import clientPromise from '@/lib/mongodb';
import { subDays } from 'date-fns';

export async function deleteExpiredAccounts() {
  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('users');

  const cutoffDate = subDays(new Date(), 7);

  const result = await users.updateMany(
    {
      isDeleted: true,
      deletedAt: { $lt: cutoffDate },
    },
    {
      $set: {
        name: '(탈퇴한 회원)',
        email: '(탈퇴한 회원)',
        phone: null,
        address: null,
        addressDetail: null,
        permanentlyDeleted: true, // optional: 추가 상태 표시용
        permanentlyDeletedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
}
