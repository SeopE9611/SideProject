import { connectToDatabase } from '@/lib/db';
import { compare } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const db = await connectToDatabase();
  const user = await db.collection('users').findOne({ email });

  if (!user) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (user.isDeleted) {
    return NextResponse.json({ error: 'withdrawn' }, { status: 403 });
  }

  const isValid = await compare(password, user.hashedPassword);
  if (!isValid) {
    return NextResponse.json({ error: 'wrong_password' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
