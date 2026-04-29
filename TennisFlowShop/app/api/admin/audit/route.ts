import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function normalizeObjectIdText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  const record = value as UnknownRecord;
  if (typeof record.$oid === "string") return record.$oid;
  if (typeof record.toString === "function") {
    const converted = record.toString();
    if (typeof converted === "string" && converted !== "[object Object]") return converted;
  }
  return null;
}

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 4)}...${value.slice(-4)}` : value;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseNum(value: string | null, defaultValue: number, min: number, max: number) {
  const num = Number.parseInt(value || String(defaultValue), 10);
  if (!Number.isFinite(num)) return defaultValue;
  return Math.min(max, Math.max(min, num));
}

function actorDisplay(doc: UnknownRecord) {
  const diff = asRecord(doc.diff);
  const metadata = asRecord(diff.metadata);
  const metadataActor = asRecord(metadata.actor);

  const name = (metadataActor.name as string | undefined) ?? (diff.actorName as string | undefined) ?? (doc.actorName as string | undefined) ?? null;
  const email = (metadataActor.email as string | undefined) ?? (diff.actorEmail as string | undefined) ?? (doc.actorEmail as string | undefined) ?? null;
  const role = (metadataActor.role as string | undefined) ?? (diff.actorRole as string | undefined) ?? (doc.actorRole as string | undefined) ?? null;
  const actorId = normalizeObjectIdText(metadataActor.id) ?? normalizeObjectIdText(doc.actorId) ?? normalizeObjectIdText(doc.by);

  const principal = name ? (email ? `${name} <${email}>` : name) : email;
  if (principal) return { actor: role ? `${principal} · ${role}` : principal, actorTitle: undefined, actorId: actorId ?? null };
  if (actorId) return { actor: `actorId: ${shortId(actorId)}`, actorTitle: actorId, actorId };
  return { actor: "알 수 없음", actorTitle: undefined, actorId: null };
}

function targetDisplay(doc: UnknownRecord): string | null {
  const diff = asRecord(doc.diff);
  const metadata = asRecord(diff.metadata);
  const target = asRecord(metadata.target);
  const targetId = normalizeObjectIdText(doc.targetId) ?? normalizeObjectIdText(target.id);
  if (targetId) return shortId(targetId);
  if (typeof target.scope === "string" && target.scope.trim()) return target.scope;
  if (typeof diff.targetType === "string" && diff.targetType.trim()) return diff.targetType;
  if (typeof diff.targetScope === "string" && diff.targetScope.trim()) return diff.targetScope;
  return null;
}

function getDiffSummary(doc: UnknownRecord): string[] {
  const diff = asRecord(doc.diff);
  const summary: string[] = [];
  const changedKeys = Array.isArray(diff.changedKeys) ? diff.changedKeys.filter((v) => typeof v === "string") : [];
  if (changedKeys.length) summary.push(`changedKeys: ${changedKeys.slice(0, 6).join(", ")}`);

  const before = asRecord(diff.before);
  const after = asRecord(diff.after);
  const statusKeys = ["status", "paymentStatus", "cancelStatus"] as const;
  for (const key of statusKeys) {
    const b = before[key];
    const a = after[key];
    if (typeof b === "string" && typeof a === "string" && b !== a) {
      summary.push(`${key}: ${b} → ${a}`);
    }
  }

  const metadata = asRecord(diff.metadata);
  for (const key of ["reason", "action", "result"] as const) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) summary.push(`${key}: ${value}`);
  }

  if (typeof diff.targetScope === "string" && diff.targetScope.trim()) summary.push(`targetScope: ${diff.targetScope}`);

  return summary.slice(0, 5);
}

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.res;

    const url = new URL(req.url);
    const page = parseNum(url.searchParams.get("page"), 1, 1, 100000);
    const limit = parseNum(url.searchParams.get("limit"), 20, 1, 100);
    const q = (url.searchParams.get("q") || "").trim();
    const type = (url.searchParams.get("type") || "").trim();

    const query: UnknownRecord = {};
    if (type) query.type = { $regex: escapeRegex(type), $options: "i" };

    if (q) {
      const qRegex = { $regex: escapeRegex(q), $options: "i" };
      const or: UnknownRecord[] = [
        { message: qRegex },
        { "diff.metadata.actor.email": qRegex },
        { "diff.metadata.actor.name": qRegex },
        { "diff.actorEmail": qRegex },
        { "diff.actorName": qRegex },
      ];
      if (ObjectId.isValid(q)) {
        or.push({ actorId: new ObjectId(q) });
        or.push({ targetId: new ObjectId(q) });
      }
      or.push({ actorId: q }, { targetId: q });
      query.$or = or;
    }

    const skip = (page - 1) * limit;
    const collection = guard.db.collection("audits");
    const [docs, total] = await Promise.all([
      collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query),
    ]);

    const items = docs.map((doc) => {
      const actorInfo = actorDisplay(asRecord(doc));
      return {
        id: String(doc._id),
        type: typeof doc.type === "string" ? doc.type : "unknown",
        message: typeof doc.message === "string" ? doc.message : null,
        actor: actorInfo.actor,
        actorTitle: actorInfo.actorTitle,
        actorId: actorInfo.actorId,
        targetId: targetDisplay(asRecord(doc)),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
        requestId: typeof doc.requestId === "string" ? doc.requestId : null,
        ip: typeof doc.ip === "string" ? doc.ip : null,
        ua: typeof doc.ua === "string" ? doc.ua : null,
        diffSummary: getDiffSummary(asRecord(doc)),
      };
    });

    return NextResponse.json({
      success: true,
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/audit GET] error", error);
    return NextResponse.json({ success: false, message: "internal error" }, { status: 500 });
  }
}
