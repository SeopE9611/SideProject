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
 * 서버 sanitizer 직전에 기존 HTML과 레거시 일반 텍스트의 형식을 정규화합니다.
 *
 * 기존 HTML은 엔티티를 포함한 원문 구조를 유지해야 하고, 태그가 없는 과거 일반
 * 텍스트는 sanitizeHtml() 처리로 엔티티가 남아 있을 수 있습니다. 따라서 태그 없는
 * 값만 한 번 디코딩한 뒤 plainTextToRichTextHtml()로 다시 escape하여 안전한 문단
 * HTML로 만듭니다. 디코딩한 값을 normalizeRichTextValue()에 전달하면 인코딩된 태그
 * 문자열을 실제 HTML로 오인할 수 있으므로 사용하지 않습니다.
 *
 * 이 함수는 sanitizer가 아닌 형식 정규화 함수입니다. 반환값도 반드시
 * sanitizeRichTextHtml()을 거쳐 allowlist 정책을 적용해야 합니다.
 */
export function prepareRichTextHtmlForSanitization(
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

  // 과거 sanitizeHtml()이 일반 텍스트의 &를 &amp;로 저장했을 수 있으므로
  // 태그가 없는 레거시 값만 한 번 디코딩한 뒤 문단 HTML에서 정확히 한 번 다시 escape한다.
  const decodedLegacyText = decodeHtmlEntities(normalized);

  return plainTextToRichTextHtml(decodedLegacyText);
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

type RichTextExtractionOptions = {
  // 목록 기호는 표시용 표현일 뿐 사용자가 입력한 문자가 아니므로 검증용에는 추가하지 않는다.
  includeListMarkers: boolean;
  // 블록 경계는 표시용에서는 읽기 쉬운 개행이지만, 검증용에서는 0자로 계산되어야 한다.
  blockSeparator: string;
  // 연속 개행 축약은 표시 가독성 정책이므로 실제 글자 수를 검증할 때는 적용하지 않는다.
  collapseDisplayLineBreaks: boolean;
};

/**
 * 리치 텍스트와 기존 일반 텍스트를 같은 규칙으로 화면상 문자열로 추출합니다.
 *
 * 목록 기호처럼 사용자가 직접 입력하지 않은 HTML 구조는 옵션으로만 추가해,
 * 표시용 표현과 서버 글자 수 검증이 서로 다른 목적을 안전하게 가질 수 있게 합니다.
 */
function extractRichTextPlainText(
  value: string | null | undefined,
  {
    includeListMarkers,
    blockSeparator,
    collapseDisplayLineBreaks,
  }: RichTextExtractionOptions,
): string {
  const normalized = normalizeRichTextValue(value);

  const withStructure = normalized
    // 실제 <br>는 사용자가 삽입한 hard break이므로 한 글자 줄바꿈으로 유지한다.
    .replace(/<br\s*\/?>/gi, "\n")
    // 자동 목록 기호는 사용자 입력이 아니므로 표시용에서만 추가한다.
    .replace(/<li\b[^>]*>/gi, includeListMarkers ? "• " : "")
    // 블록 경계는 표시용에서는 개행, 검증용에서는 빈 문자열로 변환한다.
    .replace(
      /<\/(p|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi,
      blockSeparator,
    );

  const withoutTags = withStructure.replace(/<[^>]+>/g, "");

  const decoded = decodeHtmlEntities(withoutTags).replace(/\u00a0/g, " ");

  if (collapseDisplayLineBreaks) {
    return decoded
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return decoded.trim();
}

/**
 * 미리보기·검색 텍스트처럼 읽기 쉬운 일반 텍스트 표현을 만듭니다.
 *
 * 목록 항목을 서로 구분해 보여 주기 위해 기존처럼 표시용 목록 기호를 포함합니다.
 */
export function richTextToPlainText(
  value: string | null | undefined,
): string {
  // 미리보기·검색에서는 문단과 목록 경계가 개행으로 보여야 읽기 쉬우므로 기존 목록 기호와 개행 축약을 유지한다.
  return extractRichTextPlainText(value, {
    includeListMarkers: true,
    blockSeparator: "\n",
    collapseDisplayLineBreaks: true,
  });
}

/**
 * 서버 본문 길이 검증에 사용할 실제 입력 텍스트를 만듭니다.
 *
 * 목록 기호는 사용자가 입력한 문자가 아니므로 제외해야 빈 목록이 최소 길이 검증을
 * 우회하지 않으며, 서버 글자 수 검증도 실제 화면상 입력 텍스트만 계산할 수 있습니다.
 */
export function richTextToValidationText(
  value: string | null | undefined,
): string {
  // 문단·제목·목록 항목 경계는 HTML 구조이지 입력 문자가 아니므로 최소 10자 우회와 정확히 8,000자인 다중 문단의 초과 오판을 막기 위해 빈 문자열로 처리한다.
  // 실제 <br>는 사용자가 삽입한 hard break라 내부에서는 한 글자로 남기며, 연속 hard break도 검증용에서 임의 축약하지 않는다.
  return extractRichTextPlainText(value, {
    includeListMarkers: false,
    blockSeparator: "",
    collapseDisplayLineBreaks: false,
  });
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
  "[&_h2]:font-ui-bold",
  "[&_h2]:text-ui-section-title",
  "[&_h2]:font-semibold",
  "[&_h2]:leading-snug",
  "[&_h2:first-child]:mt-0",

  "[&_h3]:mb-2",
  "[&_h3]:mt-6",
  "[&_h3]:font-ui-bold",
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
