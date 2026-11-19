"use client";

import { EditorContent, useEditor, useEditorState, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { isSafeNewsLink, type NewsBodyDocument } from "@/features/news/news.rich-text";

// Tiptap의 링크 표시 속성(target/rel/class/title)과 목록 type은 저장 계약에 포함하지 않습니다.
// 서버에서는 이 변환을 신뢰하지 않고 허용 목록을 다시 검사합니다.
function documentForStorage(node: JSONContent): unknown {
  return {
    type: node.type,
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(node.type === "heading" ? { attrs: { level: node.attrs?.level } } : {}),
    ...(node.type === "orderedList" ? { attrs: { start: node.attrs?.start ?? 1 } } : {}),
    ...(node.marks?.length ? { marks: node.marks.map((mark) => ({ type: mark.type, ...(mark.type === "link" ? { attrs: { href: mark.attrs?.href } } : {}) })) } : {}),
    ...(node.content ? { content: node.content.map(documentForStorage) } : {}),
  };
}

export function AdminNewsRichEditor({ initialDocument, disabled, invalid, describedBy, onChange }: {
  initialDocument: NewsBodyDocument;
  disabled: boolean;
  invalid: boolean;
  describedBy?: string;
  onChange: (document: unknown) => void;
}) {
  const callback = useRef(onChange);
  useEffect(() => { callback.current = onChange; }, [onChange]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    content: initialDocument.document,
    editable: !disabled,
    extensions: [StarterKit.configure({
      heading: { levels: [2, 3] }, hardBreak: { keepMarks: false },
      blockquote: false, code: false, codeBlock: false, horizontalRule: false,
      strike: false, underline: false, trailingNode: false,
      link: { openOnClick: false, autolink: false, linkOnPaste: false,
        isAllowedUri: (href) => isSafeNewsLink(href),
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } },
    })],
    editorProps: { attributes: { id: "admin-news-body", role: "textbox", "aria-multiline": "true", "aria-labelledby": "admin-news-body-label", "aria-required": "true", "aria-invalid": invalid ? "true" : "false", "aria-describedby": describedBy ?? "", class: "min-h-80 min-w-0 p-4 outline-none whitespace-pre-wrap break-words [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_p]:my-3 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_a]:underline" } },
    onUpdate: ({ editor: current }) => callback.current({ version: 1, document: documentForStorage(current.getJSON()) }),
  });
  // 읽기 전용 전환이 초기화·저장 시 문서 변경 이벤트를 만들지 않도록 합니다.
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    paragraph: current?.isActive("paragraph") ?? false,
    bold: current?.isActive("bold") ?? false, italic: current?.isActive("italic") ?? false,
    h2: current?.isActive("heading", { level: 2 }) ?? false, h3: current?.isActive("heading", { level: 3 }) ?? false,
    bullet: current?.isActive("bulletList") ?? false, ordered: current?.isActive("orderedList") ?? false,
    link: current?.isActive("link") ?? false,
    undo: current?.can().undo() ?? false, redo: current?.can().redo() ?? false,
  }) });
  const unavailable = disabled || !editor;
  function button(label: string, active: boolean | undefined, action: () => void, blocked = false) {
    return <button type="button" disabled={unavailable || blocked} aria-pressed={active} onMouseDown={(event) => event.preventDefault()} onClick={action}
      className="min-h-11 rounded-control border border-border px-3 text-small font-semibold aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-50">{label}</button>;
  }
  function applyLink() {
    if (!editor || disabled) return;
    const href = url.trim();
    if (!isSafeNewsLink(href)) { setLinkError("http:// 또는 https://로 시작하는 올바른 주소를 입력해 주세요."); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false); setLinkError(null);
  }
  return <div className="min-w-0 [overflow-wrap:anywhere] rounded-control border border-border-strong bg-background focus-within:outline-2 focus-within:outline-focus-ring">
    <div role="group" aria-label="본문 서식" className="flex flex-wrap gap-2 border-b border-border p-3">
      {button("문단", state?.paragraph, () => editor?.chain().focus().setParagraph().run())}
      {button("굵게", state?.bold, () => editor?.chain().focus().toggleBold().run())}
      {button("기울임", state?.italic, () => editor?.chain().focus().toggleItalic().run())}
      {button("제목 H2", state?.h2, () => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
      {button("제목 H3", state?.h3, () => editor?.chain().focus().toggleHeading({ level: 3 }).run())}
      {button("글머리 목록", state?.bullet, () => editor?.chain().focus().toggleBulletList().run())}
      {button("번호 목록", state?.ordered, () => editor?.chain().focus().toggleOrderedList().run())}
      {button("링크 삽입·수정", state?.link, () => { setUrl(String(editor?.getAttributes("link").href ?? "")); setLinkError(null); setLinkOpen(!linkOpen); })}
      {button("링크 제거", undefined, () => editor?.chain().focus().extendMarkRange("link").unsetLink().run(), !state?.link)}
      {button("실행 취소", undefined, () => editor?.chain().focus().undo().run(), !state?.undo)}
      {button("다시 실행", undefined, () => editor?.chain().focus().redo().run(), !state?.redo)}
    </div>
    {linkOpen ? <div className="grid min-w-0 gap-2 border-b border-border p-3">
      <label htmlFor="news-editor-link" className="text-small font-semibold">링크 주소</label>
      <input id="news-editor-link" type="text" inputMode="url" data-unsaved-ignore value={url} maxLength={2048} disabled={unavailable}
        aria-invalid={Boolean(linkError)} aria-describedby={linkError ? "news-editor-link-error" : undefined}
        onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); applyLink(); }
          if (event.key === "Escape") { event.preventDefault(); setLinkOpen(false); editor?.commands.focus(); }
        }} className="min-h-11 w-full min-w-0 rounded-control border border-border-strong px-3 focus-visible:outline-2 focus-visible:outline-focus-ring" />
      {linkError ? <p id="news-editor-link-error" role="alert" className="text-small text-danger">{linkError}</p> : null}
      <div className="flex flex-wrap gap-2">{button("링크 적용", undefined, applyLink)}{button("닫기", undefined, () => { setLinkOpen(false); editor?.commands.focus(); })}</div>
    </div> : null}
    {!editor ? <p role="status" className="min-h-80 p-4 text-small text-muted-foreground">본문 편집기를 준비하고 있습니다.</p> : null}
    <EditorContent editor={editor} />
  </div>;
}
