export const EMPTY_RICH_TEXT_HTML = "<p></p>";

const HTML_ELEMENT_PATTERN = /<\/?[a-z][\s\S]*?>/i;

/**
 * 기존 일반 텍스트를 HTML로 변환할 때 사용합니다.
 *
 * 사용자가 작성한 일반 문자열이 HTML로 해석되지 않도록
 * 먼저 특수문자를 엔티티로 변환합니다.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 브라우저에서는 textarea를 이용해 HTML 엔티티를 해석합니다.
 * 서버 환경에서는 프로젝트에 필요한 기본 엔티티만 처리합니다.
 */
function decodeHtmlEntities(value: string): string {
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

/**
 * 기존 DB에 저장된 일반 텍스트를 Tiptap이 읽을 수 있는 HTML로 변환합니다.
 *
 * 빈 줄 두 개 이상:
 *   서로 다른 문단으로 변환
 *
 * 문단 안의 단일 줄바꿈:
 *   <br>로 변환
 */
export function plainTextToRichTextHtml(value: string): string {
  const normalized = value.replace(/\r\n?/g, "\n").trim();

  if (!normalized) {
    return EMPTY_RICH_TEXT_HTML;
  }

  return normalized
    .split(/\n{2,}/)
    .map((block) => {
      const safeBlock = escapeHtml(block).replace(/\n/g, "<br>");
      return `<p>${safeBlock}</p>`;
    })
    .join("");
}

/**
 * 전달받은 값이 이미 HTML이면 유지하고,
 * 기존 일반 텍스트이면 안전한 HTML 문단으로 변환합니다.
 */
export function normalizeRichTextValue(
  value: string | null | undefined,
): string {
  const normalized =
    typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    return EMPTY_RICH_TEXT_HTML;
  }

  if (HTML_ELEMENT_PATTERN.test(normalized)) {
    return normalized;
  }

  return plainTextToRichTextHtml(normalized);
}

/**
 * HTML에서 화면에 보이는 일반 텍스트를 추출합니다.
 *
 * 사용 목적:
 * - 글자 수 계산
 * - 기존 일반 텍스트와의 호환
 * - 서버 전송 전 빈 내용 검사
 */
export function richTextToPlainText(
  value: string | null | undefined,
): string {
  const normalized = normalizeRichTextValue(value);

  const withBlockBreaks = normalized
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(
      /<\/(p|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi,
      "\n",
    );

  const withoutTags = withBlockBreaks.replace(/<[^>]+>/g, "");

  return decodeHtmlEntities(withoutTags)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 에디터 입력 영역과 상세 출력 영역에서 공통으로 사용하는 문서 스타일입니다.
 *
 * Tailwind Typography 플러그인 없이 현재 프로젝트의 의미 토큰만 사용합니다.
 */
export const RICH_TEXT_DOCUMENT_CLASS_NAME = [
  "break-words text-left text-ui-body leading-8 text-foreground",
  "[&_p]:my-3",
  "[&_p:first-child]:mt-0",
  "[&_p:last-child]:mb-0",

  "[&_h2]:mb-3",
  "[&_h2]:mt-7",
  "[&_h2]:font-brand-heading",
  "[&_h2]:text-ui-section-title",
  "[&_h2]:font-semibold",
  "[&_h2]:leading-snug",
  "[&_h2:first-child]:mt-0",

  "[&_h3]:mb-2",
  "[&_h3]:mt-6",
  "[&_h3]:font-brand-heading",
  "[&_h3]:text-ui-card-title",
  "[&_h3]:font-semibold",
  "[&_h3]:leading-snug",
  "[&_h3:first-child]:mt-0",

  "[&_ul]:my-4",
  "[&_ul]:list-disc",
  "[&_ul]:pl-6",

  "[&_ol]:my-4",
  "[&_ol]:list-decimal",
  "[&_ol]:pl-6",

  "[&_li]:my-1",
  "[&_li]:pl-1",
  "[&_li_p]:my-0",

  "[&_blockquote]:my-5",
  "[&_blockquote]:border-l-4",
  "[&_blockquote]:border-brand-highlight-ink/40",
  "[&_blockquote]:bg-brand-highlight-muted/25",
  "[&_blockquote]:px-4",
  "[&_blockquote]:py-3",
  "[&_blockquote]:text-muted-foreground",

  "[&_a]:break-all",
  "[&_a]:font-medium",
  "[&_a]:text-primary",
  "[&_a]:underline",
  "[&_a]:underline-offset-4",

  "[&_strong]:font-semibold",
  "[&_u]:underline",
  "[&_s]:text-muted-foreground",
].join(" ");
