import createDOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';

/**
 * 서버 사이드 전용 DOMPurify 인스턴스
 * - RegExp를 받지 않는 옵션 시그니처(DOMPurify 타입)에 맞춤
 * - on* 핸들러/자바스크립트 URL 등은 훅에서 제거
 */
const jsdom = new JSDOM('');
// jsdom.window 는 Window & typeof globalThis 형태라 DOMPurify의 WindowLike를 만족함
const DOMPurify = createDOMPurify(jsdom.window as any);

// 최소 허용 태그/속성 (프로젝트 정책에 맞게 추가 가능)
const ALLOWED_TAGS = ['p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'blockquote', 'code', 'pre', 'a', 'img', 'hr', 'span'];
const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height'];

// afterSanitizeAttributes 훅으로 위험 요소 제거(타입 안전)
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // 모든 on* 속성 제거
  // (DOMPurify 기본도 제거하지만 확실하게 한 번 더)
  // eslint-disable-next-line guard-for-in
  for (const name in node) {
    // noop (TS 만족용)
  }

  // 앵커: javascript:, data: 차단 + rel 보정
  if (node instanceof jsdom.window.HTMLAnchorElement) {
    const href = node.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(href)) {
      node.removeAttribute('href');
    }
    if (node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    } else {
      // 그래도 안전하게 기본 rel 부여
      node.setAttribute('rel', 'noopener noreferrer');
    }
  }

  // 이미지: http/https만 허용(그 외 제거)
  if (node instanceof jsdom.window.HTMLImageElement) {
    const src = node.getAttribute('src') || '';
    if (!/^https?:\/\//i.test(src)) {
      // src 없애면 깨진 이미지 아이콘만 남으니 통째로 제거
      node.remove();
      return;
    }
    node.removeAttribute('srcset'); // srcset은 관리 안 할 거면 제거
  }

  // 이벤트 핸들러 속성(on*) 전부 제거
  // DOMPurify 기본 정책이 있지만 명시적으로 반복 제거
  Array.from(node.attributes ?? []).forEach((attr) => {
    const n = attr.name;
    if (/^on/i.test(n) || n === 'style') {
      node.removeAttribute(n);
    }
  });
});

export function sanitizeHtml(dirty: string): string {
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // 타입 시그니처상 FORBID_ATTR은 string[]만 허용이므로 RegExp는 사용하지 않음
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    ALLOW_DATA_ATTR: false, // data- 속성 비활성화(필요하면 true)
    ADD_ATTR: ['target', 'rel'],
    KEEP_CONTENT: true,
  });

  // 위에서 충분히 정리했지만, 최종 안전을 위해 한 번 더 링크/이미지 검증
  const dom = new JSDOM(clean);
  const doc = dom.window.document;

  doc.querySelectorAll('a').forEach((a: HTMLAnchorElement) => {
    const href = a.getAttribute('href');
    if (!href || !/^https?:\/\//i.test(href)) a.removeAttribute('href');
    if (a.getAttribute('target') === '_blank') {
      a.setAttribute('rel', 'noopener noreferrer');
    } else {
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });

  doc.querySelectorAll('img').forEach((img: HTMLImageElement) => {
    const src = img.getAttribute('src');
    if (!src || !/^https?:\/\//i.test(src)) img.remove();
    img.removeAttribute('srcset');
  });

  return doc.body.innerHTML;
}
