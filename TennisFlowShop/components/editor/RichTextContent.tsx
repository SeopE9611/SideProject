import { cn } from "@/lib/utils";
import { normalizeRichTextValue, RICH_TEXT_DOCUMENT_CLASS_NAME } from "./rich-text-utils";

type RichTextContentProps = {
  content: string | null | undefined;
  className?: string;
};

/**
 * 서버에서 sanitize가 끝난 HTML만 전달해야 합니다.
 *
 * 기존 일반 텍스트는 normalizeRichTextValue에서
 * HTML 특수문자를 escape한 뒤 문단 HTML로 변환됩니다.
 */
export function RichTextContent({ content, className }: RichTextContentProps) {
  const normalized = normalizeRichTextValue(content);

  return (
    <div
      className={cn(RICH_TEXT_DOCUMENT_CLASS_NAME, className)}
      dangerouslySetInnerHTML={{
        __html: normalized,
      }}
    />
  );
}
