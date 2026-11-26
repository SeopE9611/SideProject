"use client";

import { Node, NodeViewWrapper, ReactNodeViewRenderer, type Editor, type NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useEffect, useRef, useState } from "react";
import {
  BODY_VIDEO_LIMIT, BODY_VIDEO_TITLE_LIMIT, isYouTubeVideoId, normalizeBodyVideoTitle, parseYouTubeVideoUrl, youtubeWatchUrl,
} from "@/features/news/news.rich-text";
import { insertBodyMedia } from "./admin-body-image";

type Video = { videoId: string; title: string };
export type VideoSelection = { position: number; video?: Video };
const control = "min-h-11 rounded-control border border-border-strong px-3 text-small focus-visible:outline-2 focus-visible:outline-focus-ring disabled:opacity-50";

function VideoView({ node, editor, extension, getPos, deleteNode, selected }: NodeViewProps) {
  function editVideo() {
    const position = getPos();
    const { videoId, title } = node.attrs;
    if (editor.isEditable && typeof position === "number" && isYouTubeVideoId(videoId) && typeof title === "string") {
      const onEdit = extension.options.onEdit as (selection: VideoSelection) => void;
      editor.commands.setNodeSelection(position);
      onEdit({ position, video: { videoId, title } });
    }
  }
  return <NodeViewWrapper contentEditable={false} className="my-4 min-w-0">
    <div className={`grid gap-2 rounded-control border bg-surface p-3 ${selected ? "border-primary outline-2 outline-focus-ring" : "border-border"}`}>
      <p className="text-small font-semibold text-primary">YouTube 영상</p>
      <p className="break-words font-semibold">{node.attrs.title}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={control} onClick={editVideo}>영상 수정</button>
        <button type="button" className={control}
          onClick={() => { if (editor.isEditable) { deleteNode(); editor.commands.focus(); } }}>영상 제거</button>
      </div>
    </div>
  </NodeViewWrapper>;
}

export const BodyVideoNode = Node.create<{ onEdit: (selection: VideoSelection) => void }>({
  name: "youtubeVideo",
  atom: true,
  addOptions: () => ({ onEdit: () => {} }),
  addAttributes: () => ({ videoId: { default: null }, title: { default: "" } }),
  // 클립보드의 HTML은 영상 노드로 읽지 않습니다.
  renderHTML: () => ["div"],
  addNodeView: () => ReactNodeViewRenderer(VideoView),
});

export function AdminBodyVideoPicker({ editor, selection, fieldId, disabled, onClose }: {
  editor: Editor;
  selection: VideoSelection;
  fieldId: string;
  disabled: boolean;
  onClose: () => void;
}) {
  const { position, video } = selection;
  const [url, setUrl] = useState(video ? youtubeWatchUrl(video.videoId) : "");
  const [title, setTitle] = useState(video?.title ?? "");
  const [error, setError] = useState<{ field?: "url" | "title"; message: string }>();
  const urlInput = useRef<HTMLInputElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  useEffect(() => { urlInput.current?.focus(); }, []);

  function apply() {
    if (disabled || editor.isDestroyed) return;
    const videoId = parseYouTubeVideoUrl(url);
    if (!videoId) {
      setError({ field: "url", message: "HTTPS로 시작하는 YouTube 개별 영상 주소를 입력해 주세요." });
      urlInput.current?.focus();
      return;
    }
    const normalizedTitle = normalizeBodyVideoTitle(title);
    if (!normalizedTitle) {
      setError({ field: "title", message: `영상 제목을 ${BODY_VIDEO_TITLE_LIMIT}자 이내로 입력해 주세요.` });
      titleInput.current?.focus();
      return;
    }
    if (video) {
      const node = editor.state.doc.nodeAt(position);
      if (node?.type.name !== "youtubeVideo" || node.attrs.videoId !== video.videoId || node.attrs.title !== video.title) {
        setError({ message: "영상 위치를 확인할 수 없습니다. 편집기를 닫고 다시 시도해 주세요." });
        return;
      }
      if (video.videoId !== videoId || video.title !== normalizedTitle) {
        const transaction = editor.state.tr.setNodeMarkup(position, undefined, { videoId, title: normalizedTitle });
        editor.view.dispatch(transaction.setSelection(NodeSelection.create(transaction.doc, position)));
      }
    } else {
      if ((editor.$nodes("youtubeVideo")?.length ?? 0) >= BODY_VIDEO_LIMIT) {
        setError({ message: `본문 영상은 ${BODY_VIDEO_LIMIT}개까지 넣을 수 있습니다.` });
        return;
      }
      if (!insertBodyMedia(editor, position, "youtubeVideo", { videoId, title: normalizedTitle })) {
        setError({ message: "영상을 넣을 위치를 확인할 수 없습니다. 편집기를 닫고 다시 시도해 주세요." });
        return;
      }
    }
    onClose();
  }

  return <div id={fieldId} data-unsaved-ignore className="grid min-w-0 gap-3 border-b border-border bg-surface p-3"
    onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); apply(); }
    }}>
    <label className="grid gap-1 text-small font-semibold">
      YouTube 영상 주소
      <input ref={urlInput} type="text" inputMode="url" value={url} maxLength={2048} disabled={disabled}
        aria-required="true" aria-invalid={error?.field === "url"} aria-describedby={error?.field === "url" ? `${fieldId}-error` : undefined}
        className={`w-full min-w-0 ${control}`} onChange={(event) => { setUrl(event.target.value); setError(undefined); }} />
    </label>
    <label className="grid gap-1 text-small font-semibold">
      영상 제목
      <input ref={titleInput} value={title} maxLength={BODY_VIDEO_TITLE_LIMIT} disabled={disabled}
        aria-required="true" aria-invalid={error?.field === "title"} aria-describedby={error?.field === "title" ? `${fieldId}-error` : undefined}
        className={`w-full min-w-0 ${control}`} onChange={(event) => { setTitle(event.target.value); setError(undefined); }} />
    </label>
    <p className="text-small text-muted-foreground">영상은 문단 사이에 넣습니다. 문단 안에서 삽입하면 해당 문단 뒤에 표시됩니다.</p>
    {error ? <p id={`${fieldId}-error`} role="alert" className="text-small text-danger">{error.message}</p> : null}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={control} disabled={disabled} onClick={apply}>{video ? "수정 적용" : "영상 삽입"}</button>
      <button type="button" className={control} onClick={onClose}>취소</button>
    </div>
  </div>;
}
