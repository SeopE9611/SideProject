import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { hash } from 'bcryptjs';

export async function POST(req: Request) {
  const { email, password, name, phone, address, postalCode } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ message: '필수 항목 누락' }, { status: 400 });
  }

  let hashedPassword: string;

  try {
    const db = await connectToDatabase();
    const existingUser = await db.collection('users').findOne({ email });

    if (existingUser) {
      return NextResponse.json({ message: '이미 존재하는 사용자입니다' }, { status: 409 });
    }

    hashedPassword = await hash(password, 10); //

    const newUser = {
      email,
      name,
      hashedPassword,
      phone,
      address,
      postalCode,
      role: 'user',
      createdAt: new Date(),
    };

    await db.collection('users').insertOne(newUser);
    return NextResponse.json({ message: '회원가입 완료' }, { status: 201 });
  } catch (error) {
    console.error('회원가입 오류:', error);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}
