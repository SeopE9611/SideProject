'use client';

import { ArrowLeft, Check, FileText, ImageIcon, Loader2, Package, Tag, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { getMarketBrandOptions, isMarketBrandCategory, isValidMarketBrandForCategory } from '@/app/board/market/_components/market.constants';
import MarketMetaFields from '@/app/board/market/_components/MarketMetaFields';
import ImageUploader from '@/components/admin/ImageUploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { communityFetch } from '@/lib/community/communityFetch.client';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { normalizeMarketMeta, type MarketMeta } from '@/lib/market';
import { supabase } from '@/lib/supabase';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export const CATEGORY_OPTIONS = [
  { value: 'racket', label: '라켓' },
  { value: 'string', label: '스트링' },
  { value: 'equipment', label: '일반장비' },
] as const;

type CategoryValue = (typeof CATEGORY_OPTIONS)[number]['value'];

// 게시글 작성 제출 직전 최종 유효성 가드(우회 방지)
const TITLE_MIN = 4;
const TITLE_MAX = 80;
const CONTENT_MIN = 10;
const CONTENT_MAX = 5000;
const hasHtmlLike = (s: string) => /<[^>]+>/.test(s); // 최소 수준 태그 감지
const hasScriptLike = (s: string) => /<\s*script/i.test(s) || /javascript\s*:/i.test(s);

// marketMeta 내부 값이 하나라도 채워졌는지 확인
// - 기본값(selling/B 등)만 있는 상태는 dirty로 보지 않고,
// - 가격/메모/스펙 입력이 시작되면 즉시 dirty 처리합니다.
const hasMarketMetaInput = (category: CategoryValue, marketMeta: MarketMeta) => {
  const normalized = normalizeMarketMeta(category, marketMeta);
  if (!normalized) return false;

  if (typeof normalized.price === 'number' && Number.isFinite(normalized.price)) return true;
  if ((normalized.conditionNote ?? '').trim()) return true;

  if (category === 'racket') {
    const spec = normalized.racketSpec;
    if (!spec) return false;
    return Boolean(
      (spec.modelName ?? '').trim() ||
      spec.year != null ||
      spec.weight != null ||
      spec.balance != null ||
      spec.headSize != null ||
      spec.lengthIn != null ||
      spec.swingWeight != null ||
      spec.stiffnessRa != null ||
      (spec.pattern ?? '').trim() ||
      (spec.gripSize ?? '').trim(),
    );
  }

  if (category === 'string') {
    const spec = normalized.stringSpec;
    if (!spec) return false;
    return Boolean((spec.modelName ?? '').trim() || (spec.material ?? '').trim() || (spec.gauge ?? '').trim() || (spec.color ?? '').trim() || (spec.length ?? '').trim());
  }

  return false;
};

type FieldKey = 'category' | 'brand' | 'price' | 'modelName' | 'title' | 'content' | 'attachments';
type FieldErrors = Partial<Record<FieldKey, string>>;
const scrollIntoViewOpts: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' };

export default function FreeBoardWriteClient() {
  const router = useRouter();
  const [brand, setBrand] = useState<string>('');
  const [marketMeta, setMarketMeta] = useState<MarketMeta>({ price: null, saleStatus: 'selling', conditionGrade: 'B', conditionNote: '', racketSpec: null, stringSpec: null });

  // 폼 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // 카테고리 상태 (기본 'racket')
  const [category, setCategory] = useState<CategoryValue>('racket');

  // 포커스/스크롤 대상 refs (첫 오류로 이동)
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const brandRef = useRef<HTMLDivElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const modelNameRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentsRef = useRef<HTMLDivElement | null>(null);

  // 이미지 상태
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // 파일 업로드 상태
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // 제출 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 더블클릭/연타 레이스 방지(제출 시작~끝까지 1회만 허용)
  const submitRef = useRef(false);

  // 입력 중(Dirty) 판단: marketMeta 핵심 입력(price/spec)도 반드시 반영
  const isDirty = useMemo(() => {
    const t = title.trim();
    const c = content.trim();
    if (t || c) return true;
    if (category !== 'racket') return true;
    if (brand) return true;
    if (images.length > 0) return true;
    if (selectedFiles.length > 0) return true;
    if (hasMarketMetaInput(category, marketMeta)) return true;
    return false;
  }, [title, content, category, brand, images.length, selectedFiles.length, marketMeta]);

  // 탭 닫기/새로고침/주소 직접 변경 등 “브라우저 이탈” 경고
  useUnsavedChangesGuard(isDirty && !isSubmitting);

  const guardLeave = (e: any) => {
    if (!isDirty || isSubmitting) return;
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (!ok) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
    }
  };

  const handleCancel = () => {
    if (!isDirty || isSubmitting) {
      router.back();
      return;
    }
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (ok) router.back();
  };

  const focusField = (key: FieldKey) => {
    if (key === 'category') {
      categoryRef.current?.scrollIntoView(scrollIntoViewOpts);
      return;
    }
    if (key === 'brand') {
      brandRef.current?.scrollIntoView(scrollIntoViewOpts);
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
    attachmentsRef.current?.scrollIntoView(scrollIntoViewOpts);
  };

  // 클라(제출 전) 유효성: 토스트 없이 "필드별 인라인 + 상단 메시지"로만 안내 (중복 UX 방지)
  const setInlineError = (key: FieldKey, msg: string, formMsg = '입력값을 확인해 주세요.') => {
    setFieldErrors((prev) => ({ ...prev, [key]: msg }));
    setErrorMsg(formMsg);
    requestAnimationFrame(() => focusField(key));
  };

  // 서버/네트워크 에러: 기존 토스트 흐름 유지 + 상단 메시지
  const emitServerError = (msg: string) => {
    setErrorMsg(msg);
    showErrorToast(msg);
  };

  // 카테고리 변경 시 브랜드 자동 초기화
  useEffect(() => {
    if (!isMarketBrandCategory(category)) {
      if (brand) setBrand('');
      return;
    }
    if (brand && !isValidMarketBrandForCategory(category, brand)) setBrand('');
  }, [category, brand]);

  // 카테고리 전환 시 불필요한 spec은 즉시 정리
  useEffect(() => {
    if (category === 'racket') setMarketMeta((prev) => ({ ...prev, stringSpec: null }));
    else if (category === 'string') setMarketMeta((prev) => ({ ...prev, racketSpec: null }));
    else setMarketMeta((prev) => ({ ...prev, racketSpec: null, stringSpec: null }));
  }, [category]);

  // marketMeta 변경 시 price/modelName 에러를 지우기 위한 용도
  useEffect(() => {
    if (!fieldErrors.price && !fieldErrors.modelName) return;
    setFieldErrors((prev) => ({
      ...prev,
      price: undefined,
      modelName: undefined,
    }));
  }, [marketMeta.price, marketMeta.racketSpec?.modelName, marketMeta.stringSpec?.modelName]);

  // 제출 직전 최종 유효성 검증(우회 방지)
  const validateBeforeSubmit = (): FieldErrors => {
    const errs: FieldErrors = {};
    const t = title.trim();
    const c = content.trim();

    // 카테고리 화이트리스트(타입이 있어도 devtools로 깨질 수 있어 방어)
    if (!CATEGORY_OPTIONS.some((o) => o.value === category)) {
      errs.category = '분류를 선택해 주세요.';
      return errs;
    }

    // 브랜드가 필요한 카테고리(라켓/스트링)는 브랜드 선택이 필수 + 카테고리-브랜드 정합성까지 체크
    if (isMarketBrandCategory(category)) {
      if (!brand) errs.brand = '브랜드를 선택해 주세요.';
      else if (!isValidMarketBrandForCategory(category, brand)) errs.brand = '선택한 브랜드가 분류에 맞지 않습니다.';
    }
    if (!Number.isFinite(Number(marketMeta.price)) || Number(marketMeta.price) <= 0) errs.price = '판매가는 1원 이상 입력해 주세요.';
    if (category === 'racket' && !(marketMeta.racketSpec?.modelName ?? '').trim()) errs.modelName = '라켓 모델명을 입력해 주세요.';
    if (category === 'string' && !(marketMeta.stringSpec?.modelName ?? '').trim()) errs.modelName = '스트링 모델명을 입력해 주세요.';

    // 제목/내용 기본 + min/max 길이
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

    // 게시판 입력은 기본적으로 HTML/스크립트 입력을 차단하는 편이 안전
    if (!errs.title && hasScriptLike(t)) errs.title = '스크립트로 의심되는 입력이 포함되어 저장할 수 없습니다.';
    if (!errs.content && hasScriptLike(c)) errs.content = '스크립트로 의심되는 입력이 포함되어 저장할 수 없습니다.';
    if (!errs.title && hasHtmlLike(t)) errs.title = 'HTML 태그는 사용할 수 없습니다.';
    if (!errs.content && hasHtmlLike(c)) errs.content = 'HTML 태그는 사용할 수 없습니다.';

    // 업로드 제한은 UI에서 막아도 devtools/드롭으로 우회될 수 있어 제출 직전 1회 더 방어
    if (images.length > 5) errs.attachments = '이미지는 최대 5장까지만 업로드할 수 있어요.';
    if (selectedFiles.length > MAX_FILES) errs.attachments = `파일은 최대 ${MAX_FILES}개까지만 업로드할 수 있어요.`;

    return errs;
  };

  const MAX_FILES = 5;
  const MAX_SIZE_MB = 10;

  // 파일 추가 (드롭/선택 공통)
  const addFiles = (files: File[]) => {
    if (!files.length) return;

    // 개수 제한
    if (selectedFiles.length + files.length > MAX_FILES) {
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
    const isImageExt = (name: string) => /\.(jpe?g|png|gif|webp)$/i.test(name);
    const hasImage = files.some((f) => f.type?.startsWith('image/') || isImageExt(f.name));
    if (hasImage) {
      setInlineError('attachments', '이미지 파일은 "이미지 업로드" 탭에서 업로드해 주세요.', '첨부 파일을 확인해 주세요.');
      return;
    }

    // 드롭 업로드는 accept를 우회할 수 있으므로, 문서 allowlist를 추가로 방어
    const extOk = (name: string) => /\.(pdf|docx?|xlsx?|xls|pptx?|ppt|hwp|hwpx|txt)$/i.test(name);
    const ALLOWED_MIME = new Set<string>([
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

    // 성공 케이스: 첨부 관련 에러/폼 에러는 해제
    if (fieldErrors.attachments) setFieldErrors((prev) => ({ ...prev, attachments: undefined }));
    if (errorMsg) setErrorMsg(null);

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
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    // 중복 제출 방지(연타/더블클릭 레이스까지 방어)
    if (isSubmitting || submitRef.current) return;

    const errs = validateBeforeSubmit();
    if (Object.keys(errs).some((k) => Boolean((errs as any)[k]))) {
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
      submitRef.current = true;
      setIsSubmitting(true);

      let attachments: { name: string; url: string; size?: number }[] | undefined;

      if (selectedFiles.length > 0) {
        setIsUploadingFiles(true);
        try {
          const uploaded = await Promise.all(selectedFiles.map(uploadOneFile));
          attachments = uploaded;
        } finally {
          setIsUploadingFiles(false);
        }
      }

      const t = title.trim();
      const c = content.trim();

      const payload: any = {
        type: 'market',
        title: t,
        content: c,
        images,
        category,
        brand: isMarketBrandCategory(category) ? brand : null,
        marketMeta,
      };
      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }

      const res = await communityFetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        const msg = data?.details?.[0]?.message ?? data?.error ?? '글 작성에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        emitServerError(msg);
        return;
      }

      const goId = data.id ?? data.item?._id ?? data.item?.id;
      showSuccessToast('게시글이 등록되었습니다.');
      router.push(goId ? `/board/market/${goId}` : '/board/market');
      router.refresh();
    } catch (err) {
      console.error(err);
      emitServerError('글 작성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
      submitRef.current = false;
    }
  };

  /* ── 요약 카드에 표시할 파생값 ── */
  const categoryLabel = CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? '-';
  const brandLabel = brand ? (getMarketBrandOptions(category).find((o) => o.value === brand)?.label ?? brand) : '-';
  const priceLabel = typeof marketMeta.price === 'number' && marketMeta.price > 0 ? `${marketMeta.price.toLocaleString('ko-KR')}원` : '-';
  const saleStatusLabel = marketMeta.saleStatus === 'selling' ? '판매중' : marketMeta.saleStatus === 'reserved' ? '예약중' : '판매완료';
  const gradeLabel = marketMeta.conditionGrade ?? '-';

  const checklist = [
    { label: '분류 선택', ok: true },
    { label: '브랜드 선택', ok: !isMarketBrandCategory(category) || !!brand },
    { label: '판매가 입력', ok: typeof marketMeta.price === 'number' && marketMeta.price > 0 },
    { label: '제목 입력', ok: title.trim().length >= TITLE_MIN },
    { label: '내용 입력', ok: content.trim().length >= CONTENT_MIN },
    { label: '이미지 첨부', ok: images.length > 0 },
  ];

  const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* ── 상단 헤더 ── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 text-sm text-muted-foreground">
              <span className="font-medium text-primary">게시판</span>
              <span className="mx-1">{'>'}</span>
              <Link href="/board/market" onClick={guardLeave} className="text-muted-foreground underline-offset-2 hover:underline">
                중고 거래
              </Link>
              <span className="mx-1">{'>'}</span>
              <span className="text-foreground">상품 등록</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">상품 등록</h1>
            <p className="mt-1 text-sm text-muted-foreground">테니스 라켓, 스트링, 장비를 판매해 보세요.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href="/board/market" onClick={guardLeave}>
                <ArrowLeft className="h-4 w-4" />
                <span>목록으로</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/board">게시판 홈</Link>
            </Button>
          </div>
        </div>

        {/* ── 등록 체크리스트 배너 ── */}
        <div className="mb-6 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-foreground">등록 전 체크리스트</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
            <span>{'- '}정확한 브랜드 / 모델명 입력</span>
            <span>{'- '}상태를 솔직하게 작성</span>
            <span>{'- '}실물 사진 1장 이상 첨부 권장</span>
            <span>{'- '}희망 판매가 명시</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── 2-column: 폼 + sticky 요약 ── */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* ====== 왼쪽: 입력 폼 ====== */}
            <div className="flex-1 space-y-6 min-w-0">
              {/* ── 섹션 1: 상품 기본 정보 ── */}
              <section className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-3 border-b border-border px-5 py-4 md:px-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">상품 기본 정보</h2>
                    <p className="text-[11px] text-muted-foreground">판매할 상품의 분류와 브랜드를 선택하세요.</p>
                  </div>
                </div>
                <div className="px-5 py-5 md:px-6 space-y-5">
                  {/* 분류 */}
                  <div className="space-y-2" ref={categoryRef}>
                    <Label className="text-sm">
                      분류 <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setCategory(opt.value as CategoryValue);
                            if (fieldErrors.category) setFieldErrors((prev) => ({ ...prev, category: undefined }));
                            if (fieldErrors.brand) setFieldErrors((prev) => ({ ...prev, brand: undefined }));
                          }}
                          className={cn(
                            'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                            category === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {fieldErrors.category ? <p className="text-xs text-destructive">{fieldErrors.category}</p> : null}
                  </div>

                  {/* 브랜드 */}
                  {isMarketBrandCategory(category) && (
                    <div className="space-y-2" ref={brandRef}>
                      <Label className="text-sm">
                        브랜드 <span className="text-destructive">*</span>
                      </Label>
                      <select
                        value={brand}
                        onChange={(e) => {
                          setBrand(e.target.value);
                          if (fieldErrors.brand) setFieldErrors((prev) => ({ ...prev, brand: undefined }));
                        }}
                        disabled={isSubmitting}
                        className={cn(selectCls, fieldErrors.brand ? 'border-destructive focus:border-destructive' : '')}
                      >
                        <option value="">브랜드를 선택해 주세요</option>
                        {getMarketBrandOptions(category).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.brand ? <p className="text-xs text-destructive">{fieldErrors.brand}</p> : null}
                      <p className="text-[11px] text-muted-foreground">라켓/스트링 글은 브랜드 선택이 필수입니다.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* ── 섹션 2+3: 거래 핵심 정보 + 상품 세부 스펙 (MarketMetaFields) ── */}
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

              {/* ── 섹션 4: 게시글 내용 ── */}
              <section className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-3 border-b border-border px-5 py-4 md:px-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">게시글 내용</h2>
                    <p className="text-[11px] text-muted-foreground">제목과 상세 설명을 작성하세요.</p>
                  </div>
                </div>
                <div className="px-5 py-5 md:px-6 space-y-5">
                  {/* 제목 */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold">
                      제목 <span className="text-destructive">*</span>
                    </Label>
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
                      className={cn('h-11 text-base placeholder:text-muted-foreground/60', fieldErrors.title ? 'border-destructive focus-visible:border-destructive focus-visible:ring-ring' : '')}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {title.trim().length}/{TITLE_MAX}
                      </span>
                      {fieldErrors.title ? <p className="text-xs text-destructive">{fieldErrors.title}</p> : null}
                    </div>
                  </div>

                  {/* 내용 */}
                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-sm font-semibold">
                      내용 <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="content"
                      ref={contentRef}
                      className={cn('min-h-[220px] resize-y leading-relaxed placeholder:text-muted-foreground/60', fieldErrors.content ? 'border-destructive focus-visible:border-destructive focus-visible:ring-ring' : '')}
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: undefined }));
                      }}
                      disabled={isSubmitting}
                      maxLength={CONTENT_MAX}
                      placeholder={'구매 시기, 사용 기간, 상태, 거래 방식(직거래/택배), 포함 구성품 등을 적어주세요.'}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {content.trim().length}/{CONTENT_MAX}
                      </span>
                      {fieldErrors.content ? <p className="text-xs text-destructive">{fieldErrors.content}</p> : null}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── 섹션 5: 이미지 / 파일 첨부 ── */}
              <section className="rounded-xl border border-border bg-card shadow-sm" ref={attachmentsRef}>
                <div className="flex items-center gap-3 border-b border-border px-5 py-4 md:px-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">판매 이미지 / 파일</h2>
                    <p className="text-[11px] text-muted-foreground">실물 사진을 첨부하면 거래 성사율이 높아집니다.</p>
                  </div>
                </div>
                <div className="px-5 py-5 md:px-6 space-y-4">
                  {fieldErrors.attachments ? <p className="text-xs text-destructive">{fieldErrors.attachments}</p> : null}

                  <Tabs defaultValue="image" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="image" className="gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" />
                        이미지 업로드
                      </TabsTrigger>
                      <TabsTrigger value="file" className="gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        파일 업로드
                      </TabsTrigger>
                    </TabsList>

                    {/* 이미지 */}
                    <TabsContent value="image" className="pt-4 space-y-3">
                      <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-[12px] text-muted-foreground">
                        <span className="font-medium text-foreground">첫 번째 이미지가 대표 이미지</span>로 사용됩니다. 최소 1장 이상 첨부를 권장합니다. (최대 5장)
                      </div>
                      <ImageUploader value={images} onChange={setImages} max={5} folder="community/posts" onUploadingChange={setIsUploadingImages} />
                    </TabsContent>

                    {/* 파일 */}
                    <TabsContent value="file" className="pt-4 space-y-4">
                      <div
                        className="rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/30 cursor-pointer bg-muted/20"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          if (e.target !== e.currentTarget) return;
                          fileInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          addFiles(Array.from(e.dataTransfer.files || []));
                        }}
                      >
                        <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">파일을 드래그하거나 클릭하여 업로드</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          문서 파일만 가능 (파일당 최대 {MAX_SIZE_MB}MB, 최대 {MAX_FILES}개)
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
                          <p className="text-xs text-muted-foreground">
                            첨부된 파일 ({selectedFiles.length}/{MAX_FILES})
                          </p>
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                            {selectedFiles.map((file, index) => (
                              <div key={`${file.name}-${index}`} className="group relative flex flex-col justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 transition hover:border-primary/30">
                                <div className="flex flex-col gap-0.5 text-xs">
                                  <span className="truncate font-medium text-foreground" title={file.name}>
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
                </div>
              </section>

              {/* ── 하단 액션 (모바일) ── */}
              <div className="flex items-center justify-end gap-3 pt-2 lg:hidden">
                <Button type="button" variant="outline" disabled={isSubmitting || isUploadingImages || isUploadingFiles} onClick={handleCancel}>
                  취소
                </Button>
                <Button type="submit" className="gap-2 px-6" disabled={isSubmitting || isUploadingImages || isUploadingFiles}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      등록 중...
                    </>
                  ) : (
                    '상품 등록'
                  )}
                </Button>
              </div>
            </div>

            {/* ====== 오른쪽: sticky 요약 카드 (lg+) ====== */}
            <aside className="hidden lg:block lg:w-[300px] xl:w-[320px] flex-shrink-0">
              <div className="sticky top-24 space-y-4">
                {/* 입력 요약 */}
                <div className="rounded-xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border px-5 py-3">
                    <h3 className="text-sm font-semibold text-foreground">등록 요약</h3>
                  </div>
                  <div className="px-5 py-4 space-y-3 text-sm">
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
                      <span className="text-muted-foreground">제목</span>
                      <span className="max-w-[140px] truncate font-medium text-foreground">{title.trim() || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">이미지</span>
                      <span className="font-medium text-foreground">{images.length}장</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">파일</span>
                      <span className="font-medium text-foreground">{selectedFiles.length}개</span>
                    </div>
                  </div>
                </div>

                {/* 체크리스트 */}
                <div className="rounded-xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border px-5 py-3">
                    <h3 className="text-sm font-semibold text-foreground">등록 전 확인</h3>
                  </div>
                  <div className="px-5 py-4 space-y-2">
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

                {/* CTA 버튼 */}
                <div className="space-y-2">
                  <Button type="submit" className="w-full gap-2" disabled={isSubmitting || isUploadingImages || isUploadingFiles}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        등록 중...
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4" />
                        상품 등록
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" className="w-full" disabled={isSubmitting || isUploadingImages || isUploadingFiles} onClick={handleCancel}>
                    취소
                  </Button>
                </div>

                {errorMsg && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">{errorMsg}</div>}
              </div>
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}
