import sanitizeHtmlLib from 'sanitize-html';

/**
 * 서버 사이드 HTML sanitize (문자열 기반)
 * - jsdom(가짜 DOM) 의존을 완전히 제거해서
 *   Turbopack/Node ESM-CJS 충돌(ERR_REQUIRE_ESM) 자체를 원천 차단.
 * - 정책: "허용 리스트(allowlist)"만 통과, 나머지는 제거
 */

// 최소 허용 태그 (필요 시 점진적으로 추가)
const ALLOWED_TAGS = ['p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'blockquote', 'code', 'pre', 'a', 'img', 'hr', 'span'];

// 태그별 허용 속성 (style/on* 등은 아예 허용하지 않음)
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
  span: [],
};

// a 태그 rel 강제(탭 납치 방지)
function normalizeRel() {
  return 'noopener noreferrer';
}

export async function sanitizeHtml(dirty: string): Promise<string> {
  // null/undefined 방어 (API에서 혹시라도 빈 값 들어오면 빈 문자열로 처리)
  const input = typeof dirty === 'string' ? dirty : '';

  const cleaned = sanitizeHtmlLib(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,

    /**
     * 스킴 제한
     * - href/src는 http/https만 허용 (javascript:, data:, 상대경로 전부 제거)
     * - 기존 DOMPurify 로직의 "https?://만 허용" 정책과 동일하게 맞춤
     */
    allowedSchemes: ['http', 'https'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],

    /**
     * 금지 태그 처리 모드
     * - 태그는 제거하고(대부분) 내용은 남김.
     * - 단, sanitize-html 기본 nonTextTags(script/style 등)은 내용도 제거되는 편이라 더 안전해짐.
     */
    disallowedTagsMode: 'discard',

    /**
     * 태그별 후처리
     * - a: rel 강제, target 유지
     */
    transformTags: {
      a: (tagName, attribs) => {
        const next = { ...attribs };
        // 절대 URL(http/https)만 허용 (상대경로/기타 스킴 제거)
        const href = next.href ?? '';
        if (!/^https?:\/\//i.test(href)) {
          delete next.href;
        }
        next.rel = normalizeRel();
        return { tagName, attribs: next };
      },
      img: (tagName, attribs) => {
        const next = { ...attribs };
        // 절대 URL(http/https)만 허용 (상대경로/기타 스킴 제거)
        const src = next.src ?? '';
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
    exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs?.src,
  });

  return cleaned;
}

type SanitizedLengthValidationOptions = {
  min: number;
  max: number;
};

export function normalizeSanitizedContent(content: string): string {
  return content.trim();
}

export function validateSanitizedLength(content: string, options: SanitizedLengthValidationOptions): 'too_short' | 'too_long' | null {
  if (content.length < options.min) {
    return 'too_short';
  }

  if (content.length > options.max) {
    return 'too_long';
  }

  return null;
}
