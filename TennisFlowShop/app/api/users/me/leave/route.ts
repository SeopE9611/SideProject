import { ADMIN_CSRF_COOKIE_KEY } from "@/lib/admin/adminCsrf";
import { verifyAccessToken } from "@/lib/auth.utils";
import { baseCookie } from "@/lib/cookieOptions";
import clientPromise from "@/lib/mongodb";
import { findBlockingPackageOrderByUserId } from "@/lib/package-order-ownership";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;

  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    let reason: string | null = null;
    let detail: string | null = null;

    try {
      const body: unknown = await req.json();

      if (body && typeof body === "object") {
        const input = body as {
          reason?: unknown;
          detail?: unknown;
        };

        if (typeof input.reason === "string") {
          const normalizedReason = input.reason.trim();
          reason = normalizedReason ? normalizedReason.slice(0, 100) : null;
        }

        if (typeof input.detail === "string") {
          const normalizedDetail = input.detail.trim();
          detail = normalizedDetail ? normalizedDetail.slice(0, 500) : null;
        }
      }
    } catch {
      // 탈퇴 사유가 없어도 회원 탈퇴는 진행한다.
    }
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = safeVerifyAccessToken(token);
    const userId = typeof payload?.sub === "string" ? payload.sub : "";

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const userObjectId = new ObjectId(userId);
    const [pendingOrder, activeRental, activeStringingApplication, blockingPackageOwnership] =
      await Promise.all([
        db.collection("orders").findOne(
          {
            userId: userObjectId,
            status: {
              $nin: [
                "완료",
                "completed",
                "구매확정",
                "confirmed",
                "purchase_confirmed",
                "취소",
                "취소완료",
                "canceled",
                "cancelled",
                "환불",
                "환불완료",
                "refunded",
                "refund_completed",
                "결제취소",
              ],
            },
          },
          {
            projection: { _id: 1 },
          },
        ),
        db.collection("rental_orders").findOne(
          {
            userId: userObjectId,
            $or: [
              {
                status: {
                  $nin: ["returned", "반납완료", "canceled", "cancelled", "취소"],
                },
              },
              {
                status: {
                  $in: ["returned", "반납완료"],
                },
                $or: [
                  { depositRefundedAt: { $exists: false } },
                  { depositRefundedAt: null },
                  { depositRefundedAt: "" },
                ],
              },
            ],
          },
          {
            projection: { _id: 1 },
          },
        ),
        db.collection("stringing_applications").findOne(
          {
            userId: userObjectId,
            status: {
              $nin: [
                "draft",
                "expired",
                "만료",
                "완료",
                "교체완료",
                "completed",
                "done",
                "work_done",
                "취소",
                "canceled",
                "cancelled",
                "rejected",
                "거절",
              ],
            },
          },
          {
            projection: { _id: 1 },
          },
        ),
        findBlockingPackageOrderByUserId(userId),
      ]);

    if (pendingOrder || activeRental || activeStringingApplication || blockingPackageOwnership) {
      return NextResponse.json(
        {
          error:
            "진행 중인 주문, 대여, 교체 서비스 또는 사용 가능한 패키지가 있어 탈퇴할 수 없습니다. 모든 처리가 완료된 후 다시 시도해 주세요.",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const anonymizedEmail = `withdrawn-${userId}@deleted.invalid`;

    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const result = await db.collection("users").updateOne(
          {
            _id: userObjectId,
            isDeleted: { $ne: true },
          },
          {
            $set: {
              isDeleted: true,
              deletedAt: now,
              withdrawalReason: reason,
              withdrawalDetail: detail,
              name: "(탈퇴한 회원)",
              email: anonymizedEmail,
              phone: null,
              address: null,
              addressDetail: null,
              postalCode: null,
              updatedAt: now,
            },
            $unset: {
              hashedPassword: "",
              oauth: "",
              nickname: "",
              profile: "",
              marketing: "",
              passwordResetToken: "",
              passwordResetExpires: "",
              passwordResetRequestedAt: "",
              passwordMustChange: "",
              lastLoginAt: "",
            },
          },
          { session },
        );

        if (result.matchedCount === 0) {
          throw new Error("USER_NOT_FOUND_OR_ALREADY_WITHDRAWN");
        }

        await db.collection("user_sessions").deleteMany({ userId: userObjectId }, { session });

        await db
          .collection("apps_in_toss_sessions")
          .deleteMany({ userId: userObjectId }, { session });

        await db
          .collection("apps_in_toss_identities")
          .deleteMany({ userId: userObjectId }, { session });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "USER_NOT_FOUND_OR_ALREADY_WITHDRAWN") {
        return NextResponse.json(
          { error: "존재하지 않거나 이미 탈퇴한 회원입니다." },
          { status: 404 },
        );
      }

      throw error;
    } finally {
      await session.endSession();
    }

    const response = NextResponse.json({ message: "탈퇴 완료" }, { status: 200 });

    response.cookies.set("accessToken", "", {
      ...baseCookie,
      maxAge: 0,
    });

    response.cookies.set("refreshToken", "", {
      ...baseCookie,
      maxAge: 0,
    });

    response.cookies.set("force_pwd_change", "", {
      ...baseCookie,
      maxAge: 0,
    });

    response.cookies.set(ADMIN_CSRF_COOKIE_KEY, "", {
      ...baseCookie,
      httpOnly: false,
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[users/me/leave] withdrawal failed", error);

    return NextResponse.json({ error: "회원 탈퇴 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
