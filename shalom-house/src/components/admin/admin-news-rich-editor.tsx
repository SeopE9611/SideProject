"use client";

import { EditorContent, useEditor, useEditorState, type JSONContent } from "@tiptap/react";
import { AdminBodyImagePicker, BodyImageDocument, BodyImageNode, type ImageTarget } from "./admin-body-image";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ADMIN_NEWS_BODY_MAX_LENGTH } from "@/features/news/news.admin-validation";
import { isSafeNewsLink, newsDocumentToBody, type NewsBodyDocument, type NewsRichNode } from "@/features/news/news.rich-text";

// Tiptap의 링크 표시 속성(target/rel/class/title)과 목록 type은 저장 계약에 포함하지 않습니다.
// 서버에서는 이 변환을 신뢰하지 않고 허용 목록을 다시 검사합니다.
function documentForStorage(node: JSONContent): unknown {
  return {
    type: node.type,
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(node.type === "bodyImage" ? { attrs: { imageId: node.attrs?.imageId, alt: node.attrs?.alt } } : {}),
    ...(node.type === "heading" ? { attrs: { level: node.attrs?.level } } : {}),
    ...(node.type === "orderedList" ? { attrs: { start: node.attrs?.start ?? 1 } } : {}),
    ...(node.marks?.length ? { marks: node.marks.map((mark) => ({ type: mark.type, ...(mark.type === "link" ? { attrs: { href: mark.attrs?.href } } : {}) })) } : {}),
    ...(node.content ? { content: node.content.map(documentForStorage) } : {}),
  };
}

// 기존 LineIcon의 선 굵기와 뷰박스에 맞춰 그린 편집기 전용 아이콘입니다.
const toolbarPaths = {
  paragraph: "M15 4h-5a4 4 0 0 0 0 8h1m0-8v16m4-16v16",
  h2: "M3 5v14m7-14v14M3 12h7m4-1a3 3 0 0 1 6 0c0 2-6 4-6 8h6",
  h3: "M3 5v14m7-14v14M3 12h7m4-1a3 3 0 1 1 3 3 3 3 0 1 1-3 3",
  bold: "M6 4h6a4 4 0 0 1 0 8H6m0-8v16h7a4 4 0 0 0 0-8h-1",
  italic: "M11 4h8M5 20h8m2-16-6 16",
  bullet: "M9 6h12M9 12h12M9 18h12M4 6h.1M4 12h.1M4 18h.1",
  ordered: "M11 6h10m-10 6h10m-10 6h10M4 4l1-1v5m-2 0h4m-4 7a2 2 0 1 1 4 0c0 1-4 2-4 4h4",
  link: "M10 8l3-3a4 4 0 0 1 6 6l-3 3m-2 2-3 3a4 4 0 0 1-6-6l3-3m1 5 6-6",
  unlink: "M13 5a4 4 0 0 1 6 6l-2 2m-4 4-2 2a4 4 0 0 1-6-6m-2-9 18 16",
  image: "M3 4h18v16H3zM3 17l5-5 4 4 3-3 6 5M15 8h.1",
  undo: "M8 5l-5 5 5 5m-5-5h11a6 6 0 0 1 6 6v3",
  redo: "M16 5l5 5-5 5m5-5H10a6 6 0 0 0-6 6v3",
};

const countFormat = new Intl.NumberFormat("ko-KR");
const placeholder = "내용을 입력해 주세요.";

function navigateToolbar(event: KeyboardEvent<HTMLDivElement>) {
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(event.key)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
  const index = buttons.findIndex((button) => button === event.target);
  if (index < 0) return;
  event.preventDefault();
  let next = 0;
  if (event.key === "End") next = buttons.length - 1;
  if (event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
  if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
  buttons[next]?.focus();
}

export function AdminNewsRichEditor({ initialDocument, disabled, invalid, describedBy, onChange, imageTarget, imageUploadEnabled, onImageUploading, bodyId = "admin-news-body", labelId = "admin-news-body-label", linkId = "news-editor-link", maxLength = ADMIN_NEWS_BODY_MAX_LENGTH }: {
  initialDocument: NewsBodyDocument;
  bodyId?: string;
  imageTarget?: ImageTarget;
  imageUploadEnabled?: boolean;
  onImageUploading: (uploading: boolean) => void;
  labelId?: string;
  linkId?: string;
  maxLength?: number;
  disabled: boolean;
  invalid: boolean;
  describedBy?: string;
  onChange: (document: unknown) => void;
}) {
  const callback = useRef(onChange);
  useEffect(() => { callback.current = onChange; }, [onChange]);
  const [imageCursor, setImageCursor] = useState<number>();
  const [uploading, setUploading] = useState(false);
  const imageOpen = imageCursor !== undefined;
  const linkInput = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  useEffect(() => {
    if (linkOpen && !disabled) linkInput.current?.focus();
  }, [linkOpen, disabled]);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    content: initialDocument.document,
    editable: !disabled,
    extensions: [BodyImageDocument, BodyImageNode.configure({ target: imageTarget }), StarterKit.configure({
      document: false,
      heading: { levels: [2, 3] }, hardBreak: { keepMarks: false },
      blockquote: false, code: false, codeBlock: false, horizontalRule: false,
      strike: false, underline: false, trailingNode: false,
      link: { openOnClick: false, autolink: false, linkOnPaste: false,
        isAllowedUri: (href) => isSafeNewsLink(href),
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } },
    })],
    editorProps: { attributes: { id: bodyId, role: "textbox", "aria-multiline": "true", "aria-labelledby": labelId, "aria-required": "true", "aria-placeholder": placeholder, "aria-invalid": invalid ? "true" : "false", "aria-describedby": describedBy ?? "", class: "min-h-80 min-w-0 p-4 leading-7 outline-none whitespace-pre-wrap [overflow-wrap:anywhere] [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_p]:my-3 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_a]:underline" } },
    onUpdate: ({ editor: current }) => callback.current({ version: 1, document: documentForStorage(current.getJSON()) }),
  });
  // 읽기 전용 전환이 초기화·저장 시 문서 변경 이벤트를 만들지 않도록 합니다.
  useEffect(() => { editor?.setEditable(!disabled && !imageOpen, false); }, [editor, disabled, imageOpen]);
  // 구독 스냅샷은 첫 트랜잭션 전까지 null을 유지할 수 있으므로 현재 인스턴스를 읽습니다.
  const state = useEditorState({ editor, selector: () => ({
    count: editor ? newsDocumentToBody({ version: 1, document: editor.getJSON() as NewsRichNode }).join("\n\n").length : 0,
    empty: editor?.isEmpty ?? true,
    paragraph: editor?.isActive("paragraph") ?? false,
    bold: editor?.isActive("bold") ?? false, italic: editor?.isActive("italic") ?? false,
    h2: editor?.isActive("heading", { level: 2 }) ?? false, h3: editor?.isActive("heading", { level: 3 }) ?? false,
    bullet: editor?.isActive("bulletList") ?? false, ordered: editor?.isActive("orderedList") ?? false,
    link: editor?.isActive("link") ?? false,
    undo: editor?.can().undo() ?? false, redo: editor?.can().redo() ?? false,
  }) });
  const unavailable = disabled || !editor;
  function button(icon: keyof typeof toolbarPaths, label: string, active: boolean | undefined, action: () => void, blocked = false) {
    return (
      <button type="button" disabled={unavailable || blocked || (imageOpen && icon !== "image") || uploading} aria-label={label} title={label}
        aria-pressed={active}
        aria-expanded={icon === "link" ? linkOpen : icon === "image" ? imageOpen : undefined}
        aria-controls={icon === "link" && linkOpen ? `${linkId}-panel` : icon === "image" && imageOpen ? `${bodyId}-image-panel` : undefined}
        onMouseDown={(event) => event.preventDefault()} onClick={action}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-transparent text-foreground enabled:hover:bg-primary-soft aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-40 lg:size-9"
      >
        <svg aria-hidden="true" focusable="false" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={toolbarPaths[icon]} />
        </svg>
      </button>
    );
  }
  function closeImage() {
    setImageCursor(undefined);
    editor?.commands.focus();
  }
  function closeLink() {
    setLinkOpen(false);
    editor?.commands.focus();
  }
  function applyLink() {
    if (!editor || disabled) return;
    const href = url.trim();
    if (!isSafeNewsLink(href)) { setLinkError("http:// 또는 https://로 시작하는 올바른 주소를 입력해 주세요."); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false); setLinkError(null);
  }
  return <div className="min-w-0 [overflow-wrap:anywhere] rounded-control border border-border-strong bg-background focus-within:outline-2 focus-within:outline-focus-ring">
    <div role="toolbar" aria-label="본문 서식" onKeyDown={navigateToolbar}
      className="flex flex-wrap items-center gap-y-1 rounded-t-control border-b border-border bg-surface px-2 py-1.5">
      <div role="group" aria-label="문단과 제목" className="flex gap-0.5 pr-1.5">
        {button("paragraph", "문단", state?.paragraph, () => editor?.chain().focus().setParagraph().run())}
        {button("h2", "제목 H2", state?.h2, () => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
        {button("h3", "제목 H3", state?.h3, () => editor?.chain().focus().toggleHeading({ level: 3 }).run())}
      </div>
      <div role="group" aria-label="글자 서식" className="flex gap-0.5 border-l border-border px-1.5">
        {button("bold", "굵게", state?.bold, () => editor?.chain().focus().toggleBold().run())}
        {button("italic", "기울임", state?.italic, () => editor?.chain().focus().toggleItalic().run())}
      </div>
      <div role="group" aria-label="목록" className="flex gap-0.5 border-l border-border px-1.5">
        {button("bullet", "글머리 목록", state?.bullet, () => editor?.chain().focus().toggleBulletList().run())}
        {button("ordered", "번호 목록", state?.ordered, () => editor?.chain().focus().toggleOrderedList().run())}
      </div>
      <div role="group" aria-label="링크" className="flex gap-0.5 border-l border-border px-1.5">
        {button("link", "링크 삽입·수정", state?.link, () => {
          if (linkOpen) { closeLink(); return; }
          setUrl(String(editor?.getAttributes("link").href ?? ""));
          setLinkError(null);
          setLinkOpen(true);
        })}
        {button("unlink", "링크 제거", undefined, () => editor?.chain().focus().extendMarkRange("link").unsetLink().run(), !state?.link)}
      </div>
      <div role="group" aria-label="이미지" className="flex gap-0.5 border-l border-border px-1.5">
        {button("image", "이미지 삽입", undefined, () => {
          if (!editor) return;
          if (imageOpen) { closeImage(); return; }
          setLinkOpen(false);
          setImageCursor(editor.state.selection.from);
        })}
      </div>
      <div role="group" aria-label="편집 기록" className="flex gap-0.5 border-l border-border pl-1.5">
        {button("undo", "실행 취소", undefined, () => editor?.chain().focus().undo().run(), !state?.undo)}
        {button("redo", "다시 실행", undefined, () => editor?.chain().focus().redo().run(), !state?.redo)}
      </div>
    </div>
    {imageOpen && editor ? <AdminBodyImagePicker editor={editor} cursor={imageCursor}
      target={imageUploadEnabled ? imageTarget : undefined} hasSavedPost={Boolean(imageTarget)} fieldId={`${bodyId}-image-panel`}
      uploading={uploading} onUploading={(value) => { setUploading(value); onImageUploading(value); }}
      onClose={closeImage} /> : null}
    {linkOpen ? <div id={`${linkId}-panel`} className="grid min-w-0 gap-2 border-b border-border bg-surface p-3">
      <label htmlFor={linkId} className="text-small font-semibold">링크 주소</label>
      <input ref={linkInput} id={linkId} type="text" inputMode="url" data-unsaved-ignore value={url} maxLength={2048} disabled={unavailable}
        aria-invalid={Boolean(linkError)} aria-describedby={linkError ? `${linkId}-error` : undefined}
        onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); applyLink(); }
          if (event.key === "Escape") { event.preventDefault(); closeLink(); }
        }} className="min-h-11 w-full min-w-0 rounded-control border border-border-strong px-3 focus-visible:outline-2 focus-visible:outline-focus-ring" />
      {linkError ? <p id={`${linkId}-error`} role="alert" className="text-small text-danger">{linkError}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={unavailable} onClick={applyLink} className="min-h-11 rounded-control bg-primary px-4 text-small font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-40">링크 적용</button>
        <button type="button" disabled={unavailable} onClick={closeLink} className="min-h-11 rounded-control border border-border-strong px-4 text-small font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-40">닫기</button>
      </div>
    </div> : null}
    <div className="relative min-w-0">
      {!editor ? <p role="status" className="min-h-80 p-4 text-small text-muted-foreground">본문 편집기를 준비하고 있습니다.</p> : null}
      {editor && state?.empty ? <p aria-hidden="true" className="pointer-events-none absolute inset-x-4 top-4 my-3 leading-7 text-muted-foreground">{placeholder}</p> : null}
      <div inert={imageOpen || disabled}><EditorContent editor={editor} /></div>
    </div>
    <div className="flex flex-wrap justify-end gap-x-2 border-t border-border px-4 py-2 text-small text-muted-foreground">
      {(state?.count ?? 0) > maxLength ? <span className="font-semibold text-danger">본문 글자 수 초과</span> : null}
      <span aria-label="본문 글자 수" title="일반 텍스트와 문단 사이 줄바꿈 기준" className="tabular-nums">
        {countFormat.format(state?.count ?? 0)} / {countFormat.format(maxLength)}자
      </span>
    </div>
  </div>;
}
