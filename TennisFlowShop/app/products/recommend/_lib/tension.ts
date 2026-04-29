import type {
  CompletedStringRecommendAnswers,
  RecommendableProduct,
  TensionRange,
} from "@/app/products/recommend/_types";

export function getRecommendedTensionRange(
  answers: CompletedStringRecommendAnswers,
  _product: RecommendableProduct,
): TensionRange {
  if (answers.arm === "high" || answers.goal === "comfort") {
    return {
      min: 44,
      max: 48,
      label: "추천 시작 범위",
      note: "실제 텐션은 라켓 상태와 사용 습관에 따라 조정될 수 있어요.",
    };
  }

  if (answers.level === "beginner" || answers.level === "novice") {
    return {
      min: 45,
      max: 50,
      label: "추천 시작 범위",
      note: "실제 텐션은 라켓 상태와 사용 습관에 따라 조정될 수 있어요.",
    };
  }

  if (answers.goal === "durability" || answers.freq === "heavy") {
    return {
      min: 48,
      max: 53,
      label: "추천 시작 범위",
      note: "실제 텐션은 라켓 상태와 사용 습관에 따라 조정될 수 있어요.",
    };
  }

  if (answers.goal === "control") {
    return { min: 48, max: 52, label: "추천 시작 범위", note: "실제 텐션은 라켓 상태와 사용 습관에 따라 조정될 수 있어요." };
  }

  if (answers.goal === "power") {
    return { min: 45, max: 49, label: "추천 시작 범위", note: "실제 텐션은 라켓 상태와 사용 습관에 따라 조정될 수 있어요." };
  }

  if (answers.goal === "spin") {
    return { min: 46, max: 51, label: "추천 시작 범위", note: "실제 텐션은 라켓 상태와 사용 습관에 따라 조정될 수 있어요." };
  }

  return {
    min: 46,
    max: 51,
    label: "추천 시작 범위",
    note: "실제 텐션은 라켓 상태와 사용 습관에 따라 조정될 수 있어요.",
  };
}
