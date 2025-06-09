// import { connectToDatabase } from '@/lib/db';
// import { compare } from 'bcryptjs';
// import { NextRequest, NextResponse } from 'next/server';

// export async function POST(req: NextRequest) {
//   const { email, password } = await req.json();

//   if (!email || !password) {
//     return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
//   }

//   const db = await connectToDatabase();
//   const user = await db.collection('users').findOne({ email });

//   console.log('입력된 이메일:', email);
//   console.log('입력된 비밀번호 길이:', password.length);
//   console.log('조회된 유저:', user);

//   if (!user) {
//     return NextResponse.json({ error: 'not_found' }, { status: 404 });
//   }

//   const isValid = await compare(password, user.hashedPassword);
//   console.log('비밀번호 일치 여부:', isValid);
//   if (!isValid) {
//     return NextResponse.json({ error: 'wrong_password' }, { status: 401 });
//   }

//   if (user.isDeleted) {
//     console.warn(`탈퇴한 사용자 로그인 시도: ${email}`);
//     return NextResponse.json({ error: 'withdrawn', message: '탈퇴한 계정입니다. 복구를 진행해주세요.' }, { status: 403 });
//   }

//   return NextResponse.json({ success: true });
// }
