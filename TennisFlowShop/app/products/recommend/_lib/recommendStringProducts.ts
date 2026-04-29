import { getRecommendedTensionRange } from "@/app/products/recommend/_lib/tension";
import type {
  CompletedStringRecommendAnswers,
  RecommendableProduct,
  RecommendedStringProduct,
} from "@/app/products/recommend/_types";

function normalizeFeatureScore(value: number | undefined): number {
  if (!value || value <= 0) return 0;
  if (value <= 5) return value / 5;
  if (value <= 10) return value / 10;
  return Math.min(1, value / 10);
}

function isSoldOut(product: RecommendableProduct): boolean {
  const status = String(product.inventory?.status ?? "").toLowerCase();
  if (status === "outofstock" || status === "soldout") return true;

  const manageStock = product.inventory?.manageStock === true;
  const stock = Number(product.inventory?.stock ?? 0);
  const allowBackorder = product.inventory?.allowBackorder === true;
  return manageStock && stock <= 0 && !allowBackorder;
}

function scoreProduct(product: RecommendableProduct, answers: CompletedStringRecommendAnswers): number {
  const feature = product.features ?? {};
  const goalKey = answers.goal;
  const goalScore = normalizeFeatureScore(feature[goalKey]);
  let score = goalScore * 40;

  const comfort = normalizeFeatureScore(feature.comfort);
  const control = normalizeFeatureScore(feature.control);
  const durability = normalizeFeatureScore(feature.durability);

  if (answers.level === "beginner" || answers.level === "novice") {
    score += (product.tags?.beginner ? 7 : 0) + (comfort * 4 + control * 4);
  } else if (answers.level === "intermediate") {
    score += goalScore * 7 + comfort * 4 + control * 4;
  } else {
    score += goalScore * 12 + (product.tags?.advanced ? 3 : 0);
  }

  if (answers.arm === "high") {
    score += comfort * 20;
    if (comfort < 0.3) score -= 5;
  } else if (answers.arm === "medium") {
    score += comfort * 10 + control * 10;
  }

  if (answers.freq === "monthly" || answers.freq === "weekly") {
    score += comfort * 5 + control * 5;
  } else if (answers.freq === "biweekly_plus") {
    score += durability * 10;
  } else {
    score += durability * 10;
  }

  const price = Number(product.price ?? 0);
  if (answers.budget === "value") score += price <= 15000 ? 10 : price <= 30000 ? 4 : 0;
  if (answers.budget === "mid") score += price > 15000 && price <= 30000 ? 10 : price <= 40000 ? 5 : 1;
  if (answers.budget === "premium") score += price > 30000 ? 10 : price > 20000 ? 4 : 1;

  if ((product.mountingFee ?? 0) > 0) score += 3;
  if (!isSoldOut(product)) score += 2;

  return Math.round(score * 10) / 10;
}

function buildReasons(product: RecommendableProduct, answers: CompletedStringRecommendAnswers): string[] {
  const reasons: string[] = [];
  const goalReasonMap: Record<CompletedStringRecommendAnswers["goal"], string> = {
    power: "파워 성향 점수가 높아 공을 더 쉽게 밀어내는 느낌을 원하는 사용자에게 잘 맞습니다.",
    spin: "스핀 성향이 강해 회전량과 안정적인 궤적을 원하는 사용자에게 적합합니다.",
    control: "컨트롤 성향이 높아 원하는 코스로 보내는 안정감을 중시할 때 선택하기 좋습니다.",
    comfort: "편안한 타구감을 우선한 선택으로 부드러운 느낌을 선호하는 사용자에게 잘 맞습니다.",
    durability: "내구성 성향이 높아 자주 플레이하는 사용자에게 고려하기 좋은 선택입니다.",
  };
  reasons.push(goalReasonMap[answers.goal]);

  if (answers.arm === "high") {
    reasons.push("팔이나 손목 부담이 신경 쓰이는 경우를 고려해 편안한 타구감 요소를 함께 반영했습니다.");
  } else if (answers.freq === "heavy" || answers.freq === "biweekly_plus") {
    reasons.push("플레이 빈도를 고려해 내구성 요소를 함께 반영했습니다.");
  }

  if (answers.budget === "value") reasons.push("가성비를 고려해 가격 부담이 비교적 낮은 선택지를 우선 반영했습니다.");
  else if (answers.budget === "premium") reasons.push("프리미엄 예산 성향을 반영해 성능 중심 선택지를 함께 고려했습니다.");

  if (reasons.length < 2) {
    reasons.push("실력 수준과 플레이 빈도를 함께 반영해 균형 잡힌 선택지를 추천합니다.");
  }

  return reasons.slice(0, 3);
}

export function recommendStringProducts(products: RecommendableProduct[], answers: CompletedStringRecommendAnswers): RecommendedStringProduct[] {
  const scored = products
    .filter((p) => !!p.id && !!p.name)
    .map((product) => ({
      product,
      score: scoreProduct(product, answers),
      reasons: buildReasons(product, answers),
      tensionRange: getRecommendedTensionRange(answers, product),
      badges: [product.material, product.gauge, product.tags?.beginner ? "입문 추천" : null, product.tags?.advanced ? "상급 추천" : null]
        .filter((v): v is string => Boolean(v))
        .slice(0, 3),
    }));

  const primaryPool = scored.filter((item) => {
    const soldOut = isSoldOut(item.product);
    const hasMounting = (item.product.mountingFee ?? 0) > 0;
    const allowBackorder = item.product.inventory?.allowBackorder === true;
    return !soldOut && hasMounting && !allowBackorder;
  });

  const fallbackPool = scored.filter((item) => !isSoldOut(item.product));

  const primaryTop = primaryPool.sort((a, b) => b.score - a.score).slice(0, 3);
  if (primaryTop.length >= 3) return primaryTop;

  const used = new Set(primaryTop.map((p) => p.product.id));
  const fallbackTop = fallbackPool
    .sort((a, b) => b.score - a.score)
    .filter((item) => !used.has(item.product.id))
    .slice(0, 3 - primaryTop.length);

  return [...primaryTop, ...fallbackTop].slice(0, 3);
}
