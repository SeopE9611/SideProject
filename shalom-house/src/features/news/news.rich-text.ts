import { BODY_IMAGE_ALT_LIMIT, BODY_IMAGE_LIMIT, isBodyImageId, type BodyImageReference } from "./body-image-reference";

export type NewsRichMark = { type: "bold" | "italic" | "link"; attrs?: { href: string } };
export type NewsRichNode = {
  type: "doc" | "paragraph" | "heading" | "text" | "hardBreak" | "bulletList" | "orderedList" | "listItem" | "bodyImage" | "youtubeVideo";
  text?: string;
  attrs?: { level?: 2 | 3; start?: number; imageId?: string; alt?: string; videoId?: string; title?: string };
  marks?: NewsRichMark[];
  content?: NewsRichNode[];
};
export type NewsBodyDocument = { version: 1; document: NewsRichNode };

export const NEWS_DOCUMENT_MAX_BYTES = 48 * 1024;
const MAX_NODES = 2000;
const MAX_DEPTH = 12;
const MAX_LIST_DEPTH = 3;

export const BODY_VIDEO_LIMIT = 3;
export const BODY_VIDEO_TITLE_LIMIT = 180;
export const isYouTubeVideoId = (value: unknown): value is string =>
  typeof value === "string" && value.length === 11 && /^[a-zA-Z0-9_-]+$/.test(value);

export function normalizeBodyVideoTitle(value: unknown): string | null {
  if (typeof value !== "string" || value.length > BODY_VIDEO_TITLE_LIMIT || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  return value.trim() || null;
}

export function parseYouTubeVideoUrl(value: string): string | null {
  const input = value.trim();
  if (input.length > 2048 || !/^https:\/\//i.test(input) || /[\s\\<>\u0000-\u001f\u007f]/u.test(input) ||
      input.slice(8).split(/[/?#]/, 1)[0].includes("@")) return null;
  let url: URL;
  try { url = new URL(input); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;

  const mainHost = url.hostname === "youtube.com" || url.hostname === "www.youtube.com";
  const watchHost = mainHost || url.hostname === "m.youtube.com";
  const privacyHost = url.hostname === "www.youtube-nocookie.com" || url.hostname === "youtube-nocookie.com";
  let id: string | null | undefined;
  if (watchHost && url.pathname === "/watch") {
    const values = url.searchParams.getAll("v");
    if (values.length === 1) id = values[0];
  } else if (url.hostname === "youtu.be") {
    id = /^\/([^/]+)$/.exec(url.pathname)?.[1];
  } else if (mainHost && url.pathname.startsWith("/shorts/")) {
    id = /^\/shorts\/([^/]+)$/.exec(url.pathname)?.[1];
  } else if (watchHost || privacyHost) {
    id = /^\/embed\/([^/]+)$/.exec(url.pathname)?.[1];
  }
  return isYouTubeVideoId(id) ? id : null;
}

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}
export function isSafeNewsLink(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || !/^https?:\/\//i.test(value) || /[\u0000-\u0020\u007f-\u009f]/u.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

// 서버와 편집기, 요약, 호환 요청에서 동일한 순서·줄바꿈 규칙을 사용합니다.
export function newsDocumentToBody(value: NewsBodyDocument): string[] {
  const blocks: string[] = [];
  const inline = (node: NewsRichNode): string => node.type === "text" ? node.text! : node.type === "hardBreak" ? "\n" : (node.content ?? []).map(inline).join("");
  const visit = (node: NewsRichNode) => {
    if (node.type === "paragraph" || node.type === "heading") blocks.push(inline(node));
    else (node.content ?? []).forEach(visit);
  };
  visit(value.document);
  return blocks.filter((block) => block.trim().length > 0);
}
export function sameNewsBodyText(a: readonly string[], b: readonly string[]): boolean {
  const normalize = (body: readonly string[]) => body.join("\n\n").replace(/\s+/gu, " ").trim();
  return normalize(a) === normalize(b);
}
export function newsBodyToDocument(body: readonly string[]): NewsBodyDocument {
  return {
    version: 1,
    document: { type: "doc", content: (body.length ? body : [""]).map((paragraph) => ({
      type: "paragraph",
      content: paragraph.replace(/\r\n?/g, "\n").split("\n").flatMap((line, index): NewsRichNode[] => [
        ...(index ? [{ type: "hardBreak" as const }] : []), ...(line ? [{ type: "text" as const, text: line }] : []),
      ]),
    })) },
  };
}
export function sameNewsDocument(a: NewsBodyDocument | undefined, b: NewsBodyDocument | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// 알 수 없는 노드·속성을 제거해 성공으로 처리하지 않고 문서 전체를 거부합니다.
export function parseNewsBodyDocument(input: unknown): NewsBodyDocument | null {
  if (!record(input) || !keys(input, ["version", "document"]) || input.version !== 1) return null;
  let count = 0;
  let paragraphs = 0;
  let textLength = 0;
  let videos = 0;
  const imageIds = new Set<string>();
  function parse(value: unknown, depth: number, lists: number): NewsRichNode | null {
    if (++count > MAX_NODES || depth > MAX_DEPTH || !record(value) || typeof value.type !== "string") return null;
    const type = value.type;
    if (type === "bodyImage") {
      if (depth !== 1 || !keys(value, ["type", "attrs"]) || !record(value.attrs) ||
          !keys(value.attrs, ["imageId", "alt"])) return null;
      const { imageId, alt } = value.attrs;
      if (!isBodyImageId(imageId) || imageIds.has(imageId) || imageIds.size >= BODY_IMAGE_LIMIT ||
          typeof alt !== "string" || !alt.trim() || alt.length > BODY_IMAGE_ALT_LIMIT || /[\u0000-\u001f\u007f]/u.test(alt)) return null;
      imageIds.add(imageId);
      return { type, attrs: { imageId, alt: alt.trim() } };
    }
    if (type === "youtubeVideo") {
      if (depth !== 1 || ++videos > BODY_VIDEO_LIMIT || !keys(value, ["type", "attrs"]) ||
          !record(value.attrs) || !keys(value.attrs, ["videoId", "title"])) return null;
      const { videoId } = value.attrs;
      const title = normalizeBodyVideoTitle(value.attrs.title);
      return isYouTubeVideoId(videoId) && title ? { type, attrs: { videoId, title } } : null;
    }
    if (type === "text") {
      if (!keys(value, ["type", "text", "marks"]) || typeof value.text !== "string" || !value.text.length || value.text.length > 10000) return null;
      textLength += value.text.length;
      if (textLength > 10000) return null;
      const marks: NewsRichMark[] = [];
      if (value.marks !== undefined) {
        if (!Array.isArray(value.marks) || value.marks.length > 3) return null;
        for (const mark of value.marks) {
          if (!record(mark) || !keys(mark, ["type", "attrs"]) || marks.some((item) => item.type === mark.type)) return null;
          if (mark.type === "bold" || mark.type === "italic") {
            if (mark.attrs !== undefined) return null;
            marks.push({ type: mark.type });
          } else if (mark.type === "link") {
            if (!record(mark.attrs) || !keys(mark.attrs, ["href"]) || !isSafeNewsLink(mark.attrs.href)) return null;
            marks.push({ type: "link", attrs: { href: mark.attrs.href } });
          } else return null;
        }
      }
      marks.sort((a, b) => a.type.localeCompare(b.type));
      return { type: "text", text: value.text, ...(marks.length ? { marks } : {}) };
    }
    if (type === "hardBreak") return ++textLength <= 10000 && keys(value, ["type"]) ? { type } : null;
    if (!["doc", "paragraph", "heading", "bulletList", "orderedList", "listItem"].includes(type) || !keys(value, ["type", "attrs", "content"])) return null;
    if ((depth === 0) !== (type === "doc")) return null;
    let attrs: NewsRichNode["attrs"];
    if (type === "heading") {
      if (!record(value.attrs) || !keys(value.attrs, ["level"]) || (value.attrs.level !== 2 && value.attrs.level !== 3)) return null;
      attrs = { level: value.attrs.level };
    } else if (type === "orderedList") {
      if (value.attrs !== undefined && (!record(value.attrs) || !keys(value.attrs, ["start"]))) return null;
      const start = record(value.attrs) ? value.attrs.start ?? 1 : 1;
      if (typeof start !== "number" || !Number.isSafeInteger(start) || start < 1 || start > 9999) return null;
      attrs = { start };
    } else if (value.attrs !== undefined) return null;
    const isList = type === "bulletList" || type === "orderedList";
    if ((type === "paragraph" || type === "heading") && ++paragraphs > 50) return null;
    const nextLists = lists + (isList ? 1 : 0);
    if (nextLists > MAX_LIST_DEPTH || (value.content !== undefined && !Array.isArray(value.content))) return null;
    const raw = value.content ?? [];
    if (!Array.isArray(raw) || raw.length > MAX_NODES || (!["paragraph", "heading"].includes(type) && !raw.length)) return null;
    const content: NewsRichNode[] = [];
    for (const child of raw) {
      const node = parse(child, depth + 1, nextLists);
      if (!node) return null;
      const allowed = type === "paragraph" || type === "heading" ? ["text", "hardBreak"] :
        isList ? ["listItem"] : type === "listItem" ? ["paragraph", "bulletList", "orderedList"] : ["paragraph", "heading", "bulletList", "orderedList", "bodyImage", "youtubeVideo"];
      if (!allowed.includes(node.type)) return null;
      const previous = content[content.length - 1];
      if (node.type === "text" && previous?.type === "text" && JSON.stringify(node.marks) === JSON.stringify(previous.marks)) previous.text += node.text!;
      else content.push(node);
    }
    if (type === "listItem" && content[0]?.type !== "paragraph") return null;
    if ((type === "paragraph" || type === "heading") && content.reduce((size, child) => size + (child.text?.length ?? 1), 0) > 2000) return null;
    return { type: type as NewsRichNode["type"], ...(attrs ? { attrs } : {}), content };
  }
  const document = parse(input.document, 0, 0);
  if (!document) return null;
  const result: NewsBodyDocument = { version: 1, document };
  const body = newsDocumentToBody(result);
  if (!body.length || body.length > 50 || body.some((block) => block.length > 2000) || body.join("\n\n").length > 10000 || !body.some((block) => block.trim())) return null;
  return new TextEncoder().encode(JSON.stringify(result)).byteLength <= NEWS_DOCUMENT_MAX_BYTES ? result : null;
}

export function resolveNewsBodyUpdate(currentBody: readonly string[], stored: unknown, nextBody: readonly string[], submitted?: NewsBodyDocument):
  | { ok: true; body: readonly string[]; bodyDocument?: NewsBodyDocument }
  | { ok: false; reason: "invalid_body_document" | "rich_text_required" } {
  const current = stored === undefined ? undefined : parseNewsBodyDocument(stored);
  if (current === null || (current && !sameNewsBodyText(currentBody, newsDocumentToBody(current)))) return { ok: false, reason: "invalid_body_document" };
  if (!submitted) {
    if (current && !sameNewsBodyText(currentBody, nextBody)) return { ok: false, reason: "rich_text_required" };
    return { ok: true, body: current || sameNewsBodyText(currentBody, nextBody) ? currentBody : nextBody, ...(current ? { bodyDocument: current } : {}) };
  }
  const baseline = current ?? newsBodyToDocument(currentBody);
  if (sameNewsDocument(baseline, submitted)) return { ok: true, body: currentBody, ...(current ? { bodyDocument: current } : {}) };
  return { ok: true, body: newsDocumentToBody(submitted), bodyDocument: submitted };
}

export function bodyImageReferences(document?: NewsBodyDocument): BodyImageReference[] {
  return (document?.document.content ?? []).flatMap((node) =>
    node.type === "bodyImage" && node.attrs?.imageId && node.attrs.alt
      ? [{ imageId: node.attrs.imageId, alt: node.attrs.alt }] : []);
}
