"use client";
import Link from "next/link";
import {
  ArrowUp,
  MessageCircle,
  Pencil,
  Trash2,
  Calendar,
  Eye,
  CheckCircle,
  FileText,
  ExternalLink,
  MessageSquare,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import useSWR from "swr";
import { USER_ME_KEY, USER_ME_SWR_OPTIONS } from "@/lib/hooks/useCurrentUser";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { badgeSizeSm, getQnaCategoryBadgeSpec, getAnswerStatusBadgeSpec } from "@/lib/badge-style";
import type { BoardPost } from "@/lib/types/board";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { communityFetch } from "@/lib/community/communityFetch.client";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, PublicSurface } from "@/components/public";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { QnaDetailContentSkeleton } from "../_components/QnaDetailLoadingShell";

type QnaItem = BoardPost & { type: "qna" };

export default function QnaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  type FetchError = Error & { status?: number; info?: unknown };

  function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
  }

  // /api/boards/:id가 401/403/404를 내려줄 때
  // fetcher가 에러를 던지지 않으면(SWR error 미발생) 화면이 "그냥 비어 보이는" 문제발생.
  // -> res.ok / json.ok 를 확인하고, 실패면 throw 해서 error UI가 확실히 뜨게 만듬.
  const boardFetcher = async (url: string) => {
    const res = await communityFetch(url, { credentials: "include" });
    const json = await res.json().catch(() => null);

    const okFalse = isRecord(json) && json["ok"] === false;
    if (!res.ok || okFalse) {
      const message =
        isRecord(json) && typeof json["error"] === "string" ? json["error"] : "request_failed";

      const err: FetchError = new Error(message);
      err.status = res.status;
      err.info = json;
      throw err;
    }

    return json;
  };
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/boards/${id}` : null, boardFetcher, {
    // 404/401/403 같은 “회복 불가” 에러에서 불필요한 재시도 차단
    shouldRetryOnError: false,
    onErrorRetry: () => {}, // SWR 내부 retry 로직 자체 차단
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30_000, // 짧은 시간 중복 호출 방지
  });
  const qna = data?.item as QnaItem | undefined;

  // 조회수는 GET이 아니라 POST /view에서만 증가
  const viewedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id) return;
    if (error) return;
    if (!qna?._id) return;
    if (viewedIdRef.current === String(id)) return;
    viewedIdRef.current = String(id);

    (async () => {
      const res = await communityFetch(`/api/boards/${id}/view`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok === true && typeof json.viewCount === "number") {
        mutate(
          (prev: any) =>
            prev?.item ? { ...prev, item: { ...prev.item, viewCount: json.viewCount } } : prev,
          false,
        );
      }
    })();
  }, [id, error, qna?._id, mutate]);

  // 에러 메시지 분리
  const errorTitle = (() => {
    const status = (error as FetchError | undefined)?.status;
    if (status === 404) return "존재하지 않는 Q&A 글입니다";
    if (status === 401) return "로그인이 필요합니다";
    if (status === 403) return "열람 권한이 없습니다";
    return "불러오기에 실패했습니다";
  })();

  const errorBody = (() => {
    const status = (error as FetchError | undefined)?.status;
    if (status === 404) return "삭제되었거나 잘못된 주소입니다.";
    if (status === 401) return "로그인 후 다시 시도해주세요.";
    if (status === 403) return "작성자/관리자만 볼 수 있는 글일 수 있습니다.";
    return "페이지를 새로고침하거나 잠시 후 다시 시도해주세요.";
  })();

  const returnTo = searchParams.get("returnTo");
  const from = searchParams.get("from");
  const detailQuery = searchParams.toString();
  const listParams = new URLSearchParams(searchParams.toString());
  listParams.delete("from");
  listParams.delete("returnTo");
  const listQuery = listParams.toString();
  const listHref = listQuery ? `/board/qna?${listQuery}` : "/board/qna";
  const supportHref = from === "support" || returnTo === "/support" ? "/support" : "/support";

  const fmt = (v?: string | Date) =>
    v
      ? new Date(v).toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  // 로그인 사용자 정보
  const meRes = useSWR(
    USER_ME_KEY,
    (url: string) => fetch(url, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    USER_ME_SWR_OPTIONS,
  );
  const me = meRes.data;
  const isAdmin = me?.role === "admin";
  const isAuthor = me?.sub && qna?.authorId && String(me.sub) === String(qna.authorId);
  const [answerText, setAnswerText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // 답변 "작성/수정" 상태에서만 dirty 판단
  const answerBaseline = qna?.answer?.content ?? "";
  const isAnswerDirty = useMemo(() => {
    // 답변 작성(아직 답변 없음)
    if (isAdmin && qna && !qna.answer) return answerText.trim().length > 0;
    // 답변 수정(편집 모드)
    if (isAdmin && qna?.answer && isEditing) return answerText !== answerBaseline;
    return false;
  }, [answerText, isAdmin, isEditing, qna, answerBaseline]);

  useUnsavedChangesGuard(isAnswerDirty);

  const confirmLeave = (e: React.MouseEvent) => {
    if (!isAnswerDirty) return;
    if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const [lightbox, setLightbox] = useState<{
    open: boolean;
    src: string;
    alt: string;
  }>({
    open: false,
    src: "",
    alt: "",
  });

  async function handleDelete() {
    if (!qna?._id) return;
    if (!confirm("정말 삭제할까요?")) return;
    const res = await communityFetch(`/api/boards/${qna._id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      alert("삭제 실패");
      return;
    }
    router.replace(listHref);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicPageHero
        variant="feature"
        eyebrow={<Badge variant="signal">Q&amp;A</Badge>}
        title="고객센터 · Q&A"
        description="Q&A 목록에서 선택한 상세 문의와 답변을 확인하실 수 있습니다."
        actions={
          <>
            <Button asChild variant="highlight" size="sm" className="w-full sm:w-auto">
              <Link href={listHref} onClick={confirmLeave}>
                Q&amp;A 목록
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href={supportHref} onClick={confirmLeave}>
                고객센터 홈
              </Link>
            </Button>
          </>
        }
      />

      <SiteContainer className="space-y-6 py-6 md:space-y-8 md:py-8">
        {isLoading && <QnaDetailContentSkeleton />}

        {!isLoading && error && (
          <PublicSurface variant="feature" padding="lg" className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-balance font-ui-bold text-ui-page-title font-semibold leading-tight text-foreground sm:text-ui-page-title-lg">
                {errorTitle}
              </h2>
              <p className="whitespace-pre-line break-words text-ui-body leading-relaxed text-muted-foreground">
                {errorBody}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {(error as FetchError | undefined)?.status === 401 && (
                <Button asChild variant="highlight" className="w-full sm:w-auto">
                  <Link
                    href={`/login?next=${encodeURIComponent(`/board/qna/${id}${detailQuery ? `?${detailQuery}` : ""}`)}`}
                  >
                    로그인하고 다시 보기
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href={listHref}>Q&amp;A 목록으로</Link>
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href={supportHref}>고객센터 홈</Link>
              </Button>
            </div>
          </PublicSurface>
        )}

        {!isLoading && !error && qna && (
          <>
            <PublicSurface variant="feature" padding="none" className="overflow-hidden">
              <div className="h-1 bg-brand-highlight" aria-hidden="true" />
              <div className="space-y-4 border-b border-border bg-brand-highlight-muted/30 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge
                      variant={getQnaCategoryBadgeSpec(qna.category).variant}
                      className={`${badgeSizeSm} shrink-0 whitespace-nowrap`}
                    >
                      {qna.category ?? "일반문의"}
                    </Badge>
                    {qna.isSecret && (
                      <Badge
                        variant="secondary"
                        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-ui-label"
                      >
                        <Lock className="h-3 w-3" /> 비밀글
                      </Badge>
                    )}
                    {qna.productRef?.productId && (
                      <Link
                        href={
                          qna.productRef.targetType === "racket"
                            ? `/rackets/${qna.productRef.productId}`
                            : `/products/${qna.productRef.productId}`
                        }
                        className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Badge
                          variant="secondary"
                          className={`${badgeSizeSm} max-w-[12rem] shrink-0 truncate whitespace-nowrap`}
                        >
                          {qna.productRef.targetType === "racket" ? "라켓" : "상품"}:{" "}
                          {qna.productRef.name ?? "상품"}
                        </Badge>
                      </Link>
                    )}
                  </div>
                  <Badge
                    variant={getAnswerStatusBadgeSpec(!!qna.answer).variant}
                    className={`${badgeSizeSm} shrink-0 whitespace-nowrap`}
                  >
                    {qna.answer ? "답변 완료" : "답변 대기"}
                  </Badge>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-foreground">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <h2 className="break-words text-balance font-ui-bold text-ui-page-title font-semibold leading-tight text-foreground sm:text-ui-page-title-lg">
                    {qna.title}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-ui-label text-muted-foreground sm:text-ui-body-sm md:gap-x-6">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Avatar className="h-7 w-7 border border-border">
                      <AvatarFallback className="bg-muted text-ui-label font-medium text-foreground">
                        {(qna.authorName ?? "익명").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{qna.authorName ?? "익명"}</span>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">작성일</span>
                    <span>{fmt(qna.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium">조회수</span>
                    <span className="font-semibold text-foreground">{qna.viewCount ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-4 md:p-6">
                <div className="max-w-3xl rounded-panel bg-card text-ui-body leading-8 text-foreground">
                  <div className="whitespace-pre-line break-words p-4 md:p-6">
                    {String(qna.content || "")}
                  </div>
                </div>

                {Array.isArray(qna.attachments) && qna.attachments.length > 0 && (
                  <section className="space-y-4 border-t border-border pt-6">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-ui-card-title-lg font-semibold text-foreground">
                        첨부파일
                      </h3>
                      <Badge variant="secondary">{qna.attachments.length}개</Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
                      {qna.attachments.map((att: any, i: number) => {
                        const url = typeof att === "string" ? att : att?.url;
                        const name =
                          typeof att === "string"
                            ? `attachment-${i}`
                            : att?.name || `attachment-${i}`;
                        if (!url) return null;
                        const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);

                        return isImage ? (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setLightbox({ open: true, src: url, alt: name })}
                            className="group relative block w-full overflow-hidden rounded-panel border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            aria-label={`${name} 이미지 확대 보기`}
                          >
                            <img
                              src={url || "/placeholder.svg"}
                              alt={name}
                              className="h-52 w-full object-cover sm:h-48"
                            />
                            <span
                              className="absolute inset-0 flex items-center justify-center bg-overlay/0 opacity-0 group-hover:bg-overlay/30 group-hover:opacity-100 group-focus-visible:bg-overlay/30 group-focus-visible:opacity-100"
                              aria-hidden="true"
                            >
                              <ExternalLink
                                className="h-5 w-5 text-surface-inverse-foreground"
                                aria-hidden="true"
                              />
                            </span>
                          </button>
                        ) : (
                          <div
                            key={i}
                            className="rounded-panel border border-border bg-card p-3 sm:p-4"
                          >
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-ui-body-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{name}</span>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              {(isAuthor || isAdmin) && (
                <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 p-4 md:p-6">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/board/qna/write?id=${qna._id}`} onClick={confirmLeave}>
                      <Pencil className="mr-2 h-4 w-4" />
                      수정
                    </Link>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </Button>
                </div>
              )}
            </PublicSurface>

            {isAdmin && !qna.answer && (
              <PublicSurface variant="feature" padding="none" className="overflow-hidden">
                <div className="h-1 bg-brand-highlight" aria-hidden="true" />
                <div className="border-b border-border bg-brand-highlight-muted/30 p-4 md:p-6">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-foreground" />
                    <h2 className="font-ui-bold text-ui-card-title-lg font-semibold text-foreground">
                      관리자 답변 작성
                    </h2>
                  </div>
                </div>
                <div className="space-y-4 p-4 md:p-6">
                  <Textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    aria-label="관리자 답변 내용"
                    placeholder="답변 내용을 입력하세요"
                    className="min-h-[140px] border-border bg-card focus:border-ring focus:ring-ring"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="highlight"
                      onClick={async () => {
                        const res = await communityFetch(`/api/boards/${qna._id}/answer`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ content: answerText }),
                        });
                        const j = await res.json().catch(() => ({}));
                        if (!res.ok || !j?.ok) return alert("등록 실패");
                        setAnswerText("");
                        await mutate();
                      }}
                      disabled={!answerText.trim()}
                    >
                      답변 등록
                    </Button>
                  </div>
                </div>
              </PublicSurface>
            )}

            {qna.answer && (
              <PublicSurface variant="feature" padding="none" className="overflow-hidden">
                <div className="h-1 bg-brand-highlight" aria-hidden="true" />
                <div className="space-y-3 border-b border-border bg-brand-highlight-muted/30 p-4 md:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card">
                        <MessageCircle className="h-4 w-4 text-foreground" />
                      </div>
                      <h2 className="font-ui-bold text-ui-section-title font-semibold text-foreground">
                        관리자 답변
                      </h2>
                      <Badge variant="success" className={badgeSizeSm}>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        답변 완료
                      </Badge>
                    </div>
                    {isAdmin && !isEditing && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAnswerText(qna.answer?.content ?? "");
                            setIsEditing(true);
                          }}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (!confirm("답변을 삭제할까요?")) return;
                            const res = await communityFetch(`/api/boards/${qna._id}/answer`, {
                              method: "DELETE",
                              credentials: "include",
                            });
                            const j = await res.json().catch(() => ({}));
                            if (!res.ok || !j?.ok) return alert("삭제 실패");
                            setAnswerText("");
                            setIsEditing(false);
                            await mutate();
                          }}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          삭제
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-ui-label text-muted-foreground sm:text-ui-body-sm md:gap-x-6">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Avatar className="h-6 w-6 border border-border">
                        <AvatarFallback className="bg-muted text-ui-label font-medium text-foreground">
                          {(qna.answer.authorName ?? "관리자").slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{qna.answer.authorName ?? "관리자"}</span>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">답변일</span>
                      <span>{fmt(qna.answer.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  {!isEditing ? (
                    <div className="max-w-3xl rounded-panel bg-card text-ui-body leading-8 text-foreground">
                      <div className="whitespace-pre-line break-words p-4 md:p-6">
                        {String(qna.answer.content || "")}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        aria-label="관리자 답변 수정 내용"
                        className="min-h-[140px] border-border bg-card focus:border-ring focus:ring-ring"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          취소
                        </Button>
                        <Button
                          variant="highlight"
                          onClick={async () => {
                            const res = await communityFetch(`/api/boards/${qna._id}/answer`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              credentials: "include",
                              body: JSON.stringify({ content: answerText }),
                            });
                            const j = await res.json().catch(() => ({}));
                            if (!res.ok || !j?.ok) return alert("수정 실패");
                            setIsEditing(false);
                            await mutate();
                          }}
                        >
                          저장
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </PublicSurface>
            )}

            <PublicSurface variant="muted" padding="md" className="space-y-4">
              <p className="text-ui-body-sm text-muted-foreground">
                Q&amp;A는 비밀글/권한 정책이 있어 이전 글/다음 글 이동 대신 목록 중심으로 이동을
                제공합니다.
              </p>
              <div className="flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                <Button
                  variant="highlight_soft"
                  size="default"
                  asChild
                  className="w-full justify-center px-4 sm:w-auto"
                >
                  <Link href={listHref} onClick={confirmLeave}>
                    <ArrowUp className="mr-2 h-4 w-4" />
                    목록으로 돌아가기
                  </Link>
                </Button>
                <Button
                  variant="highlight"
                  size="default"
                  asChild
                  className="w-full justify-center px-4 sm:w-auto"
                >
                  <Link href="/board/qna/write" onClick={confirmLeave}>
                    <MessageCircle className="mr-2 h-4 w-4" />새 문의하기
                  </Link>
                </Button>
              </div>
            </PublicSurface>
          </>
        )}
      </SiteContainer>

      <Dialog
        open={lightbox.open}
        onOpenChange={(open) => {
          if (!open) setLightbox({ open: false, src: "", alt: "" });
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] bg-card p-3 sm:max-w-5xl">
          <DialogTitle className="sr-only">이미지 확대 보기</DialogTitle>
          <img
            src={lightbox.src || "/placeholder.svg"}
            alt={lightbox.alt}
            className="max-h-[80vh] w-full rounded-panel object-contain"
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
