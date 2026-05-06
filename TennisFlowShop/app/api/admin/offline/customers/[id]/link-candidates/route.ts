import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { maskPhone, normalizeEmail, normalizePhone } from "@/lib/offline/normalizers";

const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildLoosePhoneRegex(digits: string) {
  return new RegExp(digits.split("").map(escapeRegex).join("\\D*"));
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const _id = oid((await ctx.params).id);
  if (!_id) return NextResponse.json({ message: "invalid customer id" }, { status: 400 });

  const customer = await guard.db.collection("offline_customers").findOne({ _id }, { projection: { _id: 1 } });
  if (!customer) return NextResponse.json({ message: "customer not found" }, { status: 404 });

  const url = new URL(req.url);
  const name = (url.searchParams.get("name") || "").trim();
  const phone = (url.searchParams.get("phone") || "").trim();
  const email = (url.searchParams.get("email") || "").trim();

  if (!name && !phone && !email) return NextResponse.json({ items: [] });

  const emailLower = normalizeEmail(email);
  const phoneNormalized = normalizePhone(phone);
  const or: Record<string, unknown>[] = [];
  if (name) or.push({ name: new RegExp(escapeRegex(name), "i") });
  if (emailLower) or.push({ email: new RegExp(escapeRegex(emailLower), "i") });
  if (phone) {
    const phoneRegex = phoneNormalized ? buildLoosePhoneRegex(phoneNormalized) : new RegExp(escapeRegex(phone), "i");
    or.push({ phone: phoneRegex });
  }

  const users = await guard.db.collection("users")
    .find(or.length ? { $or: or } : {}, { projection: { name: 1, email: 1, phone: 1 } })
    .limit(20)
    .toArray();

  const userIds = users.map((user) => user._id).filter((id): id is ObjectId => id instanceof ObjectId);
  const linkedCustomers = userIds.length
    ? await guard.db.collection("offline_customers")
      .find({ linkedUserId: { $in: userIds } }, { projection: { _id: 1, linkedUserId: 1 } })
      .toArray()
    : [];
  const linkedByUserId = new Map<string, string>();
  for (const linked of linkedCustomers) {
    if (linked.linkedUserId instanceof ObjectId) linkedByUserId.set(String(linked.linkedUserId), String(linked._id));
  }

  return NextResponse.json({
    items: users.map((user: any) => {
      const userName = String(user.name || "");
      const userEmail = typeof user.email === "string" ? user.email : null;
      const userPhone = typeof user.phone === "string" ? user.phone : "";
      const normalizedUserPhone = normalizePhone(userPhone);
      return {
        id: String(user._id),
        name: userName,
        email: userEmail,
        phone: userPhone || null,
        phoneMasked: userPhone ? maskPhone(userPhone) : null,
        match: {
          name: !!name && userName.toLowerCase().includes(name.toLowerCase()),
          phone: !!phoneNormalized && normalizedUserPhone.includes(phoneNormalized),
          email: !!emailLower && !!userEmail && userEmail.toLowerCase().includes(emailLower),
        },
        alreadyLinkedOfflineCustomerId: linkedByUserId.get(String(user._id)) ?? null,
      };
    }),
  });
}
