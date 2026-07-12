"use client";

import { getCustomerRentalStatusLabel } from "@/app/mypage/_lib/flow-display";
import MaskedBlock from "@/components/reviews/MaskedBlock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { useReviewPhotoUploadSession } from "@/lib/reviews/useReviewPhotoUploadSession";
import { getReviewManagedVisibilityStatus } from "@/lib/reviews/review-managed-status";
import {
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Package,
  Pencil,
  Briefcase,
  Star,
  ThumbsUp,
  Trash2,
  Wrench,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const ReviewPhotoDialog = dynamic(() => import("@/app/reviews/_components/ReviewPhotoDialog"), {
  loading: () => null,
});
const PhotosUploader = dynamic(() => import("@/components/reviews/PhotosUploader"), {
  loading: () => null,
});
const PhotosReorderGrid = dynamic(() => import("@/components/reviews/PhotosReorderGrid"), {
  loading: () => null,
});

/* 날짜 YYYY-MM-DD 포맷 */
function fmt(dateStr?: string) {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

/* 개별 리뷰 카드: 상품/서비스 공용 */
export default function ReviewCard({
  item,
  onMutate,
  isAdmin = false,
  isLoggedIn = false,
}: {
  item: any;
  onMutate?: () => any;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
}) {
  const [voted, setVoted] = useState<boolean>(Boolean(item.votedByMe));
  const [count, setCount] = useState<number>(item.helpfulCount ?? 0);
  const [open, setOpen] = useState(false); // 사진 Dialog
  const [busy, setBusy] = useState(false); // 카드 액션 로딩(토글/수정/삭제)
  const { isAdminModeration, managedStatus, nextStatus } = getReviewManagedVisibilityStatus(item, isAdmin);

  // 수정
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    rating: number | "";
    content: string;
    photos: string[];
  }>({
    rating: typeof item.rating === "number" ? item.rating : "",
    content: item.content ?? "",
    photos: Array.isArray(item.photos) ? item.photos : [],
  });
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [uploadingEditPhotos, setUploadingEditPhotos] = useState(false);
  const editPhotoSession = useReviewPhotoUploadSession();

  const openEdit = () => {
    void editPhotoSession.cleanupUncommittedPhotos();
    editPhotoSession.resetSession();
    void editPhotoSession.startSession();
    setEditOpen(true);
  };
  const closeEdit = () => {
    if (uploadingEditPhotos) return;
    void editPhotoSession.cleanupUncommittedPhotos();
    editPhotoSession.resetSession();
    setEditOpen(false);
  };

  // 확대 뷰어
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const openViewer = (idx: number) => {
    setViewerIndex(idx);
    setViewerOpen(true);
  };

  const submitEdit = async () => {
    if (uploadingEditPhotos) {
      showErrorToast("사진 업로드가 끝난 후 저장해 주세요.");
      return;
    }
    const { rating, content } = editForm;
    try {
      setBusy(true);
      const patchBody = JSON.stringify({
        rating: rating === "" ? undefined : Number(rating),
        content,
        photos: editForm.photos,
        uploadSessionId: editPhotoSession.uploadSessionId,
      });
      editPhotoSession.markSaving();
      if (isAdmin && !item.ownedByMe) {
        await adminMutator(`/api/admin/reviews/${item._id}`, {
          method: "PATCH",
          body: patchBody,
        });
      } else {
        const res = await fetch(`/api/reviews/${item._id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: patchBody,
        });
        if (!res.ok) throw new Error("수정 실패");
      }
      editPhotoSession.markCommitted();
      try {
        await onMutate?.(); // 리스트 재검증
      } catch (revalidateError) {
        console.error("[reviews] failed to revalidate after successful mutation", revalidateError);
      }
      showSuccessToast("리뷰를 수정했어요.");
      closeEdit();
      setBusy(false);
    } catch (e: any) {
      editPhotoSession.markSaveFailed();
      setBusy(false);
      showErrorToast(e?.message || "리뷰 수정에 실패했습니다.");
    }
  };

  // 공개/비공개에 따른 표시 이름
  const displayName =
    item.status === "hidden"
      ? item.ownedByMe
        ? `${item.userName ?? "내 리뷰"} (비공개)`
        : isAdmin
          ? `${item.userName ?? "사용자"} (비공개)`
          : "비공개 리뷰"
      : (item.userName ?? "익명");

  // 마스킹 여부(서버가 내려준 masked를 우선 사용, 없으면 폴백)
  const isMasked = item.masked ?? (item.status === "hidden" && !(item.ownedByMe || isAdmin));

  // 카드 제목(상품/서비스 공용)
  // - 상품: productName
  // - 서비스: serviceTargetName/serviceTitle (없으면 fallback)
  const headerTitle =
    item.type === "product"
      ? item.productName
      : item.type === "rental"
        ? item.rentalTargetName || item.rentalTitle || "라켓 대여 후기"
        : item.serviceTitle ||
          item.serviceTargetName ||
          (item.service === "stringing" ? "교체서비스 후기" : "서비스 후기");

  const typeLabel = item.contextLabel || item.serviceContextLabel ||
    (item.type === "product"
      ? "상품 후기"
      : item.type === "rental"
        ? "대여 후기"
        : "교체서비스 후기");
  const TypeIcon = item.type === "product" ? Package : item.type === "rental" ? Briefcase : Wrench;
  const targetMeta =
    item.type === "rental"
      ? [
          item.rentalDays ? `${item.rentalDays}일 대여` : null,
          item.rentalStatus ? `상태 ${getCustomerRentalStatusLabel(item.rentalStatus)}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  // 연타/경합 제어용
  const [pending, setPending] = useState(false); // 처리 중 버튼 잠금
  const reqSeqRef = useRef(0); // 보낸 요청 시퀀스
  const abortRef = useRef<AbortController | null>(null); // 이전 요청 취소용
  const helpfulEligible = !item.ownedByMe && !isMasked && item.effectiveStatus !== "hidden";

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // 실제 요청 전송(멱등 desired 사용)
  const sendIntent = async (desired: boolean, previousVotedByMe: boolean, previousHelpfulCount: number) => {
    setPending(true);
    const mySeq = ++reqSeqRef.current;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch(
        `/api/reviews/${item._id}/helpful?desired=${desired ? "on" : "off"}`,
        {
          method: "POST",
          credentials: "include",
          signal: ac.signal,
        },
      );
      const j = await res.json().catch(() => null);

      if (mySeq !== reqSeqRef.current) return;

      if (!res.ok) throw new Error(j?.message || j?.reason || "도움돼요 처리에 실패했습니다.");

      setVoted(Boolean(j?.voted));
      setCount(Math.max(0, Number(j?.helpfulCount ?? 0)));
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      if (mySeq === reqSeqRef.current) {
        setVoted(previousVotedByMe);
        setCount(previousHelpfulCount);
        showErrorToast(e?.message || "도움돼요 처리에 실패했습니다.");
      }
    } finally {
      if (mySeq === reqSeqRef.current) {
        setPending(false);
      }
    }
  };

  // 클릭 핸들러: 마지막 의도 큐잉 + 낙관적 반영
  const onHelpful = () => {
    if (!isLoggedIn) {
      showErrorToast("로그인이 필요합니다. 로그인 후 이용해주세요.");
      return;
    }

    if (!helpfulEligible) return;
    if (pending) return;

    const previousVotedByMe = Boolean(voted);
    const previousHelpfulCount = count;
    const desired = !previousVotedByMe;
    setVoted(desired);
    setCount(Math.max(0, previousHelpfulCount + (desired ? 1 : -1)));
    void sendIntent(desired, previousVotedByMe, previousHelpfulCount);
  };

  return (
    <Card
      variant="interactive"
      className="group overflow-hidden rounded-2xl border-border bg-card shadow-sm"
    >
      {/* Tennis court line accent */}
      <div className="h-1 bg-secondary" />

      <CardContent className="relative space-y-4 p-4 md:p-5">
        {busy && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-card/80">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-ui-body-sm text-primary">변경 중...</span>
          </div>
        )}

        {/* Header with badges and date */}
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Badge
              variant={item.type === "product" ? "info" : item.type === "rental" ? "success" : "neutral"}
              className="gap-1.5 rounded-full px-2.5 py-1 font-medium"
            >
              <TypeIcon className="h-3.5 w-3.5" />
              {typeLabel}
            </Badge>
            {!!headerTitle && (
              <div className="min-w-0">
                <p className="line-clamp-2 break-words text-ui-body font-semibold text-foreground">
                  {headerTitle}
                </p>
                {targetMeta && (
                  <p className="mt-1 line-clamp-1 break-words text-ui-label text-muted-foreground">
                    {targetMeta}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(item.ownedByMe || isAdmin) && !isMasked && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                    aria-label="리뷰 관리"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {/* 공개/비공개 토글 */}
                  <DropdownMenuItem
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        setBusy(true);
                        if (isAdminModeration) {
                          await adminMutator(`/api/admin/reviews/${item._id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ moderationStatus: nextStatus }),
                          });
                        } else {
                          const res = await fetch(`/api/reviews/${item._id}`, {
                            method: "PATCH",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: nextStatus }),
                          });
                          if (!res.ok) throw new Error("상태 변경 실패");
                        }
                        try {
                          await onMutate?.(); // 리스트 재검증
                        } catch (revalidateError) {
                          console.error("[reviews] failed to revalidate after successful mutation", revalidateError);
                        }
                        showSuccessToast(
                          nextStatus === "hidden" ? "비공개로 전환했습니다." : "공개로 전환했습니다.",
                        );
                      } catch (err: any) {
                        showErrorToast(err?.message || "상태 변경 중 오류");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {managedStatus === "visible" ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        비공개로 전환
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        공개로 전환
                      </>
                    )}
                  </DropdownMenuItem>

                  {/* 수정 */}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit();
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    수정
                  </DropdownMenuItem>

                  {/* 삭제 */}
                  <DropdownMenuItem
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("이 리뷰를 삭제하시겠습니까?")) return;
                      try {
                        setBusy(true);
                        if (isAdmin && !item.ownedByMe) {
                          await adminMutator(`/api/admin/reviews/${item._id}`, { method: "DELETE" });
                        } else {
                          const res = await fetch(`/api/reviews/${item._id}`, {
                            method: "DELETE",
                            credentials: "include",
                          });
                          if (!res.ok) throw new Error("삭제 실패");
                        }
                        try {
                          await onMutate?.(); // 리스트 재검증
                        } catch (revalidateError) {
                          console.error("[reviews] failed to revalidate after successful mutation", revalidateError);
                        }
                        showSuccessToast("삭제했습니다.");
                        setBusy(false);
                      } catch (err: any) {
                        setBusy(false);
                        showErrorToast(err?.message || "삭제 중 오류");
                      }
                    }}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Author info with tennis styling */}
        <div className="flex items-center gap-2 text-ui-label">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-secondary text-foreground">
            <span className="font-semibold text-ui-micro">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="font-medium text-muted-foreground">{displayName}</span>
        </div>

        {/* Rating with tennis court styling */}
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < (item.rating ?? 0) ? "text-warning fill-current" : "text-muted-foreground"}`}
              />
            ))}
          </div>
          <span className="ml-1 text-ui-body-sm font-semibold text-foreground">
            {item.rating}/5
          </span>
        </div>

        {/* Content */}
        {isMasked ? (
          <MaskedBlock className="mt-1" />
        ) : (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="whitespace-pre-wrap break-words text-ui-body-sm leading-relaxed text-foreground">
              {item.content}
            </p>
          </div>
        )}

        {/* Photo thumbnails */}
        {Array.isArray(item.photos) && item.photos.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2 text-ui-label font-medium text-muted-foreground">
              <ImageIcon className="h-4 w-4 text-primary" />
              사진 {item.photos.length}장
            </span>

            <div className="flex flex-wrap gap-2">
              {item.photos.slice(0, 4).map((src: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setViewerIndex(idx);
                    setOpen(true);
                  }}
                  className="relative h-12 w-12 overflow-hidden rounded-xl border border-border/60 bg-muted transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`리뷰 사진 ${idx + 1} 크게 보기`}
                >
                  <Image
                    src={src || "/placeholder.svg"}
                    alt={`photo-${idx}`}
                    fill
                    className="object-cover"
                  />
                  {idx === 3 && item.photos.length > 4 && (
                    <div className="absolute inset-0 bg-overlay/60 text-foreground text-ui-micro font-semibold flex items-center justify-center">
                      +{item.photos.length - 3}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Helpful + Date (우측 정렬) */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
          <Button
            size="sm"
            variant={voted ? "default" : "secondary"}
            onClick={onHelpful}
            disabled={pending || !helpfulEligible}
            className="h-9 w-full overflow-hidden whitespace-nowrap rounded-xl px-4 font-medium sm:w-auto"
            aria-pressed={voted}
            aria-label={item.ownedByMe ? "내 후기에는 도움돼요를 누를 수 없습니다." : `도움돼요 ${count ? `(${count})` : ""}`}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ThumbsUp className="h-4 w-4 mr-2" />
            )}
            {item.ownedByMe ? "내 후기" : `도움돼요 ${count ? `(${count})` : ""}`}
          </Button>

          {/* 날짜 */}
          <time className="whitespace-nowrap rounded-full border border-border/60 bg-secondary px-2 py-1 text-ui-label font-medium text-muted-foreground sm:ml-auto shrink-0 tabular-nums">
            {fmt(item.createdAt)}
          </time>
        </div>
      </CardContent>

      {/* 사진 Dialog */}
      {Array.isArray(item.photos) && item.photos.length > 0 && (
        <ReviewPhotoDialog
          open={open}
          onOpenChange={setOpen}
          photos={item.photos}
          initialIndex={viewerIndex}
        />
      )}

      <Dialog open={editOpen} onOpenChange={(v) => (v ? setEditOpen(true) : closeEdit())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>리뷰 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>평점</Label>
              <div
                role="radiogroup"
                aria-label="평점 선택"
                className="flex items-center gap-1"
                onKeyDown={(e) => {
                  const curr = typeof editForm.rating === "number" ? editForm.rating : 0;
                  if (e.key === "ArrowRight") {
                    const next = Math.min(5, curr + 1 || 1);
                    setEditForm((s) => ({ ...s, rating: next }));
                    e.preventDefault();
                  }
                  if (e.key === "ArrowLeft") {
                    const next = Math.max(1, (curr || 1) - 1);
                    setEditForm((s) => ({ ...s, rating: next }));
                    e.preventDefault();
                  }
                }}
              >
                {[1, 2, 3, 4, 5].map((i) => {
                  const current = typeof editForm.rating === "number" ? editForm.rating : 0;
                  const filled = (hoverRating ?? current) >= i;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={current === i}
                      aria-label={`${i}점`}
                      className="p-1"
                      onMouseEnter={() => setHoverRating(i)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setEditForm((s) => ({ ...s, rating: i }))}
                    >
                      <Star
                        className={`h-6 w-6 ${filled ? "text-warning fill-current stroke-current" : "fill-transparent text-muted-foreground stroke-current"}`}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-ui-body-sm text-muted-foreground">
                  {typeof editForm.rating === "number" ? editForm.rating : 0}/5
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">내용</Label>
              <Textarea
                id="content"
                rows={6}
                value={editForm.content}
                onChange={(e) => setEditForm((s) => ({ ...s, content: e.target.value }))}
                placeholder="리뷰 내용을 입력하세요."
              />
              <div className="mt-3">
                <Label>사진 (선택, 최대 5장)</Label>
                <PhotosUploader
                  value={editForm.photos}
                  onChange={(arr) => setEditForm((s) => ({ ...s, photos: arr }))}
                  max={5}
                  previewMode="queue"
                  uploadSessionId={editPhotoSession.uploadSessionId}
                  onUploaded={editPhotoSession.registerUploadedUrls}
                  onRemove={editPhotoSession.removeUploadedUrl}
                  onUploadingChange={setUploadingEditPhotos}
                  disabled={busy || uploadingEditPhotos || !editPhotoSession.uploadSessionId}
                />

                <PhotosReorderGrid
                  value={editForm.photos}
                  onChange={(arr) => setEditForm((s) => ({ ...s, photos: arr }))}
                  disabled={busy || uploadingEditPhotos}
                  onRemove={(url) => {
                    const sessionId = editPhotoSession.uploadSessionId;
                    if (sessionId) void editPhotoSession.removeUploadedUrl(url, sessionId);
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-md border text-ui-body-sm"
              onClick={closeEdit}
              disabled={busy || uploadingEditPhotos}
            >
              취소
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-ui-body-sm"
              onClick={submitEdit}
              disabled={busy || uploadingEditPhotos || editForm.rating === "" || String(editForm.content ?? "").trim().length < 5}
            >
              {uploadingEditPhotos ? "사진 업로드 중…" : "저장"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
