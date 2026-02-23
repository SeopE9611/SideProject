'use client';

import { FormEvent, useRef, useState, ChangeEvent, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowLeft, Loader2, Upload, X } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import ImageUploader from '@/components/admin/ImageUploader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { getMarketBrandOptions, isMarketBrandCategory, isValidMarketBrandForCategory } from '@/app/board/market/_components/market.constants';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

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

type FieldKey = 'category' | 'brand' | 'title' | 'content' | 'attachments';
type FieldErrors = Partial<Record<FieldKey, string>>;
const scrollIntoViewOpts: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' };

export default function FreeBoardWriteClient() {
  const router = useRouter();
  const [brand, setBrand] = useState<string>('');

  // 폼 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // 카테고리 상태 (기본 'racket')
  const [category, setCategory] = useState<CategoryValue>('racket');

  // 포커스/스크롤 대상 refs (첫 오류로 이동)
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const brandRef = useRef<HTMLDivElement | null>(null);
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

  // 입력 중(Dirty) 판단: 내용/제목/분류/첨부가 하나라도 있으면 true
  const isDirty = useMemo(() => {
    const t = title.trim();
    const c = content.trim();
    if (t || c) return true;
    if (category !== 'racket') return true;
    if (brand) return true;
    if (images.length > 0) return true;
    if (selectedFiles.length > 0) return true;
    return false;
  }, [title, content, category, brand, images.length, selectedFiles.length]);

  // 탭 닫기/새로고침/주소 직접 변경 등 “브라우저 이탈” 경고
  useUnsavedChangesGuard(isDirty && !isSubmitting);

  const guardLeave = (e: any) => {
    if (!isDirty || isSubmitting) return;
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE)
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
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE)
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

      const order: FieldKey[] = ['category', 'brand', 'title', 'content', 'attachments'];
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
      };
      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }

      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card dark:from-background dark:via-muted dark:to-card">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 상단 헤더 영역 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* 브레드크럼: 게시판 > 중고 거래 게시판 > 글쓰기 */}
            <div className="mb-1 text-sm text-muted-foreground">
              <span className="font-medium text-success">게시판</span>
              <span className="mx-1">›</span>
              <Link href="/board/market" onClick={guardLeave} className="text-muted-foreground underline-offset-2 hover:underline dark:text-muted-foreground">
                중고 거래 게시판
              </Link>
              <span className="mx-1">›</span>
              <span>글쓰기</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">중고 거래 게시판 글쓰기</h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">회원들과 자유롭게 테니스 상품을 거래 해보세요.</p>
          </div>

          {/* 우측 버튼들: 목록으로 / 게시판 홈 */}
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

        {/* 글쓰기 카드 */}
        <Card className="border-0 bg-card shadow-xl backdrop-blur-sm dark:bg-card">
          <CardHeader className="flex flex-row items-center gap-3 border-b bg-gradient-to-r from-background to-card dark:from-background dark:to-card">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-lg dark:bg-primary/20">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base md:text-lg">중고 거래 게시판 글 작성</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">테니스 라켓, 스트링,장비 등 판매하고자 하는 상품을 작성해보세요.</p>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* 분류 선택 */}
              <div className="space-y-2" ref={categoryRef}>
                <Label>분류</Label>
                <div className="flex flex-wrap gap-2 text-sm">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setCategory(opt.value as CategoryValue);
                        if (fieldErrors.category) setFieldErrors((prev) => ({ ...prev, category: undefined }));
                        // 카테고리 변경 시 브랜드 요구 조건이 바뀔 수 있어 brand 에러도 함께 해제
                        if (fieldErrors.brand) setFieldErrors((prev) => ({ ...prev, brand: undefined }));
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1',
                        category === opt.value ? 'border-border bg-primary/10 text-primary dark:border-border dark:bg-primary/20 dark:text-primary' : 'border-border text-muted-foreground dark:border-border dark:text-muted-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {fieldErrors.category ? <p className="text-xs text-destructive">{fieldErrors.category}</p> : null}
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
                    className={cn('h-10 w-full rounded-md border bg-card px-3 text-sm shadow-sm', fieldErrors.brand ? 'border-destructive focus:border-destructive focus:ring-ring' : '')}
                  >
                    <option value="">브랜드를 선택해 주세요</option>
                    {getMarketBrandOptions(category).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.brand ? <p className="text-xs text-destructive">{fieldErrors.brand}</p> : null}
                  <p className="text-xs text-muted-foreground">라켓/스트링 글은 브랜드 선택이 필수입니다.</p>
                </div>
              )}

              {/* 제목 입력 */}
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
                  className={fieldErrors.title ? 'border-destructive focus-visible:border-destructive focus-visible:ring-ring' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  {title.trim().length}/{TITLE_MAX}
                </p>
                {fieldErrors.title ? <p className="text-xs text-destructive">{fieldErrors.title}</p> : null}
              </div>

              {/* 내용 입력 */}
              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea
                  id="content"
                  ref={contentRef}
                  className={cn('min-h-[200px] resize-y', fieldErrors.content ? 'border-destructive focus-visible:border-destructive focus-visible:ring-ring' : '')}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: undefined }));
                  }}
                  disabled={isSubmitting}
                  maxLength={CONTENT_MAX}
                />
                <p className="text-xs text-muted-foreground">
                  {content.trim().length}/{CONTENT_MAX}
                </p>
                {fieldErrors.content ? <p className="text-xs text-destructive">{fieldErrors.content}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">신청/주문 문의 등 개인 정보가 필요한 내용은 고객센터 Q&amp;A 게시판을 활용해 주세요.</p>
              </div>

              {/* 첨부 영역: 이미지 / 파일 탭 */}
              <div className="space-y-3" ref={attachmentsRef}>
                <Label>첨부 (선택)</Label>
                {fieldErrors.attachments ? <p className="text-xs text-destructive">{fieldErrors.attachments}</p> : null}
                <Tabs defaultValue="image" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="image">이미지 업로드</TabsTrigger>
                    <TabsTrigger value="file">파일 업로드</TabsTrigger>
                  </TabsList>

                  {/* 이미지 업로드 탭 */}
                  <TabsContent value="image" className="pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">최대 5장까지 업로드할 수 있으며, 첫 번째 이미지가 대표로 사용됩니다.</p>
                    <ImageUploader value={images} onChange={setImages} max={5} folder="community/posts" onUploadingChange={setIsUploadingImages} />
                  </TabsContent>

                  {/* 파일 업로드 탭 */}
                  <TabsContent value="file" className="pt-4 space-y-4">
                    {/* 드롭존 */}
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-border dark:hover:border-border transition-colors cursor-pointer bg-card"
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
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">클릭하여 파일을 선택하거나, 이 영역으로 드래그하여 업로드할 수 있어요.</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        이미지 파일은 이미지 탭에서 업로드해 주세요. (파일당 최대 {MAX_SIZE_MB}MB, 최대 {MAX_FILES}개)
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
                        <Upload className="h-4 w-4 mr-2" />
                        파일 선택
                      </Button>
                      <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt" className="sr-only" onChange={handleFileInputChange} />
                    </div>

                    {/* 선택된 파일 카드 목록 */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          첨부된 파일 ({selectedFiles.length}/{MAX_FILES})
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="group relative flex flex-col justify-between rounded-lg bg-card px-3 py-2 shadow-sm hover:shadow-md ring-1 ring-ring hover:ring-2 hover:ring-ring transition"
                            >
                              <div className="flex-1 flex flex-col gap-1 text-xs">
                                <span className="font-medium truncate" title={file.name}>
                                  {file.name}
                                </span>
                                <span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-destructive"
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

              {/* 버튼 영역 */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" disabled={isSubmitting || isUploadingImages || isUploadingFiles} onClick={handleCancel}>
                  취소
                </Button>
                <Button type="submit" size="sm" className={cn('gap-2')} disabled={isSubmitting || isUploadingImages || isUploadingFiles}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      등록 중…
                    </>
                  ) : (
                    '작성하기'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
