"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import SelectStringLayout from "@/app/components/select-string/SelectStringLayout";
import { racketBrandLabel } from "@/lib/constants";
import { racketConditionLabel } from "@/lib/racket-condition";

type RacketMini = {
  id: string;
  brand: string;
  model: string;
  condition: "A" | "B" | "C";
  image: string | null;
};

export default function RentalSelectStringClient({
  racket,
  period,
}: {
  racket: RacketMini;
  period: 7 | 15 | 30;
}) {
  const router = useRouter();

  // Format racket name for display
  const brandLabel = useMemo(() => racketBrandLabel(racket.brand) || racket.brand, [racket.brand]);
  const conditionLabel = useMemo(
    () => racketConditionLabel(racket.condition) || racket.condition,
    [racket.condition],
  );
  const racketName = useMemo(
    () => `${brandLabel} ${racket.model}`.trim(),
    [brandLabel, racket.model],
  );

  // Navigate to checkout when string is selected
  const handleSelectString = ({
    stringProduct,
    selectedGauge,
    selectedColor,
  }: {
    stringProduct: any;
    selectedGauge?: string;
    selectedColor?: string;
    workCount: number;
  }) => {
    const stringId = String(stringProduct?._id);
    const params = new URLSearchParams(`period=${period}`);

    if (stringId) params.set("stringId", stringId);
    if (selectedGauge) params.set("selectedGauge", selectedGauge);
    if (selectedColor) params.set("selectedColor", selectedColor);

    router.push(`/rentals/${encodeURIComponent(racket.id)}/checkout?${params.toString()}`);
  };

  // Navigate to checkout without string
  const handleSkipString = () => {
    const params = new URLSearchParams(`period=${period}`);
    router.push(`/rentals/${encodeURIComponent(racket.id)}/checkout?${params.toString()}`);
  };

  return (
    <SelectStringLayout
      racket={{
        id: racket.id,
        name: racketName,
        image: racket.image,
        brand: racket.brand,
        model: racket.model,
        condition: racket.condition,
        conditionLabel,
      }}
      flowType="rental"
      backLink={`/rackets/${racket.id}`}
      backLabel="라켓 상세로"
      rentalPeriod={period}
      onSelectString={handleSelectString}
      onSkipString={handleSkipString}
      showQuantityControls={false}
      ctaLabel="대여 신청 계속하기"
      ctaSubLabel="선택 후 대여 신청 단계로 이동합니다"
      designVariant="rental"
    />
  );
}
