"use client";

import { Node, NodeViewWrapper, ReactNodeViewRenderer, type Editor, type NodeViewProps } from "@tiptap/react";
import { Selection } from "@tiptap/pm/state";
import { useEffect, useRef, useState } from "react";
import { convertImageToWebp } from "@/lib/client-image-conversion";
import { useAdminUnsavedChangesGuard } from "@/lib/use-admin-unsaved-changes-guard";
import { BODY_IMAGE_ALT_LIMIT, BODY_IMAGE_LIMIT, bodyImageUrl, isBodyImageId, type BodyImageDomain, type BodyImageReference } from "@/features/news/body-image-reference";

export type ImageTarget = { domain: BodyImageDomain; postId: string; expectedUpdatedAt: string };
const control = "min-h-11 rounded-control border border-border-strong px-3 text-small focus-visible:outline-2 focus-visible:outline-focus-ring disabled:opacity-50";
const uploadErrorCodes = new Set([
  "invalid_image_request",
  "invalid_webp",
  "edit_conflict",
  "image_limit",
  "image_upload_failed",
]);

export const BodyImageDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "(block | bodyImage | youtubeVideo)+",
});

function BodyImageView({ node, editor, selected, deleteNode, extension }: NodeViewProps) {
  const image = node.attrs as BodyImageReference;
  const { target } = extension.options as { target?: ImageTarget };
  return <NodeViewWrapper contentEditable={false} className="my-4 min-w-0">
    <figure className={`relative w-fit max-w-full rounded-control border ${selected ? "border-primary outline-2 outline-focus-ring" : "border-border"}`}>
      {target && isBodyImageId(image.imageId) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bodyImageUrl(target.domain, target.postId, image.imageId, true)} alt={image.alt}
          className="block h-auto max-w-full rounded-control" draggable={false} />
      ) : <p>이미지 미리보기를 표시할 수 없습니다.</p>}
      <button type="button" aria-label={`이미지 삭제 · ${image.alt}`}
        className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-control bg-background text-xl font-bold text-foreground shadow focus-visible:outline-2 focus-visible:outline-focus-ring"
        onClick={() => { if (editor.isEditable) { deleteNode(); editor.commands.focus(); } }}>
        <span aria-hidden="true">×</span>
      </button>
    </figure>
  </NodeViewWrapper>;
}

export const BodyImageNode = Node.create<{ target?: ImageTarget }>({
  name: "bodyImage",
  atom: true,
  addOptions: () => ({ target: undefined }),
  addAttributes: () => ({ imageId: { default: null }, alt: { default: "" } }),
  // HTML·클립보드에서 이미지 참조를 가져오지 않습니다.
  renderHTML: () => ["div"],
  addNodeView: () => ReactNodeViewRenderer(BodyImageView),
});

export function insertBodyMedia(editor: Editor, cursor: number, type: "bodyImage" | "youtubeVideo", attrs: Record<string, unknown>) {
  if (editor.isDestroyed) return false;
  const transaction = editor.state.tr;
  const point = transaction.doc.resolve(cursor);
  let position = cursor;
  if (type === "bodyImage" && point.depth === 1 && point.parent.isTextblock && point.parent.type.name === "paragraph" &&
      point.parentOffset > 0 && point.parentOffset < point.parent.content.size) {
    transaction.split(cursor);
    position++;
  } else if (point.depth > 0) {
    position = point.depth === 1 && point.parentOffset === 0 ? point.before(1) : point.after(1);
  }
  const node = editor.schema.nodes[type].create(attrs);
  transaction.insert(position, node);
  const next = position + node.nodeSize;
  if (next === transaction.doc.content.size) transaction.insert(next, editor.schema.nodes.paragraph.create());
  if (!transaction.doc.childAfter(position).node?.eq(node)) return false;
  const selection = Selection.near(transaction.doc.resolve(next), 1);
  editor.view.dispatch(transaction.setSelection(selection).scrollIntoView());
  return true;
}

export function insertBodyImage(editor: Editor, cursor: number, image: BodyImageReference) {
  return insertBodyMedia(editor, cursor, "bodyImage", image);
}

export function AdminBodyImagePicker({ editor, target, cursor, uploading, onUploading, onClose, fieldId, hasSavedPost }: {
  editor: Editor;
  target?: ImageTarget;
  cursor: number;
  uploading: boolean;
  onUploading: (uploading: boolean) => void;
  onClose: () => void;
  fieldId: string;
  hasSavedPost: boolean;
}) {
  const [selection, setSelection] = useState<{ file: File; preview: string }>();
  const file = selection?.file;
  const preview = selection?.preview;
  const fileInput = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [nonIdentifiable, setNonIdentifiable] = useState(false);
  const [error, setError] = useState<{ message: string; diagnostic?: { status: number; code: string } }>();
  useAdminUnsavedChangesGuard(uploading, "이미지 업로드 중입니다. 페이지를 벗어나면 본문에 삽입되지 않습니다.");
  useEffect(() => {
    fileInput.current?.focus();
  }, []);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function upload() {
    if (!target || !file || uploading || !nonIdentifiable || !alt.trim()) return;
    if ((editor.$nodes("bodyImage")?.length ?? 0) >= BODY_IMAGE_LIMIT) {
      setError({ message: `본문 이미지는 ${BODY_IMAGE_LIMIT}개까지 넣을 수 있습니다.` });
      return;
    }
    setError(undefined);
    onUploading(true);
    try {
      const { blob } = await convertImageToWebp(file);
      const response = await fetch(`/api/admin/body-images/${target.domain}/${target.postId}`, {
        method: "POST", credentials: "same-origin", body: blob,
        headers: {
          "Content-Type": "image/webp",
          "X-Expected-Updated-At": target.expectedUpdatedAt,
          "X-Non-Identifiable-Image": "true",
        },
      });
      const data: { id?: unknown; error?: unknown } | null = await response.json().catch(() => null);
      if (!response.ok || !isBodyImageId(data?.id)) {
        const code = typeof data?.error === "string" && uploadErrorCodes.has(data.error) ? data.error : "unknown";
        const message = code === "edit_conflict"
          ? "게시물 상태가 바뀌었습니다. 현재 입력을 확인한 뒤 최신 수정 화면에서 다시 시도해 주세요."
          : code === "image_limit" ? "이 게시물의 이미지 저장 한도에 도달했습니다."
          : "이미지를 올리지 못했습니다. 로그인 상태와 파일을 확인한 뒤 다시 시도해 주세요.";
        setError({ message, diagnostic: { status: response.status, code } });
        return;
      }
      if (!insertBodyImage(editor, cursor, { imageId: data.id, alt: alt.trim() })) {
        setError({ message: "본문에 삽입하지 못했습니다. 닫은 뒤 문단에 커서를 놓고 다시 시도해 주세요." });
        return;
      }
      onClose();
    } catch {
      setError({ message: "이미지를 삽입하지 못했습니다. JPEG·PNG·WebP 파일을 확인한 뒤 다시 시도해 주세요." });
    } finally {
      onUploading(false);
    }
  }

  return <div id={fieldId} className="grid min-w-0 gap-3 border-b border-border bg-surface p-3"
    data-unsaved-ignore aria-busy={uploading} onKeyDown={(event) => {
      if (event.key === "Escape" && !uploading) { event.preventDefault(); onClose(); }
    }}>
    {target ? <>
      <label className="grid gap-1 text-small font-semibold">
        이미지 파일
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}
          onChange={(event) => {
            const next = event.target.files?.[0];
            setSelection(next ? { file: next, preview: URL.createObjectURL(next) } : undefined);
            setError(undefined);
          }} />
      </label>
      {file ? <p className="break-all text-small">{file.name}</p> : null}
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="선택한 이미지 미리보기" className="h-auto max-h-40 max-w-full object-contain object-left" />
      ) : null}
      <label className="grid gap-1 text-small font-semibold">
        대체 텍스트
        <input value={alt} maxLength={BODY_IMAGE_ALT_LIMIT} disabled={uploading} className={control}
          onChange={(event) => setAlt(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }} />
      </label>
      <label className="flex items-start gap-2 text-small">
        <input type="checkbox" checked={nonIdentifiable} disabled={uploading}
          onChange={(event) => setNonIdentifiable(event.target.checked)} />
        이름, 얼굴, 명찰 등으로 식별할 수 있는 사람이 이미지에 없습니다.
      </label>
      <p className="text-small text-muted-foreground">문단 사이에 삽입됩니다. 목록 안에서는 목록 뒤에 들어갑니다.</p>
    </> : <p className="text-small">{hasSavedPost
      ? "저장된 비공개 초안에만 이미지를 올릴 수 있습니다. 게시물 상태를 확인해 주세요."
      : "이미지를 게시물에 연결하려면 비공개 초안이 필요합니다. 초안을 저장한 뒤 상세 화면에서 수정으로 들어와 주세요."}</p>}
    {error ? <div role="alert" className="text-small text-danger">
      <p>{error.message}</p>
      {error.diagnostic ? <p>진단 정보: HTTP {error.diagnostic.status} / {error.diagnostic.code}</p> : null}
    </div> : null}
    {uploading ? <p role="status" className="text-small">이미지를 올리는 중입니다. 완료 후 게시물을 저장해 주세요.</p> : null}
    <div className="flex flex-wrap gap-2">
      {target ? <button type="button" disabled={uploading || !file || !alt.trim() || !nonIdentifiable}
        className={control} onClick={upload}>업로드하고 삽입</button> : null}
      <button type="button" disabled={uploading} className={control} onClick={onClose}>{target ? "선택 취소" : "닫기"}</button>
    </div>
  </div>;
}
