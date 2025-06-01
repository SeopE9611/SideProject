import Credentials from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';

export const authConfig: NextAuthOptions = {
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

        const user = await db.collection('users').findOne({
          email: credentials?.email,
        });

        if (!user) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
  },

  pages: {
    signIn: '/login',
  },
};
