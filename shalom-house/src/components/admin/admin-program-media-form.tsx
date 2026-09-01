"use client";
import { FormEvent, useState } from "react";
export type AdminProgramMediaFormProps = { programId: string; expectedUpdatedAt: string; editable: boolean;
  currentCover: { id: string; title: string; altText: string; mediaUrl: string; publiclyAvailable: boolean } | null;
  coverOptions: readonly { id: string; title: string; activityDate: string; altText: string; mediaUrl: string }[];
  currentAttachment: { label: string; originalFileName: string; byteSize: number; downloadUrl: string } | null };
type ResponseBody = { ok?: boolean; redirectTo?: string; error?: string };
const messages: Record<string, string> = {
  edit_conflict: "다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요.",
  not_editable: "현재 게시 상태에서는 대표 이미지와 첨부파일을 변경할 수 없습니다.",
  invalid_gallery_item: "선택한 활동사진 정보를 확인할 수 없습니다.",
  gallery_item_not_public: "선택한 활동사진은 현재 공개 가능한 상태가 아닙니다.",
  invalid_document: "기존 프로그램 미디어 정보가 손상되어 변경할 수 없습니다.",
  payload_too_large: "PDF 파일 또는 요청 크기가 허용 범위를 초과했습니다.",
  unsupported_media_type: "허용되지 않는 요청 형식입니다.",
  unavailable: "현재 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  unauthorized: "관리자 로그인이 만료되었습니다. 다시 로그인해 주세요.",
  forbidden: "대표 이미지와 첨부파일을 변경할 권한이 없습니다.",
};
async function responseJson(response: Response): Promise<ResponseBody | null> {
  try { return await response.json() as ResponseBody; } catch { return null; }
}
function responseError(response: Response, body: ResponseBody) {
  if (response.status === 401) return messages.unauthorized;
  if (response.status === 403) return messages.forbidden;
  return body.error && messages[body.error] ? messages[body.error] : "요청을 처리하지 못했습니다. 다시 시도해 주세요.";
}
export function AdminProgramMediaForm(props: AdminProgramMediaFormProps) {
  const expectedRedirect = `/admin/programs/${props.programId}?mediaUpdated=1`;
  const [coverId, setCoverId] = useState(props.currentCover?.id ?? ""); const [coverConfirmed, setCoverConfirmed] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false); const [coverErrors, setCoverErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null); const [label, setLabel] = useState(props.currentAttachment?.label ?? "");
  const [safe, setSafe] = useState(false); const [attachmentBusy, setAttachmentBusy] = useState(false); const [attachmentErrors, setAttachmentErrors] = useState<Record<string, string>>({});
  const option = props.coverOptions.find((item) => item.id === coverId);
  function acceptResponse(response: Response, body: ResponseBody | null, setError: (value: Record<string, string>) => void) {
    if (!body) { setError({ form: "현재 서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요." }); return; }
    if (!response.ok || body.ok !== true) { setError({ form: responseError(response, body) }); return; }
    if (typeof body.redirectTo !== "string" || body.redirectTo !== expectedRedirect || !body.redirectTo.startsWith("/admin/programs/")) {
      setError({ form: "현재 서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요." }); return;
    }
    window.location.assign(body.redirectTo);
  }
  async function saveCover(event: FormEvent) {
    event.preventDefault(); if (coverBusy) return;
    const errors: Record<string, string> = {};
    if (!coverId) errors.coverGalleryItemId = "대표 활동사진을 선택해 주세요.";
    if (!coverConfirmed) errors.mediaConfirmed = "공개 상태와 개인정보·동의 정보를 확인해 주세요.";
    if (Object.keys(errors).length) { setCoverErrors(errors); return; }
    setCoverBusy(true); setCoverErrors({});
    try { const response = await fetch(`/api/admin/programs/${props.programId}/cover`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUpdatedAt: props.expectedUpdatedAt, galleryItemId: coverId, mediaConfirmed: true }) });
      acceptResponse(response, await responseJson(response), setCoverErrors);
    } catch { setCoverErrors({ form: "네트워크 연결을 확인한 뒤 다시 시도해 주세요." }); }
    finally { setCoverBusy(false); }
  }
  async function remove(kind: "cover" | "attachment") {
    const busy = kind === "cover" ? coverBusy : attachmentBusy; if (busy) return;
    const setBusy = kind === "cover" ? setCoverBusy : setAttachmentBusy;
    const setError = kind === "cover" ? setCoverErrors : setAttachmentErrors;
    setBusy(true); setError({});
    try { const response = await fetch(`/api/admin/programs/${props.programId}/${kind}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedUpdatedAt: props.expectedUpdatedAt, removeConfirmed: true }) });
      acceptResponse(response, await responseJson(response), setError);
    } catch { setError({ form: "네트워크 연결을 확인한 뒤 다시 시도해 주세요." }); }
    finally { setBusy(false); }
  }
  async function saveAttachment(event: FormEvent) {
    event.preventDefault(); if (attachmentBusy) return;
    const errors: Record<string, string> = {};
    if (!file) errors.file = "PDF 파일을 선택해 주세요.";
    if (!label.trim()) errors.label = "공개 링크 문구를 입력해 주세요.";
    if (!safe) errors.contentSafetyConfirmed = "PDF의 공개 안전성을 확인해 주세요.";
    if (Object.keys(errors).length) { setAttachmentErrors(errors); return; }
    setAttachmentBusy(true); setAttachmentErrors({});
    try { const data = new FormData(); data.set("file", file!); data.set("label", label); data.set("expectedUpdatedAt", props.expectedUpdatedAt); data.set("contentSafetyConfirmed", "true");
      const response = await fetch(`/api/admin/programs/${props.programId}/attachment`, { method: "PUT", body: data });
      acceptResponse(response, await responseJson(response), setAttachmentErrors);
    } catch { setAttachmentErrors({ form: "네트워크 연결을 확인한 뒤 다시 시도해 주세요." }); }
    finally { setAttachmentBusy(false); }
  }
  return <section className="space-y-8 rounded-card border border-border bg-surface p-5" aria-labelledby="program-media-heading"><h2 id="program-media-heading" className="text-heading font-bold">대표 이미지·첨부파일</h2>
    <form onSubmit={saveCover} aria-busy={coverBusy} className="space-y-4"><h3 className="font-bold">대표 활동사진</h3>
      {props.currentCover && !props.currentCover.publiclyAvailable ? <p role="alert">현재 연결된 활동사진은 공개할 수 없어 홈페이지에 표시되지 않습니다. 다른 사진을 선택하거나 연결을 제거해 주세요.</p> : null}
      <label className="block font-semibold" htmlFor="program-cover-gallery-item">공개 가능한 활동사진</label><select id="program-cover-gallery-item" disabled={!props.editable} value={coverId} aria-invalid={coverErrors.coverGalleryItemId ? true : undefined} aria-describedby={coverErrors.coverGalleryItemId ? "program-cover-gallery-item-error" : undefined}
        onChange={(e) => { setCoverId(e.target.value); setCoverConfirmed(false); setCoverErrors({}); }} className="min-h-11 w-full border p-2"><option value="">선택</option>{props.coverOptions.map((item) => <option key={item.id} value={item.id}>{item.activityDate} · {item.title}</option>)}</select>
      {coverErrors.coverGalleryItemId ? <p id="program-cover-gallery-item-error" role="alert">{coverErrors.coverGalleryItemId}</p> : null}
      {option ? <div><img src={option.mediaUrl} alt={option.altText} width={400} height={240} className="max-w-full rounded-card"/><p className="text-small">대체 텍스트: {option.altText}</p></div> : null}
      <label className="flex gap-2" htmlFor="program-cover-confirmed"><input id="program-cover-confirmed" type="checkbox" disabled={!props.editable} checked={coverConfirmed} aria-invalid={coverErrors.mediaConfirmed ? true : undefined} aria-describedby={coverErrors.mediaConfirmed ? "program-cover-confirmed-error" : undefined} onChange={(e) => { setCoverConfirmed(e.target.checked); setCoverErrors({}); }}/>선택한 활동사진의 공개 상태와 개인정보·동의 정보를 확인했습니다.</label>
      {coverErrors.mediaConfirmed ? <p id="program-cover-confirmed-error" role="alert">{coverErrors.mediaConfirmed}</p> : null}
      {coverErrors.form ? <p id="program-cover-form-error" role="alert" aria-live="polite">{coverErrors.form}</p> : null}
      <div className="flex gap-3"><button type="submit" disabled={!props.editable || coverBusy} className="min-h-11 bg-primary px-4 text-primary-foreground">대표 사진 저장</button>{props.currentCover ? <button type="button" onClick={() => remove("cover")} disabled={!props.editable || coverBusy} className="min-h-11 border px-4">연결 제거</button> : null}</div></form>
    <form onSubmit={saveAttachment} aria-busy={attachmentBusy} className="space-y-4"><h3 className="font-bold">PDF 첨부파일</h3><p className="text-small text-muted-foreground">거주인 이름, 장애·건강 정보, 개인 연락처, 주민등록번호, 계좌·카드번호, 내부 사건·사고·상담·회의·인사자료가 포함된 PDF는 첨부하지 마세요.</p>{props.currentAttachment ? <p><a href={props.currentAttachment.downloadUrl} download className="font-bold text-primary underline">{props.currentAttachment.originalFileName} 내려받기</a></p> : null}
      <label className="block font-semibold" htmlFor="program-pdf-file">PDF 파일</label><input id="program-pdf-file" type="file" accept="application/pdf,.pdf" disabled={!props.editable} aria-invalid={attachmentErrors.file ? true : undefined} aria-describedby={attachmentErrors.file ? "program-pdf-file-error" : undefined} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setSafe(false); setAttachmentErrors({}); }}/>{attachmentErrors.file ? <p id="program-pdf-file-error" role="alert">{attachmentErrors.file}</p> : null}
      <label className="block font-semibold" htmlFor="program-pdf-label">공개 링크 문구</label><input id="program-pdf-label" value={label} maxLength={100} disabled={!props.editable} aria-invalid={attachmentErrors.label ? true : undefined} aria-describedby={attachmentErrors.label ? "program-pdf-label-error" : undefined} onChange={(e) => { setLabel(e.target.value); setSafe(false); setAttachmentErrors({}); }} className="min-h-11 w-full border p-2"/>{attachmentErrors.label ? <p id="program-pdf-label-error" role="alert">{attachmentErrors.label}</p> : null}
      <label className="flex gap-2" htmlFor="program-pdf-confirmed"><input id="program-pdf-confirmed" type="checkbox" disabled={!props.editable} checked={safe} aria-invalid={attachmentErrors.contentSafetyConfirmed ? true : undefined} aria-describedby={attachmentErrors.contentSafetyConfirmed ? "program-pdf-confirmed-error" : undefined} onChange={(e) => { setSafe(e.target.checked); setAttachmentErrors({}); }}/>첨부 PDF에 개인정보·민감정보와 내부 비공개 정보가 포함되지 않았음을 확인했습니다.</label>
      {attachmentErrors.contentSafetyConfirmed ? <p id="program-pdf-confirmed-error" role="alert">{attachmentErrors.contentSafetyConfirmed}</p> : null}
      {attachmentErrors.form ? <p id="program-attachment-form-error" role="alert" aria-live="polite">{attachmentErrors.form}</p> : null}
      <div className="flex gap-3"><button type="submit" disabled={!props.editable || attachmentBusy} className="min-h-11 bg-primary px-4 text-primary-foreground">PDF 저장</button>{props.currentAttachment ? <button type="button" onClick={() => remove("attachment")} disabled={!props.editable || attachmentBusy} className="min-h-11 border px-4">PDF 제거</button> : null}</div></form></section>;
}
