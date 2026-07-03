import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { isAdminRole, isSuperAdminRole } from "@/lib/admin/roles";
import { ObjectId, Db } from "mongodb";

type GuardOk = {
  ok: true;
  db: Db;
  admin: { _id: ObjectId; email?: string; name?: string; role: string };
};
type GuardFail = { ok: false; res: NextResponse };

type AccessTokenPayload = {
  sub: string;
};

type AdminUserRecord = {
  _id: ObjectId;
  email?: string;
  name?: string;
  role: string;
};

type RequireAdminOptions = {
  measure?: <T>(name: string, work: () => Promise<T>) => Promise<T>;
};

function authError(status: 401 | 403) {
  const isUnauthorized = status === 401;
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: isUnauthorized ? "unauthorized" : "forbidden",
        message: isUnauthorized ? "Unauthorized" : "Forbidden",
      },
    },
    { status },
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseAccessTokenPayload(raw: unknown): AccessTokenPayload | null {
  const payload = asRecord(raw);
  if (!payload || typeof payload.sub !== "string" || !payload.sub) return null;
  return { sub: payload.sub };
}

function parseAdminUser(raw: unknown): AdminUserRecord | null {
  const admin = asRecord(raw);
  const role = String(admin?.role ?? "");
  if (!admin || !(admin._id instanceof ObjectId) || !isAdminRole(role)) return null;

  return {
    _id: admin._id,
    email: typeof admin.email === "string" ? admin.email : undefined,
    name: typeof admin.name === "string" ? admin.name : undefined,
    role,
  };
}

function superAdminError() {
  return NextResponse.json(
    {
      ok: false,
      code: "SUPERADMIN_REQUIRED",
      message: "관리자 권한 변경은 최고 관리자만 가능합니다.",
    },
    { status: 403 },
  );
}

/**
 * 관리자 API 인증/인가 단일 진입점.
 *
 * - 401 Unauthorized: accessToken 누락/파손/만료 또는 sub 식별자 검증 실패
 * - 403 Forbidden: 인증은 되었으나 관리자 계정이 아닌 경우
 */
export async function requireAdmin(
  _req: Request,
  options?: RequireAdminOptions,
): Promise<GuardOk | GuardFail> {
  const measure = options?.measure ?? (<T>(_name: string, work: () => Promise<T>) => work());
  const payload = await measure("auth.parseRequest", async () => {
    const jar = await cookies();
    const at = jar.get("accessToken")?.value;
    if (!at) return null;

    // 만료/파손 토큰에서 verifyAccessToken이 throw 되어도 500이 아니라 401로 정리
    let payloadRaw: unknown = null;
    try {
      payloadRaw = verifyAccessToken(at);
    } catch {
      payloadRaw = null;
    }

    const parsedPayload = parseAccessTokenPayload(payloadRaw);
    // sub는 ObjectId 문자열이어야 함 (new ObjectId에서 500 방지)
    if (!parsedPayload || !ObjectId.isValid(parsedPayload.sub)) return null;
    return parsedPayload;
  });
  if (!payload) return { ok: false, res: authError(401) };

  const db = await measure("auth.getDb", () => getDb());
  const adminRaw: unknown = await measure("auth.userLookup", () =>
    db
      .collection("users")
      .findOne(
        { _id: new ObjectId(payload.sub) },
        { projection: { _id: 1, email: 1, name: 1, role: 1 } },
      ),
  );
  const admin = await measure("auth.roleCheck", async () => parseAdminUser(adminRaw));
  if (!admin) {
    return { ok: false, res: authError(403) };
  }

  return { ok: true, db, admin };
}

export async function requireSuperAdmin(req: Request): Promise<GuardOk | GuardFail> {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard;
  if (!isSuperAdminRole(guard.admin.role)) return { ok: false, res: superAdminError() };
  return guard;
}
