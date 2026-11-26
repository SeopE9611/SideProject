"use client";

import { useEffect, useRef, useState } from "react";
import { youtubeWatchUrl } from "@/features/news/news.rich-text";

export function NewsBodyVideo({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => { if (playing) frame.current?.focus(); }, [playing]);

  return <figure className="min-w-0 space-y-3 rounded-control border border-border bg-surface p-3 sm:p-4">
    <figcaption className="break-words font-semibold">{title}</figcaption>
    {playing ? (
      <iframe ref={frame}
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={`YouTube 영상 · ${title}`}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="block aspect-video min-h-[200px] w-full rounded-control border-0 bg-black"
      />
    ) : (
      <div className="space-y-2">
        <p className="text-small text-muted-foreground">영상을 선택하면 외부 콘텐츠인 YouTube 플레이어를 불러옵니다.</p>
        <button type="button" onClick={() => setPlaying(true)}
          className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 text-small font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          영상 보기
        </button>
      </div>
    )}
    <a href={youtubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center text-small text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
      YouTube에서 직접 보기 <span className="sr-only"> · {title} · 새 창</span>
    </a>
  </figure>;
}
