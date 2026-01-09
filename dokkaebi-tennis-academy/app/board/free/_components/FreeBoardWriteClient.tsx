'use client';

import { FormEvent, useRef, useState, ChangeEvent } from 'react';
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
import SiteContainer from '@/components/layout/SiteContainer';

export const CATEGORY_OPTIONS = [
  { value: 'general', label: '자유' },
  { value: 'info', label: '정보' },
  { value: 'qna', label: '질문' },
  { value: 'tip', label: '노하우' },
  { value: 'etc', label: '기타' },
] as const;

type CategoryValue = (typeof CATEGORY_OPTIONS)[number]['value'];

export default function FreeBoardWriteClient() {
  const router = useRouter();

  // 폼 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 카테고리 상태 (기본 'general')
  const [category, setCategory] = useState<CategoryValue>('general');

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

  // 간단한 프론트 유효성 검증
  const validate = () => {
    if (!title.trim()) {
      return '제목을 입력해 주세요.';
    }
    if (!content.trim()) {
      return '내용을 입력해 주세요.';
    }
    return null;
  };

  const MAX_FILES = 5;
  const MAX_SIZE_MB = 10;

  // 파일 추가 (드롭/선택 공통)
  const addFiles = (files: File[]) => {
    if (!files.length) return;

    // 개수 제한
    if (selectedFiles.length + files.length > MAX_FILES) {
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
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !content.trim()) {
      setErrorMsg('제목과 내용을 입력해 주세요.');
      return;
    }

    if (isUploadingImages || isUploadingFiles) {
      setErrorMsg('첨부 업로드가 끝날 때까지 잠시만 기다려 주세요.');
      return;
    }

    try {
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

      const payload: any = {
        type: 'free',
        title: title.trim(),
        content: content.trim(),
        images,
        category,
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
        setErrorMsg(data?.error ?? '글 작성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      const goId = data.id ?? data.item?._id ?? data.item?.id;
      router.push(goId ? `/board/free/${goId}` : '/board/free');
      router.refresh();
    } catch (err) {
      console.error(err);
      setErrorMsg('글 작성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-10 space-y-8">
        {/* 상단 헤더 영역 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* 브레드크럼: 게시판 > 자유 게시판 > 글쓰기 */}
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-teal-600 dark:text-teal-400">게시판</span>
              <span className="mx-1">›</span>
              <Link href="/board/free" className="text-gray-500 underline-offset-2 hover:underline dark:text-gray-300">
                자유 게시판
              </Link>
              <span className="mx-1">›</span>
              <span>글쓰기</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">자유 게시판 글쓰기</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 md:text-base">테니스 관련 질문, 정보 공유, 후기, 잡담 등 다양한 이야기를 자유롭게 남겨 보세요.</p>
          </div>

          {/* 우측 버튼들: 목록으로 / 게시판 홈 */}
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href="/board/free">
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
              <CardTitle className="text-base md:text-lg">자유 게시판 글 작성</CardTitle>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 md:text-sm">다른 이용자들이 함께 볼 수 있다는 점을 고려해, 예의를 지키는 표현을 사용해 주세요.</p>
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
                        category === opt.value ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/40 dark:text-blue-100' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* 제목 입력 */}
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSubmitting} />
              </div>

              {/* 내용 입력 */}
              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea id="content" className="min-h-[200px] resize-y" value={content} onChange={(e) => setContent(e.target.value)} disabled={isSubmitting} />
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
              {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/60">{errorMsg}</div>}

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
      </SiteContainer>
    </div>
  );
}
