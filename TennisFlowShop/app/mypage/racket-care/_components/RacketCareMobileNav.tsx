"use client";

import type { CareItem } from "@/app/mypage/racket-care/_components/racket-care-client.types";
import { Bell, ClipboardList, HeartPulse, Sparkles } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";

const anchors = [
  { id: "workspace", label: "내 라켓", href: "#racket-care-workspace", icon: ClipboardList },
  { id: "status", label: "상태 진단", href: "#racket-care-status", icon: HeartPulse },
  { id: "reminder", label: "알림 관리", href: "#racket-care-reminder", icon: Bell },
] as const;

type ActiveSection = (typeof anchors)[number]["id"] | null;

export default function RacketCareMobileNav({ item }: { item: CareItem }) {
  const [active, setActive] = useState<ActiveSection>(null);
  const recommendHref = `/products/recommend?from=racket-care&careItemId=${item.id}&freq=${item.playFrequency}`;
  useEffect(() => {
    const sections = anchors.map((anchor) => document.querySelector(anchor.href)).filter((section): section is Element => Boolean(section));
    if (sections.length === 0 || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (!visible) return;
      const matched = anchors.find((anchor) => anchor.href === `#${visible.target.id}`);
      if (matched) setActive(matched.id);
    }, { rootMargin: "-35% 0px -55% 0px", threshold: 0.01 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  const scrollTo = (href: string, id: (typeof anchors)[number]["id"]) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setActive(id);
    const target = document.querySelector(href);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return <div data-bottom-sticky="1" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bp-lg:hidden"><nav className="pointer-events-auto rounded-panel border border-border bg-card/95 p-2 shadow-float backdrop-blur" aria-label="라켓 케어 바로가기"><div className="grid grid-cols-4 gap-1 text-ui-label">{anchors.slice(0, 2).map((anchor) => { const Icon = anchor.icon; return <a key={anchor.id} className="grid min-h-11 place-items-center rounded-control px-1 py-2 text-center data-[active=true]:bg-brand-highlight-muted data-[active=true]:text-brand-highlight-foreground dark:data-[active=true]:text-brand-highlight" href={anchor.href} onClick={scrollTo(anchor.href, anchor.id)} data-active={active === anchor.id} aria-current={active === anchor.id ? "location" : undefined}><Icon className="h-4 w-4" /><span>{anchor.label}</span></a>; })}<Link className="grid min-h-11 place-items-center rounded-control px-1 py-2 text-center" href={recommendHref}><Sparkles className="h-4 w-4" /><span>맞춤 추천</span></Link>{anchors.slice(2).map((anchor) => { const Icon = anchor.icon; return <a key={anchor.id} className="grid min-h-11 place-items-center rounded-control px-1 py-2 text-center data-[active=true]:bg-brand-highlight-muted data-[active=true]:text-brand-highlight-foreground dark:data-[active=true]:text-brand-highlight" href={anchor.href} onClick={scrollTo(anchor.href, anchor.id)} data-active={active === anchor.id} aria-current={active === anchor.id ? "location" : undefined}><Icon className="h-4 w-4" /><span>{anchor.label}</span></a>; })}</div></nav></div>;
}
