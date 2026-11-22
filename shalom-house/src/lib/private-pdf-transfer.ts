import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { PDF_OBJECT_ID, scanPdfStaging } from "@/lib/pdf-staging-cleanup.mjs";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import type { AdminPrincipal } from "@/features/admin-auth/admin-auth.types";

type Attachment = {
  bucket: string;
  objectPath: string;
  originalFileName: string;
  label: string;
  contentType: "application/pdf";
  byteSize: number;
  storedAt: Date;
};
type Target = { updatedAt: string; isEditable: boolean; attachment?: Attachment | null };
type Options = {
  domain: "news" | "programs";
  maxBytes: number;
  bucket: () => string;
  find: (id: string) => Promise<Target | null>;
  validateMetadata: (input: unknown) => { expectedUpdatedAt: Date; label: string } | null;
  validateFile: (file: unknown) => Promise<{ buffer: Buffer; originalFileName: string; byteSize: number } | null>;
  upload: (id: string, path: string, buffer: Buffer) => Promise<{ bucket: string; objectPath: string }>;
  remove: (id: string, bucket: string, path: string) => Promise<void>;
  attach: (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal; attachment: Attachment }) =>
    Promise<{ ok: true; previousAttachment?: Attachment | null } | { ok: false; reason: string }>;
};

const INTENT_TTL = 10 * 60_000;
const MAX_JSON = 16 * 1024;
type Intent = {
  objectId: string;
  expectedUpdatedAt: string;
  label: string;
  name: string;
  size: number;
};
const json = (body: unknown, status: number) => Response.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});
const fail = (error: string, status: number) => json({ ok: false, error }, status);

function signIntent(scope: string, payload: string) {
  const secret = process.env.SHALOM_SUPABASE_SECRET_KEY ?? process.env.SHALOM_SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("PDF 저장 설정이 필요합니다.");
  return createHmac("sha256", secret).update("shalom-pdf-upload:v1:").update(scope).update(":").update(payload).digest();
}

function readIntent(scope: string, token: unknown): Intent | null {
  if (typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[a-f0-9]{64}$/.test(parts[1])) return null;
  const [payload, signature] = parts;
  if (!timingSafeEqual(signIntent(scope, payload), Buffer.from(signature, "hex"))) return null;
  const intent = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Intent;
  const age = Date.now() - new ObjectId(intent.objectId).getTimestamp().getTime();
  return age >= 0 && age <= INTENT_TTL ? intent : null;
}

async function readStagedFile(url: string, intent: Intent): Promise<File | null> {
  const response = await fetch(url, { cache: "no-store", redirect: "error" });
  if (!response.ok || response.headers.get("content-type")?.split(";")[0].trim() !== "application/pdf" || !response.body) {
    await response.body?.cancel();
    return null;
  }
  const reader = response.body.getReader();
  const buffer = new Uint8Array(intent.size);
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (bytes + value.byteLength > buffer.length) {
        await reader.cancel();
        return null;
      }
      buffer.set(value, bytes);
      bytes += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  return bytes === buffer.length ? new File([buffer], intent.name, { type: "application/pdf" }) : null;
}

export async function handlePrivatePdfTransfer(request: Request, id: string, options: Options) {
  if (!isSameOriginRequest(request)) return fail("forbidden", 403);
  if (!PDF_OBJECT_ID.test(id)) return fail("not_found", 404);
  const authorization = await authorizeCurrentAdmin("content.update");
  if (!authorization.ok) return fail(authorization.reason, authorization.reason === "unauthorized" ? 401 : 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return fail("unsupported_media_type", 415);
  if (Number(request.headers.get("content-length")) > MAX_JSON) return fail("payload_too_large", 413);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_JSON) return fail("payload_too_large", 413);
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail("validation", 400);
    data = parsed as Record<string, unknown>;
  } catch { return fail("invalid_json", 400); }

  const actor = authorization.admin;
  const scope = `${options.domain}/${id}/${actor.id}`;
  const prefix = `shalom-house/${options.domain}/${id}/attachment-staging`;
  try {
    const bucket = options.bucket();
    const storage = getSupabaseAdminClient().storage.from(bucket);
    async function cleanStage(path: string) {
      try {
        const { error } = await storage.remove([path]);
        if (error) throw error;
        return true;
      } catch {
        console.error("PDF 임시 파일 정리 실패", { domain: options.domain, id, path });
        return false;
      }
    }
    async function afterStage(path: string, response: Response) {
      return (await cleanStage(path)) ? response : fail("staging_cleanup_pending", 503);
    }
    function logUncertain(path: string) {
      console.error("PDF 첨부 확정 결과 확인 필요", { domain: options.domain, id, path });
    }

    if (data.action === "prepare") {
      const metadata = options.validateMetadata({
        expectedUpdatedAt: data.expectedUpdatedAt, label: data.label,
        contentSafetyConfirmed: data.contentSafetyConfirmed,
      });
      const name = data.name;
      const size = data.size;
      if (!metadata || typeof name !== "string" || name.length > 255 || !/\.pdf$/i.test(name) ||
          data.type !== "application/pdf" || typeof size !== "number" || !Number.isSafeInteger(size) ||
          size < 5 || size > options.maxBytes) return fail("validation", 400);
      const target = await options.find(id);
      if (!target) return fail("not_found", 404);
      if (!target.isEditable) return fail("not_editable", 409);
      if (target.updatedAt !== metadata.expectedUpdatedAt.toISOString()) return fail("edit_conflict", 409);
      await scanPdfStaging(storage, { domain: options.domain, postId: id, apply: true, maxPages: 5 });
      const objectId = new ObjectId().toHexString();
      const { data: signed, error } = await storage.createSignedUploadUrl(`${prefix}/${objectId}.pdf`, { upsert: false });
      if (error || !signed) return fail("unavailable", 503);
      const intent: Intent = { objectId, name, size, expectedUpdatedAt: target.updatedAt, label: metadata.label };
      const payload = Buffer.from(JSON.stringify(intent)).toString("base64url");
      return json({ ok: true, uploadUrl: signed.signedUrl, intent: `${payload}.${signIntent(scope, payload).toString("hex")}` }, 200);
    }

    if (data.action !== "cancel" && data.action !== "finalize") return fail("validation", 400);
    const intent = readIntent(scope, data.intent);
    if (!intent) return fail("invalid_upload_intent", 400);
    const staging = `${prefix}/${intent.objectId}.pdf`;
    if (data.action === "cancel")
      return afterStage(staging, json({ ok: true }, 200));

    const target = await options.find(id);
    if (!target) return afterStage(staging, fail("not_found", 404));
    if (!target.isEditable) return afterStage(staging, fail("not_editable", 409));
    if (target.updatedAt !== intent.expectedUpdatedAt) return afterStage(staging, fail("edit_conflict", 409));
    const { data: info, error: infoError } = await storage.info(staging);
    if (infoError || info?.size !== intent.size || info.contentType !== "application/pdf")
      return afterStage(staging, fail("invalid_pdf", 400));
    const { data: signedRead, error: readError } = await storage.createSignedUrl(staging, 30);
    if (readError || !signedRead) return afterStage(staging, fail("unavailable", 503));
    let stagedFile;
    try {
      stagedFile = await readStagedFile(signedRead.signedUrl, intent);
    } catch {
      return afterStage(staging, fail("unavailable", 503));
    }
    const file = await options.validateFile(stagedFile);
    if (!file) return afterStage(staging, fail("invalid_pdf", 400));

    const objectPath = `shalom-house/${options.domain}/${id}/attachments/${new ObjectId().toHexString()}.pdf`;
    const stagedClean = await cleanStage(staging);
    let uploaded;
    try {
      uploaded = await options.upload(id, objectPath, file.buffer);
    } catch {
      // 확정 단계에 들어가기 전이므로 이 요청에서 생성한 최종 경로는 정리해도 안전합니다.
      try { await options.remove(id, bucket, objectPath); }
      catch { logUncertain(objectPath); return fail("staging_cleanup_pending", 503); }
      return fail(stagedClean ? "unavailable" : "staging_cleanup_pending", 503);
    }
    let result;
    try {
      result = await options.attach({
        id, actor, expectedUpdatedAt: new Date(intent.expectedUpdatedAt),
        attachment: { ...uploaded, originalFileName: file.originalFileName, byteSize: file.byteSize,
          contentType: "application/pdf", label: intent.label, storedAt: new Date() },
      });
    } catch {
      // 커밋 여부를 알 수 없으므로 현재 첨부가 가리킬 수 있는 파일은 보존합니다.
      logUncertain(objectPath);
      return fail("attachment_outcome_unknown", 503);
    }
    if (!result.ok) {
      try { await options.remove(id, bucket, objectPath); }
      catch { logUncertain(objectPath); return fail("staging_cleanup_pending", 503); }
      if (!stagedClean) return fail("staging_cleanup_pending", 503);
      return fail(result.reason, result.reason === "not_found" ? 404 : result.reason === "invalid_document" ? 503 : 409);
    }

    let previousClean = true;
    if (result.previousAttachment) {
      try { await options.remove(id, result.previousAttachment.bucket, result.previousAttachment.objectPath); }
      catch { previousClean = false; logUncertain(result.previousAttachment.objectPath); }
    }
    if (!stagedClean || !previousClean) return fail("attachment_cleanup_pending", 503);
    return json({ ok: true, redirectTo: `/admin/${options.domain}/${id}?mediaUpdated=1` }, 200);
  } catch (error) {
    console.error("PDF 처리 실패", { domain: options.domain, id, errorName: error instanceof Error ? error.name : "UnknownError" });
    return fail("unavailable", 503);
  }
}
