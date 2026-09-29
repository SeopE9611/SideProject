import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export type PackageOrderBlockReason = "pending_order" | "active_pass";

export type PendingOrderBlock = {
  _id: ObjectId;
  status?: unknown;
  paymentStatus?: unknown;
  packageInfo?: unknown;
  createdAt?: unknown;
};

export type ActivePassBlock = {
  _id: ObjectId;
  status?: unknown;
  remainingCount?: unknown;
  expiresAt?: unknown;
  packageSize?: unknown;
  orderId?: unknown;
};

export type BlockingPackageOwnership =
  | {
      kind: "pending_order";
      pendingOrder: PendingOrderBlock;
    }
  | {
      kind: "active_pass";
      activePass: ActivePassBlock;
    };

const BLOCKING_PASS_STATUSES = new Set(["active", "paused", "suspended"]);

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value as any);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function findBlockingPackageOrderByUserId(
  userId: string,
): Promise<BlockingPackageOwnership | null> {
  if (!ObjectId.isValid(userId)) return null;

  const objectUserId = new ObjectId(userId);
  const db = (await clientPromise).db();
  const packageOrders = db.collection("packageOrders");
  const servicePasses = db.collection("service_passes");

  const pendingOrder = await packageOrders.findOne(
    { userId: objectUserId, paymentStatus: "결제대기" },
    {
      projection: {
        _id: 1,
        status: 1,
        paymentStatus: 1,
        packageInfo: 1,
        createdAt: 1,
      },
      sort: { createdAt: -1, _id: -1 },
    },
  );

  if (pendingOrder?._id) {
    return {
      kind: "pending_order",
      pendingOrder: pendingOrder as PendingOrderBlock,
    };
  }

  const now = new Date();
  const candidatePasses = await servicePasses
    .find(
      {
        userId: objectUserId,
        remainingCount: { $gt: 0 },
        status: { $in: Array.from(BLOCKING_PASS_STATUSES) },
      },
      {
        projection: {
          _id: 1,
          status: 1,
          remainingCount: 1,
          expiresAt: 1,
          packageSize: 1,
          orderId: 1,
          updatedAt: 1,
        },
      },
    )
    .sort({ updatedAt: -1, _id: -1 })
    .limit(20)
    .toArray();

  const blockingPass = candidatePasses.find((pass) => {
    const expiresAt = toDateOrNull(pass.expiresAt);
    if (!expiresAt) return true;
    return expiresAt.getTime() >= now.getTime();
  });

  if (!blockingPass?._id) return null;

  return {
    kind: "active_pass",
    activePass: blockingPass as ActivePassBlock,
  };
}
