import { getRecommendedTensionRange } from "@/app/products/recommend/_lib/tension";
import { stringMaterialLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { getEffectiveProductPrice } from "@/lib/product-pricing";
import { hasPaidMountingFee, isMountableStringByFee } from "@/lib/orders/string-mounting-policy";
import { hasSelectableStringStock } from "@/lib/products/string-stock";
import type {
  CompletedStringRecommendAnswers,
  RecommendableProduct,
  RecommendedStringProduct,
} from "@/app/products/recommend/_types";

type FeatureKey = keyof NonNullable<RecommendableProduct["features"]>;

const FEATURE_LABELS: Record<FeatureKey, string> = {
  power: "파워",
  control: "컨트롤",
  spin: "스핀",
  durability: "내구성",
  comfort: "편안함",
};

function normalizeFeatureScore(value: number | undefined): number {
  if (!value || value <= 0) return 0;
  return Math.min(1, value / 100);
}

function featureScorePoint(value: number | undefined): number {
  return Math.round(normalizeFeatureScore(value) * 100);
}

function isSoldOut(product: RecommendableProduct): boolean {
  const status = String(product.inventory?.status ?? "").toLowerCase();
  if (status === "outofstock" || status === "soldout") return true;
  if (!hasSelectableStringStock(product)) return true;

  const manageStock = product.inventory?.manageStock === true;
  const stock = Number(product.inventory?.stock ?? 0);
  const allowBackorder = product.inventory?.allowBackorder === true;
  return manageStock && stock <= 0 && !allowBackorder;
}

function hasAnyFeatureScore(product: RecommendableProduct): boolean {
  const features = product.features ?? {};
  return ["power", "control", "spin", "durability", "comfort"].some(
    (key) => normalizeFeatureScore(features[key as FeatureKey]) > 0,
  );
}

function getSecondaryFeatureKey(
  product: RecommendableProduct,
  answers: CompletedStringRecommendAnswers,
): FeatureKey {
  if (answers.arm === "high" && answers.goal !== "comfort") return "comfort";
  if (
    (answers.freq === "heavy" || answers.freq === "biweekly_plus") &&
    answers.goal !== "durability"
  )
    return "durability";
  if (answers.goal !== "control") return "control";

  const features = product.features ?? {};
  return (["spin", "power", "comfort", "durability"] as FeatureKey[]).sort(
    (a, b) => normalizeFeatureScore(features[b]) - normalizeFeatureScore(features[a]),
  )[0];
}

function getPrimaryGauge(product: RecommendableProduct): string | undefined {
  return product.gauge || product.gaugeOptions?.[0];
}

function getGaugeNumber(product: RecommendableProduct): number | null {
  const raw = getPrimaryGauge(product);
  if (!raw) return null;
  const matched = raw.match(/\d+(?:\.\d+)?/);
  if (!matched) return null;
  const value = Number(matched[0]);
  return Number.isFinite(value) ? value : null;
}

function getMaterialGaugeLabel(product: RecommendableProduct): string {
  const material = stringMaterialLabel(product.material) || "소재 정보 없음";
  const gauge = formatGaugeLabel(getPrimaryGauge(product)) || "게이지(굵기) 정보 없음";
  return `${material} · ${gauge}`;
}

function getBudgetLabel(budget: CompletedStringRecommendAnswers["budget"]): string {
  if (budget === "value") return "가성비";
  if (budget === "premium") return "프리미엄";
  return "중간";
}

function getFrequencyLabel(freq: CompletedStringRecommendAnswers["freq"]): string {
  if (freq === "monthly") return "월 1~2회";
  if (freq === "weekly") return "주 1회";
  if (freq === "biweekly_plus") return "주 2~3회";
  return "주 4회 이상";
}

function getArmLabel(arm: CompletedStringRecommendAnswers["arm"]): string {
  if (arm === "high") return "팔 부담 있음";
  if (arm === "medium") return "팔 부담 보통";
  return "팔 부담 낮음";
}

function scoreProduct(
  product: RecommendableProduct,
  answers: CompletedStringRecommendAnswers,
): number {
  const feature = product.features ?? {};
  const goalKey = answers.goal;
  const goalScore = normalizeFeatureScore(feature[goalKey]);
  let score = goalScore * 40;

  const comfort = normalizeFeatureScore(feature.comfort);
  const control = normalizeFeatureScore(feature.control);
  const durability = normalizeFeatureScore(feature.durability);

  if (answers.level === "beginner" || answers.level === "novice") {
    score += (product.tags?.beginner ? 7 : 0) + comfort * 4 + control * 4;
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

  // 할인 상품은 추천 순위가 실제 구매 부담에 맞도록 실판매가 기준으로 예산 점수를 계산한다.
  const price = getEffectiveProductPrice(product);
  if (answers.budget === "value") score += price <= 15000 ? 10 : price <= 30000 ? 4 : 0;
  if (answers.budget === "mid")
    score += price > 15000 && price <= 30000 ? 10 : price <= 40000 ? 5 : 1;
  if (answers.budget === "premium") score += price > 30000 ? 10 : price > 20000 ? 4 : 1;

  if (hasPaidMountingFee(product.mountingFee)) score += 3;
  if (!isSoldOut(product)) score += 2;

  return Math.round(score * 10) / 10;
}

function buildReasons(
  product: RecommendableProduct,
  answers: CompletedStringRecommendAnswers,
): string[] {
  const features = product.features ?? {};
  const goalPoint = featureScorePoint(features[answers.goal]);
  const secondaryKey = getSecondaryFeatureKey(product, answers);
  const secondaryPoint = featureScorePoint(features[secondaryKey]);
  const price = getEffectiveProductPrice(product);
  const gauge = getGaugeNumber(product);
  const material = stringMaterialLabel(product.material);
  const reasons: string[] = [
    `${FEATURE_LABELS[answers.goal]} ${goalPoint}점으로 선택한 목표 성능과 가장 강하게 맞습니다.`,
  ];

  if (secondaryPoint > 0) {
    reasons.push(
      `${FEATURE_LABELS[secondaryKey]} ${secondaryPoint}점을 함께 반영해 ${getArmLabel(
        answers.arm,
      )} · ${getFrequencyLabel(answers.freq)} 조건을 보완했습니다.`,
    );
  }

  if (gauge && gauge >= 1.28) {
    reasons.push(
      `${formatGaugeLabel(String(gauge))} 게이지(굵기)라 잦은 사용 환경에서 안정적이고 내구성을 기대하기 좋습니다.`,
    );
  } else if (gauge && gauge <= 1.23) {
    reasons.push(
      `${formatGaugeLabel(String(gauge))} 게이지(굵기)라 반발과 스핀 감각을 살리되 컨트롤 변화를 확인해 보세요.`,
    );
  } else if (material) {
    reasons.push(`${material} 소재 특성을 고려해 현재 플레이 성향과 균형을 맞췄습니다.`);
  }

  const budgetLabel = getBudgetLabel(answers.budget);
  if (reasons.length < 3) {
    reasons.push(
      `판매가 ${price.toLocaleString()}원으로 ${budgetLabel} 예산 조건에서 비교하기 좋은 선택지입니다.`,
    );
  }

  if (answers.arm === "high" && featureScorePoint(features.comfort) < 50) {
    reasons[reasons.length - 1] =
      "다만 편안함 점수가 낮아 팔 부담이 있다면 낮은 텐션부터 시작하는 것이 좋습니다.";
  }

  return reasons.slice(0, 3);
}

function buildMatchSummary(
  product: RecommendableProduct,
  answers: CompletedStringRecommendAnswers,
): NonNullable<RecommendedStringProduct["matchSummary"]> {
  const features = product.features ?? {};
  const secondaryKey = getSecondaryFeatureKey(product, answers);
  return [
    {
      label: "선택 목표 성능",
      value: `${FEATURE_LABELS[answers.goal]} ${featureScorePoint(features[answers.goal])}점`,
    },
    {
      label: "보조 성능",
      value: `${FEATURE_LABELS[secondaryKey]} ${featureScorePoint(features[secondaryKey])}점`,
    },
    {
      label: "실제 판매가",
      value: `${getEffectiveProductPrice(product).toLocaleString()}원`,
    },
    {
      label: "소재/게이지(굵기)",
      value: getMaterialGaugeLabel(product),
    },
  ];
}

export function recommendStringProducts(
  products: RecommendableProduct[],
  answers: CompletedStringRecommendAnswers,
): RecommendedStringProduct[] {
  const scored = products.map((product) => ({
    product,
    score: scoreProduct(product, answers),
    reasons: buildReasons(product, answers),
    tensionRange: getRecommendedTensionRange(answers, product),
    badges: [
      stringMaterialLabel(product.material),
      formatGaugeLabel(getPrimaryGauge(product)),
      product.tags?.beginner ? "입문 추천" : null,
      product.tags?.advanced ? "상급 추천" : null,
    ]
      .filter((v): v is string => Boolean(v))
      .slice(0, 3),
    matchSummary: buildMatchSummary(product, answers),
  }));

  const eligible = scored.filter((item) => {
    const product = item.product;

    return (
      !!product.id &&
      !!product.name &&
      isMountableStringByFee(product.mountingFee) &&
      !isSoldOut(product) &&
      product.inventory?.allowBackorder !== true &&
      hasAnyFeatureScore(product)
    );
  });

  return eligible.sort((a, b) => b.score - a.score).slice(0, 3);
}
