'use client';

import { FormEvent, useRef, useState, ChangeEvent, useEffect } from 'react';
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

export default function FreeBoardWriteClient() {
  const router = useRouter();
  const [brand, setBrand] = useState<string>('');

  // 폼 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 카테고리 상태 (기본 'racket')
  const [category, setCategory] = useState<CategoryValue>('racket');

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

  // 에러 표시는 "화면 박스 + 토스트"를 함께 사용(운영/UX 둘 다 챙김)
  const emitError = (msg: string) => {
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

  // 간단한 프론트 유효성 검증
  const validate = () => {
    const t = title.trim();
    const c = content.trim();

    // 브랜드가 필요한 카테고리(라켓/스트링)는 브랜드 선택이 필수 + 카테고리-브랜드 정합성까지 체크
    if (isMarketBrandCategory(category)) {
      if (!brand) return '브랜드를 선택해 주세요.';
      if (!isValidMarketBrandForCategory(category, brand)) return '선택한 브랜드가 분류에 맞지 않습니다.';
    }

    // 제목/내용 기본 + min/max 길이
    if (!t || !c) return '제목과 내용을 입력해 주세요.';
    if (t.length < TITLE_MIN) return `제목은 ${TITLE_MIN}자 이상 입력해 주세요.`;
    if (t.length > TITLE_MAX) return `제목은 ${TITLE_MAX}자 이내로 입력해 주세요.`;
    if (c.length < CONTENT_MIN) return `내용은 ${CONTENT_MIN}자 이상 입력해 주세요.`;
    if (c.length > CONTENT_MAX) return `내용은 ${CONTENT_MAX}자 이내로 입력해 주세요.`;

    // 게시판 입력은 기본적으로 HTML/스크립트 입력을 차단하는 편이 안전
    if (hasScriptLike(t) || hasScriptLike(c)) return '스크립트로 의심되는 입력이 포함되어 저장할 수 없습니다.';
    if (hasHtmlLike(t) || hasHtmlLike(c)) return 'HTML 태그는 사용할 수 없습니다.';

    // 업로드 제한은 UI에서 막아도 devtools/드롭으로 우회될 수 있어 제출 직전 1회 더 방어
    if (images.length > 5) return '이미지는 최대 5장까지만 업로드할 수 있어요.';
    if (selectedFiles.length > MAX_FILES) return `파일은 최대 ${MAX_FILES}개까지만 업로드할 수 있어요.`;

    return null;
  };

  const MAX_FILES = 5;
  const MAX_SIZE_MB = 10;

  // 파일 추가 (드롭/선택 공통)
  const addFiles = (files: File[]) => {
    if (!files.length) return;

    // 개수 제한
    if (selectedFiles.length + files.length > MAX_FILES) {
      emitError(`파일은 최대 ${MAX_FILES}개까지만 업로드할 수 있어요.`);
      return;
    }

    // 용량 제한
    const tooLarge = files.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (tooLarge) {
      emitError(`파일당 ${MAX_SIZE_MB}MB를 초과할 수 없어요.`);
      return;
    }

    // 이미지 파일 방지 (이미지는 이미지 탭에서만)
    const isImageExt = (name: string) => /\.(jpe?g|png|gif|webp)$/i.test(name);
    const hasImage = files.some((f) => f.type?.startsWith('image/') || isImageExt(f.name));
    if (hasImage) {
      emitError('이미지 파일은 "이미지 업로드" 탭에서 업로드해 주세요.');
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
      emitError('문서 파일(PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX/HWP/HWPX/TXT)만 업로드할 수 있어요.');
      return;
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
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 중복 제출 방지(연타/더블클릭 레이스까지 방어)
    if (isSubmitting || submitRef.current) return;

    const msg = validate();
    if (msg) {
      emitError(msg);
      return;
    }

    if (isUploadingImages || isUploadingFiles) {
      emitError('첨부 업로드가 끝날 때까지 잠시만 기다려 주세요.');
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

      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        emitError(data?.details?.[0]?.message ?? data?.error ?? '글 작성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      const goId = data.id ?? data.item?._id ?? data.item?.id;
      showSuccessToast('게시글이 등록되었습니다.');
      router.push(goId ? `/board/market/${goId}` : '/board/market');
      router.refresh();
    } catch (err) {
      console.error(err);
      emitError('글 작성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
      submitRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 상단 헤더 영역 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* 브레드크럼: 게시판 > 중고 거래 게시판 > 글쓰기 */}
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-teal-600 dark:text-teal-400">게시판</span>
              <span className="mx-1">›</span>
              <Link href="/board/market" className="text-gray-500 underline-offset-2 hover:underline dark:text-gray-300">
                중고 거래 게시판
              </Link>
              <span className="mx-1">›</span>
              <span>글쓰기</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">중고 거래 게시판 글쓰기</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 md:text-base">회원들과 자유롭게 테니스 상품을 거래 해보세요.</p>
          </div>

          {/* 우측 버튼들: 목록으로 / 게시판 홈 */}
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href="/board/market">
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
        <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
          <CardHeader className="flex flex-row items-center gap-3 border-b bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-900/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base md:text-lg">중고 거래 게시판 글 작성</CardTitle>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 md:text-sm">테니스 라켓, 스트링,장비 등 판매하고자 하는 상품을 작성해보세요.</p>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* 분류 선택 */}
              <div className="space-y-2">
                <Label>분류</Label>
                <div className="flex flex-wrap gap-2 text-sm">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCategory(opt.value as CategoryValue)}
                      className={cn(
                        'rounded-full border px-3 py-1',
                        category === opt.value ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/40 dark:text-blue-100' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {isMarketBrandCategory(category) && (
                <div className="space-y-2">
                  <Label>브랜드</Label>
                  <select value={brand} onChange={(e) => setBrand(e.target.value)} disabled={isSubmitting} className="h-10 w-full rounded-md border bg-white px-3 text-sm shadow-sm">
                    <option value="">브랜드를 선택해 주세요</option>
                    {getMarketBrandOptions(category).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">라켓/스트링 글은 브랜드 선택이 필수입니다.</p>
                </div>
              )}

              {/* 제목 입력 */}
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSubmitting} maxLength={TITLE_MAX} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {title.trim().length}/{TITLE_MAX}
                </p>
              </div>

              {/* 내용 입력 */}
              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea id="content" className="min-h-[200px] resize-y" value={content} onChange={(e) => setContent(e.target.value)} disabled={isSubmitting} maxLength={CONTENT_MAX} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {content.trim().length}/{CONTENT_MAX}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">신청/주문 문의 등 개인 정보가 필요한 내용은 고객센터 Q&amp;A 게시판을 활용해 주세요.</p>
              </div>

              {/* 첨부 영역: 이미지 / 파일 탭 */}
              <div className="space-y-3">
                <Label>첨부 (선택)</Label>

                <Tabs defaultValue="image" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="image">이미지 업로드</TabsTrigger>
                    <TabsTrigger value="file">파일 업로드</TabsTrigger>
                  </TabsList>

                  {/* 이미지 업로드 탭 */}
                  <TabsContent value="image" className="pt-4 space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">최대 5장까지 업로드할 수 있으며, 첫 번째 이미지가 대표로 사용됩니다.</p>
                    <ImageUploader value={images} onChange={setImages} max={5} folder="community/posts" onUploadingChange={setIsUploadingImages} />
                  </TabsContent>

                  {/* 파일 업로드 탭 */}
                  <TabsContent value="file" className="pt-4 space-y-4">
                    {/* 드롭존 */}
                    <div
                      className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer bg-white/60 dark:bg-gray-900/40"
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
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">클릭하여 파일을 선택하거나, 이 영역으로 드래그하여 업로드할 수 있어요.</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          첨부된 파일 ({selectedFiles.length}/{MAX_FILES})
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="group relative flex flex-col justify-between rounded-lg bg-white dark:bg-gray-900/80 px-3 py-2 shadow-sm hover:shadow-md ring-1 ring-gray-200/60 hover:ring-2 hover:ring-blue-400 transition"
                            >
                              <div className="flex-1 flex flex-col gap-1 text-xs">
                                <span className="font-medium truncate" title={file.name}>
                                  {file.name}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500"
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

              {/* 에러 메시지 */}
              {/* {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/60">{errorMsg}</div>} */}

              {/* 버튼 영역 */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" disabled={isSubmitting || isUploadingImages || isUploadingFiles} onClick={() => router.back()}>
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
