import sanitizeHtmlLib from "sanitize-html";

/**
 * 서버 사이드 HTML sanitize (문자열 기반)
 * - jsdom(가짜 DOM) 의존을 완전히 제거해서
 *   Turbopack/Node ESM-CJS 충돌(ERR_REQUIRE_ESM) 자체를 원천 차단.
 * - 정책: "허용 리스트(allowlist)"만 통과, 나머지는 제거
 */

// 최소 허용 태그 (필요 시 점진적으로 추가)
const ALLOWED_TAGS = [
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "blockquote",
  "code",
  "pre",
  "a",
  "img",
  "hr",
  "span",
];

// 태그별 허용 속성 (style/on* 등은 아예 허용하지 않음)
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height"],
  span: [],
};

/**
 * 공지·이벤트 리치 텍스트 전용 허용 태그
 *
 * 기존 sanitizeHtml 정책과 분리하여
 * 댓글·Q&A·일반 커뮤니티에 제목/정렬 스타일이 확산되지 않게 한다.
 */
const RICH_TEXT_ALLOWED_TAGS = [
  "p",
  "br",

  "h2",
  "h3",

  "ul",
  "ol",
  "li",

  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",

  "blockquote",
  "a",
];

/**
 * 리치 텍스트에서 허용하는 속성
 *
 * 정렬 기능은 Tiptap이 p/h2/h3의 style 속성으로 출력한다.
 * span이나 전체 태그에는 style을 허용하지 않는다.
 */
const RICH_TEXT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  p: ["style"],
  h2: ["style"],
  h3: ["style"],
};

/**
 * 임의 CSS는 차단하고 텍스트 정렬만 제한적으로 허용한다.
 */
const RICH_TEXT_ALLOWED_STYLES = {
  p: {
    "text-align": [/^(left|center|right)$/],
  },
  h2: {
    "text-align": [/^(left|center|right)$/],
  },
  h3: {
    "text-align": [/^(left|center|right)$/],
  },
};

// a 태그 rel 강제(탭 납치 방지)
function normalizeRel() {
  return "noopener noreferrer";
}

export async function sanitizeHtml(dirty: string): Promise<string> {
  // null/undefined 방어 (API에서 혹시라도 빈 값 들어오면 빈 문자열로 처리)
  const input = typeof dirty === "string" ? dirty : "";

  const cleaned = sanitizeHtmlLib(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,

    /**
     * 스킴 제한
     * - href/src는 http/https만 허용 (javascript:, data:, 상대경로 전부 제거)
     * - 기존 DOMPurify 로직의 "https?://만 허용" 정책과 동일하게 맞춤
     */
    allowedSchemes: ["http", "https"],
    allowedSchemesAppliedToAttributes: ["href", "src"],

    /**
     * 금지 태그 처리 모드
     * - 태그는 제거하고(대부분) 내용은 남김.
     * - 단, sanitize-html 기본 nonTextTags(script/style 등)은 내용도 제거되는 편이라 더 안전해짐.
     */
    disallowedTagsMode: "discard",

    /**
     * 태그별 후처리
     * - a: rel 강제, target 유지
     */
    transformTags: {
      a: (tagName, attribs) => {
        const next = { ...attribs };
        // 절대 URL(http/https)만 허용 (상대경로/기타 스킴 제거)
        const href = next.href ?? "";
        if (!/^https?:\/\//i.test(href)) {
          delete next.href;
        }
        next.rel = normalizeRel();
        return { tagName, attribs: next };
      },
      img: (tagName, attribs) => {
        const next = { ...attribs };
        // 절대 URL(http/https)만 허용 (상대경로/기타 스킴 제거)
        const src = next.src ?? "";
        if (!/^https?:\/\//i.test(src)) {
          delete next.src;
        }
        return { tagName, attribs: next };
      },
    },

    /**
     * 최종 제거 규칙
     * - src가 사라진 img(=허용 스킴이 아니어서 제거된 경우)는 통째로 제거
     */
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs?.src,
  });

  return cleaned;
}

/**
 * 공지·이벤트용 리치 텍스트 HTML 정제
 *
 * 주의:
 * - 기존 sanitizeHtml()은 댓글·커뮤니티 등에서 계속 사용한다.
 * - 이 함수는 리치 텍스트 에디터를 적용한 영역에서만 사용한다.
 * - 임의 style은 허용하지 않고 정렬 값만 allowlist로 허용한다.
 */
export async function sanitizeRichTextHtml(dirty: string): Promise<string> {
  const input = typeof dirty === "string" ? dirty : "";

  const cleaned = sanitizeHtmlLib(input, {
    allowedTags: RICH_TEXT_ALLOWED_TAGS,
    allowedAttributes: RICH_TEXT_ALLOWED_ATTRIBUTES,
    allowedStyles: RICH_TEXT_ALLOWED_STYLES,

    /**
     * 링크는 http/https만 허용한다.
     */
    allowedSchemes: ["http", "https"],
    allowedSchemesAppliedToAttributes: ["href"],

    /**
     * 허용하지 않는 태그는 태그만 제거하고
     * 안전한 텍스트 내용은 가능한 한 유지한다.
     */
    disallowedTagsMode: "discard",

    /**
     * 링크 보안 정책
     *
     * - javascript:, data:, 상대 주소 차단
     * - 새 탭 열기 강제
     * - opener 접근 방지
     */
    transformTags: {
      a: (tagName, attribs) => {
        const next = { ...attribs };
        const href = next.href ?? "";

        if (!/^https?:\/\//i.test(href)) {
          delete next.href;
          delete next.target;
        } else {
          next.target = "_blank";
        }

        next.rel = normalizeRel();

        return {
          tagName,
          attribs: next,
        };
      },
    },
  });

  return cleaned.trim();
}

type SanitizedLengthValidationOptions = {
  min: number;
  max: number;
};

export function normalizeSanitizedContent(content: string): string {
  return content.trim();
}

export function validateSanitizedLength(
  content: string,
  options: SanitizedLengthValidationOptions,
): "too_short" | "too_long" | null {
  if (content.length < options.min) {
    return "too_short";
  }

  if (content.length > options.max) {
    return "too_long";
  }

  return null;
}
