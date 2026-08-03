"use client";

import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export type CheckoutBottomStickyBarProps = {
  amount: number;
  label: string;
  amountLabel: string;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  onClick: () => void;
  helperText?: string;
  ariaLabel?: string;
};

export default function CheckoutBottomStickyBar({
  amount,
  label,
  amountLabel,
  icon,
  disabled = false,
  loading = false,
  loadingLabel = "처리 중...",
  onClick,
  helperText,
  ariaLabel,
}: CheckoutBottomStickyBarProps) {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;

  return (
    <div
      data-bottom-sticky="1"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pt-3 pb-[calc(env(safe-area-inset-bottom)+10px)] shadow-float bp-lg:hidden"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4">
        <div className="min-w-0 flex-1">
          <p className="text-ui-label text-muted-foreground">{amountLabel}</p>
          <p className="truncate text-ui-price-lg font-ui-medium tabular-nums text-foreground">
            {safeAmount.toLocaleString()}원
          </p>
          {helperText && (
            <p className="mt-0.5 line-clamp-1 text-ui-label leading-tight text-muted-foreground">
              {helperText}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="highlight"
          size="tall"
          wrap="responsive"
          className="min-w-0 w-full max-w-[52vw] shrink-[0.6] px-3 bp-sm:w-auto bp-sm:min-w-[128px] bp-sm:px-4"
          disabled={disabled || loading}
          aria-label={ariaLabel ?? label}
          onClick={onClick}
        >
          {loading ? (
            <span>{loadingLabel}</span>
          ) : (
            <>
              {icon}
              <span>{label}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
