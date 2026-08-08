import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin.guard";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { sendEmail } from "@/lib/email/sendEmail";

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const recipient = z.string().email().safeParse(guard.admin.email);
  if (!recipient.success) {
    return NextResponse.json(
      { message: "관리자 계정의 이메일 주소가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  try {
    await sendEmail({
      to: recipient.data,
      subject: "TennisFlowShop SMTP 테스트 이메일",
      html: "<p>관리자 이메일 설정을 통한 SMTP 테스트가 성공했습니다.</p>",
    });
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    console.error("관리자 SMTP 테스트 이메일 전송 실패", { code });
    return NextResponse.json(
      { message: "테스트 이메일 전송에 실패했습니다. 저장된 SMTP 설정을 확인해주세요." },
      { status: 502 },
    );
  }

  try {
    await appendAdminAudit(
      guard.db,
      {
        type: "admin.settings.email.test",
        actorId: guard.admin._id,
        targetId: "adminEmailSettings",
        message: "테스트 이메일 전송 성공",
      },
      req,
    );
  } catch {
    console.error("SMTP 테스트 이메일 성공 감사 로그 기록 실패");
  }

  return NextResponse.json({ message: "테스트 이메일이 발송되었습니다." });
}

export const dynamic = "force-dynamic";
