"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { HelpCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type FaqCategory =
  "전체" | "주문/결제" | "배송/수령" | "교체서비스" | "대여/반납" | "패키지권" | "회원/비회원";

type FaqItem = {
  id: string;
  category: Exclude<FaqCategory, "전체">;
  question: string;
  answer: string;
  keywords: string[];
};

const FAQ_CATEGORIES: FaqCategory[] = [
  "전체",
  "주문/결제",
  "배송/수령",
  "교체서비스",
  "대여/반납",
  "패키지권",
  "회원/비회원",
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "order-payment-1",
    category: "주문/결제",
    question: "결제 완료 후 교체서비스 신청도 같이 접수되나요?",
    answer:
      "교체서비스 포함 주문은 결제 완료 후 신청 정보가 함께 접수됩니다. 주문 상세에서 진행 상태를 확인할 수 있습니다.",
    keywords: ["결제", "주문", "교체서비스", "신청", "주문 상세"],
  },
  {
    id: "order-payment-2",
    category: "주문/결제",
    question: "무통장입금으로 결제하면 언제 확인되나요?",
    answer:
      "입금자명과 주문 정보가 확인되면 관리자가 결제 상태를 확인합니다. 입금자명을 정확히 입력해주세요.",
    keywords: ["무통장입금", "입금자명", "결제 확인", "주문 정보"],
  },
  {
    id: "delivery-1",
    category: "배송/수령",
    question: "방문 수령과 택배 수령은 어떻게 다른가요?",
    answer:
      "방문 수령은 매장에서 직접 수령하는 방식이고, 택배 수령은 입력한 주소로 배송되는 방식입니다.",
    keywords: ["방문 수령", "택배 수령", "배송", "수령 방식"],
  },
  {
    id: "delivery-2",
    category: "배송/수령",
    question: "배송 상태가 수령 준비중으로 보이는 이유는 무엇인가요?",
    answer: "방문 수령 주문은 배송중 상태를 사용자 화면에서 수령 준비중으로 안내합니다.",
    keywords: ["수령 준비중", "배송 상태", "방문 수령", "주문 상태"],
  },
  {
    id: "service-1",
    category: "교체서비스",
    question: "보유 라켓이나 보유 스트링으로도 신청할 수 있나요?",
    answer:
      "가능합니다. 교체서비스 신청 화면에서 보유 라켓/보유 스트링으로 신청을 선택해 정보를 입력해주세요.",
    keywords: ["보유 라켓", "보유 스트링", "교체서비스 신청", "신청 화면"],
  },
  {
    id: "service-2",
    category: "교체서비스",
    question: "라켓과 장착 스트링 수량은 왜 맞춰야 하나요?",
    answer:
      "교체서비스는 라켓 1개당 장착 스트링 1개 기준으로 진행되므로 수량을 함께 맞춰야 합니다.",
    keywords: ["장착 스트링", "수량", "라켓", "교체서비스 기준"],
  },
  {
    id: "rental-1",
    category: "대여/반납",
    question: "라켓 대여와 교체서비스를 함께 신청할 수 있나요?",
    answer:
      "가능합니다. 라켓 대여 흐름에서 스트링을 선택하면 대여 결제와 함께 교체서비스 신청이 이어집니다.",
    keywords: ["라켓 대여", "교체서비스", "대여 결제", "신청"],
  },
  {
    id: "package-1",
    category: "패키지권",
    question: "패키지권을 사용하면 교체비는 어떻게 처리되나요?",
    answer:
      "사용 가능한 패키지권이 있으면 신청/결제 단계에서 적용 여부를 확인할 수 있으며, 적용 시 교체비가 차감됩니다.",
    keywords: ["패키지권", "교체비", "적용", "결제"],
  },
  {
    id: "member-1",
    category: "회원/비회원",
    question: "비회원 주문은 못하나요?",
    answer:
      "네, 현재 저희 도깨비테니스에서는 비회원을 받고있지 않습니다. 혜택 및 이용에 불편함이 없기위해서 되도록이면 회원가입하여 진행해주세요.",
    keywords: ["비회원 주문 조회", "이름", "이메일", "전화번호"],
  },
  {
    id: "member-2",
    category: "회원/비회원",
    question: "마이페이지에  주문조회가 안나와요.",
    answer:
      "정상적으로 주문 및 결제가 완료되었는지 다시한번 확인해주세요. 계속 조회되지 않으면 매장 전화 및 고객센터 문의로 남겨주세요.",
    keywords: ["주문 조회", "비회원", "고객센터", "문의"],
  },
];

export default function SupportFaqSearch() {
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return FAQ_ITEMS.filter((item) => {
      const byCategory = selectedCategory === "전체" || item.category === selectedCategory;
      if (!byCategory) return false;
      if (!query) return true;

      const targetText = [item.question, item.answer, ...item.keywords].join(" ").toLowerCase();
      return targetText.includes(query);
    });
  }, [searchQuery, selectedCategory]);

  const isDefaultFaqView = selectedCategory === "전체" && searchQuery.trim().length === 0;
  const visibleFaqs = isDefaultFaqView ? filteredFaqs.slice(0, 6) : filteredFaqs;
  const hiddenFaqCount = filteredFaqs.length - visibleFaqs.length;

  const clearSearch = () => {
    setSearchQuery("");
    inputRef.current?.focus();
  };

  return (
    <Card className="overflow-hidden border-border">
      <CardHeader className="border-b border-border bg-muted/30 p-5 md:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-keep text-ui-section-title font-semibold text-foreground">
              자주 묻는 질문
            </h2>
            <p className="mt-1 break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
              자주 묻는 내용을 먼저 확인해보세요.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-5 min-w-0">
          <div
            className={cn(
              "relative min-w-0 transition-all duration-200",
              isFocused && "rounded-lg ring-2 ring-ring ring-offset-2 ring-offset-background",
            )}
          >
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="주문, 배송, 패키지권처럼 궁금한 내용을 검색해보세요"
              className="h-12 min-w-0 border-border bg-background pl-11 pr-10 text-ui-body-sm focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-ui-body-lg"
              aria-label="자주 묻는 질문 검색"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 shrink-0 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="검색어 지우기"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          {FAQ_CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "rounded-full px-4 py-2 text-ui-body-sm font-medium break-keep transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-pressed={isActive}
              >
                {category}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-5 md:p-6">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="break-keep text-ui-body-lg font-medium text-foreground">
              찾는 FAQ가 없습니다
            </p>
            <p className="mt-1 break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
              다른 표현으로 다시 검색하거나 고객센터로 문의해 주세요.
            </p>
            <Button asChild className="mt-4 w-full sm:w-auto" size="sm" wrap="responsive">
              <Link href="/board/qna/write">문의하기</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Accordion type="single" className="space-y-2">
              {visibleFaqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="rounded-xl border border-border bg-card px-4 py-1 data-[state=open]:bg-muted/30 sm:px-5"
                >
                  <AccordionTrigger
                    value={faq.id}
                    className="min-w-0 gap-3 py-4 hover:no-underline sm:py-5"
                  >
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-2 text-left">
                      <Badge
                        variant="secondary"
                        className="px-2 py-0.5 text-ui-label font-normal break-keep"
                      >
                        {faq.category}
                      </Badge>
                      <span className="min-w-0 break-keep break-words text-ui-body-sm font-medium leading-relaxed text-foreground sm:text-ui-body-lg">
                        {faq.question}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent
                    value={faq.id}
                    className="whitespace-pre-line break-keep break-words pb-5 text-ui-body-sm leading-7 text-muted-foreground sm:text-ui-body"
                  >
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {hiddenFaqCount > 0 && (
              <p className="break-keep py-2 text-center text-ui-body-sm leading-relaxed text-muted-foreground">
                {visibleFaqs.length}개의 질문을 표시 중입니다. 더 많은 질문은 검색하거나 카테고리를
                선택해 확인하세요.
              </p>
            )}

            <div className="flex flex-col items-center justify-center gap-3 border-t border-border pt-4 sm:flex-row">
              <span className="break-keep text-center text-ui-body-sm text-muted-foreground">
                원하는 답변을 찾지 못하셨나요?
              </span>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                wrap="responsive"
              >
                <Link href="/board/qna/write">문의하기</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
