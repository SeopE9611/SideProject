"use client";

import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";

import ImageUploader from "@/components/admin/ImageUploader";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { richTextToValidationText } from "@/components/editor/rich-text-utils";
import {
  COMMUNITY_RICH_TEXT_CONTENT_MAX,
  COMMUNITY_RICH_TEXT_CONTENT_MIN,
} from "@/lib/community/community-rich-text-policy";
import SiteContainer from "@/components/layout/SiteContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { communityFetch } from "@/lib/community/communityFetch.client";
import { getApiErrorMessage } from "@/lib/fetchers/getApiErrorMessage";
import { useBoardUnsavedChangesGuard } from "@/lib/hooks/useBoardUnsavedChangesGuard";
import { supabase } from "@/lib/supabase";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export const CATEGORY_OPTIONS = [
  { value: "general", label: "자유" },
  { value: "info", label: "정보" },
  { value: "qna", label: "질문" },
  { value: "tip", label: "노하우" },
  { value: "etc", label: "기타" },
] as const;

type CategoryValue = (typeof CATEGORY_OPTIONS)[number]["value"];

// 게시글 작성 제출 직전 최종 유효성 가드(우회 방지)
const TITLE_MIN = 4;
const TITLE_MAX = 80;
const WRITE_ERROR_MESSAGE = "글 작성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
const hasHtmlLike = (s: string) => /<[^>]+>/.test(s);
const hasScriptLike = (s: string) => /<\s*script/i.test(s) || /javascript\s*:/i.test(s);

type FieldKey = "category" | "title" | "content" | "attachments";
type FieldErrors = Partial<Record<FieldKey, string>>;
const scrollIntoViewOpts: ScrollIntoViewOptions = {
  behavior: "smooth",
  block: "center",
};

type BoardCreateResponse = {
  ok?: boolean;
  id?: string;
  item?: {
    _id?: string;
    id?: string;
  };
  details?: unknown;
  message?: unknown;
  error?: unknown;
};

export default function FreeBoardWriteClient() {
  const router = useRouter();

  // 폼 상태
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // content에는 HTML 태그가 포함되므로 서버와 같은 실제 텍스트 기준으로 검증합니다. 별도 길이 상태를 두지 않아야 에디터 초기화와 상태 변경이 어긋나지 않습니다.
  const contentValidationLength = useMemo(
    () => richTextToValidationText(content).length,
    [content],
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // 카테고리 상태 (기본 'general')
  const [category, setCategory] = useState<CategoryValue>("general");

  // 포커스/스크롤 대상 refs (첫 오류로 이동)
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const contentEditorRef = useRef<HTMLDivElement | null>(null);
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
    if (t || contentValidationLength > 0) return true;
    if (category !== "general") return true;
    if (images.length > 0) return true;
    if (selectedFiles.length > 0) return true;
    return false;
  }, [title, contentValidationLength, category, images.length, selectedFiles.length]);

  // 탭닫기/새로고침 + 뒤로가기(popstate)까지 통합 보호
  const { guardLinkClick, confirmAndNavigate, navigateAfterSave } = useBoardUnsavedChangesGuard(isDirty);

  const guardLeave = guardLinkClick;

  const handleCancel = () => {
    confirmAndNavigate(() => router.back());
  };

  const focusField = (key: FieldKey) => {
    if (key === "category") {
      categoryRef.current?.scrollIntoView(scrollIntoViewOpts);
      return;
    }
    if (key === "title") {
      titleRef.current?.scrollIntoView(scrollIntoViewOpts);
      titleRef.current?.focus();
      return;
    }
    if (key === "content") {
      contentEditorRef.current?.scrollIntoView(scrollIntoViewOpts);
      contentEditorRef.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();
      return;
    }
    if (key === "attachments") {
      attachmentsRef.current?.scrollIntoView(scrollIntoViewOpts);
      return;
    }
  };

  const setInlineError = (key: FieldKey, msg: string, formMsg = "입력값을 확인해 주세요.") => {
    setFieldErrors((prev) => ({ ...prev, [key]: msg }));
    setErrorMsg(formMsg);
    requestAnimationFrame(() => focusField(key));
  };

  const emitServerError = (msg: string) => {
    setErrorMsg(msg);
    showErrorToast(msg);
  };

  // 제출 직전 최종 유효성 검증(우회 방지)
  const validateBeforeSubmit = (): FieldErrors => {
    const errs: FieldErrors = {};
    const t = title.trim();
    // 카테고리 화이트리스트(타입이 있어도 devtools로 깨질 수 있어 방어)
    if (!CATEGORY_OPTIONS.some((o) => o.value === category)) {
      errs.category = "분류를 선택해 주세요.";
      return errs;
    }

    if (!t) errs.title = "제목을 입력해 주세요.";
    if (contentValidationLength === 0) errs.content = "내용을 입력해 주세요.";

    if (!errs.title) {
      if (t.length < TITLE_MIN) errs.title = `제목은 ${TITLE_MIN}자 이상 입력해 주세요.`;
      else if (t.length > TITLE_MAX) errs.title = `제목은 ${TITLE_MAX}자 이내로 입력해 주세요.`;
    }
    if (!errs.content) {
      if (contentValidationLength < COMMUNITY_RICH_TEXT_CONTENT_MIN) errs.content = `내용은 ${COMMUNITY_RICH_TEXT_CONTENT_MIN}자 이상 입력해 주세요.`;
      else if (contentValidationLength > COMMUNITY_RICH_TEXT_CONTENT_MAX)
        errs.content = `내용은 ${COMMUNITY_RICH_TEXT_CONTENT_MAX}자 이내로 입력해 주세요.`;
    }

    // 스크립트/HTML 유사 입력 방어: 해당 필드에 귀속
    // 본문의 HTML은 에디터 정상 출력이므로 일괄 거부하지 않으며, 최종 허용 여부는 서버 sanitizer가 결정합니다.
    if (!errs.title && hasScriptLike(t))
      errs.title = "스크립트로 의심되는 입력이 포함되어 저장할 수 없습니다.";
    if (!errs.title && hasHtmlLike(t)) errs.title = "HTML 태그는 사용할 수 없습니다.";

    // 이미지 업로더 max=5이지만, 제출 직전 한 번 더 방어
    if (images.length > 5) errs.attachments = "이미지는 최대 5장까지만 업로드할 수 있어요.";
    if (selectedFiles.length > MAX_FILES)
      errs.attachments = `파일은 최대 ${MAX_FILES}개까지만 업로드할 수 있어요.`;

    return errs;
  };

  const MAX_FILES = 5;
  const MAX_SIZE_MB = 10;

  // 파일 추가 (드롭/선택 공통)
  const addFiles = (files: File[]) => {
    if (!files.length) return;

    // 개수 제한
    if (selectedFiles.length + files.length > MAX_FILES) {
      setInlineError(
        "attachments",
        `파일은 최대 ${MAX_FILES}개까지만 업로드할 수 있어요.`,
        "첨부 파일을 확인해 주세요.",
      );
      return;
    }

    // 용량 제한
    const tooLarge = files.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (tooLarge) {
      setInlineError(
        "attachments",
        `파일당 ${MAX_SIZE_MB}MB를 초과할 수 없어요.`,
        "첨부 파일을 확인해 주세요.",
      );
      return;
    }

    // 이미지 파일 방지 (이미지는 이미지 탭에서만)
    const hasImage = files.some((f) => f.type?.startsWith("image/"));
    if (hasImage) {
      setInlineError(
        "attachments",
        '이미지 파일은 "이미지 업로드" 탭에서 업로드해 주세요.',
        "첨부 파일을 확인해 주세요.",
      );
      return;
    }

    // 드롭 업로드는 accept를 우회할 수 있으므로, 문서 allowlist를 추가로 방어
    const extOk = (name: string) => /\.(pdf|docx?|xlsx?|xls|pptx?|ppt|hwp|hwpx|txt)$/i.test(name);
    const ALLOWED_MIME = new Set<string>([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      // HWP/HWPX는 브라우저/OS별로 mime이 비어있거나 제각각이라 확장자 기반을 주로 사용
    ]);
    const invalid = files.find((f) => !(ALLOWED_MIME.has(f.type) || extOk(f.name)));
    if (invalid) {
      setInlineError(
        "attachments",
        "문서 파일(PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX/HWP/HWPX/TXT)만 업로드할 수 있어요.",
        "첨부 파일을 확인해 주세요.",
      );
      return;
    }

    // 성공 케이스: 첨부 관련 에러/폼 에러는 해제
    setFieldErrors((prev) => ({ ...prev, attachments: undefined }));
    setErrorMsg(null);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Supabase에 한 개 파일 업로드
  const uploadOneFile = async (file: File) => {
    const BUCKET = "tennis-images";
    const FOLDER = "community/attachments";

    const ext = file.name.split(".").pop() || "bin";
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
    if (!url) throw new Error("파일 URL 생성에 실패했습니다.");

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

    // 제출 직전 최종 검증(우회 방지)
    const errs = validateBeforeSubmit();
    if (Object.keys(errs).some((k) => Boolean((errs as any)[k]))) {
      setFieldErrors(errs);
      setErrorMsg("입력값을 확인해 주세요.");

      const order: FieldKey[] = ["category", "title", "content", "attachments"];
      const first = order.find((k) => Boolean(errs[k]));
      if (first) requestAnimationFrame(() => focusField(first));
      return;
    }

    if (isUploadingImages || isUploadingFiles) {
      setErrorMsg("첨부 업로드가 끝날 때까지 잠시만 기다려 주세요.");
      requestAnimationFrame(() => focusField("attachments"));
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

      const payload: any = {
        type: "free",
        title: title.trim(),
        content: content.trim(),
        images,
        category,
      };
      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }

      const res = await communityFetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: BoardCreateResponse | null = null;
      try {
        data = (await res.json()) as BoardCreateResponse;
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        emitServerError(getApiErrorMessage(data, WRITE_ERROR_MESSAGE));
        return;
      }

      const goId = data.id ?? data.item?._id ?? data.item?.id;
      showSuccessToast("게시글이 등록되었습니다.");
      navigateAfterSave(() => {
        router.push(goId ? `/board/free/${goId}` : "/board/free");
      });
      router.refresh();
    } catch (err) {
      console.error(err);
      setErrorMsg("글 작성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
      submitRef.current = false;
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <SiteContainer
        variant="wide"
        className="max-w-5xl space-y-6 py-6 bp-sm:py-8 bp-md:space-y-8 bp-md:py-10"
      >
        <section className="rounded-panel border border-border bg-brand-highlight-muted/45 p-5 shadow-soft md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">커뮤니티</Badge>
                <span className="text-ui-label text-muted-foreground">자유 게시판 · 새 글</span>
              </div>
              <div>
                <h1 className="font-ui-bold text-ui-page-title tracking-normal text-foreground md:text-ui-page-title-lg">
                  자유 게시판 글쓰기
                </h1>
                <p className="mt-2 text-ui-body-sm text-muted-foreground md:text-ui-body-lg">
                  질문, 정보, 일상을 자유롭게 나누고 테니스 이야기를 이어가세요.
                </p>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button asChild variant="outline" size="sm" className="w-full gap-1 sm:w-auto">
                <Link href="/board/free" onClick={guardLeave}>
                  <ArrowLeft className="h-4 w-4" />
                  <span>목록으로</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 글쓰기 카드 */}
        <Card variant="feature" className="overflow-hidden rounded-panel border-border shadow-soft">
          <CardHeader className="border-b border-border bg-brand-highlight-muted/35 p-4 sm:p-6">
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
              />
              {fieldErrors.title ? (
                <p className="text-ui-label text-destructive">{fieldErrors.title}</p>
              ) : null}
              <p className="text-ui-label text-muted-foreground">
                {title.trim().length}/{TITLE_MAX}
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-6 lg:p-8">
            <form className="space-y-6 md:space-y-8" onSubmit={handleSubmit}>
              {/* 분류 선택 */}
              <div className="space-y-2" ref={categoryRef}>
                <Label>분류</Label>
                <div className="flex flex-wrap gap-2 rounded-control border border-border bg-brand-highlight-muted/35 p-3 text-ui-body-sm">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setCategory(opt.value as CategoryValue);
                        if (fieldErrors.category)
                          setFieldErrors((prev) => ({
                            ...prev,
                            category: undefined,
                          }));
                      }}
                      className={cn(
                        "rounded-control border px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        category === opt.value
                          ? "border-border bg-brand-highlight text-brand-highlight-foreground"
                          : "border-border text-muted-foreground dark:border-border dark:text-muted-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {fieldErrors.category ? (
                  <p className="text-ui-label text-destructive">{fieldErrors.category}</p>
                ) : null}
              </div>

              {/* 내용 입력 */}
              <section className="space-y-2 rounded-panel border border-border bg-card p-4 shadow-soft md:p-5">
                <div className="border-b border-border pb-3">
                  <h2 className="font-ui-medium text-ui-body-lg text-foreground">
                    본문 작성
                  </h2>
                  <p className="mt-1 text-ui-label text-muted-foreground">
                    다른 이용자가 이해하기 쉽도록 구체적으로 작성해 주세요.
                  </p>
                </div>
                <Label>내용</Label>
                <div ref={contentEditorRef}>
                  <RichTextEditor
                    value={content}
                    onChange={(change) => {
                      setContent(change.html);

                      if (fieldErrors.content) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          content: undefined,
                        }));
                      }
                    }}
                    maxLength={COMMUNITY_RICH_TEXT_CONTENT_MAX}
                    placeholder="게시글 내용을 작성해 주세요."
                    ariaLabel="게시글 본문 편집기"
                    disabled={isSubmitting || isUploadingImages || isUploadingFiles}
                    invalid={Boolean(fieldErrors.content)}
                  />
                </div>
                {fieldErrors.content ? (
                  <p className="text-ui-label text-destructive">{fieldErrors.content}</p>
                ) : null}

                <p className="mt-1 text-ui-label text-muted-foreground">
                  신청/주문 문의 등 개인 정보가 필요한 내용은 고객센터 Q&amp;A 게시판을 활용해
                  주세요.
                </p>
              </section>

              {/* 첨부 영역: 이미지 / 파일 탭 */}
              <section
                className="space-y-3 rounded-panel border border-border bg-card p-4 shadow-soft md:p-5"
                ref={attachmentsRef}
              >
                <div className="border-b border-border pb-3">
                  <h2 className="font-ui-medium text-ui-body-lg text-foreground">
                    첨부 파일
                  </h2>
                  <p className="mt-1 text-ui-label text-muted-foreground">
                    이미지와 문서를 나누어 안전하게 첨부할 수 있습니다.
                  </p>
                </div>
                <Label>첨부 (선택)</Label>
                {fieldErrors.attachments ? (
                  <p className="text-ui-label text-destructive">{fieldErrors.attachments}</p>
                ) : null}
                <Tabs defaultValue="image" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="image">이미지 업로드</TabsTrigger>
                    <TabsTrigger value="file">파일 업로드</TabsTrigger>
                  </TabsList>

                  {/* 이미지 업로드 탭 */}
                  <TabsContent value="image" className="pt-4 space-y-2">
                    <p className="text-ui-label text-muted-foreground">
                      최대 5장까지 업로드할 수 있으며, 첫 번째 이미지가 대표로 사용됩니다.
                    </p>
                    <ImageUploader
                      value={images}
                      onChange={setImages}
                      max={5}
                      folder="community/posts"
                      onUploadingChange={setIsUploadingImages}
                    />
                  </TabsContent>

                  {/* 파일 업로드 탭 */}
                  <TabsContent value="file" className="pt-4 space-y-4">
                    {/* 드롭존 */}
                    <div
                      className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/30 p-4 text-center transition-colors hover:bg-muted/50 md:p-6 dark:hover:border-border"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        if (e.target !== e.currentTarget) return;
                        fileInputRef.current?.click();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
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
                      <p className="text-ui-body-sm text-muted-foreground">
                        클릭하여 파일을 선택하거나, 이 영역으로 드래그하여 업로드할 수 있어요.
                      </p>
                      <p className="mt-1 text-ui-label text-muted-foreground">
                        이미지 파일은 이미지 탭에서 업로드해 주세요. (파일당 최대 {MAX_SIZE_MB}MB,
                        최대 {MAX_FILES}개)
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
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt"
                        className="sr-only"
                        onChange={handleFileInputChange}
                      />
                    </div>

                    {/* 선택된 파일 카드 목록 */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-ui-label text-muted-foreground">
                          첨부된 파일 ({selectedFiles.length}/{MAX_FILES})
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="group relative flex flex-col justify-between rounded-lg bg-card px-3 py-2 shadow-sm hover:shadow-md ring-1 ring-ring hover:ring-2 hover:ring-ring transition"
                            >
                              <div className="flex-1 flex flex-col gap-1 text-ui-label">
                                <span className="font-medium truncate" title={file.name}>
                                  {file.name}
                                </span>
                                <span className="text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
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
              </section>

              {/* 버튼 영역 */}
              <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={isSubmitting || isUploadingImages || isUploadingFiles}
                  onClick={handleCancel}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className={cn("w-full gap-2 sm:w-auto")}
                  disabled={isSubmitting || isUploadingImages || isUploadingFiles}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      등록 중…
                    </>
                  ) : (
                    "작성하기"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </SiteContainer>
    </main>
  );
}
