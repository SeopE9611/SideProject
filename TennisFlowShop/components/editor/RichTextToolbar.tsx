"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import type { ReactNode } from "react";

type RichTextToolbarProps = {
  editor: Editor;
  disabled?: boolean;
};

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "highlight_soft" : "ghost"}
          size="icon"
          className="h-8 w-8 shrink-0 rounded-md"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onMouseDown={(event) => {
            // 툴바를 클릭할 때 에디터의 현재 선택 영역이 사라지는 것을 방지합니다.
            event.preventDefault();
          }}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>

      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function ToolbarDivider() {
  return <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />;
}

function normalizeLinkUrl(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function RichTextToolbar({ editor, disabled = false }: RichTextToolbarProps) {
  const editorState = useEditorState({
    editor,

    selector: ({ editor: currentEditor }) => {
      const alignCenter = currentEditor.isActive({
        textAlign: "center",
      });

      const alignRight = currentEditor.isActive({
        textAlign: "right",
      });

      return {
        paragraph: currentEditor.isActive("paragraph"),
        heading2: currentEditor.isActive("heading", {
          level: 2,
        }),
        heading3: currentEditor.isActive("heading", {
          level: 3,
        }),

        bold: currentEditor.isActive("bold"),
        italic: currentEditor.isActive("italic"),
        underline: currentEditor.isActive("underline"),
        strike: currentEditor.isActive("strike"),

        bulletList: currentEditor.isActive("bulletList"),
        orderedList: currentEditor.isActive("orderedList"),
        blockquote: currentEditor.isActive("blockquote"),
        link: currentEditor.isActive("link"),

        alignLeft: currentEditor.isActive({ textAlign: "left" }) || (!alignCenter && !alignRight),
        alignCenter,
        alignRight,

        canUndo: currentEditor.can().chain().focus().undo().run(),

        canRedo: currentEditor.can().chain().focus().redo().run(),
      };
    },
  });

  const handleSetLink = () => {
    const previousHref =
      typeof editor.getAttributes("link").href === "string"
        ? editor.getAttributes("link").href
        : "";

    const enteredUrl = window.prompt("연결할 주소를 입력해 주세요.", previousHref || "https://");

    if (enteredUrl === null) {
      return;
    }

    if (!enteredUrl.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const normalizedUrl = normalizeLinkUrl(enteredUrl);

    if (!normalizedUrl) {
      window.alert("올바른 http 또는 https 주소를 입력해 주세요.");
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: normalizedUrl,
        target: "_blank",
        rel: "noopener noreferrer",
      })
      .run();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex max-w-full flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-2 py-2"
        role="toolbar"
        aria-label="본문 서식 도구"
      >
        <ToolbarButton
          label="본문"
          active={editorState.paragraph}
          disabled={disabled}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow />
        </ToolbarButton>

        <ToolbarButton
          label="큰 제목"
          active={editorState.heading2}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 />
        </ToolbarButton>

        <ToolbarButton
          label="소제목"
          active={editorState.heading3}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="굵게"
          active={editorState.bold}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>

        <ToolbarButton
          label="기울임"
          active={editorState.italic}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>

        <ToolbarButton
          label="밑줄"
          active={editorState.underline}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline />
        </ToolbarButton>

        <ToolbarButton
          label="취소선"
          active={editorState.strike}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="글머리표 목록"
          active={editorState.bulletList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>

        <ToolbarButton
          label="번호 목록"
          active={editorState.orderedList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>

        <ToolbarButton
          label="인용문"
          active={editorState.blockquote}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="왼쪽 정렬"
          active={editorState.alignLeft}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft />
        </ToolbarButton>

        <ToolbarButton
          label="가운데 정렬"
          active={editorState.alignCenter}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter />
        </ToolbarButton>

        <ToolbarButton
          label="오른쪽 정렬"
          active={editorState.alignRight}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="링크 설정"
          active={editorState.link}
          disabled={disabled}
          onClick={handleSetLink}
        >
          <Link2 />
        </ToolbarButton>

        <ToolbarButton
          label="링크 해제"
          disabled={disabled || !editorState.link}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Unlink />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="실행 취소"
          disabled={disabled || !editorState.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 />
        </ToolbarButton>

        <ToolbarButton
          label="다시 실행"
          disabled={disabled || !editorState.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}
