"use client";

import StringRecommendQuestion from "@/app/products/recommend/_components/StringRecommendQuestion";
import StringRecommendResultCard from "@/app/products/recommend/_components/StringRecommendResultCard";
import { normalizeRecommendableProduct } from "@/app/products/recommend/_lib/normalizers";
import { RECOMMEND_QUESTIONS } from "@/app/products/recommend/_lib/questions";
import { recommendStringProducts } from "@/app/products/recommend/_lib/recommendStringProducts";
import type {
  CompletedStringRecommendAnswers,
  RecommendQuestionId,
  RecommendableProduct,
  RecommendedStringProduct,
  StringRecommendAnswers,
} from "@/app/products/recommend/_types";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const initialAnswers: StringRecommendAnswers = {
  goal: null,
  level: null,
  arm: null,
  freq: null,
  budget: null,
};
const answerLabels = {
  goal: "플레이 감각",
  level: "실력 수준",
  arm: "팔/손목 부담",
  freq: "플레이 빈도",
  budget: "예산 성향",
} as const;
const freqLabels: Record<string, string> = { monthly: "월 1~2회", weekly: "주 1회", biweekly_plus: "주 2~3회", heavy: "주 4회 이상" };
type CareContext = {
  nickname: string;
  racket: { brand?: string | null; model?: string | null };
  playFrequency: string;
  stringSnapshot: { name?: string | null; gauge?: string | null; tensionMain?: string | null; tensionCross?: string | null } | null;
};
function ntrpToRecommendLevel(level: string): StringRecommendAnswers["level"] {
  if (level === "1.0" || level === "1.5") return "beginner";
  if (level === "2.0" || level === "2.5") return "novice";
  if (level === "3.0" || level === "3.5") return "intermediate";
  if (level === "4.0" || level === "4.5" || level === "5.0" || level === "pro") return "advanced";
  return null;
}

export default function StringRecommendClient() {
  const searchParams = useSearchParams();
  const initialFreq = searchParams.get("freq");
  const rawCareItemId = searchParams.get("careItemId");
  const isValidInitialFreq = RECOMMEND_QUESTIONS.find((q) => q.id === "freq")?.options.some((option) => option.value === initialFreq);
  const [answers, setAnswers] = useState<StringRecommendAnswers>({
    ...initialAnswers,
    freq: isValidInitialFreq ? (initialFreq as StringRecommendAnswers["freq"]) : null,
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [products, setProducts] = useState<RecommendableProduct[]>([]);
  const [results, setResults] = useState<RecommendedStringProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [careItemId, setCareItemId] = useState<string | null>(null);
  const [careContext, setCareContext] = useState<CareContext | null>(null);


  useEffect(() => {
    if (!rawCareItemId) {
      setCareItemId(null);
      setCareContext(null);
      return;
    }
    let ignore = false;
    const verify = async () => {
      const response = await fetch(`/api/users/me/racket-care/${rawCareItemId}`, { credentials: "include" });
      const data: unknown = response.ok ? await response.json().catch(() => null) : null;
      const item = data && typeof data === "object" ? (data as { item?: CareContext }).item : null;
      if (!ignore) {
        setCareItemId(response.ok ? rawCareItemId : null);
        setCareContext(item ?? null);
      }
    };
    void verify();
    return () => {
      ignore = true;
    };
  }, [rawCareItemId]);


  useEffect(() => {
    if (!rawCareItemId) return;
    let ignore = false;
    fetch("/api/users/me/racket-care", { credentials: "include" }).then(async (res) => {
      if (!res.ok || ignore) return;
      const data: unknown = await res.json();
      const profileLevel = data && typeof data === "object" ? String((data as { profileLevel?: unknown }).profileLevel ?? "") : "";
      const mappedLevel = ntrpToRecommendLevel(profileLevel);
      if (mappedLevel) setAnswers((prev) => prev.level ? prev : { ...prev, level: mappedLevel });
    }).catch(() => undefined);
    return () => { ignore = true; };
  }, [rawCareItemId]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setIsLoadingProducts(true);
        setProductsError(null);
        const response = await fetch("/api/products?purpose=stringing&limit=100");
        if (!response.ok) throw new Error("추천에 사용할 스트링 정보를 불러오지 못했습니다.");
        const data: unknown = await response.json();
        const rawItems = Array.isArray(data)
          ? data
          : Array.isArray((data as { products?: unknown[] }).products)
            ? (data as { products: unknown[] }).products
            : Array.isArray((data as { items?: unknown[] }).items)
              ? (data as { items: unknown[] }).items
              : Array.isArray((data as { data?: unknown[] }).data)
                ? (data as { data: unknown[] }).data
                : [];
        const normalized = rawItems
          .map((item) =>
            item && typeof item === "object"
              ? normalizeRecommendableProduct(item as Record<string, unknown>)
              : null,
          )
          .filter((item): item is RecommendableProduct => item !== null);
        if (!ignore) setProducts(normalized);
      } catch (error) {
        if (!ignore)
          setProductsError(
            error instanceof Error
              ? error.message
              : "추천에 사용할 스트링 정보를 불러오지 못했습니다.",
          );
      } finally {
        if (!ignore) setIsLoadingProducts(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const isComplete = answeredCount === RECOMMEND_QUESTIONS.length;
  const progress = Math.round((answeredCount / RECOMMEND_QUESTIONS.length) * 100);

  const selectedSummary = useMemo(
    () =>
      RECOMMEND_QUESTIONS.map((q) => {
        const picked = q.options.find((option) => option.value === answers[q.id]);
        return {
          id: q.id,
          title: answerLabels[q.id],
          value: picked?.label ?? "미선택",
        };
      }),
    [answers],
  );
  const careSummary = useMemo(() => {
    if (!careContext) return [];
    const racketName = [careContext.racket?.brand, careContext.racket?.model].map((value) => String(value ?? "").trim()).filter(Boolean).join(" ");
    const tension = careContext.stringSnapshot?.tensionMain || careContext.stringSnapshot?.tensionCross
      ? `${careContext.stringSnapshot?.tensionMain ?? "-"} / ${careContext.stringSnapshot?.tensionCross ?? "-"}LB`
      : "";
    return [
      { label: "라켓", value: racketName || careContext.nickname },
      { label: "플레이 빈도", value: freqLabels[careContext.playFrequency] ?? careContext.playFrequency },
      { label: "최근 스트링", value: careContext.stringSnapshot?.name ?? "" },
      { label: "게이지", value: careContext.stringSnapshot?.gauge ?? "" },
      { label: "텐션", value: tension },
    ].filter((item) => item.value);
  }, [careContext]);

  function handleSelect(id: RecommendQuestionId, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [id]: value as StringRecommendAnswers[RecommendQuestionId],
    }));
    setHasSubmitted(false);
    setResults([]);
  }

  function handleSubmit() {
    if (!isComplete || isLoadingProducts || productsError) return;
    const completedAnswers = answers as CompletedStringRecommendAnswers;
    setResults(recommendStringProducts(products, completedAnswers));
    setHasSubmitted(true);
  }

  function handleReset() {
    setAnswers(initialAnswers);
    setHasSubmitted(false);
    setResults([]);
    setProductsError(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-7">
      <PublicSurface variant="muted" padding="lg" className="rounded-2xl">
        <SectionHeader
          eyebrow={
            careContext ? (
              <Badge variant="signal">RACKET CARE STRING MATCH</Badge>
            ) : (
              <Badge variant="secondary">STRING RECOMMENDATION</Badge>
            )
          }
          title={careContext ? "내 플레이에 맞는 스트링 추천" : "스트링 추천 도우미"}
          description={
            <div className="space-y-2 break-keep leading-relaxed">
              <p>
                {careContext
                  ? "라켓 케어에서 확인한 플레이 빈도와 아래 질문에 답한 내용을 바탕으로 스트링을 추천해드려요."
                  : "간단한 질문에 답하면 플레이 성향에 맞는 스트링 선택 방향을 안내해드릴게요."}
              </p>
              <p className="text-ui-body-sm">
                {careContext
                  ? "등록된 라켓과 최근 스트링·텐션 정보는 비교를 위한 참고 정보이며, 추천 결과는 아래에서 선택한 조건을 기준으로 계산됩니다."
                  : "추천 결과는 선택을 돕기 위한 참고 정보이며, 실제 텐션과 세팅은 라켓 상태와 사용 습관에 따라 달라질 수 있어요."}
              </p>
            </div>
          }
        />
        {careSummary.length > 0 ? (
          <div className="mt-5 rounded-xl border border-border/80 bg-card/70 p-3">
            <p className="mb-2 text-ui-label font-medium text-muted-foreground">
              라켓 케어 참고 정보
            </p>
            <div className="flex flex-wrap gap-2">
              {careSummary.map((item) => (
                <Badge key={item.label} variant="outline" wrap="normal" className="bg-background/80">
                  {item.label}: {item.value}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </PublicSurface>
      <Card className="sticky top-16 z-30 rounded-panel border border-border bg-card/95 shadow-soft backdrop-blur md:top-20">
        <CardContent className="p-3.5 sm:p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-ui-kicker text-muted-foreground">
                RECOMMENDATION PROGRESS
              </p>
              <p className="mt-1 break-keep text-ui-body-sm font-medium text-foreground">
                {isComplete
                  ? "모든 조건을 선택했어요."
                  : `${RECOMMEND_QUESTIONS.length}개 중 ${answeredCount}개 답변 완료`}
              </p>
            </div>
            <Badge
              variant={isComplete ? "signal_solid" : "signal"}
              className="shrink-0 tabular-nums"
            >
              {answeredCount}/{RECOMMEND_QUESTIONS.length}
            </Badge>
          </div>
          <div
            role="progressbar"
            aria-label="스트링 추천 질문 답변 진행률"
            aria-valuemin={0}
            aria-valuemax={RECOMMEND_QUESTIONS.length}
            aria-valuenow={answeredCount}
            aria-valuetext={`${RECOMMEND_QUESTIONS.length}개 중 ${answeredCount}개 답변 완료`}
            className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-brand-highlight transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 break-keep text-ui-label text-muted-foreground">
            {isComplete
              ? "추천 결과 보기 버튼을 눌러 맞춤 결과를 확인해보세요."
              : "각 질문에서 하나의 답변을 선택해 주세요."}
          </p>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {RECOMMEND_QUESTIONS.map((question, index) => (
          <StringRecommendQuestion
            key={question.id}
            question={question}
            value={answers[question.id]}
            onChange={(value) => handleSelect(question.id, value)}
            index={index}
          />
        ))}
      </div>
      {isLoadingProducts ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-ui-body-sm leading-relaxed text-muted-foreground">
          추천에 사용할 스트링 정보를 불러오는 중...
        </div>
      ) : null}
      {productsError ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-ui-body-sm leading-relaxed text-destructive">
          {productsError}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!isComplete || isLoadingProducts || !!productsError}
          className="min-h-10 w-full break-keep whitespace-normal sm:w-auto sm:min-w-44"
        >
          추천 결과 보기
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          className="min-h-10 w-full break-keep whitespace-normal sm:w-auto sm:min-w-36"
        >
          다시 선택하기
        </Button>
      </div>
      {hasSubmitted ? (
        <Card className="rounded-2xl border-primary/30 bg-muted/30">
          <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-4">
            <CardTitle className="break-keep text-ui-section-title">추천에 반영한 조건</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-5 pt-0 text-ui-body-sm sm:p-6 sm:pt-0">
            {selectedSummary.map((item) => (
              <p
                key={item.id}
                className="flex flex-col gap-0.5 text-muted-foreground sm:flex-row sm:gap-1"
              >
                <span className="shrink-0 break-keep font-medium text-foreground">
                  {item.title}:
                </span>{" "}
                <span className="break-keep break-words">{item.value}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {hasSubmitted && results.length > 0 ? (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
          {results.map((result, idx) => (
            <StringRecommendResultCard key={result.product.id} result={result} rank={idx + 1} careItemId={careItemId} />
          ))}
        </div>
      ) : null}
      {hasSubmitted && results.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-5 sm:p-6">
            <p className="break-keep text-ui-body-sm text-muted-foreground">
              지금 조건에 딱 맞는 추천 상품을 찾지 못했어요. 조건을 조금 바꾸거나 전체 스트링을 확인해보세요.
            </p>
            <Button asChild variant="outline" className="mt-3 w-full sm:w-auto" type="button">
              <Link href="/products?from=apply">전체 스트링 보기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-ui-body-sm sm:flex-row sm:items-center sm:justify-between">
        <Link href="/services/tension-guide" className="break-keep text-primary hover:underline">
          텐션 가이드 보기
        </Link>
        <Link href="/products?from=apply" className="break-keep text-primary hover:underline">
          전체 스트링 보기
        </Link>
      </div>
    </div>
  );
}
