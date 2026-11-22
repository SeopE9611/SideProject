export async function uploadAdminPdf(
  endpoint: string,
  file: File,
  expectedUpdatedAt: string,
  label: string,
  contentSafetyConfirmed: boolean,
): Promise<Response> {
  const send = (body: object) => fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const prepared = await send({
    action: "prepare", expectedUpdatedAt, label, contentSafetyConfirmed,
    name: file.name, size: file.size, type: file.type,
  });
  if (!prepared.ok) return prepared;
  const { uploadUrl, intent } = await prepared.json();
  if (typeof uploadUrl !== "string" || typeof intent !== "string")
    throw new Error("PDF 업로드 응답을 확인할 수 없습니다.");

  try {
    const data = new FormData();
    // 설치된 Storage SDK의 uploadToSignedUrl과 동일한 파일 필드 형식입니다.
    data.set("cacheControl", "0");
    data.set("", file);
    const uploaded = await fetch(uploadUrl, {
      method: "PUT", headers: { "x-upsert": "false" }, body: data, credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!uploaded.ok) throw new Error("PDF를 전송하지 못했습니다.");
  } catch {
    const cleaned = await send({ action: "cancel", intent }).catch(() => null);
    return Response.json({ ok: false, error: cleaned?.ok ? "upload_failed" : "staging_cleanup_pending" }, { status: 503 });
  }

  // 확정 응답이 유실되면 사용자가 현재 첨부를 확인할 때까지 재시도하거나 정리하지 않습니다.
  return send({ action: "finalize", intent });
}
