'use client';

/**
 * 마이페이지 > 내 리뷰 관리 탭
 * - API: GET /api/reviews/mine (커서 페이지네이션)
 * - API: PATCH /api/reviews/[id]  (content/rating/status 수정)
 * - API: DELETE /api/reviews/[id]  (소프트 삭제)
 *
 * 설계 포인트
 * 1) 최초 로딩은 SWR Infinite로 내 리뷰를 불러와 표시합니다.
 * 2) 수정 다이얼로그에서 내용/별점 저장 → PATCH 후 mutate로 목록 새로고침.
 * 3) 공개/비공개 토글 → PATCH status ('visible' | 'hidden').
 * 4) 삭제 → DELETE 후 mutate.
 * 5) 기존 컴포넌트가 props.reviews를 받던 구조를 유지하되, SWR 데이터가 없으면
 *    props.reviews로 초기 표시할 수 있게 "옵션"으로 둡니다.
 */

import { useCallback, useMemo, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Textarea 컴포넌트가 없다면, 아래 import 대신 <textarea> 사용해도 됩니다.
import { Textarea } from '@/components/ui/textarea';

import { Star, Calendar, Edit3, Trash2, ArrowRight, Award, Eye, EyeOff, Loader2, Package, Wrench } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

// ===== 타입 정의 =====
type MineItem = {
  _id: string;
  type: 'product' | 'service';
  productName?: string;
  rating: number;
  content: string;
  status: 'visible' | 'hidden';
  createdAt: string;
  updatedAt?: string;
};

type SSRReview = {
  id: number;
  productName: string;
  rating: number;
  date: string; // yyyy-mm-dd
  content: string;
};

interface ReviewListProps {
  // SSR 등으로 부모에서 넣을 수도 있는 초기 표시용(선택)
  reviews?: SSRReview[];
}

// ===== 공용 유틸 =====
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('리뷰 목록을 불러오지 못했습니다.');
    return r.json();
  });

// 별점 렌더링
const Stars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
    ))}
  </div>
);

// ===== 메인 컴포넌트 =====
export default function ReviewList({ reviews = [] }: ReviewListProps) {
  // 1) 내 리뷰 목록 불러오기 (커서 방식)
  const getKey = useCallback((pageIdx: number, prev: any) => {
    if (prev && !prev.nextCursor) return null; // 더 없음
    const cursor = pageIdx ? `&cursor=${encodeURIComponent(prev.nextCursor)}` : '';
    return `/api/reviews/mine?limit=10${cursor}`;
  }, []);

  const { data, size, setSize, isValidating, mutate, error } = useSWRInfinite(getKey, fetcher);
  const swrItems: MineItem[] = useMemo(() => (data?.flatMap((d: any) => d.items) ?? []) as MineItem[], [data]);
  const hasMore = Boolean(data?.[data.length - 1]?.nextCursor);

  // 2) 수정 다이얼로그 상태
  const [editing, setEditing] = useState<MineItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState<number>(5);
  const [saving, setSaving] = useState(false);

  const openEdit = useCallback((it: MineItem) => {
    setEditing(it);
    setEditContent(it.content);
    setEditRating(it.rating);
  }, []);
  const closeEdit = useCallback(() => {
    setEditing(null);
    setEditContent('');
    setEditRating(5);
  }, []);

  // 3) 수정 저장(PATCH)
  const submitEdit = useCallback(async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/reviews/${editing._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent, rating: editRating }),
      });
      if (!res.ok) throw new Error('리뷰를 수정하지 못했습니다.');
      showSuccessToast('리뷰가 수정되었습니다.');
      closeEdit();
      await mutate(); // 최신 목록으로 갱신
    } catch (e: any) {
      showErrorToast(e.message || '수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [editing, editContent, editRating, mutate, closeEdit]);

  // 4) 공개/비공개 토글(PATCH status)
  const toggleVisibility = useCallback(
    async (it: MineItem) => {
      const next = it.status === 'visible' ? 'hidden' : 'visible';
      try {
        const res = await fetch(`/api/reviews/${it._id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error('상태 변경에 실패했습니다.');
        showSuccessToast(next === 'visible' ? '리뷰가 공개되었습니다.' : '리뷰가 비공개로 전환되었습니다.');
        await mutate();
      } catch (e: any) {
        showErrorToast(e.message || '상태 변경 중 오류가 발생했습니다.');
      }
    },
    [mutate]
  );

  // 5) 삭제(DELETE)
  const removeReview = useCallback(
    async (it: MineItem) => {
      if (!confirm('정말 삭제하시겠어요? 삭제 후에는 복구할 수 없습니다.')) return;
      try {
        const res = await fetch(`/api/reviews/${it._id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) throw new Error('리뷰 삭제에 실패했습니다.');
        showSuccessToast('리뷰가 삭제되었습니다.');
        await mutate();
      } catch (e: any) {
        showErrorToast(e.message || '삭제 중 오류가 발생했습니다.');
      }
    },
    [mutate]
  );

  // 6) 렌더 데이터: SWR 성공 시 swrItems, 아니면 props.reviews(초기 표시)
  const itemsToRender: MineItem[] = useMemo(() => {
    if (swrItems.length) return swrItems;
    // props.reviews를 MineItem 형태로 변환(초기 표시용)
    if (reviews.length) {
      return reviews.map((r) => ({
        _id: String(r.id),
        type: 'product',
        productName: r.productName,
        rating: r.rating,
        content: r.content,
        status: 'visible',
        createdAt: r.date,
      }));
    }
    return [];
  }, [swrItems, reviews]);

  // 7) 빈 상태
  if (!itemsToRender.length && !isValidating && !error) {
    return (
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900">
            <Star className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">작성한 리뷰가 없습니다</h3>
          <p className="mb-6 text-slate-600 dark:text-slate-400">구매하신 상품이나 서비스에 대한 후기를 남겨주세요!</p>
          <Button asChild className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
            <Link href="/reviews/write" className="inline-flex items-center gap-2">
              리뷰 작성하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 8) 목록 렌더
  return (
    <div className="space-y-6">
      {itemsToRender.map((it) => (
        <Card key={it._id} className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          {/* hover 그라디언트 보더 */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
            <div className="h-full w-full bg-white dark:bg-slate-900 rounded-lg" />
          </div>

          <CardContent className="relative p-6 space-y-3">
            {/* 헤더 영역 */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900">
                  <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{it.productName ?? (it.type === 'service' ? '서비스 리뷰' : '상품 리뷰')}</h3>
                  <div className="flex items-center gap-2">
                    <Stars rating={it.rating} />
                    <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{it.rating}.0</span>
                    {it.status === 'hidden' && (
                      <Badge variant="secondary" className="ml-2">
                        비공개
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleVisibility(it)}>
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
                <Button size="sm" variant="destructive" onClick={() => removeReview(it)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  삭제
                </Button>
              </div>
            </div>

            {/* 본문 */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">{it.content}</p>
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
      ))}

      {/* 더 보기 */}
      <div className="flex justify-center pt-2">
        {hasMore ? (
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
              <Select value={String(editRating)} onValueChange={(v) => setEditRating(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="별점" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">★★★★★ (5)</SelectItem>
                  <SelectItem value="4">★★★★☆ (4)</SelectItem>
                  <SelectItem value="3">★★★☆☆ (3)</SelectItem>
                  <SelectItem value="2">★★☆☆☆ (2)</SelectItem>
                  <SelectItem value="1">★☆☆☆☆ (1)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm block mb-1">내용</label>
              {/* shadcn Textarea가 없다면 <textarea rows={6} className="w-full border rounded-md p-2" ... />로 대체 */}
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} />
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
