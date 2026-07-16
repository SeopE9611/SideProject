import type { ReactNode } from "react";
import { Check, ShoppingBag } from "lucide-react";
import Image from "next/image";

export type SelectedRacketSummaryProps = {
  label: string;
  name: string;
  image?: string | null;
  price?: ReactNode;
  meta?: ReactNode;
  quantityControls?: ReactNode;
  secondaryAction?: ReactNode;
  helper?: ReactNode;
};

export function SelectedRacketSummary({
  label,
  name,
  image,
  price,
  meta,
  quantityControls,
  secondaryAction,
  helper,
}: SelectedRacketSummaryProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-secondary/30 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          </span>
          <h2 className="text-ui-body-sm font-semibold text-foreground">{label}</h2>
        </div>
      </div>

      <div className="p-4 bp-md:p-5">
        <div className="flex gap-3 bp-md:gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted/30 bp-md:h-20 bp-md:w-20">
            {image ? (
              <Image src={image} alt={name} fill sizes="80px" className="object-contain p-1" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 min-w-0 break-words text-ui-body-sm font-semibold leading-tight text-foreground">
              {name}
            </h3>
            {price && <div className="mt-2">{price}</div>}
            {meta && <div className="mt-2">{meta}</div>}
          </div>
        </div>

        {quantityControls && <div className="mt-5">{quantityControls}</div>}
        {secondaryAction && <div className="mt-4">{secondaryAction}</div>}
        {helper && (
          <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3 text-ui-label leading-relaxed text-muted-foreground">
            {helper}
          </div>
        )}
      </div>
    </section>
  );
}
