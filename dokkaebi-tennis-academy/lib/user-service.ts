import { getDb } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function getUserByEmail(email: string) {
  const db = await getDb();
  return await db.collection('users').findOne({ email });
}
export async function verifyPassword(plain: string, hashed: string) {
  return await bcrypt.compare(plain, hashed); // bcrypt로 비밀번호 비교
}
