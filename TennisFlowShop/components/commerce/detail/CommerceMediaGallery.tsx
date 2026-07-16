"use client";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CommerceMediaGalleryProps = { images: string[]; alt: string; overrideImage?: string; badges?: ReactNode; objectFit?: "contain" | "cover"; emptyLabel?: string; className?: string; stickyClassName?: string };
export function CommerceMediaGallery({ images, alt, overrideImage, badges, objectFit = "contain", emptyLabel = "이미지가 없습니다", className, stickyClassName }: CommerceMediaGalleryProps) {
 const galleryImages = useMemo(() => Array.from(new Set([overrideImage, ...images].filter(Boolean) as string[])), [images, overrideImage]);
 const [selected, setSelected] = useState(0);
 useEffect(() => setSelected(0), [overrideImage]);
 const current = galleryImages[selected]; const hasMany = galleryImages.length > 1;
 return <div className={cn("self-start bp-md:sticky bp-md:top-[calc(var(--header-h,64px)+1rem)]", stickyClassName)}><div className={cn("space-y-3", className)}><div className="relative aspect-square overflow-hidden rounded-panel border border-border bg-muted/20">{current ? <Image src={current} alt={alt} fill sizes="(min-width: 1200px) 58vw, (min-width: 768px) 55vw, 100vw" className={cn(objectFit === "cover" ? "object-cover" : "object-contain p-5 sm:p-8")} priority /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground"><ImageIcon className="h-10 w-10" /><span className="text-ui-body-sm">{emptyLabel}</span></div>}{badges ? <div className="absolute left-4 top-4 flex flex-wrap gap-2">{badges}</div> : null}{hasMany ? <><Button type="button" variant="secondary" size="icon" aria-label="이전 이미지" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90" onClick={() => setSelected((i) => (i - 1 + galleryImages.length) % galleryImages.length)}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="secondary" size="icon" aria-label="다음 이미지" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90" onClick={() => setSelected((i) => (i + 1) % galleryImages.length)}><ChevronRight className="h-4 w-4" /></Button></> : null}</div>{galleryImages.length > 0 ? <div className="flex gap-2 overflow-x-auto pb-1" aria-label="상품 이미지 썸네일">{galleryImages.map((image, index) => { const isSelected = index === selected; return <button key={`${image}-${index}`} type="button" aria-pressed={isSelected} aria-label={`${alt} 이미지 ${index + 1} 보기`} onClick={() => setSelected(index)} className={cn("relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted/20 transition", isSelected ? "border-brand-highlight-ink ring-2 ring-brand-highlight-muted" : "border-border hover:border-foreground/40")}><Image src={image} alt="" fill sizes="80px" className={objectFit === "cover" ? "object-cover" : "object-contain p-2"} /></button>})}</div> : null}</div></div>;
}
