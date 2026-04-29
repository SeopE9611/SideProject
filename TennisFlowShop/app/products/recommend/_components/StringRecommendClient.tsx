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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const initialAnswers: StringRecommendAnswers = { goal: null, level: null, arm: null, freq: null, budget: null };
const answerLabels = { goal: "플레이 감각", level: "실력 수준", arm: "팔/손목 부담", freq: "플레이 빈도", budget: "예산 성향" } as const;

export default function StringRecommendClient() {
  const [answers, setAnswers] = useState<StringRecommendAnswers>(initialAnswers);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [products, setProducts] = useState<RecommendableProduct[]>([]);
  const [results, setResults] = useState<RecommendedStringProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

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
          .map((item) => (item && typeof item === "object" ? normalizeRecommendableProduct(item as Record<string, unknown>) : null))
          .filter((item): item is RecommendableProduct => item !== null);
        if (!ignore) setProducts(normalized);
      } catch (error) {
        if (!ignore) setProductsError(error instanceof Error ? error.message : "추천에 사용할 스트링 정보를 불러오지 못했습니다.");
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

  const selectedSummary = useMemo(() => RECOMMEND_QUESTIONS.map((q) => {
    const picked = q.options.find((option) => option.value === answers[q.id]);
    return { id: q.id, title: answerLabels[q.id], value: picked?.label ?? "미선택" };
  }), [answers]);

  function handleSelect(id: RecommendQuestionId, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value as StringRecommendAnswers[RecommendQuestionId] }));
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

  return <div className="mx-auto max-w-5xl space-y-6 py-8 md:py-12">{/* omitted for brevity */}
    <Card className="rounded-2xl"><CardHeader><CardTitle className="text-2xl md:text-3xl">스트링 추천 도우미</CardTitle><p className="text-muted-foreground">간단한 질문에 답하면 플레이 성향에 맞는 스트링 선택 방향을 안내해드릴게요.</p><p className="text-sm text-muted-foreground">추천 결과는 선택을 돕기 위한 참고 정보이며, 실제 텐션과 세팅은 라켓 상태와 사용 습관에 따라 달라질 수 있어요.</p></CardHeader></Card>
    <Card className="rounded-2xl"><CardContent className="p-5 md:p-6"><p className="text-sm text-muted-foreground">{RECOMMEND_QUESTIONS.length}개 중 {answeredCount}개 답변 완료</p><div className="mt-3 h-2 w-full rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div></CardContent></Card>
    <div className="space-y-4">{RECOMMEND_QUESTIONS.map((question, index) => (<StringRecommendQuestion key={question.id} question={question} value={answers[question.id]} onChange={(value) => handleSelect(question.id, value)} index={index} />))}</div>
    {isLoadingProducts ? <p className="text-sm text-muted-foreground">추천에 사용할 스트링 정보를 불러오는 중...</p> : null}
    {productsError ? <p className="text-sm text-destructive">{productsError}</p> : null}
    <div className="flex flex-col gap-3 sm:flex-row"><Button type="button" onClick={handleSubmit} disabled={!isComplete || isLoadingProducts || !!productsError} className="sm:min-w-44">추천 결과 보기</Button><Button type="button" variant="outline" onClick={handleReset} className="sm:min-w-36">다시 선택하기</Button></div>
    {hasSubmitted ? <Card className="rounded-2xl border-primary/30 bg-muted/30"><CardHeader><CardTitle className="text-xl">선택한 조건</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{selectedSummary.map((item) => (<p key={item.id} className="text-muted-foreground"><span className="font-medium text-foreground">{item.title}:</span> {item.value}</p>))}</CardContent></Card> : null}
    {hasSubmitted && results.length > 0 ? <div className="grid gap-4 md:grid-cols-3">{results.map((result, idx) => <StringRecommendResultCard key={result.product.id} result={result} rank={idx + 1} />)}</div> : null}
    {hasSubmitted && results.length === 0 ? <Card className="rounded-2xl"><CardContent className="p-6"><p className="text-sm text-muted-foreground">조건에 맞는 추천 상품을 찾지 못했어요.</p><Button asChild variant="outline" className="mt-3" type="button"><Link href="/products?from=apply">전체 스트링 보기</Link></Button></CardContent></Card> : null}
    <div className="flex flex-col gap-2 text-sm"><Link href="/services/tension-guide" className="text-primary hover:underline">텐션 가이드 보기</Link><Link href="/products?from=apply" className="text-primary hover:underline">전체 스트링 보기</Link></div>
  </div>;
}
