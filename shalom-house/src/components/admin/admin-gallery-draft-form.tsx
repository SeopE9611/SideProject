"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
type Values = {
  slug: string;
  title: string;
  category: string;
  description: string;
  altText: string;
  activityDate: string;
  subjectPresence: string;
  consentStatus: string;
  consentCheckedOn: string;
  consentReferenceCode: string;
  displayStartOn: string;
  displayEndOn: string;
};
type Props =
  | { mode: "create" }
  | {
      mode: "edit";
      galleryItemId: string;
      expectedUpdatedAt: string;
      initialValue: Values;
    };
type GalleryFormResponse = {
  redirectTo?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};
const empty: Values = {
  slug: "",
  title: "",
  category: "",
  description: "",
  altText: "",
  activityDate: "",
  subjectPresence: "none",
  consentStatus: "not_required",
  consentCheckedOn: "",
  consentReferenceCode: "",
  displayStartOn: "",
  displayEndOn: "",
};
const fields: [keyof Values, string, string][] = [
  ["slug", "슬러그", "text"],
  ["title", "제목", "text"],
  ["category", "분류", "text"],
  ["activityDate", "활동일", "date"],
  ["description", "설명", "textarea"],
  ["altText", "대체 텍스트", "textarea"],
  ["consentCheckedOn", "동의 확인일", "date"],
  ["consentReferenceCode", "동의 참조 코드", "text"],
  ["displayStartOn", "게시 시작일", "date"],
  ["displayEndOn", "게시 종료일", "date"],
];
export function AdminGalleryDraftForm(props: Props) {
  const router = useRouter(),
    previewRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null),
    [converted, setConverted] = useState<{
      blob: Blob;
      width: number;
      height: number;
      originalName: string;
      originalSize: number;
    } | null>(null),
    [status, setStatus] = useState(""),
    [conversionError, setConversionError] = useState(""),
    [formError, setFormError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [alt, setAlt] = useState(props.mode === "edit" ? props.initialValue.altText : "");
  const initial = props.mode === "edit" ? props.initialValue : empty;
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );
  async function choose(file: File | undefined) {
    setConversionError("");
    setConverted(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setConversionError("JPEG, PNG 또는 WebP 이미지만 선택해 주세요.");
      return;
    }
    setStatus("이미지를 WebP로 변환하고 있습니다.");
    try {
      const bitmap = await createImageBitmap(file);
      let blob: Blob;
      let width: number;
      let height: number;

      try {
        const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
        width = Math.max(1, Math.round(bitmap.width * scale));
        height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("canvas_context_unavailable");
        }

        context.drawImage(bitmap, 0, 0, width, height);
        blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((value) => (value ? resolve(value) : reject(new Error())), "image/webp", 0.82),
        );
      } finally {
        bitmap.close();
      }
      if (blob.size > 3 * 1024 * 1024) throw new Error("변환된 이미지가 3MB를 초과합니다.");
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = URL.createObjectURL(blob);
      setPreview(previewRef.current);
      setConverted({
        blob,
        width,
        height,
        originalName: file.name,
        originalSize: file.size,
      });
      setStatus("WebP 변환을 완료했습니다.");
    } catch {
      setStatus("");
      setConversionError("이미지를 변환할 수 없습니다. 다른 이미지를 선택해 주세요.");
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget),
      metadata = Object.fromEntries(fd.entries());
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    try {
      let response;
      if (props.mode === "create") {
        if (!converted) {
          setFormError("이미지를 선택하고 변환을 완료해 주세요.");
          return;
        }
        const body = new FormData();
        body.set("image", new File([converted.blob], "image.webp", { type: "image/webp" }));
        body.set(
          "metadata",
          JSON.stringify({
            ...metadata,
            originalFileName: converted.originalName,
            contentSafetyConfirmed: fd.get("contentSafetyConfirmed") === "on",
          }),
        );
        response = await fetch("/api/admin/gallery", {
          method: "POST",
          body,
          credentials: "same-origin",
        });
      } else
        response = await fetch(`/api/admin/gallery/${props.galleryItemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            ...metadata,
            contentSafetyConfirmed: fd.get("contentSafetyConfirmed") === "on",
            expectedUpdatedAt: props.expectedUpdatedAt,
          }),
        });
      const result = (await response.json().catch(() => null)) as GalleryFormResponse | null;
      if (response.ok && result?.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
        return;
      }
      setFieldErrors(result?.fieldErrors ?? {});
      setFormError(
        result?.error === "edit_conflict"
          ? "다른 관리자가 먼저 수정했습니다. 상세 화면을 새로 확인해 주세요."
          : "저장할 수 없습니다. 입력 내용과 이미지 조건을 확인해 주세요.",
      );
    } catch {
      setFormError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="max-w-4xl space-y-6" aria-busy={busy || undefined}>
      {formError ? (
        <p role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger">
          {formError}
        </p>
      ) : null}
      {props.mode === "create" ? (
        <div className="grid gap-2 border-b border-border pb-6">
          <label htmlFor="gallery-image" className="font-semibold">
            이미지 <span className="text-danger">*</span>
          </label>
          <input
            id="gallery-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(e) => void choose(e.target.files?.[0])}
            aria-invalid={Boolean(fieldErrors.image) || undefined}
            aria-describedby={`gallery-image-help gallery-image-status${fieldErrors.image ? " gallery-image-error" : ""}`}
          />
          <p id="gallery-image-help" className="text-small text-muted-foreground">
            JPEG, PNG, WebP 원본을 선택하면 긴 변 1920px 이하, quality 0.82 WebP로 변환합니다.
          </p>
          <p id="gallery-image-status" role="status">
            {status}
          </p>
          {conversionError ? (
            <p role="alert" className="text-danger">
              {conversionError}
            </p>
          ) : null}
          {fieldErrors.image ? (
            <p id="gallery-image-error" role="alert" className="text-danger">
              {fieldErrors.image}
            </p>
          ) : null}
          {converted ? (
            <dl className="text-small">
              <dt>원본 파일명</dt>
              <dd className="break-all">{converted.originalName}</dd>
              <dt>원본 용량</dt>
              <dd>{converted.originalSize.toLocaleString()} bytes</dd>
              <dt>변환 결과</dt>
              <dd>
                {converted.blob.size.toLocaleString()} bytes · {converted.width}×{converted.height}
              </dd>
            </dl>
          ) : null}
          {preview ? (
            <img src={preview} alt={alt} className="h-auto max-h-96 max-w-full rounded-card object-contain" />
          ) : null}
        </div>
      ) : (
        <p className="rounded-card border p-4">
          이번 단계에서는 이미지 교체를 지원하지 않습니다.
          <br />
          다른 이미지를 사용해야 하면 새 활동사진 초안을 등록해 주세요.
        </p>
      )}
      {fields.map(([name, label, kind]) => {
        const optional = ["consentCheckedOn", "consentReferenceCode", "displayStartOn", "displayEndOn"].includes(name);
        const maxLength =
          name === "slug"
            ? 80
            : name === "title"
              ? 100
              : name === "category"
                ? 40
                : name === "description"
                  ? 500
                  : name === "altText"
                    ? 300
                    : name === "consentReferenceCode"
                      ? 80
                      : undefined;
        return (
          <div key={name} className="grid gap-2 border-b border-border pb-6">
            <label htmlFor={`gallery-${name}`} className="font-semibold">
              {label}
              {optional ? " (선택)" : <span className="ml-1 text-danger">*</span>}
            </label>
            {kind === "textarea" ? (
              <textarea
                id={`gallery-${name}`}
                name={name}
                rows={4}
                required={!optional}
                maxLength={maxLength}
                defaultValue={initial[name]}
                aria-invalid={Boolean(fieldErrors[name]) || undefined}
                aria-describedby={
                  name === "altText"
                    ? `gallery-altText-help${fieldErrors[name] ? ` gallery-${name}-error` : ""}`
                    : fieldErrors[name]
                      ? `gallery-${name}-error`
                      : undefined
                }
                onChange={name === "altText" ? (e) => setAlt(e.target.value) : undefined}
              />
            ) : (
              <input
                id={`gallery-${name}`}
                name={name}
                type={kind}
                required={!optional}
                maxLength={maxLength}
                pattern={
                  name === "slug"
                    ? "[a-z0-9]+(?:-[a-z0-9]+)*"
                    : name === "consentReferenceCode"
                      ? "[A-Za-z0-9_-]+"
                      : undefined
                }
                defaultValue={initial[name]}
                aria-invalid={Boolean(fieldErrors[name]) || undefined}
                aria-describedby={fieldErrors[name] ? `gallery-${name}-error` : undefined}
              />
            )}{" "}
            {name === "altText" ? (
              <p id="gallery-altText-help" className="text-small text-muted-foreground">
                이름, 나이, 장애·건강 정보나 개인을 추정할 상세 위치 없이 핵심 장면을 설명해 주세요.
              </p>
            ) : null}
            {fieldErrors[name] ? (
              <p id={`gallery-${name}-error`} role="alert" className="text-small text-danger">
                {fieldErrors[name]}
              </p>
            ) : null}
          </div>
        );
      })}
      <div className="grid gap-2">
        <label htmlFor="gallery-subjectPresence" className="font-semibold">
          사진 속 인물 상태
        </label>
        <select
          id="gallery-subjectPresence"
          name="subjectPresence"
          defaultValue={initial.subjectPresence}
          className="min-h-11 border"
          aria-invalid={Boolean(fieldErrors.subjectPresence) || undefined}
          aria-describedby={fieldErrors.subjectPresence ? "gallery-subjectPresence-error" : undefined}
        >
          <option value="none">인물 없음</option>
          <option value="non_identifiable">개인 식별 불가</option>
          <option value="identifiable">개인 식별 가능</option>
        </select>
        {fieldErrors.subjectPresence ? (
          <p id="gallery-subjectPresence-error" role="alert" className="text-small text-danger">
            {fieldErrors.subjectPresence}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <label htmlFor="gallery-consentStatus" className="font-semibold">
          공개 동의 상태
        </label>
        <select
          id="gallery-consentStatus"
          name="consentStatus"
          defaultValue={initial.consentStatus}
          className="min-h-11 border"
          aria-invalid={Boolean(fieldErrors.consentStatus) || undefined}
          aria-describedby={fieldErrors.consentStatus ? "gallery-consentStatus-error" : undefined}
        >
          <option value="not_required">별도 동의 불필요</option>
          <option value="pending">동의 확인 중</option>
          <option value="confirmed">공개 동의 확인</option>
        </select>
        {fieldErrors.consentStatus ? (
          <p id="gallery-consentStatus-error" role="alert" className="text-small text-danger">
            {fieldErrors.consentStatus}
          </p>
        ) : null}
      </div>
      <div className="flex items-start gap-3 border-l-4 border-warning bg-warning-soft p-4">
        <input
          id="gallery-safety"
          name="contentSafetyConfirmed"
          type="checkbox"
          required
          aria-invalid={Boolean(fieldErrors.contentSafetyConfirmed) || undefined}
          aria-describedby={fieldErrors.contentSafetyConfirmed ? "gallery-contentSafetyConfirmed-error" : undefined}
        />
        <label htmlFor="gallery-safety">
          얼굴·이름표·문서·주소·차량번호와 개인정보·민감정보를 확인했고 공개 권한 없는 내용이 없음을 확인했습니다.
        </label>
        {fieldErrors.contentSafetyConfirmed ? (
          <p id="gallery-contentSafetyConfirmed-error" role="alert" className="text-small text-danger">
            {fieldErrors.contentSafetyConfirmed}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 rounded-control bg-primary px-6 py-2 font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "저장 중…" : props.mode === "create" ? "활동사진 초안 저장" : "변경 사항 저장"}
        </button>
        <Link
          href={props.mode === "create" ? "/admin/gallery" : `/admin/gallery/${props.galleryItemId}`}
          className="inline-flex min-h-12 items-center rounded-control border border-border-strong px-6 py-2 font-bold text-primary"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
