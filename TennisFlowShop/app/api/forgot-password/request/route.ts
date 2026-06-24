import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/sendEmail";
import {
  AUTH_RATE_LIMIT_POLICIES,
  enforcePublicAuthRateLimit,
  getClientIp,
  normalizeRateLimitIdentifier,
} from "@/lib/auth/publicAuthRateLimit";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { getDb } from "@/lib/mongodb";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  isRecoveryTokenSecretConfigured,
} from "@/lib/password-reset";

function isValidEmail(email: string) {
  // 너무 빡센 정규식은 오히려 유지보수성이 떨어질 수 있어
  // 서버에서는 "기본 형식 체크" 정도만 수행합니다.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const SAFE_RESPONSE = {
  ok: true,
  message: "가입된 계정이라면 비밀번호 재설정 링크를 발송했습니다.",
};

const CONFIGURATION_ERROR_RESPONSE = {
  message: "비밀번호 재설정 요청을 처리하는 중 오류가 발생했습니다.",
};

export async function POST(req: Request) {
  try {
    const db = await getDb();

    const ipRateLimited = await enforcePublicAuthRateLimit({
      db,
      routeId: "forgot_password_request",
      scope: "ip",
      value: getClientIp(req),
      policy: AUTH_RATE_LIMIT_POLICIES.forgot_password_request.ip,
    });
    if (ipRateLimited) return ipRateLimited;

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "이메일을 입력해주세요." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ message: "올바른 이메일 형식을 입력해주세요." }, { status: 400 });
    }

    const emailPolicy = AUTH_RATE_LIMIT_POLICIES.forgot_password_request.identifier;
    if (!emailPolicy) {
      console.error("[forgot-password/request] email rate limit policy missing");
      return NextResponse.json(CONFIGURATION_ERROR_RESPONSE, { status: 500 });
    }

    const emailRateLimited = await enforcePublicAuthRateLimit({
      db,
      routeId: "forgot_password_request",
      scope: "email",
      value: normalizeRateLimitIdentifier("email", email),
      policy: emailPolicy,
    });
    if (emailRateLimited) return emailRateLimited;

    if (!isRecoveryTokenSecretConfigured()) {
      console.error("[forgot-password/request] RECOVERY_TOKEN_SECRET is not configured");
      return NextResponse.json(CONFIGURATION_ERROR_RESPONSE, { status: 500 });
    }

    // soft delete 계정은 제외하는 편이 안전합니다.
    const user = await db.collection("users").findOne({
      email,
      isDeleted: { $ne: true },
    });

    // 사용자가 없어도 외부에는 성공처럼 보이게 처리
    if (!user?._id) {
      return NextResponse.json(SAFE_RESPONSE, { status: 200 });
    }

    const rawToken = createPasswordResetToken(user._id.toString(), email);
    const hashedToken = hashPasswordResetToken(rawToken);

    const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;

    // DB에는 토큰 원문이 아니라 해시만 저장
    // 이렇게 하면 "가장 마지막에 보낸 링크만 유효"하게 만들기 좋습니다.
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(Date.now() + 1000 * 60 * 30), // 30분
          passwordResetRequestedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );

    await sendEmail({
      to: email,
      subject: "[도깨비테니스] 비밀번호 재설정 안내",
      html: `
        <div style="max-width:560px;margin:0 auto;padding:24px;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;line-height:1.6;color:rgb(17, 24, 39);">
          <h2 style="margin:0 0 16px;color:rgb(17, 24, 39);">비밀번호 재설정</h2>
          <p style="margin:0 0 12px;color:rgb(55, 65, 81);">
            안녕하세요. 도깨비테니스 계정의 비밀번호 재설정 요청이 접수되었습니다.
          </p>
          <p style="margin:0 0 20px;color:rgb(55, 65, 81);">
            아래 버튼을 눌러 새 비밀번호를 설정해주세요.
          </p>

          <a
            href="${resetUrl}"
            style="display:inline-block;padding:12px 20px;border-radius:10px;background:rgb(31, 41, 55);color:rgb(255, 255, 255);text-decoration:none;font-weight:700;"
          >
            비밀번호 재설정하기
          </a>

          <p style="margin:20px 0 8px;font-size:14px;color:rgb(107, 114, 128);">
            버튼이 동작하지 않는다면 아래 링크를 복사해서 브라우저에 붙여 넣어주세요.
          </p>
          <p style="margin:0 0 16px;font-size:14px;word-break:break-all;color:rgb(75, 85, 99);">
            ${resetUrl}
          </p>

          <p style="margin:0;font-size:13px;color:rgb(107, 114, 128);">
            이 링크는 30분 후 만료됩니다. 요청하지 않았다면 이 메일을 무시해주세요.
          </p>
        </div>
      `,
    });

    return NextResponse.json(SAFE_RESPONSE, { status: 200 });
  } catch (error) {
    console.error("[forgot-password/request] error", error);
    return NextResponse.json(
      { message: "비밀번호 재설정 메일 전송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
