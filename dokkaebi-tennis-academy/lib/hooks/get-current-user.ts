import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET } from '@/lib/constants';
import { getUserByEmail } from '@/lib/user-service';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET!) as {
      email: string;
      sub: string;
      role: string;
    };

    const user = await getUserByEmail(decoded.email);
    if (!user) return null;

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}
