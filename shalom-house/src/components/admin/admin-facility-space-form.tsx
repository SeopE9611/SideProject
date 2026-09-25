"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { FacilitySpaceInput } from "@/features/facility-spaces/facility-space.types";
import {
  validateFacilitySpaceInput,
  type FacilitySpaceFieldErrors,
} from "@/features/facility-spaces/facility-space.validation";
import { convertImageToWebp, type ConvertedWebpImage } from "@/lib/client-image-conversion";

export type AdminFacilitySpaceMediaView = {
  src: string;
  altText: string;
  width: number;
  height: number;
  originalFileName: string;
};
export type AdminFacilitySpaceFormProps = {
  mode: "create" | "edit";
  id?: string;
  expectedUpdatedAt: string | null;
  initialSpace: FacilitySpaceInput;
  initialMedia: AdminFacilitySpaceMediaView | null;
};
type SaveResponse = {
  id?: string;
  updatedAt?: string;
  redirectTo?: string;
  error?: string;
  fieldErrors?: FacilitySpaceFieldErrors;
};
type MediaResponse = { updatedAt?: string; mediaUrl?: string; error?: string };

const mediaErrorMessage = (error?: string) =>
  error === "validation"
    ? "사진과 대체 텍스트를 확인해 주세요."
    : error === "edit_conflict"
      ? "다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요."
      : error === "media_not_found"
        ? "현재 사진이 이미 제거되었습니다. 새로고침 후 다시 확인해 주세요."
        : error === "payload_too_large"
          ? "사진 용량이 허용 범위를 초과했습니다. 변환 결과가 3MB 이하인지 확인해 주세요."
          : error === "unsupported_media_type"
            ? "이미지 변환과 파일 조건을 확인해 주세요."
            : "사진을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.";

export function AdminFacilitySpaceForm({
  mode,
  id,
  expectedUpdatedAt,
  initialSpace,
  initialMedia,
}: AdminFacilitySpaceFormProps) {
  const router = useRouter();
  const previewRef = useRef<string | null>(null);
  const [space, setSpace] = useState(initialSpace);
  const [version, setVersion] = useState(expectedUpdatedAt);
  const [currentMedia, setCurrentMedia] = useState(initialMedia);
  const [converted, setConverted] = useState<ConvertedWebpImage | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [mediaConfirmed, setMediaConfirmed] = useState(false);
  const [removeConfirmed, setRemoveConfirmed] = useState(false);
  const [mediaStatus, setMediaStatus] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<FacilitySpaceFieldErrors>({});
  const [message, setMessage] = useState("");
  const [recoveryHref, setRecoveryHref] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );
  const set = <K extends keyof FacilitySpaceInput>(key: K, value: FacilitySpaceInput[K]) =>
    setSpace((current) => ({ ...current, [key]: value }));

  async function chooseImage(file: File | undefined) {
    setMediaError("");
    setMediaStatus("");
    setConverted(null);
    setMediaConfirmed(false);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    if (!file) return;
    setMediaStatus("이미지를 WebP로 변환하고 있습니다.");
    try {
      const result = await convertImageToWebp(file);
      previewRef.current = URL.createObjectURL(result.blob);
      setPreview(previewRef.current);
      setConverted(result);
      setMediaStatus("WebP 변환을 완료했습니다.");
    } catch (error) {
      setMediaStatus("");
      setMediaError(
        error instanceof Error && error.message === "unsupported_media_type"
          ? "JPEG, PNG 또는 WebP 이미지만 선택해 주세요."
          : "이미지를 변환할 수 없습니다. 다른 이미지를 선택해 주세요.",
      );
    }
  }

  async function putMedia(spaceId: string, updatedAt: string) {
    if (!converted || !altText.trim() || !mediaConfirmed) {
      setMediaError("사진과 대체 텍스트를 확인하고 사진 안전 확인에 동의해 주세요.");
      return null;
    }
    const body = new FormData();
    body.set("image", new File([converted.blob], "image.webp", { type: "image/webp" }));
    body.set("expectedUpdatedAt", updatedAt);
    body.set("altText", altText.trim());
    body.set("originalFileName", converted.originalName);
    body.set("contentSafetyConfirmed", "true");
    const response = await fetch(`/api/admin/site-content/spaces/${spaceId}/media`, { method: "PUT", body });
    const result = (await response.json().catch(() => null)) as MediaResponse | null;
    if (!response.ok || !result?.updatedAt) {
      setMediaError(mediaErrorMessage(result?.error));
      return null;
    }
    return result;
  }

  async function saveMedia() {
    if (!id || !version || mediaBusy) return;
    setMediaError("");
    setMediaBusy(true);
    try {
      const result = await putMedia(id, version);
      if (!result?.updatedAt) return;
      setVersion(result.updatedAt);
      setCurrentMedia({
        src: `${result.mediaUrl ?? `/api/admin/site-content/spaces/${id}/media`}?v=${encodeURIComponent(result.updatedAt)}`,
        altText: altText.trim(),
        width: converted!.width,
        height: converted!.height,
        originalFileName: converted!.originalName,
      });
      setMediaStatus("공간 사진을 저장했습니다.");
      setConverted(null);
      setPreview(null);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setAltText("");
      setMediaConfirmed(false);
      router.refresh();
    } catch {
      setMediaError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setMediaBusy(false);
    }
  }

  async function removeMedia() {
    if (!id || !version || !removeConfirmed || mediaBusy) return;
    setMediaError("");
    setMediaBusy(true);
    try {
      const response = await fetch(`/api/admin/site-content/spaces/${id}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: version, removeConfirmed: true }),
      });
      const result = (await response.json().catch(() => null)) as MediaResponse | null;
      if (!response.ok || !result?.updatedAt) {
        setMediaError(mediaErrorMessage(result?.error));
        if (result?.error === "media_not_found") router.refresh();
        return;
      }
      setVersion(result.updatedAt);
      setCurrentMedia(null);
      setRemoveConfirmed(false);
      setMediaStatus("공간 사진을 제거했습니다.");
      router.refresh();
    } catch {
      setMediaError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setMediaBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const validation = validateFacilitySpaceInput(space);
    if (!validation.ok || !confirmed) {
      setErrors({
        ...(!validation.ok ? validation.fieldErrors : {}),
        ...(!confirmed ? { saveConfirmed: "공개 가능한 내용인지 확인해 주세요." } : {}),
      });
      setMessage("입력 내용을 확인해 주세요.");
      return;
    }
    if (mode === "create" && converted && (!altText.trim() || !mediaConfirmed)) {
      setMediaError("사진과 대체 텍스트를 확인하고 사진 안전 확인에 동의해 주세요.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/site-content/spaces" : `/api/admin/site-content/spaces/${id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedUpdatedAt: version, saveConfirmed: true, space: validation.value }),
        },
      );
      const body = (await response.json().catch(() => null)) as SaveResponse | null;
      if (!response.ok || !body?.redirectTo) {
        if (body?.error === "validation") {
          setErrors(body.fieldErrors ?? {});
          setMessage("입력 내용을 확인해 주세요.");
          return;
        }
        setMessage(
          body?.error === "edit_conflict"
            ? "다른 관리자가 공간 정보를 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요."
            : body?.error === "invalid_transition"
              ? "보관된 공간은 초안으로 복구한 뒤 공개할 수 있습니다."
              : "생활공간 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }
      if (mode === "create" && converted && body.id && body.updatedAt) {
        const mediaResult = await putMedia(body.id, body.updatedAt);
        if (!mediaResult) {
          setMessage("생활공간 정보는 저장됐지만 사진은 저장하지 못했습니다. 편집 화면에서 다시 등록해 주세요.");
          setRecoveryHref(`/admin/site-content/spaces/${body.id}/edit`);
          return;
        }
      }
      window.location.assign(body.redirectTo);
    } catch {
      setMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  const error = (key: keyof FacilitySpaceFieldErrors) =>
    errors[key] ? <p id={`${key}-error`} role="alert" className="text-small font-semibold text-danger">{errors[key]}</p> : null;
  const controlClass = "min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";
  return (
    <form className="max-w-4xl space-y-6" onSubmit={submit} aria-busy={busy || mediaBusy}>
      <div className="grid gap-2 border-b border-border pb-6">
        <label className="font-semibold" htmlFor="title">공간명 <span className="text-danger">*</span></label>
        <input id="title" required maxLength={100} className={controlClass} value={space.title} onChange={(e) => set("title", e.target.value)} aria-invalid={errors.title ? true : undefined} aria-describedby={errors.title ? "title-error" : undefined} />
        {error("title")}
      </div>
      <div className="grid gap-2 border-b border-border pb-6">
        <label className="font-semibold" htmlFor="description">공간 설명 <span className="text-danger">*</span></label>
        <p id="description-help" className="text-small text-muted-foreground">입소자 개인정보와 시설 보안에 영향을 줄 수 있는 상세 위치·출입 정보는 입력하지 마세요.</p>
        <textarea id="description" required minLength={10} maxLength={800} rows={8} className={controlClass} value={space.description} onChange={(e) => set("description", e.target.value)} aria-invalid={errors.description ? true : undefined} aria-describedby={`description-help${errors.description ? " description-error" : ""}`} />
        {error("description")}
      </div>
      <section className="grid gap-3 border-b border-border pb-6" aria-labelledby="space-media-title">
        <h3 id="space-media-title" className="font-semibold">공간 사진 {mode === "create" ? "(선택)" : ""}</h3>
        {currentMedia ? (
          <div className="grid gap-3 rounded-card border border-border bg-surface p-4">
            <p className="font-semibold">현재 사진</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- 인증된 no-store 프록시의 즉시 접근 차단 의미를 유지합니다. */}
            <img src={currentMedia.src} alt={currentMedia.altText} width={currentMedia.width} height={currentMedia.height} className="aspect-[3/2] w-full max-w-2xl rounded-card object-cover" />
            <dl className="grid gap-1 text-small"><dt className="font-semibold">원본 파일명</dt><dd className="break-all">{currentMedia.originalFileName}</dd><dt className="font-semibold">크기</dt><dd>{currentMedia.width}×{currentMedia.height}</dd><dt className="font-semibold">대체 텍스트</dt><dd>{currentMedia.altText}</dd></dl>
          </div>
        ) : mode === "edit" ? <p className="text-small text-muted-foreground">등록된 공간 사진이 없습니다.</p> : null}
        <label className="font-semibold" htmlFor="space-image">{currentMedia ? "새 사진 선택" : "사진 선택"}</label>
        <input id="space-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void chooseImage(e.target.files?.[0])} className={controlClass} />
        <p className="text-small text-muted-foreground">JPEG, PNG, WebP 원본을 선택하면 긴 변 1920px 이하, quality 0.82 WebP로 변환합니다.</p>
        {converted ? <><dl className="text-small"><dt>원본 파일명</dt><dd className="break-all">{converted.originalName}</dd><dt>원본 용량</dt><dd>{converted.originalSize.toLocaleString()} bytes</dd><dt>변환 결과</dt><dd>{converted.blob.size.toLocaleString()} bytes · {converted.width}×{converted.height}</dd></dl>{preview ? <img src={preview} alt={altText} className="aspect-[3/2] w-full max-w-2xl rounded-card object-cover" /> : null}<label className="font-semibold" htmlFor="space-alt-text">대체 텍스트 <span className="text-danger">*</span></label><textarea id="space-alt-text" required maxLength={300} rows={3} value={altText} onChange={(e) => setAltText(e.target.value)} className={controlClass} /><p className="text-small text-muted-foreground">공간 사진에서 실제로 보이는 구조와 쓰임을 간결하게 설명해 주세요.</p><label className="flex items-start gap-3 border-l-4 border-warning bg-warning-soft p-4"><input type="checkbox" required checked={mediaConfirmed} onChange={(e) => setMediaConfirmed(e.target.checked)} className="mt-1 size-5 shrink-0 accent-primary" /><span className="text-small leading-relaxed">사진에 인물, 이름표, 문서, 연락처, 차량번호, 건강·장애 정보와 상세 출입·보안 정보가 보이지 않음을 확인했습니다.</span></label>{mode === "edit" ? <button type="button" disabled={mediaBusy} onClick={() => void saveMedia()} className="w-fit min-h-11 rounded-control bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-60">{currentMedia ? "사진 교체" : "사진 저장"}</button> : null}</> : null}
        <p role="status" className="text-small text-muted-foreground">{mediaStatus}</p>
        {mediaError ? <p role="alert" className="text-small font-semibold text-danger">{mediaError}</p> : null}
        {mode === "edit" && currentMedia ? <div className="grid gap-3 border-t border-border pt-4"><label className="flex items-start gap-3"><input type="checkbox" checked={removeConfirmed} onChange={(e) => setRemoveConfirmed(e.target.checked)} className="mt-1 size-5 shrink-0 accent-primary" /><span>현재 공간 사진만 제거하는 작업임을 확인했습니다.</span></label><button type="button" disabled={!removeConfirmed || mediaBusy} onClick={() => void removeMedia()} className="w-fit min-h-11 rounded-control border border-danger px-5 py-2 font-bold text-danger disabled:opacity-60">사진 제거</button></div> : null}
      </section>
      <div className="grid gap-2 border-b border-border pb-6"><label className="font-semibold" htmlFor="publicationStatus">공개 상태</label><select id="publicationStatus" className={controlClass} value={space.publicationStatus} onChange={(e) => set("publicationStatus", e.target.value as FacilitySpaceInput["publicationStatus"])} aria-invalid={errors.publicationStatus ? true : undefined} aria-describedby={errors.publicationStatus ? "publicationStatus-error" : undefined}><option value="draft">초안</option><option value="published">공개</option><option value="archived">보관</option></select>{error("publicationStatus")}</div>
      <div className="grid gap-2 border-b border-border pb-6"><label className="font-semibold" htmlFor="displayOrder">표시 순서 <span className="text-danger">*</span></label><input id="displayOrder" type="number" required min={1} max={999} className={controlClass} value={space.displayOrder} onChange={(e) => set("displayOrder", Number(e.target.value))} aria-invalid={errors.displayOrder ? true : undefined} aria-describedby={errors.displayOrder ? "displayOrder-error" : undefined} />{error("displayOrder")}</div>
      <div><div className="border-l-4 border-warning bg-warning-soft p-4"><label className="flex items-start gap-3"><input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} aria-invalid={errors.saveConfirmed ? true : undefined} aria-describedby={errors.saveConfirmed ? "saveConfirmed-error" : undefined} className="size-5 shrink-0 accent-primary" /><span className="font-semibold">입력한 공간 설명이 개인정보와 시설 보안상 공개 가능한 내용임을 확인했습니다.</span></label></div>{errors.saveConfirmed ? <p id="saveConfirmed-error" role="alert" className="mt-2 text-small font-semibold text-danger">{errors.saveConfirmed}</p> : null}</div>
      {message ? <div role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger"><p>{message}</p>{recoveryHref ? <Link href={recoveryHref} className="mt-3 inline-flex min-h-11 items-center rounded-control border border-danger px-4 py-2">생성된 생활공간 편집으로 이동</Link> : null}</div> : null}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6"><button type="submit" disabled={busy || mediaBusy || Boolean(recoveryHref)} className="inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-6 py-2 font-bold text-primary-foreground disabled:opacity-60">{busy ? "저장 중…" : mode === "create" ? "생활공간 저장" : "변경 사항 저장"}</button><Link href={mode === "create" ? "/admin/site-content/spaces" : `/admin/site-content/spaces/${id}`} className="inline-flex min-h-12 items-center rounded-control border border-border-strong px-6 py-2 font-bold text-primary">취소</Link></div>
    </form>
  );
}
