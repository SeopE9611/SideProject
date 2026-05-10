"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useMemo, useState } from "react";

type FaqCategory =
  | "전체"
  | "주문/결제"
  | "배송/수령"
  | "교체서비스"
  | "대여/반납"
  | "패키지권"
  | "회원/비회원";

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
    answer:
      "방문 수령 주문은 배송중 상태를 사용자 화면에서 수령 준비중으로 안내합니다.",
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
    question: "비회원 주문은 어디서 조회하나요?",
    answer:
      "비회원 주문 조회 페이지에서 주문 시 입력한 이름, 이메일, 전화번호로 최근 6개월 이내 주문을 조회할 수 있습니다.",
    keywords: ["비회원 주문 조회", "이름", "이메일", "전화번호"],
  },
  {
    id: "member-2",
    category: "회원/비회원",
    question: "주문이 조회되지 않으면 어떻게 해야 하나요?",
    answer:
      "주문 시 입력한 이름, 이메일, 전화번호가 정확한지 확인해주세요. 계속 조회되지 않으면 고객센터 Q&A 문의로 남겨주세요.",
    keywords: ["주문 조회", "비회원", "고객센터", "Q&A 문의"],
  },
];

export default function SupportFaqSearch() {
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>("전체");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return FAQ_ITEMS.filter((item) => {
      const byCategory =
        selectedCategory === "전체" || item.category === selectedCategory;
      if (!byCategory) return false;
      if (!query) return true;

      const targetText = [item.question, item.answer, ...item.keywords]
        .join(" ")
        .toLowerCase();
      return targetText.includes(query);
    });
  }, [searchQuery, selectedCategory]);

  const isDefaultFaqView =
    selectedCategory === "전체" && searchQuery.trim().length === 0;
  const visibleFaqs = isDefaultFaqView
    ? filteredFaqs.slice(0, 6)
    : filteredFaqs;
  const hiddenFaqCount = filteredFaqs.length - visibleFaqs.length;

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="space-y-3 p-4 sm:p-5 md:p-6">
        <CardTitle className="text-xl sm:text-2xl font-semibold">
          자주 묻는 질문
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          주문, 결제, 배송, 교체서비스 관련 자주 묻는 내용을 먼저 확인해보세요.
        </p>
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="궁금한 내용을 검색해보세요"
          aria-label="자주 묻는 질문 검색"
        />
        <div className="flex flex-wrap gap-2">
          {FAQ_CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-pressed={isActive}
              >
                <Badge
                  variant={isActive ? "brand" : "outline"}
                  className="px-3 py-1 text-xs sm:text-sm"
                >
                  {category}
                </Badge>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0 md:p-6 md:pt-0 space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">
              검색 결과가 없습니다.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              다른 검색어를 입력하거나 Q&A 문의로 남겨주세요.
            </p>
          </div>
        ) : (
          <>
            <Accordion
              type="single"
              className="rounded-lg border border-border px-3 sm:px-4"
            >
              {visibleFaqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger
                    value={faq.id}
                    className="gap-3 py-3.5 sm:py-4"
                  >
                    <span className="flex min-w-0 flex-col items-start gap-2 text-left">
                      <Badge variant="outline" className="px-2 py-0.5 text-xs">
                        {faq.category}
                      </Badge>
                      <span className="text-sm font-medium leading-relaxed sm:text-base sm:leading-snug">
                        Q. {faq.question}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent
                    value={faq.id}
                    className="pb-4 text-sm text-muted-foreground leading-relaxed"
                  >
                    A. {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {hiddenFaqCount > 0 && (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                자주 찾는 도움말 {visibleFaqs.length}개를 먼저 보여드려요. 더
                많은 도움말은 검색하거나 카테고리를 선택해 확인해 주세요.
              </div>
            )}
          </>
        )}

        <div className="rounded-lg border border-border bg-muted/20 px-4 py-4">
          <p className="text-sm text-foreground">
            원하는 답변을 찾지 못했다면 Q&A 문의로 남겨주세요.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/board/qna/write">문의하기</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/board/qna">전체 문의 보기</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
