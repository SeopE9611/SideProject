import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { adminValidationError, zodIssuesToDetails } from "@/lib/admin/adminApiError";
import { isAdminRole, isSuperAdminRole, normalizeUserRole } from "@/lib/admin/roles";
import { getReservedDisplayNameErrorMessage } from "@/lib/reserved-display-name";

const userIdParamsSchema = z.object({
  id: z.string().trim().min(1).refine(ObjectId.isValid, {
    message: "유효한 사용자 ID(ObjectId)가 아닙니다.",
  }),
});

const userPatchSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "이름은 비워둘 수 없습니다.")
      .max(50, "이름은 50자 이내여야 합니다.")
      .optional(),
    email: z
      .string()
      .trim()
      .email("유효한 이메일 주소를 입력해주세요.")
      .max(254, "이메일이 너무 깁니다.")
      .optional(),
    phone: z.string().trim().max(30, "전화번호는 30자 이내여야 합니다.").optional(),
    address: z.string().trim().max(200, "주소는 200자 이내여야 합니다.").optional(),
    addressDetail: z.string().trim().max(100, "상세주소는 100자 이내여야 합니다.").optional(),
    postalCode: z.string().trim().max(12, "우편번호는 12자 이내여야 합니다.").optional(),
    role: z.enum(["user", "admin", "superadmin"]).optional(),
    isSuspended: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    confirmText: z.string().trim().optional(),
  })
  .strict();

const userProjection = { projection: { hashedPassword: 0 } };

type AdminUserDoc = {
  email?: unknown;
  role?: unknown;
  name?: unknown;
  isDeleted?: unknown;
  isSuspended?: unknown;
};

function usersCollection(db: Db) {
  return db.collection<AdminUserDoc>("users");
}

function roleConfirmText(before: string, after: string) {
  if (after === "superadmin" && before !== "superadmin") return "최고 관리자로 변경";
  if (before === "user" && after === "admin") return "관리자로 변경";
  if (isAdminRole(before) && after === "user") return "권한 변경";
  if (before === "superadmin" && after !== "superadmin") return "권한 변경";
  return "권한 변경";
}

function deleteConfirmText(user: { email?: unknown }) {
  return typeof user.email === "string" && user.email.trim() ? user.email.trim() : "회원 삭제";
}

function errorJson(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function parseUserIdParams(params: { id: string }) {
  const parsed = userIdParamsSchema.safeParse(params);
  if (!parsed.success) {
    return {
      ok: false as const,
      res: adminValidationError(
        "요청 경로 파라미터가 올바르지 않습니다.",
        parsed.error.flatten().fieldErrors,
        zodIssuesToDetails(parsed.error.issues),
      ),
    };
  }

  return {
    ok: true as const,
    id: parsed.data.id,
    _id: new ObjectId(parsed.data.id),
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;
  const parsedParams = parseUserIdParams(await ctx.params);
  if (!parsedParams.ok) return parsedParams.res;

  const doc = await usersCollection(db).findOne({ _id: parsedParams._id }, userProjection);

  if (!doc) return NextResponse.json({ message: "not found" }, { status: 404 });

  return NextResponse.json({
    ...doc,
    id: doc._id.toString(),
    isSuspended: !!(doc as any).isSuspended,
    isDeleted: !!(doc as any).isDeleted,
    _id: undefined,
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { db, admin } = guard;
  const parsedParams = parseUserIdParams(await ctx.params);
  if (!parsedParams.ok) return parsedParams.res;

  const body = await req.json().catch(() => null);
  const parsedBody = userPatchSchema.safeParse(body);
  if (!parsedBody.success) {
    return adminValidationError(
      "요청 본문이 올바르지 않습니다.",
      parsedBody.error.flatten().fieldErrors,
      zodIssuesToDetails(parsedBody.error.issues),
    );
  }

  const allowed = [
    "name",
    "email",
    "phone",
    "address",
    "addressDetail",
    "postalCode",
    "role",
    "isSuspended",
    "isDeleted",
  ] as const;
  const payload = parsedBody.data;

  if (typeof payload.name === "string") {
    const reservedNameError = getReservedDisplayNameErrorMessage(payload.name);
    if (reservedNameError) {
      return NextResponse.json(
        { message: reservedNameError, error: "RESERVED_DISPLAY_NAME" },
        { status: 400 },
      );
    }
  }

  const $set: Record<string, any> = {};
  for (const k of allowed) {
    if (k in payload) $set[k] = payload[k];
  }
  if (Object.keys($set).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const { _id } = parsedParams;

  const current = await usersCollection(db).findOne(
    { _id },
    { projection: { _id: 1, role: 1, email: 1, name: 1, isDeleted: 1, isSuspended: 1 } },
  );
  if (!current) return NextResponse.json({ message: "not found" }, { status: 404 });

  const currentRole = normalizeUserRole((current as any).role);
  const nextRole = payload.role;
  const roleChanged = !!nextRole && nextRole !== currentRole;
  const deleteRequested = payload.isDeleted === true && !(current as any).isDeleted;
  const targetIsAdminRole = isAdminRole(currentRole);

  if (roleChanged) {
    if (!isSuperAdminRole(admin.role)) {
      return errorJson(403, "SUPERADMIN_REQUIRED", "관리자 권한 변경은 최고 관리자만 가능합니다.");
    }
    if (String(admin._id) === String(_id)) {
      return errorJson(409, "SELF_ROLE_CHANGE_FORBIDDEN", "자기 자신의 권한은 변경할 수 없습니다.");
    }
    const expectedConfirmText = roleConfirmText(currentRole, nextRole);
    if (payload.confirmText !== expectedConfirmText) {
      return errorJson(400, "CONFIRM_TEXT_INVALID", "확인 문구가 일치하지 않습니다.");
    }
    if (currentRole === "superadmin" && nextRole !== "superadmin") {
      const superAdminCount = await usersCollection(db).countDocuments({
        role: "superadmin",
        isDeleted: { $ne: true },
      });
      if (superAdminCount <= 1) {
        return errorJson(
          409,
          "LAST_SUPERADMIN_REQUIRED",
          "마지막 최고 관리자는 강등하거나 삭제할 수 없습니다.",
        );
      }
    }
  }

  if (deleteRequested) {
    if (!isSuperAdminRole(admin.role)) {
      return errorJson(403, "SUPERADMIN_REQUIRED", "회원 삭제는 최고 관리자만 가능합니다.");
    }
    if (String(admin._id) === String(_id)) {
      return errorJson(409, "SELF_DELETE_FORBIDDEN", "자기 자신은 삭제할 수 없습니다.");
    }
    if (payload.confirmText !== deleteConfirmText(current)) {
      return errorJson(400, "CONFIRM_TEXT_INVALID", "확인 문구가 일치하지 않습니다.");
    }
    if (currentRole === "superadmin") {
      const superAdminCount = await usersCollection(db).countDocuments({
        role: "superadmin",
        isDeleted: { $ne: true },
      });
      if (superAdminCount <= 1) {
        return errorJson(
          409,
          "LAST_SUPERADMIN_REQUIRED",
          "마지막 최고 관리자는 강등하거나 삭제할 수 없습니다.",
        );
      }
    }
  }

  if (
    payload.isSuspended === true &&
    !(current as any).isSuspended &&
    targetIsAdminRole &&
    !isSuperAdminRole(admin.role)
  ) {
    return errorJson(
      403,
      "SUPERADMIN_REQUIRED",
      "관리자 계정 비활성화는 최고 관리자만 가능합니다.",
    );
  }
  if (
    payload.isSuspended === true &&
    !(current as any).isSuspended &&
    String(admin._id) === String(_id)
  ) {
    return errorJson(409, "SELF_SUSPEND_FORBIDDEN", "자기 자신은 비활성화할 수 없습니다.");
  }

  delete $set.confirmText;

  const r = await usersCollection(db).updateOne(
    { _id },
    { $set, $currentDate: { updatedAt: true } },
  );

  if (!r.matchedCount) return NextResponse.json({ message: "not found" }, { status: 404 });

  const v = await usersCollection(db).findOne({ _id }, userProjection);

  if (!v) return NextResponse.json({ message: "not found" }, { status: 404 });

  // PATCH 성공: 감사 로그 추가 (핸들러 내부)
  const detail = allowed.reduce((acc: any, k) => {
    if (k in payload) acc[k] = payload[k];
    return acc;
  }, {});
  await appendAdminAudit(
    db,
    {
      type: "user_update",
      actorId: admin._id,
      targetId: _id,
      message: "프로필 수정",
      diff: detail,
    },
    req,
  );

  if (roleChanged) {
    await appendAdminAudit(
      db,
      {
        type: "USER_ROLE_CHANGED",
        actorId: admin._id,
        targetId: _id,
        message: "회원 권한 변경",
        diff: {
          actorName: admin.name ?? null,
          actorEmail: admin.email ?? null,
          actorRole: admin.role,
          targetUserEmail: (current as any).email ?? null,
          targetUserName: (current as any).name ?? null,
          before: { role: currentRole },
          after: { role: nextRole },
        },
      },
      req,
    );
  }

  if (deleteRequested) {
    await appendAdminAudit(
      db,
      {
        type: "USER_SOFT_DELETED",
        actorId: admin._id,
        targetId: _id,
        message: "회원 탈퇴(삭제)",
        diff: {
          actorName: admin.name ?? null,
          actorEmail: admin.email ?? null,
          actorRole: admin.role,
          targetUserEmail: (current as any).email ?? null,
          targetUserName: (current as any).name ?? null,
        },
      },
      req,
    );
  }

  if (
    typeof payload.isSuspended === "boolean" &&
    payload.isSuspended !== Boolean((current as any).isSuspended)
  ) {
    await appendAdminAudit(
      db,
      {
        type: payload.isSuspended ? "USER_DEACTIVATED" : "USER_ACTIVATED",
        actorId: admin._id,
        targetId: _id,
        message: payload.isSuspended ? "회원 비활성화" : "회원 비활성 해제",
        diff: {
          actorName: admin.name ?? null,
          actorEmail: admin.email ?? null,
          actorRole: admin.role,
          targetUserEmail: (current as any).email ?? null,
          targetUserName: (current as any).name ?? null,
          before: { isSuspended: Boolean((current as any).isSuspended) },
          after: { isSuspended: payload.isSuspended },
        },
      },
      req,
    );
  }

  return NextResponse.json({
    ...v,
    id: v._id.toString(),
    _id: undefined,
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { db, admin } = guard;
  const parsedParams = parseUserIdParams(await ctx.params);
  if (!parsedParams.ok) return parsedParams.res;

  const { _id } = parsedParams;
  const body = await req.json().catch(() => ({}));
  const confirmText =
    typeof (body as any)?.confirmText === "string" ? (body as any).confirmText.trim() : "";
  const current = await usersCollection(db).findOne(
    { _id },
    { projection: { _id: 1, role: 1, email: 1, name: 1 } },
  );
  if (!current) return NextResponse.json({ message: "not found" }, { status: 404 });
  const currentRole = normalizeUserRole((current as any).role);

  if (!isSuperAdminRole(admin.role)) {
    return errorJson(403, "SUPERADMIN_REQUIRED", "회원 삭제는 최고 관리자만 가능합니다.");
  }
  if (String(admin._id) === String(_id)) {
    return errorJson(409, "SELF_DELETE_FORBIDDEN", "자기 자신은 삭제할 수 없습니다.");
  }
  if (confirmText !== deleteConfirmText(current)) {
    return errorJson(400, "CONFIRM_TEXT_INVALID", "확인 문구가 일치하지 않습니다.");
  }
  if (currentRole === "superadmin") {
    const superAdminCount = await usersCollection(db).countDocuments({
      role: "superadmin",
      isDeleted: { $ne: true },
    });
    if (superAdminCount <= 1) {
      return errorJson(
        409,
        "LAST_SUPERADMIN_REQUIRED",
        "마지막 최고 관리자는 강등하거나 삭제할 수 없습니다.",
      );
    }
  }

  // update pipeline
  const r = await usersCollection(db).updateOne({ _id }, [
    {
      $set: {
        isDeleted: true,
        // 이미 값이 있으면 보존, 없으면 지금 시각으로 최초 1회만 세팅
        deletedAt: { $ifNull: ["$deletedAt", "$$NOW"] },
        updatedAt: "$$NOW",
      },
    },
  ]);
  if (!r.matchedCount) return NextResponse.json({ message: "not found" }, { status: 404 });

  // DELETE 성공: 감사 로그 추가 (핸들러 내부)
  await appendAdminAudit(
    db,
    {
      type: "USER_SOFT_DELETED",
      actorId: admin._id,
      targetId: _id,
      message: "탈퇴(삭제)",
      diff: {
        actorName: admin.name ?? null,
        actorEmail: admin.email ?? null,
        actorRole: admin.role,
        targetUserEmail: (current as any).email ?? null,
        targetUserName: (current as any).name ?? null,
      },
    },
    req,
  );

  return NextResponse.json({ ok: true });
}
