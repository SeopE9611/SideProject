"use client";
import { FormEvent, useState } from "react";
export type AdminNewsMediaFormProps = { newsId: string; expectedUpdatedAt: string; editable: boolean;
  currentCover: { id: string; title: string; altText: string; mediaUrl: string; publiclyAvailable: boolean } | null;
  coverOptions: readonly { id: string; title: string; activityDate: string; altText: string; mediaUrl: string }[];
  currentAttachment: { label: string; originalFileName: string; byteSize: number; downloadUrl: string } | null };
async function responseJson(response: Response) { try { return await response.json() as { ok?: boolean; redirectTo?: string; error?: string }; } catch { return { error: "응답을 확인할 수 없습니다." }; } }
function redirect(path?: string) { if (path?.startsWith("/admin/news/") && !path.startsWith("//")) window.location.assign(path); }
export function AdminNewsMediaForm(props: AdminNewsMediaFormProps) {
  const [coverId, setCoverId] = useState(props.currentCover?.id ?? ""); const [coverConfirmed, setCoverConfirmed] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false); const [coverError, setCoverError] = useState("");
  const [file, setFile] = useState<File | null>(null); const [label, setLabel] = useState(props.currentAttachment?.label ?? "");
  const [safe, setSafe] = useState(false); const [attachmentBusy, setAttachmentBusy] = useState(false); const [attachmentError, setAttachmentError] = useState("");
  const option = props.coverOptions.find((item) => item.id === coverId);
  async function saveCover(event: FormEvent) { event.preventDefault(); if (coverBusy || !coverId || !coverConfirmed) { setCoverError("활동사진과 확인 항목을 선택해 주세요."); return; }
    setCoverBusy(true); setCoverError(""); try { const response = await fetch(`/api/admin/news/${props.newsId}/cover`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUpdatedAt: props.expectedUpdatedAt, galleryItemId: coverId, mediaConfirmed: true }) }); const body = await responseJson(response); if (!response.ok || !body.ok) setCoverError(body.error ?? "저장하지 못했습니다."); else redirect(body.redirectTo); }
    finally { setCoverBusy(false); } }
  async function remove(kind: "cover" | "attachment") { const busy = kind === "cover" ? coverBusy : attachmentBusy; if (busy) return; kind === "cover" ? setCoverBusy(true) : setAttachmentBusy(true);
    try { const response = await fetch(`/api/admin/news/${props.newsId}/${kind}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedUpdatedAt: props.expectedUpdatedAt, removeConfirmed: true }) });
      const body = await responseJson(response); if (!response.ok || !body.ok) (kind === "cover" ? setCoverError : setAttachmentError)(body.error ?? "제거하지 못했습니다."); else redirect(body.redirectTo); }
    finally { kind === "cover" ? setCoverBusy(false) : setAttachmentBusy(false); } }
  async function saveAttachment(event: FormEvent) { event.preventDefault(); if (attachmentBusy || !file || !label.trim() || !safe) { setAttachmentError("PDF, 공개 링크 문구, 확인 항목을 입력해 주세요."); return; }
    setAttachmentBusy(true); setAttachmentError(""); try { const data = new FormData(); data.set("file", file); data.set("label", label); data.set("expectedUpdatedAt", props.expectedUpdatedAt); data.set("contentSafetyConfirmed", "true");
      const response = await fetch(`/api/admin/news/${props.newsId}/attachment`, { method: "PUT", body: data }); const body = await responseJson(response); if (!response.ok || !body.ok) setAttachmentError(body.error ?? "저장하지 못했습니다."); else redirect(body.redirectTo); }
    finally { setAttachmentBusy(false); } }
  return <section className="space-y-8 rounded-card border border-border bg-surface p-5" aria-labelledby="news-media-heading"><h2 id="news-media-heading" className="text-heading font-bold">대표 이미지·첨부파일</h2>
    <form onSubmit={saveCover} aria-busy={coverBusy} className="space-y-4"><h3 className="font-bold">대표 활동사진</h3>
      {props.currentCover && !props.currentCover.publiclyAvailable ? <p role="alert">현재 연결된 활동사진은 공개할 수 없어 홈페이지에 표시되지 않습니다. 다른 사진을 선택하거나 연결을 제거해 주세요.</p> : null}
      <label className="block font-semibold" htmlFor="news-cover">공개 가능한 활동사진</label><select id="news-cover" disabled={!props.editable} value={coverId} aria-invalid={coverError ? true : undefined} aria-describedby={coverError ? "cover-error" : undefined}
        onChange={(e) => { setCoverId(e.target.value); setCoverConfirmed(false); }} className="min-h-11 w-full border p-2"><option value="">선택</option>{props.coverOptions.map((item) => <option key={item.id} value={item.id}>{item.activityDate} · {item.title}</option>)}</select>
      {option ? <div><img src={option.mediaUrl} alt={option.altText} width={400} height={240} className="max-w-full rounded-card"/><p className="text-small">대체 텍스트: {option.altText}</p></div> : null}
      <label className="flex gap-2"><input type="checkbox" disabled={!props.editable} checked={coverConfirmed} onChange={(e) => setCoverConfirmed(e.target.checked)}/>선택한 활동사진의 공개 상태와 개인정보·동의 정보를 확인했습니다.</label>
      {coverError ? <p id="cover-error" role="alert">{coverError}</p> : null}<div aria-live="polite" />
      <div className="flex gap-3"><button type="submit" disabled={!props.editable || coverBusy} className="min-h-11 bg-primary px-4 text-primary-foreground">대표 사진 저장</button>{props.currentCover ? <button type="button" onClick={() => remove("cover")} disabled={!props.editable || coverBusy} className="min-h-11 border px-4">연결 제거</button> : null}</div></form>
    <form onSubmit={saveAttachment} aria-busy={attachmentBusy} className="space-y-4"><h3 className="font-bold">PDF 첨부파일</h3>{props.currentAttachment ? <p><a href={props.currentAttachment.downloadUrl} download className="font-bold text-primary underline">{props.currentAttachment.originalFileName} 내려받기</a></p> : null}
      <label className="block font-semibold" htmlFor="news-pdf">PDF 파일</label><input id="news-pdf" type="file" accept="application/pdf,.pdf" disabled={!props.editable} aria-invalid={attachmentError ? true : undefined} aria-describedby={attachmentError ? "attachment-error" : undefined} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setSafe(false); }}/>
      <label className="block font-semibold" htmlFor="news-pdf-label">공개 링크 문구</label><input id="news-pdf-label" value={label} maxLength={100} disabled={!props.editable} onChange={(e) => { setLabel(e.target.value); setSafe(false); }} className="min-h-11 w-full border p-2"/>
      <label className="flex gap-2"><input type="checkbox" disabled={!props.editable} checked={safe} onChange={(e) => setSafe(e.target.checked)}/>첨부 PDF에 개인정보·민감정보와 내부 비공개 정보가 포함되지 않았음을 확인했습니다.</label>
      {attachmentError ? <p id="attachment-error" role="alert">{attachmentError}</p> : null}<div aria-live="polite" />
      <div className="flex gap-3"><button type="submit" disabled={!props.editable || attachmentBusy} className="min-h-11 bg-primary px-4 text-primary-foreground">PDF 저장</button>{props.currentAttachment ? <button type="button" onClick={() => remove("attachment")} disabled={!props.editable || attachmentBusy} className="min-h-11 border px-4">PDF 제거</button> : null}</div></form></section>;
}
