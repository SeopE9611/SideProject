'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, ImageIcon, Package, Wrench, Loader2 } from 'lucide-react';
import ReviewPhotoDialog from '@/app/reviews/_components/ReviewPhotoDialog';
import MaskedBlock from '@/components/reviews/MaskedBlock';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, EyeOff, Trash2, Pencil } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PhotosUploader from '@/components/reviews/PhotosUploader';
import PhotosReorderGrid from '@/components/reviews/PhotosReorderGrid';

/* 날짜 YYYY-MM-DD 포맷 */
function fmt(dateStr?: string) {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

/* 개별 리뷰 카드: 상품/서비스 공용 */
export default function ReviewCard({ item, onMutate, isAdmin = false, isLoggedIn = false }: { item: any; onMutate?: () => any; isAdmin?: boolean; isLoggedIn?: boolean }) {
  const [voted, setVoted] = useState<boolean>(Boolean(item.votedByMe));
  const [count, setCount] = useState<number>(item.helpfulCount ?? 0);
  const [open, setOpen] = useState(false); // 사진 Dialog
  const [busy, setBusy] = useState(false); // 카드 액션 로딩(토글/수정/삭제)

  // 수정
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ rating: number | ''; content: string; photos: string[] }>({
    rating: typeof item.rating === 'number' ? item.rating : '',
    content: item.content ?? '',
    photos: Array.isArray(item.photos) ? item.photos : [],
  });
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const openEdit = () => setEditOpen(true);
  const closeEdit = () => setEditOpen(false);

  // 확대 뷰어
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const openViewer = (idx: number) => {
    setViewerIndex(idx);
    setViewerOpen(true);
  };

  const submitEdit = async () => {
    const { rating, content } = editForm;
    try {
      setBusy(true);
      const res = await fetch(`/api/reviews/${item._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: rating === '' ? undefined : Number(rating),
          content,
          photos: editForm.photos,
        }),
      });
      if (!res.ok) throw new Error('수정 실패');
      showSuccessToast('리뷰를 수정했어요.');
      onMutate?.(); // 리스트 재검증
      closeEdit();
      setBusy(false);
    } catch (e: any) {
      setBusy(false);
      showErrorToast(e?.message || '리뷰 수정에 실패했습니다.');
    }
  };

  // 공개/비공개에 따른 표시 이름
  const displayName = item.status === 'hidden' ? (item.ownedByMe ? `${item.userName ?? '내 리뷰'} (비공개)` : isAdmin ? `${item.userName ?? '사용자'} (비공개)` : '비공개 리뷰') : item.userName ?? '익명';

  // 마스킹 여부(서버가 내려준 masked를 우선 사용, 없으면 폴백)
  const isMasked = item.masked ?? (item.status === 'hidden' && !(item.ownedByMe || isAdmin));

  // 카드 제목(상품/서비스 공용)
  // - 상품: productName
  // - 서비스: serviceTargetName/serviceTitle (없으면 fallback)
  const headerTitle = item.type === 'product' ? item.productName : item.serviceTargetName || item.serviceTitle || (item.service === 'stringing' ? '스트링 교체 서비스' : '서비스');

  // 연타/경합 제어용
  const [pending, setPending] = useState(false); // 처리 중 버튼 잠금
  const reqSeqRef = useRef(0); // 보낸 요청 시퀀스
  const abortRef = useRef<AbortController | null>(null); // 이전 요청 취소용
  const nextIntentRef = useRef<boolean | null>(null); // 마지막 의도(켜둘지/꺼둘지)

  // 낙관적 업데이트 적용 도우미
  const applyOptimistic = (desired: boolean) => {
    setVoted(desired);
    setCount((c) => {
      if (desired && !voted) return c + 1;
      if (!desired && voted) return Math.max(0, c - 1);
      return c; // 이미 그 상태면 변화 없음
    });
  };

  // 실제 요청 전송(멱등 desired 사용)
  const sendIntent = async (desired: boolean) => {
    setPending(true);
    const mySeq = ++reqSeqRef.current;

    // 이전 요청 있으면 취소 -? 뒤늦게 오는 응답이 상태를 덮지 않게
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch(`/api/reviews/${item._id}/helpful?desired=${desired ? 'on' : 'off'}`, {
        method: 'POST',
        credentials: 'include',
        signal: ac.signal,
      });
      const j = await res.json();

      // 오래된 응답이면 무시
      if (mySeq !== reqSeqRef.current) return;

      if (!res.ok) throw new Error(j?.reason || 'error');

      // 서버 "정답"으로 동기화
      setVoted(Boolean(j.voted));
      setCount(j.helpfulCount ?? 0);
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // 취소는 조용히 무시
      // 실패 시: 멱등 의도가 있으니 롤백 대신 화면을 현재 상태로 유지
      // (원하면 여기서 토스트 추가 가능)
    } finally {
      // 최신 요청일 때만 pending 해제
      if (mySeq === reqSeqRef.current) {
        setPending(false);

        // 큐에 "마지막 의도"가 남아 있고, 현재 상태와 다르면 한 번 더 보냄
        const queued = nextIntentRef.current;
        nextIntentRef.current = null;
        if (queued !== null && queued !== voted) {
          // 낙관적 반영 후 재요청
          applyOptimistic(queued);
          void sendIntent(queued);
        }
      }
    }
  };

  // 클릭 핸들러: 마지막 의도 큐잉 + 낙관적 반영
  const onHelpful = () => {
    if (!isLoggedIn) {
      showErrorToast('로그인이 필요합니다. 로그인 후 이용해주세요.');
      return;
    }

    const desired = !voted;
    // 이미 요청 중이면 "마지막 의도"만 갈아치우고 return
    if (pending) {
      nextIntentRef.current = desired;
      return;
    }

    nextIntentRef.current = null; // 새로운 트랜잭션 시작
    applyOptimistic(desired);
    void sendIntent(desired);
  };

  return (
    <Card className="overflow-hidden rounded-3xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group">
      {/* Tennis court line accent */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      <CardContent className="p-6 space-y-4 relative">
        {busy && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-3xl">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">변경 중...</span>
          </div>
        )}

        {/* Header with badges and date */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Badge
              variant={item.type === 'product' ? 'default' : 'secondary'}
              className={`gap-1.5 px-3 py-1 rounded-full font-medium ${item.type === 'product' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}`}
            >
              {item.type === 'product' ? <Package className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
              {item.type === 'product' ? '상품 리뷰' : '서비스 리뷰'}
            </Badge>
            {!!headerTitle && <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-full max-w-[320px] truncate">{headerTitle}</span>}
          </div>

          <div className="flex items-center gap-2">
            {(item.ownedByMe || isAdmin) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100" aria-label="리뷰 관리">
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
                        const next = item.status === 'visible' ? 'hidden' : 'visible';
                        const res = await fetch(`/api/reviews/${item._id}`, {
                          method: 'PATCH',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: next }),
                        });
                        if (!res.ok) throw new Error('상태 변경 실패');
                        showSuccessToast(next === 'hidden' ? '비공개로 전환했습니다.' : '공개로 전환했습니다.');
                        onMutate?.(); // 리스트 재검증
                      } catch (err: any) {
                        showErrorToast(err?.message || '상태 변경 중 오류');
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {item.status === 'visible' ? (
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
                      if (!confirm('이 리뷰를 삭제하시겠습니까?')) return;
                      try {
                        setBusy(true);
                        const res = await fetch(`/api/reviews/${item._id}`, {
                          method: 'DELETE',
                          credentials: 'include',
                        });
                        if (!res.ok) throw new Error('삭제 실패');
                        showSuccessToast('삭제했습니다.');
                        onMutate?.(); // 리스트 재검증
                        setBusy(false);
                      } catch (err: any) {
                        setBusy(false);
                        showErrorToast(err?.message || '삭제 중 오류');
                      }
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-600"
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
        <div className="flex items-center gap-2 text-xs">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">{displayName.charAt(0).toUpperCase()}</span>
          </div>
          <span className="font-medium text-slate-600 dark:text-slate-300">{displayName}</span>
        </div>

        {/* Rating with tennis court styling */}
        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < (item.rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`} />
            ))}
          </div>
          <span className="ml-1 text-sm font-bold text-slate-700 dark:text-slate-200">{item.rating}/5</span>
        </div>

        {/* Content */}
        {isMasked ? (
          <MaskedBlock className="mt-1" />
        ) : (
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.content}</p>
          </div>
        )}

        {/* Photo thumbnails */}
        {Array.isArray(item.photos) && item.photos.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <ImageIcon className="h-4 w-4 text-blue-500" />
              사진 {item.photos.length}장
            </span>

            <div className="flex gap-2">
              {item.photos.slice(0, 4).map((src: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setViewerIndex(idx);
                    setOpen(true);
                  }}
                  className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:scale-105 transition-transform"
                  aria-label={`리뷰 사진 ${idx + 1} 크게 보기`}
                >
                  <Image src={src || '/placeholder.svg'} alt={`photo-${idx}`} fill className="object-cover" />
                  {idx === 3 && item.photos.length > 4 && <div className="absolute inset-0 bg-black/60 text-white text-[10px] font-bold flex items-center justify-center">+{item.photos.length - 3}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Helpful + Date (우측 정렬) */}
        <div className="pt-2 flex items-center gap-2">
          <Button
            size="sm"
            variant={voted ? 'default' : 'outline'}
            onClick={onHelpful}
            disabled={pending}
            className={`rounded-full px-4 py-2 font-medium transition-all ${
              voted ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:shadow-xl' : 'border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20'
            }`}
            aria-pressed={voted}
            aria-label={`도움돼요 ${count ? `(${count})` : ''}`}
          >
            {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
            도움돼요 {count ? `(${count})` : ''}
          </Button>
          
          {/* 날짜 */}
          <time className="ml-auto text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full whitespace-nowrap shrink-0 tabular-nums">{fmt(item.createdAt)}</time>
        </div>
      </CardContent>

      {/* 사진 Dialog */}
      {Array.isArray(item.photos) && item.photos.length > 0 && <ReviewPhotoDialog open={open} onOpenChange={setOpen} photos={item.photos} initialIndex={viewerIndex} />}

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
                  const curr = typeof editForm.rating === 'number' ? editForm.rating : 0;
                  if (e.key === 'ArrowRight') {
                    const next = Math.min(5, curr + 1 || 1);
                    setEditForm((s) => ({ ...s, rating: next }));
                    e.preventDefault();
                  }
                  if (e.key === 'ArrowLeft') {
                    const next = Math.max(1, (curr || 1) - 1);
                    setEditForm((s) => ({ ...s, rating: next }));
                    e.preventDefault();
                  }
                }}
              >
                {[1, 2, 3, 4, 5].map((i) => {
                  const current = typeof editForm.rating === 'number' ? editForm.rating : 0;
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
                      <Star className={`h-6 w-6 ${filled ? 'fill-yellow-500 stroke-yellow-500' : 'stroke-muted-foreground'}`} />
                    </button>
                  );
                })}
                <span className="ml-2 text-sm text-muted-foreground">{typeof editForm.rating === 'number' ? editForm.rating : 0}/5</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">내용</Label>
              <Textarea id="content" rows={6} value={editForm.content} onChange={(e) => setEditForm((s) => ({ ...s, content: e.target.value }))} placeholder="리뷰 내용을 입력하세요." />
              <div className="mt-3">
                <Label>사진 (선택, 최대 5장)</Label>
                <PhotosUploader value={editForm.photos} onChange={(arr) => setEditForm((s) => ({ ...s, photos: arr }))} max={5} />
                <PhotosReorderGrid value={editForm.photos} onChange={(arr) => setEditForm((s) => ({ ...s, photos: arr }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button type="button" className="px-4 py-2 rounded-md border text-sm" onClick={closeEdit}>
              취소
            </button>
            <button type="button" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm" onClick={submitEdit}>
              저장
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
