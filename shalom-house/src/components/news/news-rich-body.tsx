import { NewsBodyVideo } from "./news-body-video";
import Image from "next/image";
import { bodyImageUrl, type BodyImageDomain } from "@/features/news/body-image-reference";
import { Fragment, type ReactNode } from "react";
import { parseNewsBodyDocument, type NewsBodyDocument, type NewsRichNode } from "@/features/news/news.rich-text";

// 호출부와 별개로 문서를 재검증하고, 허용한 속성만 고정된 React 요소에 전달합니다.
export function NewsRichBody({ bodyDocument, images }: {
  bodyDocument: NewsBodyDocument;
  images?: { domain: BodyImageDomain; owner: string; admin: boolean; sizes?: Record<string, { width: number; height: number }> };
}) {
  const valid = parseNewsBodyDocument(bodyDocument);
  if (!valid) return null;
  function render(node: NewsRichNode, key: number): ReactNode {
    const content = node.content?.map(render);
    if (node.type === "text") {
      let text: ReactNode = node.text;
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") text = <strong>{text}</strong>;
        else if (mark.type === "italic") text = <em>{text}</em>;
        else text = <a href={mark.attrs!.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">{text}</a>;
      }
      return <Fragment key={key}>{text}</Fragment>;
    }
    switch (node.type) {
      case "doc": return <div key={key} className="min-w-0 space-y-4 whitespace-pre-wrap break-words text-body leading-8">{content}</div>;
      case "paragraph": return <p key={key}>{content}</p>;
      case "heading": return node.attrs?.level === 2 ? <h2 key={key} className="mt-6 text-xl font-bold">{content}</h2> : <h3 key={key} className="mt-5 text-lg font-bold">{content}</h3>;
      case "bulletList": return <ul key={key} className="list-disc space-y-2 pl-6">{content}</ul>;
      case "orderedList": return <ol key={key} start={node.attrs?.start ?? 1} className="list-decimal space-y-2 pl-6">{content}</ol>;
      case "listItem": return <li key={key} className="min-w-0 space-y-2">{content}</li>;
      case "hardBreak": return <br key={key} />;
      case "youtubeVideo": {
        const { videoId, title } = node.attrs ?? {};
        return videoId && title ? <NewsBodyVideo key={`${key}-${videoId}`} videoId={videoId} title={title} /> : null;
      }
      case "bodyImage": {
        const id = node.attrs?.imageId;
        const size = id ? images?.sizes?.[id] : undefined;
        if (!images || !id || !size) return null;
        return <Image key={key} src={bodyImageUrl(images.domain, images.owner, id, images.admin)}
          alt={node.attrs?.alt ?? ""} width={size.width} height={size.height}
          unoptimized className="block h-auto max-w-full rounded-control" />;
      }
    }
  }
  return render(valid.document, 0);
}
