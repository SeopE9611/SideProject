import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { isTerminalPackageOrderStatus } from "@/lib/package-order-policy";

export async function findBlockingPackageOrderByUserId(userId: string) {
  if (!ObjectId.isValid(userId)) return null;

  const objectUserId = new ObjectId(userId);
  const db = (await clientPromise).db();
  const packageOrders = db.collection("packageOrders");

  const recentOrders = await packageOrders
    .find(
      { userId: objectUserId },
      {
        projection: {
          _id: 1,
          status: 1,
          paymentStatus: 1,
          packageInfo: 1,
          createdAt: 1,
        },
      },
    )
    .sort({ createdAt: -1, _id: -1 })
    .limit(20)
    .toArray();

  return (
    recentOrders.find((order) => !isTerminalPackageOrderStatus(order as any)) ??
    null
  );
}
