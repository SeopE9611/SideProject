"use client";

import { cn } from "@/lib/utils";
import TextAlign from "@tiptap/extension-text-align";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { RichTextToolbar } from "./RichTextToolbar";
import { normalizeRichTextValue, RICH_TEXT_DOCUMENT_CLASS_NAME } from "./rich-text-utils";

export type RichTextEditorChange = {
  html: string;
  text: string;
  characters: number;
  isEmpty: boolean;
};

type RichTextEditorProps = {
  value: string;
  onChange: (change: RichTextEditorChange) => void;
  maxLength: number;

  placeholder?: string;
  ariaLabel?: string;

  disabled?: boolean;
  invalid?: boolean;
  className?: string;
};

export function RichTextEditor({
  value,
  onChange,
  maxLength,
  placeholder = "내용을 입력해 주세요.",
  ariaLabel = "본문 편집기",
  disabled = false,
  invalid = false,
  className,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,

    /**
     * Tiptap 3에서는 툴바 상태를 useEditorState로 구독하므로
     * 에디터 전체를 매 트랜잭션마다 다시 렌더링하지 않습니다.
     */
    shouldRerenderOnTransaction: false,

    editable: !disabled,

    extensions: [
      StarterKit.configure({
        heading: {
          // 페이지 제목은 별도로 존재하므로 본문에서는 h2/h3만 허용합니다.
          levels: [2, 3],
        },

        // 1차 도입 범위에서는 코드 기능을 제공하지 않습니다.
        code: false,
        codeBlock: false,

        // 툴바에서 제공하지 않는 구분선도 1차에서는 비활성화합니다.
        horizontalRule: false,

        link: {
          openOnClick: false,
          enableClickSelection: true,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: "https",

          HTMLAttributes: {
            target: "_blank",
            rel: "noopener noreferrer",
          },
        },
      }),

      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
        defaultAlignment: "left",
      }),

      Placeholder.configure({
        placeholder,
      }),

      CharacterCount.configure({
        limit: maxLength,
        mode: "textSize",

        /**
         * 기존 글이 제한보다 길더라도 편집기 로드 순간
         * 자동으로 잘라내지 않도록 합니다.
         */
        autoTrim: false,
      }),
    ],

    content: normalizeRichTextValue(value),

    editorProps: {
      attributes: {
        "aria-label": ariaLabel,

        class: cn(
          RICH_TEXT_DOCUMENT_CLASS_NAME,
          "min-h-[240px] px-4 py-4 outline-none",
          "[&_.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.is-editor-empty:first-child::before]:float-left",
          "[&_.is-editor-empty:first-child::before]:h-0",
          "[&_.is-editor-empty:first-child::before]:text-muted-foreground",
          "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
        ),
      },
    },

    onUpdate: ({ editor: currentEditor }) => {
      const isEmpty = currentEditor.isEmpty;

      const text = currentEditor
        .getText({
          blockSeparator: "\n",
        })
        .trim();

      const html = isEmpty ? "" : currentEditor.getHTML();

      const characters = currentEditor.storage.characterCount.characters();

      onChangeRef.current({
        html,
        text,
        characters,
        isEmpty,
      });
    },
  });

  /**
   * 상위 폼에서 수정 글을 불러오거나,
   * 충돌 후 최신 글을 다시 불러온 경우 에디터 내용을 동기화합니다.
   */
  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = normalizeRichTextValue(value);

    if (editor.getHTML() === nextValue) {
      return;
    }

    editor.commands.setContent(nextValue, {
      /**
       * 외부 데이터 동기화로 인한 setContent가
       * 다시 onUpdate를 호출하지 않도록 막습니다.
       */
      emitUpdate: false,
    });
  }, [editor, value]);

  /**
   * 저장 중 disabled 상태가 변경됐을 때
   * 현재 에디터 인스턴스의 편집 가능 여부도 함께 변경합니다.
   */
  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled, false);
  }, [disabled, editor]);

  const characterCount =
    useEditorState({
      editor,
      selector: ({ editor: currentEditor }) =>
        currentEditor?.storage.characterCount.characters() ?? 0,
    }) ?? 0;

  if (!editor) {
    return (
      <div
        className={cn("overflow-hidden rounded-panel border border-border bg-card", className)}
        aria-busy="true"
      >
        <div className="h-12 border-b border-border bg-muted/30" />
        <div className="min-h-[240px] animate-pulse bg-muted/15" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-panel border bg-card transition-colors",
        invalid ? "border-destructive" : "border-border focus-within:border-ring",
        disabled && "opacity-70",
        className,
      )}
    >
      <RichTextToolbar editor={editor} disabled={disabled} />

      <EditorContent editor={editor} />

      <div className="flex items-center justify-end border-t border-border bg-muted/20 px-3 py-2 text-ui-label text-muted-foreground">
        <span className={cn(characterCount > maxLength && "font-semibold text-destructive")}>
          {characterCount}/{maxLength}자
        </span>
      </div>
    </div>
  );
}
