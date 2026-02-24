'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { communityFetch } from '@/lib/community/communityFetch.client';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { supabase } from '@/lib/supabase';
import { showErrorToast } from '@/lib/toast';
import { ArrowLeft, ChevronLeft, ChevronRight, MessageSquare, Search, Upload, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';

const CATEGORY_LABELS: Record<string, string> = {
  product: '상품문의',
  order: '주문/결제',
  delivery: '배송',
  refund: '환불/교환',
  service: '서비스',
  academy: '아카데미',
  member: '회원',
};

// 게시글 작성 제출 직전 최종 유효성 가드
const TITLE_MIN = 4;
const TITLE_MAX = 80;
const CONTENT_MIN = 10;
const CONTENT_MAX = 5000;
const hasHtmlLike = (s: string) => /<[^>]+>/.test(s); // 최소 수준 태그 감지
const hasScriptLike = (s: string) => /<\s*script/i.test(s) || /javascript\s*:/i.test(s);

type FieldKey = 'category' | 'product' | 'title' | 'content' | 'images';
type FieldErrors = Partial<Record<FieldKey, string>>;
const scrollIntoViewOpts: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' };

export default function QnaWritePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef(false); // setSubmitting 타이밍 레이스 대비(연타/더블클릭 방지)
  const categoryWrapRef = useRef<HTMLDivElement>(null);
  const productWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const imagesWrapRef = useRef<HTMLDivElement>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const router = useRouter();
  const sp = useSearchParams();
  const [product, setProduct] = useState<{ id: string; name: string; image?: string | null } | null>(null);
  const preProductId = sp.get('productId');
  const preProductName = sp.get('productName') ?? '';
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [previews, setPreviews] = useState<(string | null)[]>([]);
  useEffect(() => {
    const urls = selectedFiles.map((f) => (f.type?.startsWith('image/') ? URL.createObjectURL(f) : null));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [selectedFiles]);

  const [isPrivate, setIsPrivate] = useState(false);
  const [category, setCategory] = useState(preProductId ? 'product' : '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 이탈 경고(입력값이 하나라도 있으면 dirty)
  const isDirty = useMemo(() => {
    const initCategory = preProductId ? 'product' : '';
    return category !== initCategory || !!product?.id || title.trim().length > 0 || content.trim().length > 0 || selectedFiles.length > 0 || isPrivate;
  }, [preProductId, category, product?.id, title, content, selectedFiles.length, isPrivate]);

  useUnsavedChangesGuard(isDirty && !submitting);

  const confirmGoIfDirty = (go: () => void) => {
    if (!isDirty || submitting) return go();
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (!ok) return;
    go();
  };

  const guardLinkLeave = (e: any) => {
    if (!isDirty || submitting) return;
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (ok) return;
    e?.preventDefault?.();
    e?.stopPropagation?.();
  };

  // 라이트박스(Dialog) 상태
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 썸네일 index에서 Dialog 열기 (이미지 파일만 모아서)
  const openViewerFromIndex = (uiIndex: number) => {
    const only = previews.map((url, i) => ({ url, i })).filter((v) => !!v.url) as { url: string; i: number }[];
    if (only.length === 0) return;

    const start = only.findIndex((v) => v.i === uiIndex);
    setViewerImages(only.map((v) => v.url));
    setViewerIndex(Math.max(0, start));
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);
  const nextViewer = () => setViewerIndex((i) => (i + 1) % viewerImages.length);
  const prevViewer = () => setViewerIndex((i) => (i - 1 + viewerImages.length) % viewerImages.length);

  // SWR fetcher
  type OrdersListRes = { items?: any[]; orders?: any[]; total?: number };
  type ProductsListRes = { products?: any[]; items?: any[]; total?: number; page?: number; limit?: number };
  type MeRes = { role?: string };

  async function fetcherAllow401<T>(url: string): Promise<T | null> {
    const res = await communityFetch(url, { credentials: 'include' });
    const data = (await res.json().catch(() => null)) as any;

    // 비로그인(401)은 '에러'가 아니라 '로그인 안 됨' 상태로 취급
    if (res.status === 401) return null;

    if (!res.ok) {
      const message = typeof data === 'object' && data !== null && typeof (data as { error: string }).error === 'string' ? (data as { error: string }).error : `${res.status} ${res.statusText}`;
      throw new Error(message);
    }

    return data as T;
  }

  async function fetcher<T>(url: string): Promise<T> {
    const res = await communityFetch(url, { credentials: 'include' });
    const data = (await res.json().catch(() => null)) as any;

    if (!res.ok) {
      const message = typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : `${res.status} ${res.statusText}`;
      throw new Error(message);
    }

    return data as T;
  }

  // 로그인 여부 확인 (비로그인 401은 정상 흐름으로 처리)
  const { data: me } = useSWR<MeRes | null>('/api/users/me', fetcherAllow401, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  const ordersKey = me ? '/api/orders?limit=100' : null;

  // “내 구매상품” 목록 (로그인일 때만 호출)
  const { data: myOrders, error: ordersError } = useSWR<OrdersListRes>(ordersKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  // 주문 내 모든 상품을 평탄화 후 productId 기준으로 중복 제거
  const myProducts: { id: string; name: string; image?: string | null }[] = useMemo(() => {
    const set = new Map<string, { id: string; name: string; image?: string | null }>();
    const orders = myOrders?.items ?? myOrders?.orders ?? [];
    for (const o of orders) {
      const lines = o.items ?? o.orderItems ?? [];
      for (const it of lines) {
        const pid = String(it.productId ?? it.product?._id ?? it._id ?? '');
        if (!pid) continue;
        const name = it.product?.name ?? it.name ?? it.title ?? '상품';
        const image = it.product?.image ?? it.image ?? null;
        if (!set.has(pid)) set.set(pid, { id: pid, name, image });
      }
    }
    return Array.from(set.values());
  }, [myOrders]);

  // 전체 상품 검색
  const [q, setQ] = useState('');
  const { data: searchData } = useSWR<ProductsListRes>(q.trim() ? `/api/products?q=${encodeURIComponent(q.trim())}&limit=20` : null, fetcher);
  const searchProducts: { id: string; name: string; image?: string | null }[] = useMemo(() => {
    const rows = searchData?.products ?? searchData?.items ?? [];
    return rows.map((p: any) => ({
      id: String(p._id ?? p.id),
      name: p.name ?? p.title ?? '상품',
      image: p.image ?? p.thumbnail ?? null,
    }));
  }, [searchData]);

  const clearErrors = (keys?: FieldKey | FieldKey[]) => {
    if (!keys) {
      setFormError(null);
      setFieldErrors({});
      return;
    }
    const ks = Array.isArray(keys) ? keys : [keys];
    setFieldErrors((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const k of ks) {
        if (k in next) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setFormError(null);
  };

  const focusFirstError = (errs: FieldErrors) => {
    if (errs.category) {
      categoryWrapRef.current?.scrollIntoView(scrollIntoViewOpts);
      const el = document.getElementById('category') as HTMLElement | null;
      el?.focus?.();
      return;
    }
    if (errs.product) {
      productWrapRef.current?.scrollIntoView(scrollIntoViewOpts);
      return;
    }
    if (errs.title) {
      titleRef.current?.scrollIntoView(scrollIntoViewOpts);
      titleRef.current?.focus();
      return;
    }
    if (errs.content) {
      contentRef.current?.scrollIntoView(scrollIntoViewOpts);
      contentRef.current?.focus();
      return;
    }
    if (errs.images) {
      imagesWrapRef.current?.scrollIntoView(scrollIntoViewOpts);
    }
  };

  const validateBeforeSubmit = (): FieldErrors => {
    const errs: FieldErrors = {};
    const t = title.trim();
    const c = content.trim();

    // 카테고리 유효성(화이트리스트)
    if (!category || !CATEGORY_LABELS[category]) {
      errs.category = '카테고리를 선택해주세요.';
      return errs;
    }

    // 상품문의인 경우: 상품 선택 필수(프리필 제외)
    if (category === 'product' && !preProductId && !product?.id) {
      errs.product = '상품을 선택해주세요.';
    }

    // 제목/내용
    if (!t) errs.title = '제목을 입력해주세요.';
    if (!c) errs.content = '내용을 입력해주세요.';

    if (t && t.length < TITLE_MIN) errs.title = `제목은 ${TITLE_MIN}자 이상 입력해주세요.`;
    if (t && t.length > TITLE_MAX) errs.title = `제목은 ${TITLE_MAX}자 이내로 입력해주세요.`;
    if (c && c.length < CONTENT_MIN) errs.content = `내용은 ${CONTENT_MIN}자 이상 입력해주세요.`;
    if (c && c.length > CONTENT_MAX) errs.content = `내용은 ${CONTENT_MAX}자 이내로 입력해주세요.`;

    // HTML/스크립트 차단
    if (t && (hasScriptLike(t) || hasHtmlLike(t))) {
      errs.title = hasScriptLike(t) ? '스크립트로 의심되는 입력이 포함되어 저장할 수 없습니다.' : 'HTML 태그는 사용할 수 없습니다.';
    }
    if (c && (hasScriptLike(c) || hasHtmlLike(c))) {
      errs.content = hasScriptLike(c) ? '스크립트로 의심되는 입력이 포함되어 저장할 수 없습니다.' : 'HTML 태그는 사용할 수 없습니다.';
    }

    // (방어) 이미지 첨부 재검증
    const MAX = 3;
    if (selectedFiles.length > MAX) errs.images = `최대 ${MAX}개까지만 업로드할 수 있어요.`;
    if (selectedFiles.some((f) => f.size > 5 * 1024 * 1024)) errs.images = '파일당 최대 5MB까지 업로드할 수 있어요.';
    if (selectedFiles.some((f) => !f.type.startsWith('image/'))) errs.images = '이미지 파일만 업로드할 수 있어요.';

    return errs;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX = 3;
    const MAX_BYTES = 5 * 1024 * 1024;

    e.currentTarget.value = ''; // 같은 파일 재선택 허용(검증 실패 시에도)
    clearErrors('images');

    // 개수 제한
    if (files.length + selectedFiles.length > MAX) {
      setFieldErrors((prev) => ({ ...prev, images: `최대 ${MAX}개까지만 업로드할 수 있어요.` }));
      setFormError('첨부 이미지를 확인해 주세요.');
      requestAnimationFrame(() => imagesWrapRef.current?.scrollIntoView(scrollIntoViewOpts));
      return;
    }

    // 용량 제한
    if (files.some((f) => f.size > MAX_BYTES)) {
      setFieldErrors((prev) => ({ ...prev, images: '파일당 최대 5MB까지 업로드할 수 있어요.' }));
      setFormError('첨부 이미지를 확인해 주세요.');
      requestAnimationFrame(() => imagesWrapRef.current?.scrollIntoView(scrollIntoViewOpts));
      return;
    }

    // 타입 화이트리스트: 이미지만 허용
    if (files.some((f) => !f.type.startsWith('image/'))) {
      setFieldErrors((prev) => ({ ...prev, images: '이미지 파일만 업로드할 수 있어요.' }));
      setFormError('첨부 이미지를 확인해 주세요.');
      requestAnimationFrame(() => imagesWrapRef.current?.scrollIntoView(scrollIntoViewOpts));
      return;
    }

    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    const next = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(next);
    if (next.length <= 3) clearErrors('images');
  };

  async function handleSubmit() {
    // 중복 제출 방지
    if (submitting || submitRef.current) return;
    try {
      // 제출 직전 최종 유효성 체크(우회 방지)
      clearErrors();

      const errs = validateBeforeSubmit();
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        setFormError('입력값을 확인해 주세요.');
        focusFirstError(errs);
        return;
      }

      // 여기까지 통과한 뒤에만 submitting ON (UI 잠금)
      submitRef.current = true;
      setSubmitting(true);

      // 카테고리 값을 라벨로 정규화
      const mappedCategory = CATEGORY_LABELS[category] ?? category;
      const t = title.trim();
      const c = content.trim();

      // 첨부 업로드(Supabase)
      const BUCKET = 'tennis-images';
      const FOLDER = 'boards/qna';
      const uploadOne = async (file: File) => {
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        return {
          url: data.publicUrl,
          name: file.name,
          size: file.size,
        };
      };
      const attachments = selectedFiles.length > 0 ? await Promise.all(selectedFiles.map(uploadOne)) : [];

      //  조건부 스프레드로 '한 번에' payload 구성 + attachments 포함
      const payload = {
        type: 'qna',
        title: t,
        content: c,
        category: mappedCategory,
        isSecret: !!isPrivate,
        attachments,
        ...(preProductId ? { productRef: { productId: preProductId, name: preProductName, image: null } } : category === 'product' && product?.id ? { productRef: { productId: product.id, name: product.name, image: product.image ?? null } } : {}),
      } as const;

      const res = await communityFetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || '저장 실패(로그인/권한을 확인해주세요)');
      }
      router.replace('/board/qna');
    } catch (e: any) {
      setFormError(e?.message || '저장 중 오류가 발생했습니다.');
      showErrorToast(e?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
      submitRef.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild className="p-2">
              <Link href="/board/qna" onClick={guardLinkLeave}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30 shadow-lg">
                <MessageSquare className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">문의하기</h1>
                <p className="text-lg text-muted-foreground">궁금한 점을 자세히 작성해주세요</p>
              </div>
            </div>
          </div>

          <Card className="border-0 bg-card/80 shadow-xl backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-success" />
                <span>새 문의 작성</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div ref={categoryWrapRef} className="space-y-3">
                <Label htmlFor="category" className="text-base font-semibold">
                  카테고리 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    setCategory(v);
                    clearErrors(['category', 'product']);
                  }}
                >
                  <SelectTrigger id="category" className={`h-12 bg-card dark:bg-muted ${fieldErrors.category ? 'border-destructive focus:ring-ring' : ''}`}>
                    <SelectValue placeholder="문의 카테고리를 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">상품</SelectItem>
                    <SelectItem value="order">주문/결제</SelectItem>
                    <SelectItem value="delivery">배송</SelectItem>
                    <SelectItem value="refund">환불/교환</SelectItem>
                    <SelectItem value="service">서비스</SelectItem>
                    <SelectItem value="academy">아카데미</SelectItem>
                    <SelectItem value="member">회원</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.category && <p className="text-sm text-destructive">{fieldErrors.category}</p>}

                {/* 상품 상세에서 진입한 프리필이 있으면 안내 뱃지 */}
                {preProductId && (
                  <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Badge variant="secondary">프리필</Badge>
                    <span>
                      선택된 상품: <strong>{preProductName || preProductId}</strong>
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => confirmGoIfDirty(() => router.replace('/board/qna/write'))}>
                      제거
                    </Button>
                  </div>
                )}
              </div>

              {category === 'product' && !preProductId && (
                <div ref={productWrapRef} className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">상품 선택</span> — 본인이 구매했던 상품 또는 전체 상품에서 선택하세요.
                  </div>
                  {fieldErrors.product && <p className="text-sm text-destructive">{fieldErrors.product}</p>}

                  {/* 탭처럼 보이는 간단한 토글 */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* 내 구매상품 */}
                    <div className="rounded-lg border border-border p-4">
                      <div className="font-semibold mb-3">내 구매상품</div>
                      {!me && <div className="mb-2 text-xs text-muted-foreground">로그인하면 "내 구매상품" 목록을 불러와 빠르게 선택할 수 있어요.</div>}
                      {me && ordersError && <div className="mb-2 text-sm text-destructive">구매 상품 목록을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.</div>}
                      <div className="space-y-2 max-h-60 overflow-auto">
                        {me && myProducts.length === 0 && <div className="text-sm text-muted-foreground">구매 이력이 없습니다.</div>}
                        {myProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setProduct(p);
                              clearErrors('product');
                            }}
                            className={`w-full text-left px-3 py-2 rounded hover:bg-muted dark:hover:bg-card ${product?.id === p.id ? 'ring-2 ring-ring' : ''}`}
                          >
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.id}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 전체 상품 검색 */}
                    <div className="rounded-lg border border-border p-4">
                      <div className="font-semibold mb-3">전체 상품 검색</div>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="상품명으로 검색" className="pl-9 bg-card dark:bg-muted" />
                      </div>
                      <div className="space-y-2 max-h-60 overflow-auto">
                        {!q.trim() && <div className="text-sm text-muted-foreground">검색어를 입력하세요.</div>}
                        {q.trim() && searchProducts.length === 0 && <div className="text-sm text-muted-foreground">검색 결과가 없습니다.</div>}
                        {searchProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setProduct(p);
                              clearErrors('product');
                            }}
                            className={`w-full text-left px-3 py-2 rounded hover:bg-muted dark:hover:bg-card ${product?.id === p.id ? 'ring-2 ring-ring' : ''}`}
                          >
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.id}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 현재 선택된 상품 미리보기/해제 */}
                  {product && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary">선택됨</Badge>
                      <span>
                        <strong>{product.name}</strong> ({product.id})
                      </span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setProduct(null)}>
                        선택 해제
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="title" className="text-base font-semibold">
                  제목 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  ref={titleRef}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    clearErrors('title');
                  }}
                  placeholder="문의 제목을 작성해주세요(4자이상)"
                  className="h-12 bg-card dark:bg-muted text-base"
                />
                {fieldErrors.title && <p className="text-sm text-destructive">{fieldErrors.title}</p>}
              </div>

              <div className="space-y-3">
                <Label htmlFor="content" className="text-base font-semibold">
                  문의 내용 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="content"
                  ref={contentRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    clearErrors('content');
                  }}
                  placeholder="문의하실 내용을 자세히 작성해주세요(10자 이상)"
                  className="min-h-[200px] bg-card dark:bg-muted text-base resize-none"
                />
                {fieldErrors.content && <p className="text-sm text-destructive">{fieldErrors.content}</p>}
                <p className="text-sm text-muted-foreground">상세한 정보를 제공해주시면 더 정확한 답변을 드릴 수 있습니다.</p>
              </div>

              <div ref={imagesWrapRef} className="space-y-3">
                <Label htmlFor="image" className="text-base font-semibold">
                  이미지 첨부 (선택사항)
                </Label>
                <div className="space-y-4">
                  <div
                    className={`border-2 border-dashed ${fieldErrors.images ? 'border-destructive' : 'border-border'} rounded-lg p-6 text-center hover:border-border dark:hover:border-border transition-colors`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      if (e.target !== e.currentTarget) return; // 버튼 클릭 버블링 차단
                      fileInputRef.current?.click();
                    }}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? fileInputRef.current?.click() : null)}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">클릭하여 이미지를 선택하거나 드래그하여 업로드하세요</p>
                    <Input ref={fileInputRef} id="image" type="file" multiple accept="image/*" onChange={handleFileChange} className="sr-only" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation(); // 부모 onClick으로 버블링 방지
                        fileInputRef.current?.click(); // 파일창 열기
                      }}
                      className="mt-2"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      파일 선택
                    </Button>
                  </div>
                  {fieldErrors.images && <p className="text-sm text-destructive">{fieldErrors.images}</p>}

                  {/* 미리보기 썸네일 */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">첨부된 파일 ({selectedFiles.length}/3)</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {selectedFiles.map((file, index) => {
                          const isImage = file.type?.startsWith('image/');
                          const previewUrl = isImage ? previews[index] : null;
                          return (
                            <div key={index} className="group relative rounded-lg overflow-hidden bg-card dark:bg-muted shadow-sm ring-1 ring-border/60 hover:ring-2 hover:ring-ring transition">
                              {/* 콘텐츠 */}
                              {isImage ? (
                                previewUrl ? (
                                  <img src={previewUrl || '/placeholder.svg'} alt={file.name} className="w-full h-28 object-cover transition-transform duration-150 group-hover:scale-[1.02]" onClick={() => openViewerFromIndex(index)} role="button" />
                                ) : (
                                  <div className="h-28 rounded bg-muted dark:bg-card animate-pulse" />
                                )
                              ) : (
                                <div className="h-28 flex items-center justify-center text-xs text-muted-foreground px-2 text-center">{file.name}</div>
                              )}

                              {/* 파일 크기 */}
                              <div className="absolute left-2 bottom-2 text-[11px] px-1.5 py-0.5 rounded bg-card/85 dark:bg-card/85">{(file.size / 1024 / 1024).toFixed(2)} MB</div>

                              {/* 삭제 버튼 */}
                              <button type="button" className="absolute top-1.5 right-1.5 rounded-full bg-card/95 dark:bg-card/95 shadow p-1 opacity-90 hover:opacity-100" onClick={() => removeFile(index)} aria-label="첨부 제거">
                                <X className="h-4 w-4" />
                              </button>

                              {/* 확대 안내 오버레이 (이미지일 때만) */}
                              {isImage && previewUrl && (
                                <div className="pointer-events-none absolute bottom-1.5 right-1.5">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-full bg-overlay/50 p-1.5 backdrop-blur-[1px]">
                                    {/* lucide-react 사용 시 */}
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 21l-4.35-4.35" />
                                      <circle cx="11" cy="11" r="8" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* 제한 안내 뱃지 */}
                  <div className="text-xs text-muted-foreground">
                    • 최대 3개 / 파일당 최대 5MB
                    <br />• 지원 형식: 이미지(JPG/PNG/GIF/WEBP)
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
                <Checkbox id="private" checked={isPrivate} onCheckedChange={(checked) => setIsPrivate(checked as boolean)} className="mt-1" />
                <div className="space-y-1">
                  <label htmlFor="private" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                    비공개 문의로 작성
                  </label>
                  <p className="text-xs text-muted-foreground">비공개로 설정하면 작성자와 관리자만 내용을 볼 수 있습니다.</p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between p-8 border-t bg-muted/50 dark:bg-muted/20">
              <Button variant="outline" asChild size="lg" className="px-8 bg-transparent">
                <Link href="/board/qna" onClick={guardLinkLeave}>
                  취소
                </Link>
              </Button>
              <Button size="lg" className="px-8 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '등록 중…' : '문의 등록하기'}
              </Button>
            </CardFooter>

            <Dialog open={viewerOpen} onOpenChange={(v) => (v ? setViewerOpen(true) : closeViewer())}>
              <DialogContent className="sm:max-w-4xl p-0 bg-overlay/90 text-primary-foreground border-0">
                {/* 접근성용 제목(시각적으로 숨김) */}
                <DialogHeader className="sr-only">
                  <DialogTitle>이미지 확대 보기</DialogTitle>
                </DialogHeader>

                <div className="relative w-full aspect-video">
                  {viewerImages[viewerIndex] && <Image src={viewerImages[viewerIndex] || '/placeholder.svg'} alt={`첨부 이미지 ${viewerIndex + 1}`} fill className="object-contain" priority />}

                  {/* 좌우 이동 */}
                  {viewerImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevViewer}
                        className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-10 w-10 rounded-full bg-card/20 dark:bg-card/30 hover:bg-card/30 dark:hover:bg-card/40"
                        aria-label="이전"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={nextViewer}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-10 w-10 rounded-full bg-card/20 dark:bg-card/30 hover:bg-card/30 dark:hover:bg-card/40"
                        aria-label="다음"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {/* 닫기 */}
                  <button type="button" onClick={closeViewer} className="absolute top-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-card/20 dark:bg-card/30 hover:bg-card/30 dark:hover:bg-card/40" aria-label="닫기">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 썸네일 네비게이션 */}
                {viewerImages.length > 1 && (
                  <div className="p-3 flex flex-wrap gap-2 justify-center bg-overlay/70">
                    {viewerImages.map((thumb, i) => (
                      <button key={i} type="button" onClick={() => setViewerIndex(i)} className={`relative w-16 h-16 rounded-md overflow-hidden border ${i === viewerIndex ? 'ring-2 ring-ring' : ''}`} aria-label={`썸네일 ${i + 1}`}>
                        <Image src={thumb || '/placeholder.svg'} alt={`썸네일 ${i + 1}`} fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </Card>
        </div>
      </div>
    </div>
  );
}
