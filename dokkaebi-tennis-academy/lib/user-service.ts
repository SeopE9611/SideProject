import { connectToDatabase } from './db';
import bcrypt from 'bcryptjs';

export async function getUserByEmail(email: string) {
  const db = await connectToDatabase(); // ✅여기서 db 객체 받아옴
  return await db.collection('users').findOne({ email });
}
export async function verifyPassword(plain: string, hashed: string) {
  return await bcrypt.compare(plain, hashed); // bcrypt로 비밀번호 비교
}
