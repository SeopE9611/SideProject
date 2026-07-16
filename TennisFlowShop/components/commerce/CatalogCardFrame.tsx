import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = { viewMode: "grid" | "list"; media: ReactNode; content: ReactNode; price?: ReactNode; actions?: ReactNode; footerMeta?: ReactNode; className?: string };
export function CatalogCardFrame({ viewMode, media, content, price, actions, footerMeta, className }: Props) {
  if (viewMode === "list") return <Card className={cn("group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:bg-muted/20 hover:shadow-sm", className)}><div className="grid gap-4 p-4 bp-md:grid-cols-[240px_minmax(0,1fr)_220px] bp-lg:grid-cols-[260px_minmax(0,1fr)_230px]"><div className="min-w-0">{media}</div><div className="min-w-0">{content}{footerMeta}</div><div className="flex min-w-0 flex-col gap-3 bp-md:items-end bp-md:justify-between">{price}{actions}</div></div></Card>;
  return <Card className={cn("group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:bg-muted/20 hover:shadow-sm", className)}>{media}<div className="flex flex-1 flex-col p-4">{content}<div className="mt-auto space-y-3 pt-4">{footerMeta}{price}{actions}</div></div></Card>;
}
