import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.guard";
import { buildCustomerSearchFilter, sanitizeCustomer } from "@/lib/offline/offline.repository";
import { normalizePhone, normalizeEmail } from "@/lib/offline/normalizers";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;
  const url = new URL(req.url);
  const name = (url.searchParams.get("name") || "").trim();
  const phone = (url.searchParams.get("phone") || "").trim();
  const email = (url.searchParams.get("email") || "").trim();
  const q = [name, phone, email].find(Boolean) || "";
  const regex = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
  const phoneNormalized = normalizePhone(phone || q);
  const emailLower = normalizeEmail(email || q);
  const userOr: Record<string, unknown>[] = [];
  if (regex) userOr.push({ name: regex }, { email: regex }, { phone: regex });
  if (phoneNormalized) userOr.push({ phone: new RegExp(phoneNormalized) });
  if (emailLower) userOr.push({ email: emailLower });

  const [onlineUsers, offlineCustomers] = await Promise.all([
    db.collection("users").find(userOr.length ? { $or: userOr } : {}, { projection: { name: 1, email: 1, phone: 1 } }).limit(20).toArray(),
    db.collection("offline_customers").find(buildCustomerSearchFilter(q), { projection: { name: 1, phone: 1, email: 1, linkedUserId: 1, createdAt: 1, updatedAt: 1 } }).sort({ updatedAt: -1 }).limit(20).toArray(),
  ]);

  return NextResponse.json({
    onlineUsers: onlineUsers.map((u: any) => ({ id: String(u._id), name: u.name || "", email: u.email || null, phone: u.phone || "" })),
    offlineCustomers: offlineCustomers.map((c) => sanitizeCustomer(c as any, true)),
  });
}
