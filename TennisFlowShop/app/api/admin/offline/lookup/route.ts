import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.guard";
import { sanitizeCustomer } from "@/lib/offline/offline.repository";
import { normalizePhone, normalizeEmail } from "@/lib/offline/normalizers";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;
  const url = new URL(req.url);
  const name = (url.searchParams.get("name") || "").trim();
  const phone = (url.searchParams.get("phone") || "").trim();
  const email = (url.searchParams.get("email") || "").trim();

  if (!name && !phone && !email) return NextResponse.json({ onlineUsers: [], offlineCustomers: [] });

  const normalizedPhone = normalizePhone(phone);
  const emailLower = normalizeEmail(email);

  const userAnd: Record<string, unknown>[] = [];
  if (name) userAnd.push({ name: new RegExp(escapeRegex(name), "i") });
  if (phone) {
    const phoneRegex = new RegExp(escapeRegex(phone), "i");
    userAnd.push(normalizedPhone ? { $or: [{ phone: phoneRegex }, { phone: new RegExp(normalizedPhone) }] } : { phone: phoneRegex });
  }
  if (email) userAnd.push({ email: new RegExp(escapeRegex(email), "i") });

  const offlineAnd: Record<string, unknown>[] = [];
  if (name) offlineAnd.push({ name: new RegExp(escapeRegex(name), "i") });
  if (normalizedPhone) offlineAnd.push({ phoneNormalized: { $regex: normalizedPhone } });
  if (emailLower) offlineAnd.push({ emailLower: { $regex: escapeRegex(emailLower), $options: "i" } });

  const [onlineUsers, offlineCustomers] = await Promise.all([
    db.collection("users").find(userAnd.length ? { $and: userAnd } : {}, { projection: { name: 1, email: 1, phone: 1 } }).limit(20).toArray(),
    db.collection("offline_customers").find(offlineAnd.length ? { $and: offlineAnd } : {}, { projection: { name: 1, phone: 1, email: 1, linkedUserId: 1, createdAt: 1, updatedAt: 1 } }).sort({ updatedAt: -1 }).limit(20).toArray(),
  ]);

  return NextResponse.json({
    onlineUsers: onlineUsers.map((u: any) => ({ id: String(u._id), name: u.name || "", email: u.email || null, phone: u.phone || "" })),
    offlineCustomers: offlineCustomers.map((c) => sanitizeCustomer(c as any, true)),
  });
}
