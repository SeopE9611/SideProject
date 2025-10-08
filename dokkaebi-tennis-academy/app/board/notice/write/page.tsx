'use client';

import Link from 'next/link';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import NextImage from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, ArrowLeft, Bell, Upload, X, Pin } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';

const NOTICE_LABEL_BY_CODE: Record<string, string> = {
  general: '일반',
  event: '이벤트',
  academy: '아카데미',
  maintenance: '점검',
  urgent: '긴급',
};

// 라벨 -> 코드 (상세에서 받아온 라벨을 셀렉트의 값(코드)로 되돌리기)
const NOTICE_CODE_BY_LABEL: Record<string, string> = Object.fromEntries(Object.entries(NOTICE_LABEL_BY_CODE).map(([code, label]) => [label, code]));

export default function NoticeWritePage() {
  const sp = useSearchParams();
  const router = useRouter();
  const editId = sp.get('id'); // 있으면 수정 모드

  // 프리필은 한번만 실행
  const prefilledRef = useRef(false);

  // 파일 상태
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // 미리보기 URL 배열 (이미지에만 생성)
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  useEffect(() => {
    const urls = selectedFiles.map((f) => (f.type?.startsWith('image/') ? URL.createObjectURL(f) : null));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [selectedFiles]);

  // 모든 파일에 대한 blob URL (이미지/문서 공통)
  const [blobUrls, setBlobUrls] = useState<(string | null)[]>([]);
  useEffect(() => {
    const urls = selectedFiles.map((f) => URL.createObjectURL(f));
    setBlobUrls(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [selectedFiles]);

  // 라이트박스(Dialog) 상태
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 프리뷰 index에서 모달 열기 (이미지들만 모아서)
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

  const [isPinned, setIsPinned] = useState(false);
  const [category, setCategory] = useState<string>('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<Array<{ url: string; name?: string; size?: number }>>([]);

  // 실제 PATCH 시 제외할 기존 첨부 제거
  const removeExisting = (idx: number) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // (옵션) 스토리지 삭제까지 원할 때: 삭제할 경로 목록
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);

  // Supabase public URL -> storage path 추출 (예: boards/notice/abc.jpg)
  const toStoragePathFromPublicUrl = (url: string) => {
    // https://.../storage/v1/object/public/<bucket>/<path>
    const m = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return m ? m[1] : '';
  };

  // 기존 첨부 제거 + 스토리지 삭제 경로 기록(옵션)
  const removeExistingAndMark = (idx: number) => {
    setExistingAttachments((prev) => {
      const next = [...prev];
      const [gone] = next.splice(idx, 1);
      if (gone?.url) {
        const p = toStoragePathFromPublicUrl(gone.url);
        if (p) setRemovedPaths((rs) => Array.from(new Set([...rs, p])));
      }
      return next;
    });
  };

  // 상세 불러오기 (수정 모드일 때만)
  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
  const { data: detail } = useSWR(editId ? `/api/boards/${editId}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60_000, // 1분 정도
  });
  // 프리필: 상세 응답을 코드값으로 역변환해서 넣는다.
  useEffect(() => {
    if (!editId || !detail?.item || prefilledRef.current) return;
    const p = detail.item;
    setTitle(p.title ?? '');
    setContent(p.content ?? '');
    setIsPinned(!!p.isPinned);
    setCategory(NOTICE_CODE_BY_LABEL[p.category as string] ?? 'general');

    if (Array.isArray(p.attachments)) {
      setExistingAttachments(p.attachments.map((a: any) => ({ url: String(a.url), name: a.name, size: a.size })));
    }
    // 프리필 직후에 편집 중 임시 상태 초기화
    setSelectedFiles([]);
    setRemovedPaths([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    prefilledRef.current = true; // 두 번 다시 프리필하지 않음
  }, [editId, detail]);

  const MAX = 5; // 공지: 5개
  const MAX_MB = 10; // 공지: 10MB

  // 허용 MIME/확장자 (확장)
  const ALLOWED = new Set([
    // 이미지
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // 문서/오피스/한글
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/x-hwp',
    'application/haansoft-hwp',
    'application/x-hwpml',
    'text/plain',
  ]);

  function addFiles(files: File[]) {
    if (!files.length) return;

    if (selectedFiles.length + files.length > MAX) {
      alert(`최대 ${MAX}개까지만 업로드할 수 있어요.`);
      return;
    }
    if (files.some((f) => f.size > MAX_MB * 1024 * 1024)) {
      alert(`파일당 최대 ${MAX_MB}MB까지 업로드할 수 있어요.`);
      return;
    }
    // 일부 브라우저에서 MIME이 비어있을 수 있어 확장자로 한 번 더 체크
    const extOk = (name: string) => /\.(pdf|docx?|xlsx?|xls|pptx?|ppt|hwp|hwpx|txt|jpe?g|png|gif|webp)$/i.test(name);
    if (files.some((f) => !(ALLOWED.has(f.type) || extOk(f.name)))) {
      alert('이미지(JPG/PNG/GIF/WEBP) 또는 문서(PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX/HWP/HWPX/TXT)만 업로드할 수 있어요.');
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);

    // (input change일 때만) 다음 선택을 위해 초기화
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files || []));
  }

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  async function handleSubmit() {
    try {
      if (!title.trim() || !content.trim()) {
        alert('제목과 내용을 입력해주세요.');
        return;
      }
      setSubmitting(true);

      // Supabase 업로드는 기존 코드 재사용
      const BUCKET = 'tennis-images';
      const FOLDER = 'boards/notice';

      const getImageSize = (file: File) =>
        new Promise<{ width?: number; height?: number }>((resolve) => {
          if (!file.type?.startsWith('image/')) return resolve({});
          const url = URL.createObjectURL(file);
          const img = new window.Image();
          img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
            URL.revokeObjectURL(url);
          };
          img.onerror = () => {
            resolve({});
            URL.revokeObjectURL(url);
          };
          img.src = url;
        });

      const uploadOne = async (file: File) => {
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const meta = await getImageSize(file);
        const downloadUrl = `${data.publicUrl}${data.publicUrl.includes('?') ? '&' : '?'}download=${encodeURIComponent(file.name)}`;
        return {
          url: data.publicUrl,
          storagePath: path, // 나중 삭제를 위해 경로 보관
          downloadUrl,
          name: file.name,
          size: file.size,
          mime: file.type || undefined,
          width: meta.width,
          height: meta.height,
        };
      };

      // 새로 추가한 파일 업로드
      const uploaded = selectedFiles.length > 0 ? await Promise.all(selectedFiles.map(uploadOne)) : [];
      const cleanNew = uploaded.map((a) => ({ url: a.url, name: a.name, size: a.size, storagePath: a.storagePath }));

      // 첨부 + 새 첨부 병합
      const attachments = [...existingAttachments, ...cleanNew];

      const payload: any = {
        type: 'notice',
        title,
        content,
        isPinned,
        category: NOTICE_LABEL_BY_CODE[category] ?? '일반', // 코드 -> 라벨 변환
        attachments,
        ...(removedPaths.length > 0 ? { removedPaths } : {}), // 새 업로드 파일을 올리고 -> 응답을 attachments로 병합해서 서버로 보냄
      };

      const url = editId ? `/api/boards/${editId}` : '/api/boards';
      const method = editId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        json = { ok: false, error: text };
      }
      // 응답 파싱 후 성공 검사 통과
      if (!res.ok || !json?.ok) {
        const msg = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
        throw new Error(msg || (editId ? '수정 실패(권한 확인 필요)' : '저장 실패(권한 확인 필요)'));
      }
      // 편집 상태 리셋
      setSelectedFiles([]);
      setRemovedPaths([]);
      setExistingAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // 이동 전 캐시 최신화 + 서버컴포넌트 새로고침
      const goId = editId || json.item?._id;
      if (goId) {
        if (json.item) {
          await mutate(`/api/boards/${goId}`, { ok: true, item: json.item }, false);
        } else {
          await mutate(`/api/boards/${goId}`);
        }
        router.replace(`/board/notice/${goId}`);
        router.refresh();
        return;
      }

      window.location.href = '/board/notice';
    } catch (e: any) {
      alert(e?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild className="p-2">
              <Link href="/board/notice">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 shadow-lg">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{editId ? '공지사항 수정' : '공지사항 작성'}</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">중요한 소식을 회원들에게 전달하세요</p>
              </div>
            </div>
          </div>

          <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/50 dark:to-teal-950/50 border-b">
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <span>{editId ? '공지사항 수정' : '새 공지사항 작성'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <Label htmlFor="category" className="text-base font-semibold">
                  카테고리 <span className="text-red-500">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="h-12 bg-white dark:bg-gray-700">
                    <SelectValue placeholder="공지사항 카테고리를 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          일반
                        </Badge>
                        <span>일반적인 공지사항</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="event">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          이벤트
                        </Badge>
                        <span>할인, 프로모션 등 이벤트</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="academy">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          아카데미
                        </Badge>
                        <span>레슨, 프로그램 관련</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="maintenance">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          점검
                        </Badge>
                        <span>시스템 점검, 휴무 안내</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          긴급
                        </Badge>
                        <span>긴급 공지사항</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="title" className="text-base font-semibold">
                  제목 <span className="text-red-500">*</span>
                </Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지사항 제목을 입력해주세요" className="h-12 bg-white dark:bg-gray-700 text-base" />
              </div>

              <div className="space-y-3">
                <Label htmlFor="content" className="text-base font-semibold">
                  내용 <span className="text-red-500">*</span>
                </Label>
                <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="공지사항 내용을 작성해주세요" className="min-h-[300px] bg-white dark:bg-gray-700 text-base resize-none" />
              </div>
              {/* 기존 첨부 (수정 모드에서만 표시) */}
              {editId && existingAttachments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">기존 첨부</Label>
                  <ul className="divide-y rounded-lg border bg-white/70 dark:bg-gray-800/50">
                    {existingAttachments.map((att, idx) => {
                      const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(att.url);
                      return (
                        <li key={att.url + idx} className="flex items-center justify-between gap-3 p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {isImage ? (
                              <img src={att.url || '/placeholder.svg'} alt={att.name ?? 'image'} className="h-10 w-10 rounded object-cover border" />
                            ) : (
                              <div className="h-10 w-10 flex items-center justify-center rounded border text-xs text-gray-500">FILE</div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{att.name ?? att.url}</div>
                              <div className="text-xs text-gray-500">{att.size ? `${(att.size / 1024).toFixed(0)} KB` : ''}</div>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            <a href={att.url} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600">
                              열기
                            </a>
                            {/* 스토리지까지 지우지 않을 때 ↓ */}
                            {/* <Button type="button" variant="outline" size="sm" onClick={() => removeExisting(idx)}>제거</Button> */}
                            {/* 스토리지까지 지울 예정이면 ↓ */}
                            <Button type="button" variant="outline" size="sm" onClick={() => removeExistingAndMark(idx)}>
                              제거
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-1 text-xs text-gray-500">
                    * ‘제거’를 누르면 저장 시 해당 첨부가 게시물에서 제외됩니다.
                    {` `}
                    {`(옵션) 스토리지 파일 삭제도 활성화되면 실제 파일도 함께 삭제됩니다.`}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="image" className="text-base font-semibold">
                  첨부파일 (선택사항)
                </Label>
                <div className="space-y-4">
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      // 버튼 클릭이 버블링되어 다시 열리는 것 방지
                      if (e.target !== e.currentTarget) return;
                      fileInputRef.current?.click();
                    }}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? fileInputRef.current?.click() : null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      addFiles(Array.from(e.dataTransfer.files || []));
                    }}
                  >
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">클릭하여 이미지 또는 파일을 선택하거나 드래그하여 업로드하세요</p>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt" onChange={onInputChange} className="sr-only" />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation(); // 부모 드롭존 onClick으로 버블링 금지
                        fileInputRef.current?.click(); // 파일창 열기
                      }}
                      className="mt-2"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      파일 선택
                    </Button>
                  </div>

                  {/* 미리보기 썸네일 */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">첨부된 파일 ({selectedFiles.length}/5)</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {selectedFiles.map((file, index) => {
                          const isImage = file.type?.startsWith('image/');
                          const url = blobUrls[index]; // 이미지 썸네일/문서 다운로드에 사용

                          return (
                            <div key={index} className="group relative rounded-lg overflow-hidden bg-white dark:bg-gray-700 shadow-sm ring-1 ring-gray-200/60 hover:ring-2 hover:ring-blue-400 transition">
                              {/* 콘텐츠 */}
                              {isImage ? (
                                url ? (
                                  <div className="relative w-full h-28">
                                    <NextImage src={url} alt={file.name} fill className="object-cover transition-transform duration-150 group-hover:scale-[1.02]" onClick={() => openViewerFromIndex(index)} priority={false} />
                                  </div>
                                ) : (
                                  <div className="h-28 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                                )
                              ) : (
                                <div className="h-28 flex flex-col items-center justify-center gap-1 px-2 text-center">
                                  <div className="text-[11px] font-medium truncate max-w-[90%]">{file.name}</div>
                                  <a
                                    href={url ?? '#'}
                                    download={file.name}
                                    className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 transition"
                                  >
                                    다운로드
                                  </a>
                                </div>
                              )}

                              {/* 파일 크기 */}
                              <div className="absolute left-2 bottom-2 text-[11px] px-1.5 py-0.5 rounded bg-white/85 dark:bg-gray-800/85">{(file.size / 1024 / 1024).toFixed(2)} MB</div>

                              {/* 삭제 버튼 */}
                              <button type="button" className="absolute top-1.5 right-1.5 rounded-full bg-white/95 dark:bg-gray-800/95 shadow p-1 opacity-90 hover:opacity-100" onClick={() => removeFile(index)} aria-label="첨부 제거">
                                <X className="h-4 w-4" />
                              </button>

                              {/* 이미지 전용 심플 오버레이 아이콘 */}
                              {isImage && url && (
                                <div className="pointer-events-none absolute bottom-1.5 right-1.5">
                                  <div
                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150
                          rounded-full bg-black/50 p-1.5 backdrop-blur-[1px]"
                                  >
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    • 최대 5개 / 파일당 최대 10MB
                    <br />• 지원 형식: 이미지(JPG/PNG/GIF/WEBP), 문서(PDF/DOC/DOCX)
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Checkbox id="pinned" checked={isPinned} onCheckedChange={(checked) => setIsPinned(checked as boolean)} className="mt-1" />
                <div className="space-y-1">
                  <label htmlFor="pinned" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center">
                    <Pin className="h-4 w-4 mr-1 text-blue-600" />
                    상단 고정
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">중요한 공지사항을 게시판 상단에 고정하여 표시합니다.</p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between p-8 border-t bg-gray-50/50 dark:bg-gray-700/20">
              <Button variant="outline" asChild size="lg" className="px-8 bg-transparent">
                <Link href="/board/notice">취소</Link>
              </Button>
              <div className="flex space-x-3">
                <Button variant="outline" size="lg" className="px-6 border-blue-200 text-blue-700 hover:bg-blue-50 bg-transparent">
                  임시저장
                </Button>
                <Button size="lg" onClick={handleSubmit} disabled={submitting} className="px-8 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 disabled:opacity-60">
                  {submitting ? (editId ? '수정 중…' : '등록 중…') : editId ? '공지사항 수정' : '공지사항 등록'}
                </Button>
              </div>
            </CardFooter>

            <Dialog open={viewerOpen} onOpenChange={(v) => (v ? setViewerOpen(true) : closeViewer())}>
              <DialogContent className="sm:max-w-4xl p-0 bg-black/90 text-white border-0">
                <DialogHeader className="sr-only">
                  <DialogTitle>이미지 확대 보기</DialogTitle>
                </DialogHeader>

                <div className="relative w-full aspect-video">
                  {viewerImages[viewerIndex] && <NextImage src={viewerImages[viewerIndex]} alt={`이미지 ${viewerIndex + 1}`} fill className="object-contain" priority />}

                  {viewerImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevViewer}
                        className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 dark:bg-white/30 hover:bg-white/30 dark:hover:bg-white/40"
                        aria-label="이전"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={nextViewer}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 dark:bg-white/30 hover:bg-white/30 dark:hover:bg-white/40"
                        aria-label="다음"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  <button type="button" onClick={closeViewer} className="absolute top-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 dark:bg-white/30 hover:bg-white/30 dark:hover:bg-white/40" aria-label="닫기">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {viewerImages.length > 1 && (
                  <div className="p-3 flex flex-wrap gap-2 justify-center bg-black/70">
                    {viewerImages.map((thumb, i) => (
                      <button key={i} type="button" onClick={() => setViewerIndex(i)} className={`relative w-16 h-16 rounded-md overflow-hidden border ${i === viewerIndex ? 'ring-2 ring-blue-400' : ''}`} aria-label={`썸네일 ${i + 1}`}>
                        <NextImage src={thumb} alt={`썸네일 ${i + 1}`} fill className="object-cover" />
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
