"use client";

import { Button } from "@/components/ui/button";

export type CheckoutBottomStickyBarProps = {
  amount: number;
  label: string;
  amountLabel: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  helperText?: string;
  ariaLabel?: string;
};

export default function CheckoutBottomStickyBar({
  amount,
  label,
  amountLabel,
  disabled = false,
  loading = false,
  onClick,
  helperText,
  ariaLabel,
}: CheckoutBottomStickyBarProps) {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;

  return (
    <div
      data-bottom-sticky="1"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pt-3 pb-[calc(env(safe-area-inset-bottom)+10px)] shadow-lg backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4">
        <div className="min-w-0 flex-1">
          <p className="text-ui-label text-muted-foreground">{amountLabel}</p>
          <p className="whitespace-nowrap text-ui-price-lg font-semibold tabular-nums text-foreground">
            {safeAmount.toLocaleString()}원
          </p>
          {helperText && <p className="mt-0.5 truncate text-ui-label text-muted-foreground">{helperText}</p>}
        </div>
        <Button
          type="button"
          className="h-11 min-w-[132px] shrink-0 px-4 font-semibold sm:h-12"
          disabled={disabled || loading}
          aria-label={ariaLabel ?? label}
          onClick={onClick}
        >
          {loading ? "처리 중..." : label}
        </Button>
      </div>
    </div>
  );
}
