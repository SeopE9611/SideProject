import Credentials from 'next-auth/providers/credentials';
// import { NextAuthConfig } from "next-auth"
// import clientPromise from '@/lib/db';
import { compare } from 'bcryptjs';

export const authConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { connectToDatabase } = await import('@/lib/db');
        const db = await connectToDatabase();

        console.log('입력된 이메일:', credentials?.email);
        console.log('입력된 비밀번호:', credentials?.password);

        const user = await db.collection('users').findOne({
          email: credentials?.email,
        });

        console.log('조회된 유저:', user);
        console.log('DB 비밀번호 해시 (길이):', user.hashedPassword.length);
        console.log('입력된 비밀번호 (길이):', credentials?.password.length);

        if (!user) return null;

        const isValid = await compare(credentials!.password, user.hashedPassword);
        console.log('비밀번호 일치 여부:', isValid);

        if (!isValid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
// satisfies NextAuthConfig
