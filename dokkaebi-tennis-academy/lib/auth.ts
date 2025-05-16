import { getServerSession } from 'next-auth';
import { authConfig } from './auth.config'; // 상대 경로 기준

export async function auth() {
  return await getServerSession(authConfig);
}
