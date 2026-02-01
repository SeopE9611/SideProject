'use client';

import { FormEvent, useEffect, useState, useRef, ChangeEvent, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowLeft, Loader2, Upload, X, AlertTriangle } from 'lucide-react';
import useSWR, { mutate as globalMutate } from 'swr';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CommunityPost } from '@/lib/types/community';
import ImageUploader from '@/components/admin/ImageUploader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { CATEGORY_OPTIONS } from '@/app/board/market/_components/FreeBoardWriteClient';
import { getMarketBrandOptions, isMarketBrandCategory, isValidMarketBrandForCategory } from '@/app/board/market/_components/market.constants';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

type Props = {
  id: string;
};

type DetailResponse = { ok: true; item: CommunityPost } | { ok: false; error: string };

type AttachmentItem = NonNullable<CommunityPost['attachments']>[number];

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

  // 기존 글 불러오기
  const { data, error, isLoading } = useSWR<DetailResponse>(`/api/community/posts/${id}?type=market`, fetcher);

  type Baseline = {
    title: string;
    content: string;
    category: string;
    brand: string;
    imagesJson: string;
  };
  const baselineRef = useRef<Baseline | null>(null);

  const isDirty = useMemo(() => {
    const b = baselineRef.current;
    if (!b) return false;

    const imagesJson = JSON.stringify(images);
    return title !== b.title || content !== b.content || String(category) !== b.category || brand !== b.brand || imagesJson !== b.imagesJson || selectedFiles.length > 0;
  }, [title, content, category, brand, images, selectedFiles.length]);

 useUnsavedChangesGuard(isDirty && !isSubmitting && !isUploadingImages && !isUploadingFiles);


  const confirmLeaveIfDirty = (go: () => void) => {
    if (!isDirty) return go();
    if (isSubmitting || isUploadingImages || isUploadingFiles) return;

    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE)
    if (ok) go();
  };

  const onLeaveLinkClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!isDirty) return;
    if (isSubmitting || isUploadingImages || isUploadingFiles) return;

    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE)
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

      setTitle(nextTitle);
      setContent(nextContent);
      setImages(nextImages);
      setCategory(nextCategory);
      setBrand(nextBrand);

      // 최초 1회만 baseline 저장 (초기 로드 값 기준으로 dirty 판단)
      if (!baselineRef.current) {
        baselineRef.current = {
          title: nextTitle,
          content: nextContent,
          category: String(nextCategory),
          brand: nextBrand,
          imagesJson: JSON.stringify(nextImages),
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

  // 간단한 프론트 유효성 검증
  const validate = () => {
    if (isMarketBrandCategory(category) && !brand) return '브랜드를 선택해 주세요.';

    if (!title.trim()) return '제목을 입력해 주세요.';
    if (!content.trim()) return '내용을 입력해 주세요.';
    return null;
  };

  // 파일 업로드 관련

  const MAX_FILES = 5;
  const MAX_SIZE_MB = 10;

  // 기존 첨부 개수 + 새로 선택한 파일 개수 함께 계산
  const totalAttachmentCount = attachments.length + selectedFiles.length;

  // 파일 추가 (드롭/선택 공통)
  const addFiles = (files: File[]) => {
    if (!files.length) return;

    // 개수 제한 (기존 attachments + 새로 선택한 파일)
    if (totalAttachmentCount + files.length > MAX_FILES) {
      alert(`파일은 최대 ${MAX_FILES}개까지만 업로드할 수 있어요.`);
      return;
    }

    // 용량 제한
    const tooLarge = files.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (tooLarge) {
      alert(`파일당 ${MAX_SIZE_MB}MB를 초과할 수 없어요.`);
      return;
    }

    // 이미지 파일 방지 (이미지는 이미지 탭에서만)
    const hasImage = files.some((f) => f.type?.startsWith('image/'));
    if (hasImage) {
      alert('이미지 파일은 "이미지 업로드" 탭에서 업로드해 주세요.');
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
    } satisfies AttachmentItem;
  };

  // 제출 핸들러
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const msg = validate();
    if (msg) {
      setErrorMsg(msg);
      return;
    }

    if (isUploadingImages || isUploadingFiles) {
      setErrorMsg('첨부 업로드가 끝날 때까지 잠시만 기다려 주세요.');
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
      };

      // 새 파일을 업로드한 경우에만 attachments를 보냄
      //    (선택된 파일이 없으면 서버에서 기존 attachments 유지)
      if (selectedFiles.length > 0 && nextAttachments && nextAttachments.length > 0) {
        payload.attachments = nextAttachments;
      }

      const res = await fetch(`/api/community/posts/${id}?type=market`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const json = await res.json();

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Skeleton className="h-4 w-16" />
            <span>›</span>
            <Skeleton className="h-4 w-20" />
            <span>›</span>
            <Skeleton className="h-4 w-16" />
          </div>
          <Card className="border-0 bg-white/80 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
            <CardContent className="space-y-4 p-6">
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">해당 글을 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었을 수 있습니다.</div>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 상단 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* 브레드크럼: 게시판 > 자유 게시판 > 글 수정 */}
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-teal-600 dark:text-teal-400">게시판</span>
              <span className="mx-1">›</span>
              <Link href="/board/market" onClick={onLeaveLinkClick} className="text-gray-500 underline-offset-2 hover:underline dark:text-gray-300">
                중고 거래
              </Link>
              <span className="mx-1">›</span>
              <span>글 수정</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">중고 거래 글 수정</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 md:text-base">기존에 작성한 글의 내용을 수정합니다. 제목과 내용을 확인한 뒤 저장해 주세요.</p>
            {/* 이탈 경고(고정 노출) */}
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
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

        {/* 본문 카드 (수정 폼) */}
        <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
          <CardHeader className="space-y-1 border-b border-gray-100 pb-4 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-50">
              <MessageSquare className="h-4 w-4 text-teal-500" />
              <span>글 내용 수정</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* 분류 선택 */}
              <div className="space-y-2">
                <Label>분류</Label>
                <div className="flex flex-wrap gap-2 text-xs">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCategory(opt.value)}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px]',
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

              {/* 제목 */}
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSubmitting} />
              </div>

              {/* 내용 */}
              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea id="content" className="min-h-[200px]" value={content} onChange={(e) => setContent(e.target.value)} disabled={isSubmitting} />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">신청/주문 문의 등 개인 정보가 필요한 내용은 고객센터 Q&amp;A 게시판을 활용해 주세요.</p>
              </div>

              {/* 첨부 영역: 이미지 / 파일 탭 (작성 페이지와 동일 패턴) */}
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
                        <Upload className="h-4 w-4 mr-2" />
                        파일 선택
                      </Button>
                      <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt" className="sr-only" onChange={handleFileInputChange} />
                    </div>

                    {/* 새로 선택한 파일 카드 목록 */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">새로 첨부할 파일 ({selectedFiles.length}개)</p>
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
              {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">{errorMsg}</div>}

              {/* 하단 버튼 */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className={cn('gap-2')} disabled={isSubmitting || isUploadingImages || isUploadingFiles} onClick={() => confirmLeaveIfDirty(() => router.push(`/board/market/${id}`))}>
                  <ArrowLeft className="h-4 w-4" />
                  <span>취소</span>
                </Button>
                <Button type="submit" size="sm" className={cn('gap-2')} disabled={isSubmitting || isUploadingImages || isUploadingFiles}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>수정하기</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
