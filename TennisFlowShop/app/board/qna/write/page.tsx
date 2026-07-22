"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { communityFetch } from "@/lib/community/communityFetch.client";
import { useBackNavigationGuard } from "@/lib/hooks/useBackNavigationGuard";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { supabase } from "@/lib/supabase";
import { showErrorToast } from "@/lib/toast";
import { AlertCircle, ChevronLeft, ChevronRight, ImagePlus, Search, Upload, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, PublicSurface, SectionHeader } from "@/components/public";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { USER_ME_KEY, USER_ME_SWR_OPTIONS } from "@/lib/hooks/useCurrentUser";

const CATEGORY_LABELS: Record<string, string> = {
  product: "상품문의",
  order: "주문/결제",
  delivery: "배송",
  refund: "환불/교환",
  service: "서비스",
  academy: "아카데미",
  member: "회원",
};

// 게시글 작성 제출 직전 최종 유효성 가드
const TITLE_MIN = 4;
const TITLE_MAX = 80;
const CONTENT_MIN = 10;
const CONTENT_MAX = 5000;
const hasHtmlLike = (s: string) => /<[^>]+>/.test(s); // 최소 수준 태그 감지
const hasScriptLike = (s: string) => /<\s*script/i.test(s) || /javascript\s*:/i.test(s);

type FieldKey = "category" | "product" | "title" | "content" | "images";
type FieldErrors = Partial<Record<FieldKey, string>>;
const scrollIntoViewOpts: ScrollIntoViewOptions = {
  behavior: "smooth",
  block: "center",
};

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
  const [product, setProduct] = useState<{
    id: string;
    name: string;
    image?: string | null;
  } | null>(null);
  const preProductId = sp.get("productId");
  const preProductName = sp.get("productName") ?? "";
  const preTargetType = sp.get("targetType") === "racket" ? "racket" : "product";
  const queryCategory = sp.get("category")?.trim();
  const initialCategory =
    queryCategory?.toLowerCase() === "academy" || queryCategory === "아카데미"
      ? "academy"
      : preProductId
        ? "product"
        : "";
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [previews, setPreviews] = useState<(string | null)[]>([]);
  useEffect(() => {
    const urls = selectedFiles.map((f) =>
      f.type?.startsWith("image/") ? URL.createObjectURL(f) : null,
    );
    setPreviews(urls);
    return () => {
      urls.forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [selectedFiles]);

  const [isPrivate, setIsPrivate] = useState(false);
  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 이탈 경고(입력값이 하나라도 있으면 dirty)
  const isDirty = useMemo(() => {
    return (
      category !== initialCategory ||
      !!product?.id ||
      title.trim().length > 0 ||
      content.trim().length > 0 ||
      selectedFiles.length > 0 ||
      isPrivate
    );
  }, [initialCategory, category, product?.id, title, content, selectedFiles.length, isPrivate]);

  useUnsavedChangesGuard(isDirty && !submitting);
  useBackNavigationGuard(isDirty && !submitting);

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
    const only = previews.map((url, i) => ({ url, i })).filter((v) => !!v.url) as {
      url: string;
      i: number;
    }[];
    if (only.length === 0) return;

    const start = only.findIndex((v) => v.i === uiIndex);
    setViewerImages(only.map((v) => v.url));
    setViewerIndex(Math.max(0, start));
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);
  const nextViewer = () => setViewerIndex((i) => (i + 1) % viewerImages.length);
  const prevViewer = () =>
    setViewerIndex((i) => (i - 1 + viewerImages.length) % viewerImages.length);

  // SWR fetcher
  type OrdersListRes = { items?: any[]; orders?: any[]; total?: number };
  type ProductsListRes = {
    products?: any[];
    items?: any[];
    total?: number;
    page?: number;
    limit?: number;
  };
  type MeRes = { role?: string };

  async function fetcherAllow401<T>(url: string): Promise<T | null> {
    const res = await communityFetch(url, { credentials: "include" });
    const data = (await res.json().catch(() => null)) as any;

    // 비로그인(401)은 '에러'가 아니라 '로그인 안 됨' 상태로 취급
    if (res.status === 401) return null;

    if (!res.ok) {
      const message =
        typeof data === "object" &&
        data !== null &&
        typeof (data as { error: string }).error === "string"
          ? (data as { error: string }).error
          : `${res.status} ${res.statusText}`;
      throw new Error(message);
    }

    return data as T;
  }

  async function fetcher<T>(url: string): Promise<T> {
    const res = await communityFetch(url, { credentials: "include" });
    const data = (await res.json().catch(() => null)) as any;

    if (!res.ok) {
      const message =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : `${res.status} ${res.statusText}`;
      throw new Error(message);
    }

    return data as T;
  }

  // 로그인 여부 확인 (비로그인 401은 정상 흐름으로 처리)
  const { data: me } = useSWR<MeRes | null>(USER_ME_KEY, fetcherAllow401, USER_ME_SWR_OPTIONS);

  const ordersKey = me ? "/api/orders?limit=100" : null;

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
        const pid = String(it.productId ?? it.product?._id ?? it._id ?? "");
        if (!pid) continue;
        const name = it.product?.name ?? it.name ?? it.title ?? "상품";
        const image = it.product?.image ?? it.image ?? null;
        if (!set.has(pid)) set.set(pid, { id: pid, name, image });
      }
    }
    return Array.from(set.values());
  }, [myOrders]);

  // 전체 상품 검색
  const [q, setQ] = useState("");
  const { data: searchData } = useSWR<ProductsListRes>(
    q.trim() ? `/api/products?q=${encodeURIComponent(q.trim())}&limit=20` : null,
    fetcher,
  );
  const searchProducts: { id: string; name: string; image?: string | null }[] = useMemo(() => {
    const rows = searchData?.products ?? searchData?.items ?? [];
    return rows.map((p: any) => ({
      id: String(p._id ?? p.id),
      name: p.name ?? p.title ?? "상품",
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
      const el = document.getElementById("category") as HTMLElement | null;
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
      errs.category = "카테고리를 선택해주세요.";
      return errs;
    }

    // 상품문의인 경우: 상품 선택 필수(프리필 제외)
    if (category === "product" && !preProductId && !product?.id) {
      errs.product = "상품을 선택해주세요.";
    }

    // 제목/내용
    if (!t) errs.title = "제목을 입력해주세요.";
    if (!c) errs.content = "내용을 입력해주세요.";

    if (t && t.length < TITLE_MIN) errs.title = `제목은 ${TITLE_MIN}자 이상 입력해주세요.`;
    if (t && t.length > TITLE_MAX) errs.title = `제목은 ${TITLE_MAX}자 이내로 입력해주세요.`;
    if (c && c.length < CONTENT_MIN) errs.content = `내용은 ${CONTENT_MIN}자 이상 입력해주세요.`;
    if (c && c.length > CONTENT_MAX) errs.content = `내용은 ${CONTENT_MAX}자 이내로 입력해주세요.`;

    // HTML/스크립트 차단
    if (t && (hasScriptLike(t) || hasHtmlLike(t))) {
      errs.title = hasScriptLike(t)
        ? "스크립트로 의심되는 입력이 포함되어 저장할 수 없습니다."
        : "HTML 태그는 사용할 수 없습니다.";
    }
    if (c && (hasScriptLike(c) || hasHtmlLike(c))) {
      errs.content = hasScriptLike(c)
        ? "스크립트로 의심되는 입력이 포함되어 저장할 수 없습니다."
        : "HTML 태그는 사용할 수 없습니다.";
    }

    // (방어) 이미지 첨부 재검증
    const MAX = 3;
    if (selectedFiles.length > MAX) errs.images = `최대 ${MAX}개까지만 업로드할 수 있어요.`;
    if (selectedFiles.some((f) => f.size > 5 * 1024 * 1024))
      errs.images = "파일당 최대 5MB까지 업로드할 수 있어요.";
    if (selectedFiles.some((f) => !f.type.startsWith("image/")))
      errs.images = "이미지 파일만 업로드할 수 있어요.";

    return errs;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX = 3;
    const MAX_BYTES = 5 * 1024 * 1024;

    e.currentTarget.value = ""; // 같은 파일 재선택 허용(검증 실패 시에도)
    clearErrors("images");

    // 개수 제한
    if (files.length + selectedFiles.length > MAX) {
      setFieldErrors((prev) => ({
        ...prev,
        images: `최대 ${MAX}개까지만 업로드할 수 있어요.`,
      }));
      setFormError("첨부 이미지를 확인해 주세요.");
      requestAnimationFrame(() => imagesWrapRef.current?.scrollIntoView(scrollIntoViewOpts));
      return;
    }

    // 용량 제한
    if (files.some((f) => f.size > MAX_BYTES)) {
      setFieldErrors((prev) => ({
        ...prev,
        images: "파일당 최대 5MB까지 업로드할 수 있어요.",
      }));
      setFormError("첨부 이미지를 확인해 주세요.");
      requestAnimationFrame(() => imagesWrapRef.current?.scrollIntoView(scrollIntoViewOpts));
      return;
    }

    // 타입 화이트리스트: 이미지만 허용
    if (files.some((f) => !f.type.startsWith("image/"))) {
      setFieldErrors((prev) => ({
        ...prev,
        images: "이미지 파일만 업로드할 수 있어요.",
      }));
      setFormError("첨부 이미지를 확인해 주세요.");
      requestAnimationFrame(() => imagesWrapRef.current?.scrollIntoView(scrollIntoViewOpts));
      return;
    }

    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    const next = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(next);
    if (next.length <= 3) clearErrors("images");
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
        setFormError("입력값을 확인해 주세요.");
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
      const BUCKET = "tennis-images";
      const FOLDER = "boards/qna";
      const uploadOne = async (file: File) => {
        const ext = file.name.split(".").pop() || "bin";
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
      const attachments =
        selectedFiles.length > 0 ? await Promise.all(selectedFiles.map(uploadOne)) : [];

      //  조건부 스프레드로 '한 번에' payload 구성 + attachments 포함
      const payload = {
        type: "qna",
        title: t,
        content: c,
        category: mappedCategory,
        isSecret: !!isPrivate,
        attachments,
        ...(preProductId
          ? {
              productRef: {
                productId: preProductId,
                targetType: preTargetType,
                name: preProductName,
                image: null,
              },
            }
          : category === "product" && product?.id
            ? {
                productRef: {
                  productId: product.id,
                  targetType: "product",
                  name: product.name,
                  image: product.image ?? null,
                },
              }
            : {}),
      } as const;

      const res = await communityFetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "저장 실패(로그인/권한을 확인해주세요)");
      }
      const createdId = typeof json?.id === "string" ? json.id : null;
      router.replace(createdId ? `/board/qna/${createdId}` : "/board/qna");
    } catch (e: any) {
      setFormError(e?.message || "저장 중 오류가 발생했습니다.");
      showErrorToast(e?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
      submitRef.current = false;
    }
  }

  const categoryErrorId = "qna-write-category-error";
  const productErrorId = "qna-write-product-error";
  const titleErrorId = "qna-write-title-error";
  const contentErrorId = "qna-write-content-error";
  const imagesErrorId = "qna-write-images-error";
  const formErrorId = "qna-write-form-error";

  const productButtonClass = (selected: boolean) =>
    cn(
      "w-full rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      selected
        ? "border-brand-highlight-ink/40 bg-brand-highlight-muted text-foreground"
        : "border-border bg-card hover:bg-muted/60",
    );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicPageHero
        variant="feature"
        eyebrow={<Badge variant="signal">Q&amp;A WRITE</Badge>}
        title="문의하기"
        description="상품, 주문, 서비스 이용 중 궁금한 점을 남겨주시면 확인 후 답변드릴게요."
        actions={
          <>
            <Button asChild variant="highlight" size="sm" className="w-full bp-sm:w-auto">
              <Link href="/board/qna" onClick={guardLinkLeave}>
                Q&amp;A 목록
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full bp-sm:w-auto">
              <Link href="/support" onClick={guardLinkLeave}>
                고객센터 홈
              </Link>
            </Button>
          </>
        }
      />

      <SiteContainer className="pb-12 bp-sm:pb-16">
        <div className="mx-auto max-w-4xl space-y-5 bp-sm:space-y-6">
          <PublicSurface variant="muted" padding="md" className="grid gap-4 bp-md:grid-cols-3">
            {[
              [
                "01",
                "답변 절차",
                "접수된 문의는 담당자가 확인한 뒤 Q&A 상세에서 답변 상태를 안내합니다.",
              ],
              [
                "02",
                "필수 입력",
                "문의 유형, 제목, 내용은 필수이며 상품문의는 상품 선택이 필요합니다.",
              ],
              [
                "03",
                "작성 주의",
                "비밀번호, 카드번호 등 민감 정보와 불필요한 주문 개인정보는 입력하지 마세요.",
              ],
            ].map(([step, title, copy]) => (
              <div key={step} className="rounded-control border border-border bg-card/70 p-4">
                <span className="text-ui-kicker text-brand-highlight-ink">{step}</span>
                <h2 className="mt-2 font-ui-bold text-ui-card-title font-semibold text-foreground">
                  {title}
                </h2>
                <p className="mt-2 break-keep text-ui-body-sm text-muted-foreground">{copy}</p>
              </div>
            ))}
          </PublicSurface>

          <PublicSurface variant="feature" padding="none" className="overflow-hidden">
            <div className="border-b border-border bg-brand-highlight-muted/40 p-5 bp-sm:p-6 bp-md:p-8">
              <SectionHeader
                variant="brand"
                eyebrow="NEW QUESTION"
                title="새 문의 작성"
                description="아래 항목을 순서대로 작성해 주세요. 입력 오류가 있으면 첫 오류 위치로 이동합니다."
              />
            </div>

            <div className="space-y-8 p-5 bp-sm:p-6 bp-md:p-8">
              {formError && (
                <div
                  id={formErrorId}
                  role="alert"
                  className="flex gap-3 rounded-control border border-destructive/45 bg-destructive/10 p-4 text-ui-body-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <section ref={categoryWrapRef} className="space-y-5 scroll-mt-24">
                <SectionHeader
                  variant="brand"
                  eyebrow="TYPE & PRODUCT"
                  title="문의 유형 및 상품 선택"
                  description="문의 유형을 먼저 선택해 주세요. 상품문의는 관련 상품을 함께 지정해야 합니다."
                />
                <div className="rounded-control border border-border bg-muted/30 p-4 bp-sm:p-5">
                  <div className="space-y-3">
                    <Label htmlFor="category" className="text-ui-body font-semibold">
                      카테고리 <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={category}
                      onValueChange={(v) => {
                        setCategory(v);
                        clearErrors(["category", "product"]);
                      }}
                    >
                      <SelectTrigger
                        id="category"
                        aria-invalid={!!fieldErrors.category}
                        aria-describedby={fieldErrors.category ? categoryErrorId : undefined}
                        className={cn(
                          "h-12 bg-card text-ui-body focus:ring-ring",
                          fieldErrors.category && "border-destructive",
                        )}
                      >
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
                    {fieldErrors.category && (
                      <p id={categoryErrorId} className="text-ui-body-sm text-destructive">
                        {fieldErrors.category}
                      </p>
                    )}
                    {preProductId && (
                      <div className="flex flex-col gap-2 rounded-control border border-brand-highlight-ink/30 bg-brand-highlight-muted p-3 text-ui-body-sm text-foreground bp-sm:flex-row bp-sm:items-center">
                        <Badge variant="signal">프리필</Badge>
                        <span className="min-w-0 flex-1 break-keep">
                          선택된 상품: <strong>{preProductName || preProductId}</strong>
                        </span>
                        <Button
                          type="button"
                          variant="highlight_soft"
                          size="sm"
                          onClick={() => confirmGoIfDirty(() => router.replace("/board/qna/write"))}
                        >
                          제거
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {category === "product" && !preProductId && (
                  <div ref={productWrapRef} className="space-y-4 scroll-mt-24">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-ui-body-sm text-muted-foreground">
                        본인이 구매했던 상품 또는 전체 상품에서 선택하세요.
                      </p>
                      {product && <Badge variant="signal">선택됨</Badge>}
                    </div>
                    {fieldErrors.product && (
                      <p id={productErrorId} className="text-ui-body-sm text-destructive">
                        {fieldErrors.product}
                      </p>
                    )}

                    <div
                      className="grid gap-4 bp-md:grid-cols-2"
                      role="group"
                      aria-label="문의 상품 선택"
                      aria-invalid={!!fieldErrors.product}
                      aria-describedby={fieldErrors.product ? productErrorId : undefined}
                    >
                      <div className="rounded-control border border-border bg-muted/30 p-4">
                        <div className="mb-3 font-ui-bold text-ui-card-title font-semibold ">
                          내 구매상품
                        </div>
                        {!me && (
                          <div className="mb-2 text-ui-label text-muted-foreground">
                            로그인하면 내 구매상품 목록을 불러와 빠르게 선택할 수 있어요.
                          </div>
                        )}
                        {me && ordersError && (
                          <div className="mb-2 text-ui-body-sm text-destructive">
                            구매 상품 목록을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.
                          </div>
                        )}
                        <div className="max-h-64 space-y-2 overflow-auto pr-1">
                          {me && myProducts.length === 0 && (
                            <div className="text-ui-body-sm text-muted-foreground">
                              구매 이력이 없습니다.
                            </div>
                          )}
                          {myProducts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              aria-pressed={product?.id === p.id}
                              onClick={() => {
                                setProduct(p);
                                clearErrors("product");
                              }}
                              className={productButtonClass(product?.id === p.id)}
                            >
                              <div className="font-medium">{p.name}</div>
                              <div className="text-ui-label text-muted-foreground">{p.id}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-control border border-border bg-muted/30 p-4">
                        <div className="mb-3 font-ui-bold text-ui-card-title font-semibold ">
                          전체 상품 검색
                        </div>
                        <div className="relative mb-3">
                          <Search
                            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="상품명으로 검색"
                            aria-label="상품명으로 검색"
                            className="h-11 bg-card pl-9 text-ui-body focus-visible:ring-ring"
                          />
                        </div>
                        <div className="max-h-64 space-y-2 overflow-auto pr-1">
                          {!q.trim() && (
                            <div className="text-ui-body-sm text-muted-foreground">
                              검색어를 입력하세요.
                            </div>
                          )}
                          {q.trim() && searchProducts.length === 0 && (
                            <div className="text-ui-body-sm text-muted-foreground">
                              검색 결과가 없습니다.
                            </div>
                          )}
                          {searchProducts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              aria-pressed={product?.id === p.id}
                              onClick={() => {
                                setProduct(p);
                                clearErrors("product");
                              }}
                              className={productButtonClass(product?.id === p.id)}
                            >
                              <div className="font-medium">{p.name}</div>
                              <div className="text-ui-label text-muted-foreground">{p.id}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {product && (
                      <div className="flex flex-col gap-2 rounded-control border border-brand-highlight-ink/30 bg-brand-highlight-muted p-3 text-ui-body-sm bp-sm:flex-row bp-sm:items-center">
                        <span className="min-w-0 flex-1 break-keep">
                          <strong>{product.name}</strong> ({product.id})
                        </span>
                        <Button
                          type="button"
                          variant="highlight_soft"
                          size="sm"
                          onClick={() => setProduct(null)}
                        >
                          선택 해제
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="space-y-5 border-t border-border pt-8">
                <SectionHeader variant="brand" eyebrow="QUESTION" title="제목 및 문의 내용" />
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-ui-body font-semibold">
                    제목 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    ref={titleRef}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      clearErrors("title");
                    }}
                    placeholder="문의 제목을 작성해주세요(4자 이상)"
                    aria-invalid={!!fieldErrors.title}
                    aria-describedby={fieldErrors.title ? titleErrorId : undefined}
                    className={cn(
                      "h-12 bg-card text-ui-body focus-visible:ring-ring",
                      fieldErrors.title && "border-destructive",
                    )}
                  />
                  {fieldErrors.title && (
                    <p id={titleErrorId} className="text-ui-body-sm text-destructive">
                      {fieldErrors.title}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="content" className="text-ui-body font-semibold">
                    문의 내용 <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="content"
                    ref={contentRef}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      clearErrors("content");
                    }}
                    placeholder="문의하실 내용을 자세히 작성해주세요(10자 이상)"
                    aria-invalid={!!fieldErrors.content}
                    aria-describedby={fieldErrors.content ? contentErrorId : undefined}
                    className={cn(
                      "min-h-[220px] resize-none bg-card text-ui-body leading-relaxed focus-visible:ring-ring",
                      fieldErrors.content && "border-destructive",
                    )}
                  />
                  {fieldErrors.content && (
                    <p id={contentErrorId} className="text-ui-body-sm text-destructive">
                      {fieldErrors.content}
                    </p>
                  )}
                  <p className="text-ui-body-sm text-muted-foreground">
                    상세한 정보를 제공해주시면 더 정확한 답변을 드릴 수 있습니다.
                  </p>
                </div>
              </section>

              <section
                ref={imagesWrapRef}
                className="space-y-5 scroll-mt-24 border-t border-border pt-8"
              >
                <SectionHeader
                  variant="brand"
                  eyebrow="ATTACHMENT"
                  title="이미지 첨부"
                  description="선택 사항이며 최대 3개, 파일당 최대 5MB까지 등록할 수 있습니다."
                />
                <div
                  className={cn(
                    "rounded-control border border-dashed bg-muted/30 p-5 text-center transition-colors",
                    fieldErrors.images
                      ? "border-destructive"
                      : "border-border hover:border-brand-highlight-ink/40",
                  )}
                >
                  <ImagePlus
                    className="mx-auto mb-3 h-8 w-8 text-brand-highlight-ink"
                    aria-hidden="true"
                  />
                  <p className="text-ui-body-sm text-muted-foreground">
                    파일 선택 버튼을 눌러 문의에 필요한 이미지를 첨부하세요.
                  </p>
                  <Input
                    ref={fileInputRef}
                    id="image"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    aria-invalid={!!fieldErrors.images}
                    aria-describedby={fieldErrors.images ? imagesErrorId : undefined}
                    className="sr-only"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    파일 선택
                  </Button>
                </div>
                {fieldErrors.images && (
                  <p id={imagesErrorId} className="text-ui-body-sm text-destructive">
                    {fieldErrors.images}
                  </p>
                )}

                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-ui-body-sm font-medium text-foreground">
                      첨부된 파일 ({selectedFiles.length}/3)
                    </p>
                    <div className="grid grid-cols-2 gap-3 bp-sm:grid-cols-3 bp-md:grid-cols-4">
                      {selectedFiles.map((file, index) => {
                        const isImage = file.type?.startsWith("image/");
                        const previewUrl = isImage ? previews[index] : null;
                        return (
                          <div
                            key={index}
                            className="group relative overflow-hidden rounded-control border border-border bg-card shadow-sm"
                          >
                            {isImage && previewUrl ? (
                              <button
                                type="button"
                                onClick={() => openViewerFromIndex(index)}
                                className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                aria-label={`${file.name} 이미지 확대 보기`}
                              >
                                <img
                                  src={previewUrl || "/placeholder.svg"}
                                  alt={file.name}
                                  className="h-28 w-full object-cover transition-transform duration-150 group-hover:scale-[1.02]"
                                />
                              </button>
                            ) : isImage ? (
                              <div className="h-28 rounded bg-muted animate-pulse" />
                            ) : (
                              <div className="flex h-28 items-center justify-center px-2 text-center text-ui-label text-muted-foreground">
                                {file.name}
                              </div>
                            )}
                            <div className="absolute bottom-2 left-2 rounded bg-card/90 px-1.5 py-0.5 text-ui-caption">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                            <button
                              type="button"
                              className="absolute right-1.5 top-1.5 rounded-full bg-card p-1 shadow-sm opacity-90 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              onClick={() => removeFile(index)}
                              aria-label={`${file.name} 첨부 이미지 삭제`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="rounded-control border border-border bg-muted/30 p-3 text-ui-label text-muted-foreground">
                  • 최대 3개 / 파일당 최대 5MB
                  <br />• 지원 형식: 이미지(JPG/PNG/GIF/WEBP)
                </div>
              </section>

              <section className="space-y-4 border-t border-border pt-8">
                <SectionHeader variant="brand" eyebrow="VISIBILITY" title="공개 범위" />
                <div className="flex items-start gap-3 rounded-control border border-border bg-muted/30 p-4">
                  <Checkbox
                    id="private"
                    checked={isPrivate}
                    onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <label
                      htmlFor="private"
                      className="cursor-pointer text-ui-body-sm font-medium leading-none"
                    >
                      비공개 문의로 작성
                    </label>
                    <p className="text-ui-label text-muted-foreground">
                      비공개로 설정하면 작성자와 관리자만 내용을 볼 수 있습니다.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-3 border-t border-border bg-muted/30 p-5 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:p-6 bp-md:p-8">
              <Button variant="outline" asChild size="lg" className="w-full bg-card bp-sm:w-auto">
                <Link href="/board/qna" onClick={guardLinkLeave}>
                  취소
                </Link>
              </Button>
              <Button
                size="lg"
                variant="highlight"
                className="w-full bp-sm:w-auto"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "등록 중…" : "문의 등록하기"}
              </Button>
            </div>
          </PublicSurface>
        </div>
      </SiteContainer>

      <Dialog open={viewerOpen} onOpenChange={(v) => (v ? setViewerOpen(true) : closeViewer())}>
        <DialogContent className="border border-border bg-background/95 p-0 text-foreground sm:max-w-4xl">
          <DialogHeader className="sr-only">
            <DialogTitle>이미지 확대 보기</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video w-full bg-muted/30">
            {viewerImages[viewerIndex] && (
              <Image
                src={viewerImages[viewerIndex] || "/placeholder.svg"}
                alt={`첨부 이미지 ${viewerIndex + 1}`}
                fill
                className="object-contain"
                priority
              />
            )}
            {viewerImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevViewer}
                  className="absolute left-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="이전 이미지 보기"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={nextViewer}
                  className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="다음 이미지 보기"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          {viewerImages.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2 border-t border-border bg-muted/30 p-3">
              {viewerImages.map((thumb, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setViewerIndex(i)}
                  className={cn(
                    "relative h-16 w-16 overflow-hidden rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    i === viewerIndex
                      ? "border-brand-highlight-ink bg-brand-highlight-muted"
                      : "border-border bg-card",
                  )}
                  aria-label={`첨부 이미지 ${i + 1} 보기`}
                  aria-pressed={i === viewerIndex}
                >
                  <Image
                    src={thumb || "/placeholder.svg"}
                    alt={`썸네일 ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
