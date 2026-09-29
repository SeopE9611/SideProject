import type {
  CompletedStringRecommendAnswers,
  RecommendableProduct,
  TensionRange,
} from "@/app/products/recommend/_types";

function getGaugeNumber(product: RecommendableProduct): number | null {
  const raw = product.gauge || product.gaugeOptions?.[0];
  if (!raw) return null;
  const matched = raw.match(/\d+(?:\.\d+)?/);
  if (!matched) return null;
  const value = Number(matched[0]);
  return Number.isFinite(value) ? value : null;
}

function buildTensionNote(
  answers: CompletedStringRecommendAnswers,
  product: RecommendableProduct,
): string {
  const material = String(product.material ?? "").toLowerCase();
  const gauge = getGaugeNumber(product);

  if (answers.arm === "high") {
    return "팔 부담을 줄이기 위해 권장 범위 하단부터 시작하는 것을 추천합니다.";
  }

  if (material === "polyester" || material === "monofilament") {
    return "폴리에스터 계열은 처음에는 너무 높게 잡지 말고 타구감을 보며 조정하세요.";
  }

  if (gauge && gauge >= 1.28) {
    return "두꺼운 게이지는 내구성은 좋지만 타구감이 단단할 수 있어 단계적으로 조정하세요.";
  }

  if (gauge && gauge <= 1.23) {
    return "얇은 게이지는 반발/스핀 감각이 살아날 수 있어 컨트롤을 보며 조정하세요.";
  }

  if (answers.freq === "heavy" || answers.freq === "biweekly_plus") {
    return "플레이 빈도가 높은 편이므로 첫 장착 후 장력 유지감과 마모 속도를 함께 확인하세요.";
  }

  return "실제 텐션은 라켓 상태와 사용 습관에 따라 조정될 수 있어요.";
}

export function getRecommendedTensionRange(
  answers: CompletedStringRecommendAnswers,
  product: RecommendableProduct,
): TensionRange {
  const note = buildTensionNote(answers, product);

  if (answers.arm === "high" || answers.goal === "comfort") {
    return {
      min: 44,
      max: 48,
      label: "추천 시작 범위",
      note,
    };
  }

  if (answers.level === "beginner" || answers.level === "novice") {
    return {
      min: 45,
      max: 50,
      label: "추천 시작 범위",
      note,
    };
  }

  if (answers.goal === "durability" || answers.freq === "heavy") {
    return {
      min: 48,
      max: 53,
      label: "추천 시작 범위",
      note,
    };
  }

  if (answers.goal === "control") {
    return {
      min: 48,
      max: 52,
      label: "추천 시작 범위",
      note,
    };
  }

  if (answers.goal === "power") {
    return {
      min: 45,
      max: 49,
      label: "추천 시작 범위",
      note,
    };
  }

  if (answers.goal === "spin") {
    return {
      min: 46,
      max: 51,
      label: "추천 시작 범위",
      note,
    };
  }

  return {
    min: 46,
    max: 51,
    label: "추천 시작 범위",
    note,
  };
}
