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
    <section className="-mx-3 border-y border-border px-3 py-4 bp-sm:-mx-4 bp-sm:px-4 bp-md:mx-0 bp-md:overflow-hidden bp-md:rounded-2xl bp-md:border bp-md:bg-card bp-md:p-0 bp-md:shadow-sm">
      <div className="border-b border-border pb-3 bp-md:bg-secondary/30 bp-md:px-5 bp-md:py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          </span>
          <h2 className="text-ui-body-sm font-ui-bold text-foreground">{label}</h2>
        </div>
      </div>

      <div className="pt-4 bp-md:p-5">
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
            <h3 className="min-w-0 break-words text-ui-body-sm font-ui-medium leading-tight text-foreground">
              {name}
            </h3>
            {price && <div className="mt-2">{price}</div>}
            {meta && <div className="mt-2">{meta}</div>}
          </div>
        </div>

        {quantityControls && <div className="mt-5">{quantityControls}</div>}
        {secondaryAction && <div className="mt-4">{secondaryAction}</div>}
        {helper && (
          <div className="mt-4 border-t border-border pt-3 text-ui-label leading-relaxed text-muted-foreground bp-md:rounded-xl bp-md:border bp-md:bg-muted/20 bp-md:p-3">
            {helper}
          </div>
        )}
      </div>
    </section>
  );
}
