"use client";
import { useState, type FormEvent } from "react";
import type { ContactInformationContent } from "@/features/site-content/site-content.types";

type AdminContactInformationFormProps = { initialContent: ContactInformationContent; expectedUpdatedAt: string | null };
type TextKey = Exclude<keyof ContactInformationContent, "showInstagram">;
const fields: { key: TextKey; label: string; multiline?: boolean }[] = [
  { key: "directionsPageDescription", label: "찾아오시는 길 페이지 설명", multiline: true },
  { key: "address", label: "주소" }, { key: "phone", label: "대표 전화" },
  { key: "visitInquiryTitle", label: "방문 전 문의 제목" },
  { key: "visitInquiryDescription", label: "방문 전 문의 설명", multiline: true },
  { key: "contactPageDescription", label: "문의하기 페이지 설명", multiline: true },
  { key: "contactIntroduction", label: "문의 경로 소개", multiline: true },
  { key: "instagramUrl", label: "인스타그램 URL" },
];
export function AdminContactInformationForm({ initialContent, expectedUpdatedAt }: AdminContactInformationFormProps) {
  const [content, setContent] = useState(initialContent), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!confirmed || busy) return; setBusy(true); setErrors({}); setMessage("");
    try {
      const response = await fetch("/api/admin/site-content/contact-information", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedUpdatedAt, saveConfirmed: confirmed, content }) });
      let data: { error?: string; fieldErrors?: Record<string, string>; redirectTo?: string };
      try { data = await response.json(); } catch { data = {}; }
      if (!response.ok) {
        setErrors(data.fieldErrors ?? {});
        setMessage(data.error === "edit_conflict" ? "다른 관리자가 연락처 정보를 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요." : data.error === "validation" ? "입력 내용을 확인해 주세요." : "연락처 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."); return;
      }
      if (data.redirectTo) window.location.assign(data.redirectTo);
    } catch { setMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} aria-busy={busy} className="space-y-6">
    <p className="rounded-card border bg-surface-subtle p-4">주소와 대표 전화는 찾아오시는 길, 문의하기와 사이트 푸터에 함께 표시됩니다.</p>
    {fields.map(({ key, label, multiline }) => {
      const id = `contact-${key}`, error = errors[key], described = error ? `${id}-error` : undefined;
      const props = { id, value: content[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setContent((v) => ({ ...v, [key]: e.target.value })), "aria-describedby": described, "aria-invalid": error ? true as const : undefined, className: "mt-2 w-full rounded-control border px-3 py-2" };
      return <div key={key}><label className="block font-semibold" htmlFor={id}>{label}</label>{multiline ? <textarea {...props} className={`${props.className} min-h-24`} /> : <input {...props} disabled={key === "instagramUrl" && !content.showInstagram} />}{error ? <p id={`${id}-error`} role="alert" className="text-small text-danger">{error}</p> : null}</div>;
    })}
    <label className="flex gap-3"><input type="checkbox" checked={content.showInstagram} onChange={(e) => { setContent((v) => ({ ...v, showInstagram: e.target.checked })); setConfirmed(false); }} /><span>인스타그램 공개</span></label>
    {errors.showInstagram ? <p role="alert" className="text-small text-danger">{errors.showInstagram}</p> : null}
    <label className="flex gap-3"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} aria-invalid={errors.saveConfirmed ? true : undefined} aria-describedby={errors.saveConfirmed ? "contact-confirm-error" : undefined} /><span>입력한 주소와 연락처가 공개 홈페이지 전체에 반영되는 것을 확인했습니다.</span></label>
    {errors.saveConfirmed ? <p id="contact-confirm-error" role="alert" className="text-small text-danger">{errors.saveConfirmed}</p> : null}
    {message ? <p role="alert" className="font-semibold text-danger">{message}</p> : null}
    <button type="submit" disabled={!confirmed || busy} className="min-h-11 rounded-control bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-60">{busy ? "저장 중…" : "연락처 정보 저장"}</button>
  </form>;
}
