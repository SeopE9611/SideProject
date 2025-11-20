'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import Image from 'next/image';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { Star, Calendar, Edit3, Trash2, Eye, EyeOff, Loader2, Package, Award } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import PhotosUploader from '@/components/reviews/PhotosUploader';
import PhotosReorderGrid from '@/components/reviews/PhotosReorderGrid';

/*  API 타입 */
type ApiMineItem = {
  _id: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  status: 'visible' | 'hidden';
  photos?: string[];
  productId?: string;
  service?: string;
  serviceApplicationId?: string;
  target: {
    type: 'product' | 'service';
    name: string;
    image?: string | null;
  };
};

type ApiMineResponse = {
  items: ApiMineItem[];
  nextCursor?: string | null;
};

/* UI 타입*/
type UiItem = {
  _id: string;
  type: 'product' | 'service';
  title: string;
  rating: number;
  content: string;
  status: 'visible' | 'hidden';
  createdAt: string;
  updatedAt?: string;
  cover?: string | null;
  photos: string[];
};

type SSRReview = {
  id: number;
  productName: string;
  rating: number;
  date: string;
  content: string;
};

interface ReviewListProps {
  // SSR 등으로 부모에서 넣을 수도 있는 초기 표시용
  reviews?: SSRReview[];
}

/* 공통 */
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('리뷰 목록을 불러오지 못했습니다.');
    return r.json();
  });

// 별점 렌더링
const Stars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" />
    ))}
  </div>
);

// 별점 입력 (수정 모달 용)
const StarsInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n}점`} onClick={() => onChange(n)} className={`text-xl leading-none transition-transform hover:scale-[1.06] ${value >= n ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>
          ★
        </button>
      ))}
    </div>
  );
};

// 메인 컴포넌트
export default function ReviewList({ reviews = [] }: ReviewListProps) {
  // 내 리뷰 목록 불러오기 (커서 기반 SWR)
  const getKey = useCallback((pageIdx: number, prev: ApiMineResponse | null) => {
    if (prev && !prev.nextCursor) return null; // 마지막 페이지 (떠 없음)
    const cursor = pageIdx && prev?.nextCursor ? `&cursor=${encodeURIComponent(prev.nextCursor)}` : '';
    return `/api/reviews/mine?limit=10${cursor}`;
  }, []);

  const { data, size, setSize, isValidating, mutate, error } = useSWRInfinite<ApiMineResponse>(getKey, fetcher);

  // API -> UI 매핑
  const apiItems: ApiMineItem[] = useMemo(() => (data ? data.flatMap((p) => p.items) : []), [data]);

  const swrItems: UiItem[] = useMemo(
    () =>
      apiItems.map((a) => ({
        _id: a._id,
        type: a.target?.type ?? (a.productId ? 'product' : 'service'),
        title: a.target?.name ?? (a.productId ? '상품 리뷰' : '서비스 리뷰'),
        rating: a.rating,
        content: a.content ?? '',
        status: a.status,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        cover: a.target?.image ?? null,
        photos: Array.isArray(a.photos) ? a.photos : [],
      })),
    [apiItems]
  );

  const lastPage = data && data.length ? data[data.length - 1] : undefined;
  const hasMore = Boolean(lastPage?.nextCursor);

  // 수정 다이얼로그 상태
  const [editing, setEditing] = useState<UiItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [originalEdit, setOriginalEdit] = useState<{ content: string; rating: number; photos: string[] } | null>(null);

  const openEdit = useCallback((it: UiItem) => {
    setEditing(it);
    setEditContent(it.content);
    setEditRating(it.rating);
    setEditPhotos(it.photos || []);
    setOriginalEdit({ content: it.content, rating: it.rating, photos: it.photos || [] }); // ★ 추가
  }, []);

  const closeEdit = useCallback(() => {
    setEditing(null);
    setEditContent('');
    setEditRating(5);
    setEditPhotos([]);
    setOriginalEdit(null);
  }, []);

  // 수정 저장
  const submitEdit = useCallback(async () => {
    if (!editing) return;
    // 스냅샷(롤백용)
    const snapshot = data;
    setSaving(true);
    // 변경된 필드만 payload에 담기
    const payload: Record<string, any> = {};
    const changedContent = !originalEdit || editContent !== originalEdit.content;
    const changedRating = !originalEdit || editRating !== originalEdit.rating;
    const changedPhotos = !originalEdit || JSON.stringify(editPhotos) !== JSON.stringify(originalEdit.photos);

    // 프론트 5자 검증: content가 "변경된 경우에만" 체크
    if (changedContent) {
      const trimmed = (editContent || '').trim();
      if (trimmed.length < 5) {
        showErrorToast('내용은 5자 이상 입력해주세요.');
        setSaving(false);
        return;
      }
      payload.content = trimmed;
    }
    if (changedRating) payload.rating = editRating;
    if (changedPhotos) payload.photos = editPhotos;

    // 변경사항이 없으면 종료
    if (Object.keys(payload).length === 0) {
      showSuccessToast('변경 사항이 없습니다.');
      setSaving(false);
      closeEdit();
      return;
    }

    // 낙관적 업데이트: 변경된 필드만 반영
    await mutate((pages?: ApiMineResponse[]) => {
      if (!pages) return pages;
      return pages.map(
        (p): ApiMineResponse => ({
          ...p,
          items: p.items.map(
            (a): ApiMineItem =>
              a._id !== editing._id
                ? a
                : {
                    ...a,
                    ...(payload.content !== undefined ? { content: payload.content } : {}),
                    ...(payload.rating !== undefined ? { rating: payload.rating } : {}),
                    ...(payload.photos !== undefined ? { photos: payload.photos } : {}),
                  }
          ),
        })
      );
    }, false);

    try {
      const res = await fetch(`/api/reviews/${editing._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // 서버 메시지 반영
      let resJson: any = null;
      try {
        resJson = await res.json();
      } catch {}
      if (!res.ok) throw new Error(resJson?.message || '리뷰 수정 실패');

      showSuccessToast('리뷰가 수정되었습니다.');
      await mutate();
      closeEdit();
    } catch (e: any) {
      await mutate(() => snapshot, false);
      showErrorToast(e.message || '수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [data, editing, editContent, editRating, editPhotos, originalEdit, mutate, closeEdit]);

  // 공개/비공개 토글
  const [busyId, setBusyId] = useState<string | null>(null);
  const toggleVisibility = useCallback(
    async (it: UiItem) => {
      const nextStatus: 'visible' | 'hidden' = it.status === 'visible' ? 'hidden' : 'visible';
      const snapshot = data;

      await mutate((pages?: ApiMineResponse[]) => {
        if (!pages) return pages;
        return pages.map((p) => ({
          ...p,
          items: p.items.map((a) => (a._id === it._id ? ({ ...a, status: nextStatus } as ApiMineItem) : a)),
        }));
      }, false);

      try {
        const res = await fetch(`/api/reviews/${it._id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!res.ok) throw new Error('상태 변경에 실패했습니다.');
        showSuccessToast(nextStatus === 'visible' ? '리뷰가 공개되었습니다.' : '리뷰가 비공개로 전환되었습니다.');
        await mutate();
      } catch (e: any) {
        await mutate(() => snapshot, false);
        showErrorToast(e.message || '상태 변경 중 오류가 발생했습니다.');
      }
    },
    [data, mutate]
  );
  // 삭제
  const removeReview = useCallback(
    async (it: UiItem) => {
      if (!confirm('정말 삭제하시겠어요? 삭제 후에는 복구할 수 없습니다.')) return;

      const snapshot = data;

      await mutate((pages?: ApiMineResponse[]) => {
        if (!pages) return pages;
        return pages.map((p) => ({
          ...p,
          items: p.items.filter((a) => a._id !== it._id),
        }));
      }, false);

      try {
        const res = await fetch(`/api/reviews/${it._id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) throw new Error('삭제 실패');
        showSuccessToast('리뷰가 삭제되었습니다.');
      } catch (e: any) {
        await mutate(() => snapshot, false);
        showErrorToast(e.message || '삭제 중 오류가 발생했습니다.');
      }
    },
    [data, mutate]
  );

  // 필터
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');

  const itemsToRender: UiItem[] = useMemo(() => {
    const base: UiItem[] = swrItems.length
      ? swrItems
      : reviews.map((r) => ({
          _id: String(r.id),
          type: 'product' as const,
          title: r.productName,
          rating: r.rating,
          content: r.content,
          status: 'visible',
          createdAt: r.date,
          cover: null,
          photos: [],
        }));

    return base.filter((it) => (statusFilter === 'all' ? true : it.status === statusFilter)).filter((it) => (typeFilter === 'all' ? true : it.type === typeFilter));
  }, [swrItems, reviews, statusFilter, typeFilter]);

  // 에러 카드
  if (error) {
    return (
      <Card className="border-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950">
        <CardContent className="p-8 text-center">오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</CardContent>
      </Card>
    );
  }

  // 첫 로딩
  if (!data && isValidating) {
    return <div className="text-center py-8 text-muted-foreground">리뷰 내역을 불러오는 중입니다...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 필터 */}
      <div className="flex justify-end gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="visible">공개</SelectItem>
            <SelectItem value="hidden">비공개</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="product">상품</SelectItem>
            <SelectItem value="service">서비스</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="secondary"
          onClick={() => {
            setStatusFilter('all');
            setTypeFilter('all');
          }}
        >
          필터 초기화
        </Button>
      </div>

      {/* 목록 */}
      {itemsToRender.length ? (
        itemsToRender.map((it) => (
          <Card key={it._id} className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
              <div className="h-full w-full bg-white dark:bg-slate-900 rounded-lg" />
            </div>

            <CardContent className="relative p-6 space-y-4">
              {/* 헤더 영역 */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-yellow-50 ring-1 ring-black/5">
                    {it.cover ? (
                      <Image src={it.cover} alt={it.title} fill sizes="48px" className="object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center">
                        <Award className="h-6 w-6 text-yellow-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{it.title}</h3>
                    <div className="flex items-center gap-2">
                      <Stars rating={it.rating} />
                      <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{Number(it.rating).toFixed(1)}</span>
                      {it.status === 'hidden' && (
                        <Badge variant="secondary" className="ml-2">
                          비공개
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setBusyId(it._id);
                      await toggleVisibility(it).finally(() => setBusyId(null));
                    }}
                    disabled={busyId === it._id}
                  >
                    {it.status === 'visible' ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5 mr-1" /> 비공개
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 mr-1" /> 공개
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    수정
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      setBusyId(it._id);
                      await removeReview(it).finally(() => setBusyId(null));
                    }}
                    disabled={busyId === it._id}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    삭제
                  </Button>
                </div>
              </div>

              {/* 본문 */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">{it.content}</p>

                {/* 첨부 이미지 프리뷰 */}
                {it.photos?.length ? (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {it.photos.slice(0, 8).map((src, idx) => (
                      <div key={idx} className="relative aspect-square rounded-md overflow-hidden ring-1 ring-black/5">
                        <Image src={src} alt={`리뷰 이미지 ${idx + 1}`} fill sizes="120px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* 푸터 */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <span>{(it.createdAt || '').slice(0, 10)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Package className="h-3.5 w-3.5" />
                  <span>{it.type === 'product' ? '상품 리뷰' : '서비스 리뷰'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900">
              <Star className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">작성한 리뷰가 없습니다</h3>
            <p className="mb-6 text-slate-600 dark:text-slate-400">구매하신 상품이나 서비스에 대한 후기를 남겨주세요!</p>
          </CardContent>
        </Card>
      )}

      {/* 더 보기 */}
      <div className="flex justify-center pt-2">
        {itemsToRender.length && hasMore ? (
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> 불러오는 중…
              </>
            ) : (
              '더 보기'
            )}
          </Button>
        ) : itemsToRender.length ? (
          <span className="text-sm text-slate-500">마지막 페이지입니다</span>
        ) : null}
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>리뷰 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm block mb-1">별점</label>
              <StarsInput value={editRating} onChange={setEditRating} />
            </div>

            <div>
              <label className="text-sm block mb-1">내용</label>
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} />
            </div>

            <div>
              <div className="text-sm mb-2">사진 (선택, 최대 5장)</div>
              <PhotosUploader key={editing?._id ?? 'new'} value={editPhotos} onChange={setEditPhotos} max={5} />
              <PhotosReorderGrid value={editPhotos} onChange={setEditPhotos} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeEdit}>
              취소
            </Button>
            <Button onClick={submitEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> 저장 중…
                </>
              ) : (
                '저장'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
