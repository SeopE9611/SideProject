import type { Db } from "mongodb";
import { ObjectId } from "mongodb";

export async function getLinkedRentalStringingStatus(
  db: Db,
  rental: any,
  rentalId: string,
): Promise<string | null> {
  const links: Record<string, unknown>[] = [
    { rentalId: rental._id },
    { rentalId },
    { paymentSource: `rental:${rentalId}` },
  ];
  const applicationId = String(rental?.stringingApplicationId ?? "");
  if (ObjectId.isValid(applicationId)) {
    links.unshift({ _id: new ObjectId(applicationId) });
  }

  const application = await db
    .collection("stringing_applications")
    .findOne({ $or: links }, { projection: { status: 1 } });
  return typeof application?.status === "string" ? application.status : null;
}
