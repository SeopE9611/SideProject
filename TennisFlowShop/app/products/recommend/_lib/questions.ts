import type { RecommendQuestion } from "@/app/products/recommend/_types";

export const RECOMMEND_QUESTIONS: RecommendQuestion[] = [
  {
    id: "goal",
    title: "가장 중요하게 보는 플레이 감각은 무엇인가요?",
    description: "지금 가장 기대하는 스트링의 느낌을 골라주세요.",
    options: [
      { label: "파워", description: "공을 더 쉽게 밀어내는 느낌을 원해요.", value: "power" },
      { label: "스핀", description: "회전량과 안정적인 궤적을 원해요.", value: "spin" },
      { label: "컨트롤", description: "원하는 코스로 보내는 안정감을 원해요.", value: "control" },
      { label: "편안함", description: "부드럽고 부담이 적은 타구감을 원해요.", value: "comfort" },
      { label: "내구성", description: "오래 사용할 수 있는 구성을 원해요.", value: "durability" },
    ],
  },
  {
    id: "level",
    title: "현재 실력 수준은 어느 정도인가요?",
    description: "추천 기준을 너무 어렵거나 과하게 잡지 않기 위해 필요해요.",
    options: [
      { label: "입문", description: "이제 막 테니스를 시작했어요.", value: "beginner" },
      { label: "초급", description: "기본 랠리와 게임을 익히는 중이에요.", value: "novice" },
      { label: "중급", description: "플레이 스타일이 조금씩 잡혀가고 있어요.", value: "intermediate" },
      { label: "상급", description: "원하는 성능이 비교적 명확해요.", value: "advanced" },
    ],
  },
  {
    id: "arm",
    title: "팔이나 손목에 부담이 느껴지는 편인가요?",
    description: "부드러운 타구감과 안정감을 고려하기 위한 질문이에요.",
    options: [
      { label: "있음", description: "부담이 느껴질 때가 있어요.", value: "high" },
      { label: "보통", description: "특별히 심하지는 않지만 신경 쓰고 싶어요.", value: "medium" },
      { label: "없음", description: "부담보다는 성능을 더 우선해도 괜찮아요.", value: "low" },
    ],
  },
  {
    id: "freq",
    title: "얼마나 자주 플레이하시나요?",
    description: "사용 빈도에 따라 내구성과 편안함의 우선순위가 달라질 수 있어요.",
    options: [
      { label: "월 1~2회", description: "가끔 즐기는 편이에요.", value: "monthly" },
      { label: "주 1회", description: "꾸준히 플레이해요.", value: "weekly" },
      { label: "주 2~3회", description: "자주 플레이하는 편이에요.", value: "biweekly_plus" },
      { label: "주 4회 이상", description: "매우 자주 플레이해요.", value: "heavy" },
    ],
  },
  {
    id: "budget",
    title: "예산 성향은 어떻게 잡고 싶나요?",
    description: "가격대에 맞는 선택지를 좁히기 위한 질문이에요.",
    options: [
      { label: "가성비", description: "합리적인 가격을 우선하고 싶어요.", value: "value" },
      { label: "중간", description: "가격과 성능의 균형을 보고 싶어요.", value: "mid" },
      { label: "프리미엄", description: "좋은 성능이라면 가격대가 높아도 괜찮아요.", value: "premium" },
    ],
  },
];
