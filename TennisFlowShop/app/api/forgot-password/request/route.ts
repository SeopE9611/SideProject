import { NextResponse } from 'next/server';

import { sendEmail } from '@/app/features/notifications/channels/email';
import { getDb } from '@/lib/mongodb';
import { createPasswordResetToken, hashPasswordResetToken } from '@/lib/password-reset';

function isValidEmail(email: string) {
  // 너무 빡센 정규식은 오히려 유지보수성이 떨어질 수 있어
  // 서버에서는 "기본 형식 체크" 정도만 수행합니다.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const email = String(body?.email ?? '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: '이메일을 입력해주세요.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ message: '올바른 이메일 형식을 입력해주세요.' }, { status: 400 });
    }

    const db = await getDb();

    // soft delete 계정은 제외하는 편이 안전합니다.
    const user = await db.collection('users').findOne({
      email,
      isDeleted: { $ne: true },
    });

    // 이메일 존재 여부를 외부에 노출하지 않기 위한 공통 응답
    const safeResponse = {
      ok: true,
      message: '가입된 계정이라면 비밀번호 재설정 링크를 발송했습니다.',
    };

    // 사용자가 없어도 외부에는 성공처럼 보이게 처리
    if (!user?._id) {
      return NextResponse.json(safeResponse, { status: 200 });
    }

    const rawToken = createPasswordResetToken(user._id.toString(), email);
    const hashedToken = hashPasswordResetToken(rawToken);

    // 현재 프로젝트 환경 기준으로 base URL 후보를 순서대로 확인
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'http://localhost:3000';

    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    // DB에는 토큰 원문이 아니라 해시만 저장
    // 이렇게 하면 "가장 마지막에 보낸 링크만 유효"하게 만들기 좋습니다.
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(Date.now() + 1000 * 60 * 30), // 30분
          passwordResetRequestedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    await sendEmail({
      to: email,
      subject: '[테니스 플로우] 비밀번호 재설정 안내',
      html: `
        <div style="max-width:560px;margin:0 auto;padding:24px;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;line-height:1.6;color:#111827;">
          <h2 style="margin:0 0 16px;">비밀번호 재설정</h2>
          <p style="margin:0 0 12px;">
            안녕하세요. 테니스 플로우 계정의 비밀번호 재설정 요청이 접수되었습니다.
          </p>
          <p style="margin:0 0 20px;">
            아래 버튼을 눌러 새 비밀번호를 설정해주세요.
          </p>

          <a
            href="${resetUrl}"
            style="display:inline-block;padding:12px 20px;border-radius:10px;background:#00704A;color:#ffffff;text-decoration:none;font-weight:700;"
          >
            비밀번호 재설정하기
          </a>

          <p style="margin:20px 0 8px;font-size:14px;color:#4b5563;">
            버튼이 동작하지 않는다면 아래 링크를 복사해서 브라우저에 붙여 넣어주세요.
          </p>
          <p style="margin:0 0 16px;font-size:14px;word-break:break-all;color:#2563eb;">
            ${resetUrl}
          </p>

          <p style="margin:0;font-size:13px;color:#6b7280;">
            이 링크는 30분 후 만료됩니다.
          </p>
        </div>
      `,
    });

    return NextResponse.json(safeResponse, { status: 200 });
  } catch (error) {
    console.error('[forgot-password/request] error', error);
    return NextResponse.json(
      { message: '비밀번호 재설정 메일 전송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
