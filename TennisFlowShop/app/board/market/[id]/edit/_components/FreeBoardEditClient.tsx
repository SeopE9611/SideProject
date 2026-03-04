'use client';

import { CATEGORY_OPTIONS } from '@/app/board/market/_components/FreeBoardWriteClient';
import { getMarketBrandOptions, isMarketBrandCategory, isValidMarketBrandForCategory } from '@/app/board/market/_components/market.constants';
import MarketMetaFields from '@/app/board/market/_components/MarketMetaFields';
import ImageUploader from '@/components/admin/ImageUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { communityFetch } from '@/lib/community/communityFetch.client';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { normalizeMarketMeta, type MarketMeta } from '@/lib/market';
import { supabase } from '@/lib/supabase';
import type { CommunityPost } from '@/lib/types/community';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowLeft, Check, Loader2, MessageSquare, Package, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';

type Props = {
  id: string;
};

type DetailResponse = { ok: true; item: CommunityPost } | { ok: false; error: string };

type AttachmentItem = NonNullable<CommunityPost['attachments']>[number];
type FieldKey = 'category' | 'brand' | 'price' | 'modelName' | 'title' | 'content' | 'attachments';
type FieldErrors = Partial<Record<FieldKey, string>>;

const TITLE_MIN = 4;
const TITLE_MAX = 80;
const CONTENT_MIN = 10;
const CONTENT_MAX = 5000;
const hasHtmlLike = (s: string) => /<[^>]+>/.test(s);
const hasScriptLike = (s: string) => /<\s*script/i.test(s) || /javascript\s*:/i.test(s);
const scrollIntoViewOpts: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' };

const fetcher = async (url: string): Promise<DetailResponse> => {
  const res = await fetch(url, { credentials: 'include' });
  return res.json();
};

export default function FreeBoardEditClient({ id }: Props) {
  const router = useRouter();

  // 폼 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 카테고리 상태
  const [category, setCategory] = useState<'racket' | 'string' | 'equipment'>('racket');

  const [brand, setBrand] = useState<string>('');
  const [marketMeta, setMarketMeta] = useState<MarketMeta>({ price: null, saleStatus: 'selling', conditionGrade: 'B', conditionNote: '', racketSpec: null, stringSpec: null });

  // 이미지 상태
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // 첨부 파일
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // 상태 플래그
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [conflictOpen, setConflictOpen] = useState(false);
  const [clientSeenDate, setClientSeenDate] = useState<string | null>(null);
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const brandRef = useRef<HTMLDivElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const modelNameRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentsRef = useRef<HTMLDivElement | null>(null);

  // 기존 글 불러오기
  const { data, error, isLoading, mutate } = useSWR<DetailResponse>(`/api/community/posts/${id}?type=market`, fetcher);

  type Baseline = {
    title: string;
    content: string;
    category: string;
    brand: string;
    imagesJson: string;
    marketMetaJson: string;
  };
  const baselineRef = useRef<Baseline | null>(null);

  const isDirty = useMemo(() => {
    const b = baselineRef.current;
    if (!b) return false;

    const imagesJson = JSON.stringify(images);
    // marketMeta는 객체 순서/빈 문자열 차이를 줄이기 위해 normalize 후 문자열 비교
    const marketMetaJson = JSON.stringify(normalizeMarketMeta(category, marketMeta));
    return title !== b.title || content !== b.content || String(category) !== b.category || brand !== b.brand || imagesJson !== b.imagesJson || marketMetaJson !== b.marketMetaJson || selectedFiles.length > 0;
  }, [title, content, category, brand, images, selectedFiles.length, marketMeta]);

  useUnsavedChangesGuard(isDirty && !isSubmitting && !isUploadingImages && !isUploadingFiles);

  const confirmLeaveIfDirty = (go: () => void) => {
    if (!isDirty) return go();
    if (isSubmitting || isUploadingImages || isUploadingFiles) return;

    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (ok) go();
  };

  const onLeaveLinkClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!isDirty) return;
    if (isSubmitting || isUploadingImages || isUploadingFiles) return;

    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (!ok) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // 최초 로드 시 기존 제목/내용/이미지/첨부 세팅
  useEffect(() => {
    if (data && data.ok) {
      const item = data.item;
      const nextTitle = item.title ?? '';
      const nextContent = item.content ?? '';
      const nextImages = Array.isArray(item.images) ? item.images : [];
      const nextCategory = ((data.item.category as any) ?? 'racket') as any;
      const nextBrand = typeof item.brand === 'string' ? item.brand : '';
      const defaultMarketMeta: MarketMeta = { price: null, saleStatus: 'selling', conditionGrade: 'B', conditionNote: '', racketSpec: null, stringSpec: null };
      const nextMarketMeta = (item as any).marketMeta ?? defaultMarketMeta;
      const normalizedMarketMeta = normalizeMarketMeta(nextCategory, nextMarketMeta);
      // baseline과 화면 state 기준을 맞춰 edit 진입 직후 비교 오차를 줄인다.
      const initialMarketMeta = normalizedMarketMeta ?? defaultMarketMeta;

      setTitle(nextTitle);
      setContent(nextContent);
      setImages(nextImages);
      setCategory(nextCategory);
      setBrand(nextBrand);
      setMarketMeta(initialMarketMeta);
      setClientSeenDate(item.updatedAt ?? null);

      // 최초 1회만 baseline 저장 (초기 로드 값 기준으로 dirty 판단)
      if (!baselineRef.current) {
        baselineRef.current = {
          title: nextTitle,
          content: nextContent,
          category: String(nextCategory),
          brand: nextBrand,
          imagesJson: JSON.stringify(nextImages),
          marketMetaJson: JSON.stringify(initialMarketMeta),
        };
      }

      if (Array.isArray(item.attachments)) {
        setAttachments(item.attachments as AttachmentItem[]);
      } else {
        setAttachments([]);
      }
    }
  }, [data]);

  // category 변경 시 brand 정리
  useEffect(() => {
    if (!isMarketBrandCategory(category)) {
      if (brand) setBrand('');
      return;
    }
    // racket/string인데 현재 brand가 옵션에 없으면 비움
    if (brand && !isValidMarketBrandForCategory(category, brand)) setBrand('');
  }, [category, brand]);

  const focusField = (key: FieldKey) => {
    if (key === 'category') {
      categoryRef.current?.scrollIntoView(scrollIntoViewOpts);
      return;
    }
    if (key === 'brand') {
      brandRef.current?.scrollIntoView(scrollIntoViewOpts);
      return;
    }
    if (key === 'price') {
      priceRef.current?.scrollIntoView(scrollIntoViewOpts);
      priceRef.current?.focus();
      return;
    }
    if (key === 'modelName') {
      modelNameRef.current?.scrollIntoView(scrollIntoViewOpts);
      modelNameRef.current?.focus();
      return;
    }
    if (key === 'title') {
      titleRef.current?.scrollIntoView(scrollIntoViewOpts);
      titleRef.current?.focus();
      return;
    }
    if (key === 'content') {
      contentRef.current?.scrollIntoView(scrollIntoViewOpts);
      contentRef.current?.focus();
      return;
    }
    attachmentsRef.current?.scrollIntoView(scrollIntoViewOpts);
  };

  const setInlineError = (key: FieldKey, msg: string, formMsg = '입력값을 확인해 주세요.') => {
    setFieldErrors((prev) => ({ ...prev, [key]: msg }));
    setErrorMsg(formMsg);
    requestAnimationFrame(() => focusField(key));
  };

  const validateBeforeSubmit = (): FieldErrors => {
    const errs: FieldErrors = {};
    const t = title.trim();
    const c = content.trim();

    if (isMarketBrandCategory(category)) {
      if (!brand) errs.brand = '브랜드를 선택해 주세요.';
      else if (!isValidMarketBrandForCategory(category, brand)) errs.brand = '선택한 브랜드가 분류에 맞지 않습니다.';
    }
    if (!Number.isFinite(Number(marketMeta.price)) || Number(marketMeta.price) <= 0) errs.price = '판매가는 1원 이상 입력해 주세요.';
    if (category === 'racket' && !(marketMeta.racketSpec?.modelName ?? '').trim()) errs.modelName = '라켓 모델명을 입력해 주세요.';
    if (category === 'string' && !(marketMeta.stringSpec?.modelName ?? '').trim()) errs.modelName = '스트링 모델명을 입력해 주세요.';

    if (!t) errs.title = '제목을 입력해 주세요.';
    if (!c) errs.content = '내용을 입력해 주세요.';

    if (!errs.title) {
      if (t.length < TITLE_MIN) errs.title = `제목은 ${TITLE_MIN}자 이상 입력해 주세요.`;
      else if (t.length > TITLE_MAX) errs.title = `제목은 ${TITLE_MAX}자 이내로 입력해 주세요.`;
    }
    if (!errs.content) {
      if (c.length < CONTENT_MIN) errs.content = `내용은 ${CONTENT_MIN}자 이상 입력해 주세요.`;
      else if (c.length > CONTENT_MAX) errs.content = `내용은 ${CONTENT_MAX}자 이내로 입력해 주세요.`;
    }

    if (!errs.title && hasScriptLike(t)) errs.title = '스크립트로 의심되는 입력이 포함되어 저장할 수 없습니다.';
    if (!errs.content && hasScriptLike(c)) errs.content = '스크립트로 의심되는 입력이 포함되어 저장할 수 없습니다.';
    if (!errs.title && hasHtmlLike(t)) errs.title = 'HTML 태그는 사용할 수 없습니다.';
    if (!errs.content && hasHtmlLike(c)) errs.content = 'HTML 태그는 사용할 수 없습니다.';

    if (images.length > 5) errs.attachments = '이미지는 최대 5장까지만 업로드할 수 있어요.';
    if (totalAttachmentCount > MAX_FILES) errs.attachments = `파일은 최대 ${MAX_FILES}개까지만 업로드할 수 있어요.`;

    return errs;
  };

  // 카테고리 변경 시 계약에 맞지 않는 spec은 제거
  useEffect(() => {
    if (category === 'racket') setMarketMeta((prev) => ({ ...prev, stringSpec: null }));
    else if (category === 'string') setMarketMeta((prev) => ({ ...prev, racketSpec: null }));
    else setMarketMeta((prev) => ({ ...prev, racketSpec: null, stringSpec: null }));
  }, [category]);

  // marketMeta 수정 시 에러 지우는 effect
  useEffect(() => {
    if (!fieldErrors.price && !fieldErrors.modelName) return;
    setFieldErrors((prev) => ({
      ...prev,
      price: undefined,
      modelName: undefined,
    }));
  }, [marketMeta.price, marketMeta.racketSpec?.modelName, marketMeta.stringSpec?.modelName]);

  // 파일 업로드 관련

  const MAX_FILES = 5;
  const MAX_SIZE_MB = 10;

  // 기존 첨부 개수 + 새로 선택한 파일 개수 함께 계산
  const totalAttachmentCount = attachments.length + selectedFiles.length;

  /**
   * 1단계: write 페이지와 같은 우측 sticky 요약 카드에 보여줄 파생값들
   * ------------------------------------------------------------------
   * - 로직 변경이 아니라 "현재 state를 보기 좋게 요약"하는 값들입니다.
   * - edit는 기존 첨부 + 신규 첨부를 함께 봐야 하므로 totalAttachmentCount를 사용합니다.
   */
  const categoryLabel = CATEGORY_OPTIONS.find((opt) => opt.value === category)?.label ?? '-';
  const brandLabel = brand ? (getMarketBrandOptions(category).find((opt) => opt.value === brand)?.label ?? brand) : '-';
  const priceLabel = typeof marketMeta.price === 'number' && marketMeta.price > 0 ? `${marketMeta.price.toLocaleString('ko-KR')}원` : '-';
  const saleStatusLabel = marketMeta.saleStatus === 'selling' ? '판매중' : marketMeta.saleStatus === 'reserved' ? '예약중' : '판매완료';
  const gradeLabel = marketMeta.conditionGrade ?? '-';
  const changeStatusLabel = isDirty ? '변경 있음' : '변경 없음';
  const existingAttachmentCount = attachments.length;
  const newAttachmentCount = selectedFiles.length;

  /**
   * 오른쪽 요약 카드 하단 체크리스트
   * --------------------------------
   * - "필수 검증 로직"이 아니라, 사용자가 현재 얼마나 입력했는지 빠르게 보는 UI 용도입니다.
   * - validate()를 대체하지 않습니다.
   */
  const checklist = [
    { label: '분류 선택', ok: true },
    { label: '브랜드 선택', ok: !isMarketBrandCategory(category) || !!brand },
    { label: '판매가 입력', ok: typeof marketMeta.price === 'number' && marketMeta.price > 0 },
    { label: '제목 입력', ok: title.trim().length > 0 },
    { label: '내용 입력', ok: content.trim().length > 0 },
    { label: '이미지 첨부', ok: images.length > 0 },
  ];

  // 파일 추가 (드롭/선택 공통)
  const addFiles = (files: File[]) => {
    if (!files.length) return;

    // 개수 제한 (기존 attachments + 새로 선택한 파일)
    if (totalAttachmentCount + files.length > MAX_FILES) {
      setInlineError('attachments', `파일은 최대 ${MAX_FILES}개까지만 업로드할 수 있어요.`, '첨부 파일을 확인해 주세요.');
      return;
    }

    // 용량 제한
    const tooLarge = files.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (tooLarge) {
      setInlineError('attachments', `파일당 ${MAX_SIZE_MB}MB를 초과할 수 없어요.`, '첨부 파일을 확인해 주세요.');
      return;
    }

    // 이미지 파일 방지 (이미지는 이미지 탭에서만)
    const hasImage = files.some((f) => f.type?.startsWith('image/'));
    if (hasImage) {
      setInlineError('attachments', '이미지 파일은 "이미지 업로드" 탭에서 업로드해 주세요.', '첨부 파일을 확인해 주세요.');
      return;
    }

    // 문서 파일만 허용 (write 페이지와 동일 정책)
    const extOk = (name: string) => /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|hwp|hwpx|txt)$/i.test(name);
    const ALLOWED_MIME = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      // HWP/HWPX는 브라우저/OS별로 mime이 비어있거나 제각각이라 확장자 기반을 주로 사용
    ]);
    const invalid = files.find((f) => !(ALLOWED_MIME.has(f.type) || extOk(f.name)));
    if (invalid) {
      setInlineError('attachments', '문서 파일(PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX/HWP/HWPX/TXT)만 업로드할 수 있어요.', '첨부 파일을 확인해 주세요.');
      return;
    }

    // 성공 케이스: 첨부 관련 에러/폼 에러 해제
    if (fieldErrors.attachments) {
      setFieldErrors((prev) => ({ ...prev, attachments: undefined }));
    }
    if (errorMsg) {
      setErrorMsg(null);
    }

    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Supabase에 한 개 파일 업로드
  const uploadOneFile = async (file: File) => {
    const BUCKET = 'tennis-images';
    const FOLDER = 'community/attachments';

    const ext = file.name.split('.').pop() || 'bin';
    const path = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) {
      console.error(error);
      throw error;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = data?.publicUrl;
    if (!url) throw new Error('파일 URL 생성에 실패했습니다.');

    return {
      name: file.name,
      url,
      size: file.size,
    } satisfies AttachmentItem;
  };

  // 제출 핸들러
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});
    const errs = validateBeforeSubmit();
    if (Object.keys(errs).some((k) => Boolean(errs[k as FieldKey]))) {
      setFieldErrors(errs);
      setErrorMsg('입력값을 확인해 주세요.');
      const order: FieldKey[] = ['category', 'brand', 'price', 'modelName', 'title', 'content', 'attachments'];
      const first = order.find((k) => Boolean(errs[k]));
      if (first) requestAnimationFrame(() => focusField(first));
      return;
    }

    if (isUploadingImages || isUploadingFiles) {
      setErrorMsg('첨부 업로드가 끝날 때까지 잠시만 기다려 주세요.');
      requestAnimationFrame(() => focusField('attachments'));
      return;
    }

    try {
      setIsSubmitting(true);

      let nextAttachments: AttachmentItem[] | undefined = attachments;

      // 새로 선택한 파일이 있으면 Supabase에 업로드
      if (selectedFiles.length > 0) {
        setIsUploadingFiles(true);
        try {
          const uploaded = await Promise.all(selectedFiles.map(uploadOneFile));

          // 기존 첨부 + 새로 업로드한 파일을 합쳐서 전송
          nextAttachments = [...attachments, ...uploaded];
          setAttachments(nextAttachments);
        } finally {
          setIsUploadingFiles(false);
        }
      }

      // 기본 payload
      const payload: any = {
        title: title.trim(),
        content: content.trim(),
        images,
        category,
        brand: isMarketBrandCategory(category) ? brand : null,
        marketMeta,
        ...(clientSeenDate ? { clientSeenDate } : {}),
      };

      // 새 파일을 업로드한 경우에만 attachments를 보냄
      //    (선택된 파일이 없으면 서버에서 기존 attachments 유지)
      if (selectedFiles.length > 0 && nextAttachments && nextAttachments.length > 0) {
        payload.attachments = nextAttachments;
      }

      const res = await communityFetch(`/api/community/posts/${id}?type=market`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(clientSeenDate ? { 'If-Unmodified-Since': clientSeenDate } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.status === 409 && json?.error === 'conflict') {
        setConflictOpen(true);
        setErrorMsg('다른 사용자가 먼저 글을 수정했습니다. 최신 글을 다시 불러온 뒤 변경 사항을 병합해 주세요.');
        return;
      }

      if (!res.ok || !json?.ok) {
        const detail = json?.details?.[0]?.message ?? json?.error ?? '글 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        setErrorMsg(detail);
        return;
      }

      try {
        await globalMutate(`/api/community/posts/${id}?type=market`);
      } catch (e) {
        console.error('refresh 실패', e);
      }

      // 수정 후에는 상세 페이지로 이동
      router.push(`/board/market/${id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setErrorMsg('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로딩/에러 UI ----------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Skeleton className="h-4 w-16" />
            <span>›</span>
            <Skeleton className="h-4 w-20" />
            <span>›</span>
            <Skeleton className="h-4 w-16" />
          </div>
          <Card className="border-0 bg-card shadow-xl backdrop-blur-sm dark:bg-card">
            <CardHeader className="space-y-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isNotFound = data && !data.ok && data.error === 'not_found';
  if (error || isNotFound) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <Card className="border-0 bg-card shadow-xl backdrop-blur-sm dark:bg-card">
            <CardContent className="space-y-4 p-6">
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/15">
                해당 글을 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었을 수 있습니다.
              </div>
              <div className="flex justify-end gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/board/market">목록으로</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 실제 수정 폼 ----------------------------------------------------

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* 상단 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* 브레드크럼: 게시판 > 자유 게시판 > 글 수정 */}
            <div className="mb-1 text-sm text-muted-foreground">
              <span className="font-medium text-success">게시판</span>
              <span className="mx-1">›</span>
              <Link href="/board/market" onClick={onLeaveLinkClick} className="text-muted-foreground underline-offset-2 hover:underline dark:text-muted-foreground">
                중고 거래
              </Link>
              <span className="mx-1">›</span>
              <span>글 수정</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">중고 거래 글 수정</h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">기존에 작성한 글의 내용을 수정합니다. 제목과 내용을 확인한 뒤 저장해 주세요.</p>
            {/* 이탈 경고(고정 노출) */}
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground dark:border-border dark:bg-muted dark:text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <p className="leading-relaxed">
                <span className="font-semibold">주의:</span> 수정 중에 다른 페이지로 이동하거나 새로고침하면 입력한 내용이 <span className="font-semibold">초기화될 수 있습니다.</span>
              </p>
            </div>
          </div>

          {/* 우측 상단: 뒤로가기 */}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" className="gap-2 text-xs sm:text-sm" onClick={() => confirmLeaveIfDirty(() => router.back())}>
              <ArrowLeft className="h-4 w-4" />
              <span>이전으로</span>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 text-xs sm:text-sm">
              <Link href="/board/market" onClick={onLeaveLinkClick}>
                <MessageSquare className="h-4 w-4" />
                <span>목록으로</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-foreground">수정 전 체크리스트</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
            <span>{'- '}브랜드 / 모델명 최신 상태 확인</span>
            <span>{'- '}판매가 / 판매 상태 재점검</span>
            <span>{'- '}상태 메모 최신화</span>
            <span>{'- '}이미지 / 첨부 파일 확인</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 1단계 핵심: write 페이지와 같은 2컬럼 골격 이식 */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* ===== 왼쪽: 기존 수정 폼 ===== */}
            <div className="min-w-0 flex-1 space-y-6">
              {/*
    수정 화면에서는 에러/충돌 안내를 가장 위로 끌어올려
    사용자가 저장 전에 바로 문제를 인식할 수 있게 합니다.
  */}
              {errorMsg && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/15 dark:text-destructive">{errorMsg}</div>}

              {conflictOpen && (
                <div className="rounded-lg border border-border bg-muted px-4 py-4 text-sm text-muted-foreground dark:border-border dark:bg-muted dark:text-muted-foreground">
                  <p className="font-semibold text-foreground">동시 수정 충돌이 감지되었습니다.</p>
                  <p className="mt-1">최신 글을 다시 조회한 뒤, 현재 작성 중인 내용과 비교해서 필요한 부분만 반영해 주세요.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await mutate();
                        setConflictOpen(false);
                        setErrorMsg(null);
                      }}
                    >
                      최신 글 다시 불러오기
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConflictOpen(false)}>
                      병합 안내만 닫기
                    </Button>
                  </div>
                </div>
              )}

              {/* 상품 기본 정보 카드 */}
              <Card className="border-0 bg-card shadow-xl backdrop-blur-sm dark:bg-card">
                <CardHeader className="space-y-1 border-b border-border pb-4 dark:border-border">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Package className="h-4 w-4 text-success" />
                    <span>상품 기본 정보</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">판매할 상품의 유형과 브랜드를 먼저 확인해 주세요.</p>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">브랜드, 모델명, 가격, 상태 정보를 우선 점검해 주세요. 정확한 정보일수록 구매자가 빠르게 판단할 수 있습니다.</div>

                  <div className="space-y-2" ref={categoryRef}>
                    <Label>분류</Label>
                    <div className={cn('flex flex-wrap gap-2 text-xs', fieldErrors.category ? 'rounded-lg border border-destructive/50 p-2' : '')}>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setCategory(opt.value);
                            if (fieldErrors.category) setFieldErrors((prev) => ({ ...prev, category: undefined }));
                          }}
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[11px]',
                            category === opt.value ? 'border-border bg-primary/10 text-primary dark:border-border dark:bg-primary/20 dark:text-primary' : 'border-border text-muted-foreground dark:border-border dark:text-muted-foreground',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isMarketBrandCategory(category) && (
                    <div className="space-y-2" ref={brandRef}>
                      <Label>브랜드</Label>
                      <select
                        value={brand}
                        onChange={(e) => {
                          setBrand(e.target.value);
                          if (fieldErrors.brand) setFieldErrors((prev) => ({ ...prev, brand: undefined }));
                        }}
                        disabled={isSubmitting}
                        className={cn('h-10 w-full rounded-md border bg-card px-3 text-sm shadow-sm', fieldErrors.brand ? 'border-destructive focus:border-destructive' : '')}
                      >
                        <option value="">브랜드를 선택해 주세요</option>
                        {getMarketBrandOptions(category).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">라켓/스트링 글은 브랜드 선택이 필수입니다.</p>
                      {fieldErrors.brand ? <p className="text-xs text-destructive">{fieldErrors.brand}</p> : null}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 거래 핵심 정보 카드 */}
              <Card className="border-0 bg-card shadow-xl backdrop-blur-sm dark:bg-card">
                <CardHeader className="space-y-1 border-b border-border pb-4 dark:border-border">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Package className="h-4 w-4 text-success" />
                    <span>거래 핵심 정보</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">판매가, 상태, 세부 스펙을 최신 상태로 정리해 주세요.</p>
                </CardHeader>
                <CardContent className="p-6">
                  <MarketMetaFields
                    category={category}
                    value={marketMeta}
                    onChange={setMarketMeta}
                    disabled={isSubmitting}
                    fieldErrors={{
                      price: fieldErrors.price,
                      modelName: fieldErrors.modelName,
                    }}
                    priceRef={priceRef}
                    modelNameRef={modelNameRef}
                  />
                </CardContent>
              </Card>

              {/* 게시글 내용 카드 */}
              <Card className="border-0 bg-card shadow-xl backdrop-blur-sm dark:bg-card">
                <CardHeader className="space-y-1 border-b border-border pb-4 dark:border-border">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <MessageSquare className="h-4 w-4 text-success" />
                    <span>게시글 내용</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">구매자가 이해하기 쉽도록 제목과 설명을 구체적으로 작성해 주세요.</p>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">제목</Label>
                    <Input
                      id="title"
                      ref={titleRef}
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
                      }}
                      disabled={isSubmitting}
                      maxLength={TITLE_MAX}
                      placeholder="예: 윌슨 블레이드 98 16x19 판매합니다"
                      className={cn('placeholder:text-muted-foreground/60', fieldErrors.title ? 'border-destructive focus-visible:border-destructive' : '')}
                    />
                    {fieldErrors.title ? <p className="text-xs text-destructive">{fieldErrors.title}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">내용</Label>
                    <Textarea
                      id="content"
                      ref={contentRef}
                      className={cn('min-h-[220px] placeholder:text-muted-foreground/60', fieldErrors.content ? 'border-destructive focus-visible:border-destructive' : '')}
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: undefined }));
                      }}
                      disabled={isSubmitting}
                      maxLength={CONTENT_MAX}
                      placeholder="구매 시기, 사용 기간, 상태, 거래 방식(직거래/택배), 포함 구성품 등을 적어주세요."
                    />
                    {fieldErrors.content ? <p className="text-xs text-destructive">{fieldErrors.content}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">신청/주문 문의 등 개인 정보가 필요한 내용은 고객센터 Q&amp;A 게시판을 활용해 주세요.</p>
                  </div>
                </CardContent>
              </Card>

              {/* 판매 이미지 / 파일 카드 */}
              <Card className="border-0 bg-card shadow-xl backdrop-blur-sm dark:bg-card" ref={attachmentsRef}>
                <CardHeader className="space-y-1 border-b border-border pb-4 dark:border-border">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Upload className="h-4 w-4 text-success" />
                    <span>판매 이미지 / 파일</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">실물 사진은 최소 1장 이상 권장되며, 첫 번째 이미지가 대표 이미지로 사용됩니다.</p>
                </CardHeader>
                <CardContent className="space-y-3 p-6">
                  {/*
                    edit 화면은 "기존 첨부 + 새로 추가할 첨부"가 함께 존재할 수 있으므로
                   상단에 현재 상태를 한 번 요약해서 보여준다.
                  */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
                      <p className="text-[11px] text-muted-foreground">현재 이미지</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{images.length}장</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
                      <p className="text-[11px] text-muted-foreground">기존 첨부 파일</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{existingAttachmentCount}개</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
                      <p className="text-[11px] text-muted-foreground">새로 추가한 파일</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{newAttachmentCount}개</p>
                    </div>
                  </div>
                  {fieldErrors.attachments ? <p className="text-xs text-destructive">{fieldErrors.attachments}</p> : null}

                  <Tabs defaultValue="image" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="image">이미지 업로드</TabsTrigger>
                      <TabsTrigger value="file">파일 업로드</TabsTrigger>
                    </TabsList>

                    <TabsContent value="image" className="space-y-2 pt-4">
                      <p className="text-xs text-muted-foreground">최대 5장까지 업로드할 수 있으며, 첫 번째 이미지가 대표로 사용됩니다.</p>
                      <ImageUploader value={images} onChange={setImages} max={5} folder="community/posts" onUploadingChange={setIsUploadingImages} />
                    </TabsContent>

                    <TabsContent value="file" className="space-y-4 pt-4">
                      {attachments.length > 0 && (
                        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">현재 보관된 첨부 파일</p>
                            <span className="text-xs text-muted-foreground">{attachments.length}개</span>
                          </div>

                          <div className="space-y-2">
                            {attachments.map((file, index) => (
                              <a
                                key={`${file.url}-${index}`}
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">{typeof file.size === 'number' ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '크기 정보 없음'}</p>
                                </div>
                                <span className="ml-3 shrink-0 text-xs text-muted-foreground">열기</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      <div
                        className="cursor-pointer rounded-lg border-2 border-dashed border-border bg-card p-6 text-center transition-colors hover:border-border dark:hover:border-border"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          if (e.target !== e.currentTarget) return;
                          fileInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            fileInputRef.current?.click();
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          addFiles(Array.from(e.dataTransfer.files || []));
                        }}
                      >
                        <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">클릭하여 파일을 선택하거나, 이 영역으로 드래그하여 업로드할 수 있어요.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          이미지 파일은 이미지 탭에서 업로드해 주세요. (파일당 최대 {MAX_SIZE_MB}MB, 최대 {MAX_FILES}개, 현재 {totalAttachmentCount}/{MAX_FILES}개)
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          파일 선택
                        </Button>
                        <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt" className="sr-only" onChange={handleFileInputChange} />
                      </div>

                      {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">새로 첨부할 파일 ({selectedFiles.length}개)</p>
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                            {selectedFiles.map((file, index) => (
                              <div key={`${file.name}-${index}`} className="group relative flex flex-col justify-between rounded-lg bg-card px-3 py-2 shadow-sm ring-1 ring-ring transition hover:shadow-md hover:ring-2 hover:ring-ring">
                                <div className="flex flex-1 flex-col gap-1 text-xs">
                                  <span className="truncate font-medium" title={file.name}>
                                    {file.name}
                                  </span>
                                  <span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(index)}
                                  className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* 모바일/태블릿 하단 버튼 */}
              <div className="flex justify-end gap-2 lg:hidden">
                <Button type="button" variant="outline" size="sm" className={cn('gap-2')} disabled={isSubmitting || isUploadingImages || isUploadingFiles} onClick={() => confirmLeaveIfDirty(() => router.push(`/board/market/${id}`))}>
                  <ArrowLeft className="h-4 w-4" />
                  <span>취소</span>
                </Button>
                <Button type="submit" size="sm" className={cn('gap-2')} disabled={isSubmitting || isUploadingImages || isUploadingFiles}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>수정하기</span>
                </Button>
              </div>
            </div>

            {/* ===== 오른쪽: sticky 수정 요약 카드 (lg+) ===== */}
            <aside className="hidden flex-shrink-0 lg:sticky lg:top-24 lg:block lg:w-[300px] lg:self-start xl:w-[320px]">
              <div className="space-y-4">
                {/* 수정 요약 */}
                <div className="rounded-xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border px-5 py-3">
                    <h3 className="text-sm font-semibold text-foreground">수정 요약</h3>
                  </div>
                  <div className="space-y-3 px-5 py-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">분류</span>
                      <span className="font-medium text-foreground">{categoryLabel}</span>
                    </div>

                    {isMarketBrandCategory(category) && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">브랜드</span>
                        <span className="font-medium text-foreground">{brandLabel}</span>
                      </div>
                    )}

                    <div className="border-t border-border" />

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">판매가</span>
                      <span className="font-semibold text-foreground">{priceLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">판매 상태</span>
                      <span className="font-medium text-foreground">{saleStatusLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">상태 등급</span>
                      <span className="font-medium text-foreground">{gradeLabel}</span>
                    </div>

                    <div className="border-t border-border" />

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">변경 상태</span>
                      <span className="font-medium text-foreground">{changeStatusLabel}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">제목</span>
                      <span className="max-w-[140px] truncate font-medium text-foreground">{title.trim() || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">이미지</span>
                      <span className="font-medium text-foreground">{images.length}장</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">기존 파일</span>
                      <span className="font-medium text-foreground">{existingAttachmentCount}개</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">새 파일</span>
                      <span className="font-medium text-foreground">{newAttachmentCount}개</span>
                    </div>
                  </div>
                </div>

                {/* 수정 전 확인 */}
                <div className="rounded-xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border px-5 py-3">
                    <h3 className="text-sm font-semibold text-foreground">수정 전 확인</h3>
                  </div>
                  <div className="space-y-2 px-5 py-4">
                    {checklist.map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-sm">
                        <div className={cn('flex h-4 w-4 items-center justify-center rounded-full', item.ok ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                          <Check className="h-2.5 w-2.5" />
                        </div>
                        <span className={item.ok ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 데스크탑 전용 CTA */}
                <div className="space-y-2">
                  <Button type="submit" className="w-full gap-2" disabled={isSubmitting || isUploadingImages || isUploadingFiles}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4" />
                        수정 내용 저장
                      </>
                    )}
                  </Button>

                  <Button type="button" variant="outline" className="w-full" disabled={isSubmitting || isUploadingImages || isUploadingFiles} onClick={() => confirmLeaveIfDirty(() => router.push(`/board/market/${id}`))}>
                    취소
                  </Button>
                  <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">저장 버튼을 누르면 현재 수정 내용이 상세 페이지에 반영됩니다.</p>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}
