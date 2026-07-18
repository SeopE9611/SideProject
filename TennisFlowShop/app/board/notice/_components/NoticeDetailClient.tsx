"use client";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, PublicSurface } from "@/components/public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { badgeBaseOutlined, badgeSizeSm, getNoticeCategoryBadgeSpec } from "@/lib/badge-style";
import { communityFetch } from "@/lib/community/communityFetch.client";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  ArrowLeft,
  ArrowUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  ImageIcon,
  Paperclip,
  Pencil,
  Pin,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { USER_ME_KEY, USER_ME_SWR_OPTIONS } from "@/lib/hooks/useCurrentUser";

type NoticeDetailClientProps = { mode?: "notice" | "event" };

export default function NoticeDetailClient({ mode = "notice" }: NoticeDetailClientProps) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEventMode = mode === "event";
  const listBasePath = isEventMode ? "/board/event" : "/board/notice";
  const otherDetailBasePath = isEventMode ? "/board/notice" : "/board/event";
  const writeBasePath = isEventMode ? "/board/event/write" : "/board/notice/write";
  const sectionLabel = isEventMode ? "이벤트" : "공지사항";
  const pageTitle = isEventMode ? "고객센터 · 이벤트" : "고객센터 · 공지사항";
  const pageDescription = isEventMode
    ? "할인, 프로모션, 행사 소식을 확인하세요."
    : "도깨비테니스 고객센터의 주요 안내와 공지사항을 확인하세요.";
  type FetchError = Error & { status?: number; info?: unknown };

  function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
  }

  // /api/boards/:id가 401/403/404를 내려줄 때
  // fetcher가 에러를 던지지 않으면(SWR error 미발생) 화면이 "그냥 비어 보이는" 문제발생
  // -> res.ok / json.ok 를 확인하고, 실패면 throw 해서 error UI가 확실히 뜨게 만듬.
  const boardFetcher = async (url: string) => {
    // 조회수는 GET이 아니라 POST /api/boards/:id/view 에서만 증가
    const res = await fetch(url, { credentials: "include" });
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

  // (me 로드는 기존처럼 "에러로 던지지 않는" fetcher 유지)
  const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/boards/${id}` : null, boardFetcher, {
    // 404/401/403 같은 “회복 불가” 에러에서 불필요한 재요청 차단
    shouldRetryOnError: false,
    onErrorRetry: () => {}, // SWR 내부 재시도 로직 자체를 강제 차단
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30_000, // 짧은 시간 중복 요청 방지
  });

  const notice = data?.item;
  const isCurrentModeMatched = notice ? isEventMode === (notice.category === "이벤트") : false;

  useEffect(() => {
    if (!notice?._id) return;
    if (!isCurrentModeMatched) {
      router.replace(`${otherDetailBasePath}/${notice._id}`);
    }
  }, [isCurrentModeMatched, notice?._id, otherDetailBasePath, router]);

  // 조회수 +1은 "정석 설계"로 POST /view에서만 처리
  // - 새로고침/재진입 연타는 서버(30분 디듀프)가 막아줌
  // - 클라에서는 동일 id에서 불필요한 POST를 줄이기 위해 1회만 호출
  const viewedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id) return;
    if (error) return;
    if (!notice?._id) return;
    if (!isCurrentModeMatched) return;
    if (viewedIdRef.current === String(id)) return;
    viewedIdRef.current = String(id);

    (async () => {
      const res = await fetch(`/api/boards/${id}/view`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok === true && typeof json.viewCount === "number") {
        // 화면에서 조회수 숫자 즉시 반영(추가 GET 없이)
        mutate(
          (prev: any) =>
            prev?.item ? { ...prev, item: { ...prev.item, viewCount: json.viewCount } } : prev,
          false,
        );
      }
    })();
  }, [id, error, notice?._id, isCurrentModeMatched, mutate]);

  // 에러 메시지를 "제목/본문"으로 분리
  const errorTitle = (() => {
    const status = (error as FetchError | undefined)?.status;
    if (status === 404) return `존재하지 않는 ${sectionLabel}입니다`;
    if (status === 401) return "로그인이 필요합니다";
    if (status === 403) return "열람 권한이 없습니다";
    return "불러오기에 실패했습니다";
  })();

  const errorBody = (() => {
    const status = (error as FetchError | undefined)?.status;
    if (status === 404) return "삭제되었거나 잘못된 주소입니다.";
    if (status === 401) return "로그인 후 다시 시도해주세요.";
    if (status === 403) return "관리자에게 문의해주세요.";
    return "페이지를 새로고침하거나 잠시 후 다시 시도해주세요.";
  })();
  const detailQuery = searchParams.toString();
  const listParams = new URLSearchParams(searchParams.toString());
  listParams.delete("from");
  listParams.delete("returnTo");
  const listQuery = listParams.toString();
  const listHref = listQuery ? `${listBasePath}?${listQuery}` : listBasePath;
  const navQueryParams = new URLSearchParams(listQuery);
  if (!navQueryParams.get("limit")) navQueryParams.set("limit", "20");
  if (!navQueryParams.get("page")) navQueryParams.set("page", "1");
  navQueryParams.set("type", "notice");
  if (isEventMode) navQueryParams.set("category", "event");
  else navQueryParams.set("excludeCategory", "event");
  const navListKey = `/api/boards?${navQueryParams.toString()}`;

  // 관리자 정보 로드
  const { data: me } = useSWR(USER_ME_KEY, fetcher, USER_ME_SWR_OPTIONS);
  const isAdmin = !!(
    me &&
    (me.isAdmin === true ||
      me.role === "admin" ||
      (Array.isArray(me.roles) && me.roles.includes("admin")))
  );

  const onEdit = () => {
    if (!notice?._id) return;
    router.push(`${writeBasePath}?id=${notice._id}`);
  };

  const onDelete = async () => {
    if (!notice?._id) return;
    if (
      !confirm(
        isEventMode ? "정말 이 이벤트를 삭제하시겠습니까?" : "정말 이 공지를 삭제하시겠습니까?",
      )
    )
      return;

    const res = await communityFetch(`/api/boards/${notice._id}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      showErrorToast(json.error ?? "삭제에 실패했습니다.");
      return;
    }
    showSuccessToast("삭제되었습니다.");
    router.replace(listHref);
  };

  const attachments = Array.isArray(notice?.attachments) ? notice!.attachments : [];
  const { data: navListData } = useSWR<{
    ok: true;
    items: Array<{ _id: string; title: string }>;
  }>(
    notice ? navListKey : null,
    (url: string) => fetch(url, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30_000,
    },
  );
  const navIndex =
    navListData?.items?.findIndex((candidate) => candidate._id === notice?._id) ?? -1;
  const prevPost =
    navIndex >= 0 && navIndex < (navListData?.items?.length ?? 0) - 1
      ? navListData?.items?.[navIndex + 1]
      : null;
  const nextPost = navIndex > 0 ? navListData?.items?.[navIndex - 1] : null;
  const noticeCategoryBadge = getNoticeCategoryBadgeSpec(notice?.category);
  const imageAtts = attachments.filter((att: any) => {
    const url = typeof att === "string" ? att : att?.url;
    const mime = (att?.mime || "") as string;
    return !!url && (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url));
  });
  const fileAtts = attachments.filter((att: any) => {
    const url = typeof att === "string" ? att : att?.url;
    const mime = (att?.mime || "") as string;
    const isImg =
      !!url && (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url));
    return !!url && !isImg;
  });

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

  const [lightbox, setLightbox] = useState<{
    open: boolean;
    src: string;
    alt: string;
  }>({
    open: false,
    src: "",
    alt: "",
  });

  const renderDetailSkeleton = () => (
    <PublicSurface padding="none" className="overflow-hidden">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-9 w-4/5 max-w-3xl" />
        <div className="grid gap-2 sm:flex sm:gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="border-t border-border p-5 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="border-t border-border p-5 sm:p-6">
        <Skeleton className="h-20 w-full" />
      </div>
    </PublicSurface>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicPageHero
        variant="standard"
        eyebrow="Customer Support"
        title={pageTitle}
        description={pageDescription}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={listHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {isEventMode ? "이벤트 목록" : "공지사항 목록"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/support">고객센터 홈</Link>
            </Button>
          </>
        }
      />

      <SiteContainer className="py-7 sm:py-9 md:py-10">
        {isLoading || (notice && !isCurrentModeMatched) ? (
          renderDetailSkeleton()
        ) : error ? (
          <PublicSurface padding="lg" className="mx-auto max-w-3xl text-center">
            <div className="space-y-3">
              <h2 className="text-ui-card-title-lg font-semibold text-foreground">{errorTitle}</h2>
              <p className="text-ui-body-sm text-muted-foreground">{errorBody}</p>
              <div className="grid grid-cols-1 gap-2 pt-2 sm:inline-flex sm:grid-cols-none sm:items-center sm:justify-center">
                {(error as FetchError | undefined)?.status === 401 && (
                  <Button asChild>
                    <Link
                      href={`/login?next=${encodeURIComponent(`${listBasePath}/${id}${detailQuery ? `?${detailQuery}` : ""}`)}`}
                    >
                      로그인하고 다시 보기
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href={listHref}>{sectionLabel} 목록으로</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/support">고객센터 홈으로</Link>
                </Button>
              </div>
            </div>
          </PublicSurface>
        ) : notice ? (
          <div className="space-y-5 sm:space-y-6">
            <PublicSurface padding="none" className="overflow-hidden">
              <header className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {notice.isPinned && (
                        <Badge
                          variant="brand"
                          className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`}
                          title={`고정 ${sectionLabel}`}
                          aria-label={`고정 ${sectionLabel}`}
                        >
                          <Pin className="h-3 w-3" />
                        </Badge>
                      )}
                      <Badge
                        variant={noticeCategoryBadge.variant}
                        className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`}
                      >
                        {notice.category || "일반"}
                      </Badge>
                      {(imageAtts.length > 0 || fileAtts.length > 0) && (
                        <span
                          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-muted-foreground"
                          aria-label="첨부 정보"
                        >
                          {imageAtts.length > 0 && (
                            <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {fileAtts.length > 0 && (
                            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </span>
                      )}
                    </div>
                    <h2 className="min-w-0 break-words text-balance text-ui-section-title font-semibold leading-tight text-foreground sm:text-ui-page-title">
                      {notice.title}
                    </h2>
                    <div className="grid gap-2 text-ui-body-sm text-muted-foreground sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">작성일</span>
                        <span>{fmt(notice.createdAt)}</span>
                      </div>
                      {notice.updatedAt && notice.updatedAt !== notice.createdAt && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">수정일</span>
                          <span>{fmt(notice.updatedAt)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span className="font-medium">조회수</span>
                        <span>{notice.viewCount ?? 0}</span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-1 sm:shrink-0">
                      <Button variant="outline" onClick={onEdit} className="w-full">
                        <Pencil className="mr-1 h-4 w-4" />
                        수정
                      </Button>
                      <Button variant="destructive" onClick={onDelete} className="w-full">
                        <Trash2 className="mr-1 h-4 w-4" />
                        삭제
                      </Button>
                    </div>
                  )}
                </div>
              </header>

              <div className="border-t border-border p-5 sm:p-6 md:p-8">
                <div className="mx-auto max-w-3xl whitespace-pre-line break-words text-ui-body leading-8 text-foreground">
                  {String(notice.content || "")}
                </div>
              </div>

              {imageAtts.length > 0 && (
                <section className="border-t border-border p-5 sm:p-6 md:p-8">
                  <div className="mb-4 flex items-center gap-2 text-foreground">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-ui-card-title font-semibold">이미지</h3>
                  </div>
                  {imageAtts.length === 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLightbox({
                          open: true,
                          src: (typeof imageAtts[0] === "string"
                            ? imageAtts[0]
                            : imageAtts[0].url) as string,
                          alt: (imageAtts[0] as any)?.name || "image-1",
                        })
                      }
                      className="block w-full overflow-hidden rounded-panel border border-border bg-muted/30 hover:bg-muted/50"
                      aria-label="이미지 확대 보기"
                    >
                      <img
                        src={
                          (typeof imageAtts[0] === "string"
                            ? imageAtts[0]
                            : imageAtts[0].url) as string
                        }
                        alt={(imageAtts[0] as any)?.name || "image-1"}
                        className="h-auto max-h-[70vh] w-full object-contain"
                      />
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {imageAtts.map((att: any, i: number) => {
                        const url = typeof att === "string" ? att : att?.url;
                        const name =
                          typeof att === "string"
                            ? `image-${i + 1}`
                            : att?.name || `image-${i + 1}`;
                        return (
                          <button
                            key={`img-${i}`}
                            type="button"
                            onClick={() => setLightbox({ open: true, src: url, alt: name })}
                            className="overflow-hidden rounded-control border border-border bg-muted/30 hover:bg-muted/50"
                            aria-label={`${name} 이미지 보기`}
                          >
                            <img
                              src={url || "/placeholder.svg"}
                              alt={name}
                              className="h-56 w-full object-cover sm:h-52"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {fileAtts.length > 0 && (
                <section className="border-t border-border p-5 sm:p-6 md:p-8">
                  <div className="mb-4 flex items-center gap-2 text-foreground">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-ui-card-title font-semibold">첨부파일</h3>
                  </div>
                  <div className="overflow-hidden rounded-control border border-border divide-y divide-border">
                    {fileAtts.map((att: any, i: number) => {
                      const url = typeof att === "string" ? att : att?.url;
                      const name =
                        typeof att === "string"
                          ? `attachment-${i + 1}`
                          : att?.name || `attachment-${i + 1}`;
                      const size = att?.size ? (att.size / 1024 / 1024).toFixed(2) + " MB" : "";
                      const mime = (att?.mime || "") as string;
                      const downloadUrl =
                        typeof att === "object" && att?.downloadUrl
                          ? att.downloadUrl
                          : `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(name)}`;
                      const isPdf = mime === "application/pdf" || /\.pdf$/i.test(name);
                      return (
                        <div
                          key={`file-${i}`}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                        >
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-border text-muted-foreground">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="line-clamp-2 break-words font-medium text-foreground">
                                {name}
                              </div>
                              {size && (
                                <div className="text-ui-body-sm text-muted-foreground">{size}</div>
                              )}
                            </div>
                          </div>
                          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-flow-col sm:auto-cols-max sm:justify-end">
                            {isPdf && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="w-full sm:w-auto"
                              >
                                <a href={url} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-1 h-4 w-4" />
                                  미리보기
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="w-full sm:w-auto"
                            >
                              <a href={downloadUrl}>
                                <Download className="mr-1 h-4 w-4" />
                                다운로드
                              </a>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </PublicSurface>

            <PublicSurface padding="none" className="overflow-hidden">
              <div className="grid md:grid-cols-2 md:divide-x md:divide-border">
                {(
                  [
                    { key: "prev", label: "이전 글", icon: ChevronLeft, target: prevPost },
                    { key: "next", label: "다음 글", icon: ChevronRight, target: nextPost },
                  ] as const
                ).map(({ key, label, icon: Icon, target }) =>
                  target ? (
                    <Link
                      key={key}
                      href={`${listBasePath}/${target._id}${listQuery ? `?${listQuery}` : ""}`}
                      className="flex min-h-20 items-start gap-3 border-b border-border p-4 hover:bg-muted/30 md:border-b-0"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block text-ui-label text-muted-foreground">{label}</span>
                        <span className="line-clamp-2 break-words text-ui-body-sm font-medium text-foreground">
                          {target.title}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <div
                      key={key}
                      className="flex min-h-20 items-start gap-3 border-b border-border p-4 text-muted-foreground md:border-b-0"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-ui-label">{label}</span>
                        <span className="block line-clamp-1 text-ui-body-sm">
                          이동할 글이 없습니다.
                        </span>
                      </span>
                    </div>
                  ),
                )}
              </div>
            </PublicSurface>

            <div className="flex justify-center sm:justify-end">
              <Button variant="outline" size="lg" asChild>
                <Link href={listHref}>
                  <ArrowUp className="mr-2 h-4 w-4" />
                  {isEventMode ? "이벤트 목록으로" : "목록으로 돌아가기"}
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </SiteContainer>

      <Dialog
        open={lightbox.open}
        onOpenChange={(open) => !open && setLightbox({ open: false, src: "", alt: "" })}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] border-0 bg-transparent p-0 shadow-none sm:max-w-[90vw]">
          <DialogTitle className="sr-only">이미지 확대 보기</DialogTitle>
          <img
            src={lightbox.src || "/placeholder.svg"}
            alt={lightbox.alt}
            className="max-h-[85vh] max-w-[90vw] rounded-panel object-contain"
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
