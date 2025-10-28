// components/nav/SideMenu.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Grid2X2, Wrench, Gift, MessageSquareText } from 'lucide-react';
import { NAV_FLAGS, NAV_LINKS } from './nav.config';

export default function SideMenu() {
  const pathname = usePathname();
  const isActiveHref = (href: string) => {
    if (typeof window === 'undefined') return false;
    const url = new URL(href, window.location.origin);
    // 기본: path 동일
    if (pathname === url.pathname && !url.search) return true;
    // 브랜드 필터 하이라이트: /products?brand=xxx 형태
    if (url.pathname === '/products' && url.searchParams.has('brand')) {
      return pathname === '/products' && new URLSearchParams(window.location.search).get('brand') === url.searchParams.get('brand');
    }
    return false;
  };
  const linkClass = (href: string) => `block rounded px-3 py-2.5 text-[16px] leading-6 hover:bg-muted ${isActiveHref(href) ? 'font-semibold text-foreground' : 'text-muted-foreground'}`;
  return (
    <aside
      className="
        hidden md:block
        fixed left-0 z-30
        h-[calc(100vh-var(--header-h,4rem))] w-60 lg:w-64
        border-r bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60
        overflow-y-auto
      "
      style={{ top: 'var(--header-h, 4rem)' }} // 헤더 높이 자동 반영(기본 64px)
      aria-label="사이드 내비게이션"
    >
      <div className="p-3">
        <Accordion type="multiple" defaultValue={['strings', 'service']}>
          {/* 스트링 */}
          <AccordionItem value="strings">
            <AccordionTrigger value="strings" className="text-base font-semibold py-3">
              <span className="inline-flex items-center gap-2">
                <Grid2X2 className="h-4 w-4" /> 스트링
              </span>
            </AccordionTrigger>
            <AccordionContent value="strings" className="space-y-1">
              <Link href={NAV_LINKS.strings.root} className={linkClass(NAV_LINKS.strings.root)}>
                전체 보기
              </Link>

              {/* 브랜드 서브메뉴 (Tennis Warehouse 좌측처럼) */}
              {NAV_FLAGS.SHOW_BRAND_MENU && NAV_LINKS.strings.brands?.length ? (
                <>
                  <div className="my-2 h-px bg-border" />
                  <div className="space-y-1">
                    {NAV_LINKS.strings.brands.map((b) => (
                      <Link key={b.href} href={b.href} className={linkClass(b.href)}>
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </AccordionContent>
          </AccordionItem>

          {/* 장착 서비스 */}
          <AccordionItem value="service">
            <AccordionTrigger value="service" className="text-base font-semibold py-3">
              <span className="inline-flex items-center gap-2">
                <Wrench className="h-4 w-4" /> 장착 서비스
              </span>
            </AccordionTrigger>
            <AccordionContent value="service" className="space-y-1">
              {NAV_LINKS.services.map((it) => (
                <Link key={it.name} href={it.href} className={linkClass(it.href)}>
                  {it.name}
                </Link>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* 패키지 */}
          <AccordionItem value="packages">
            <AccordionTrigger value="packages" className="text-base font-semibold py-3">
              <span className="inline-flex items-center gap-2">
                <Gift className="h-4 w-4" /> 패키지
              </span>
            </AccordionTrigger>
            <AccordionContent value="packages" className="space-y-1">
              {NAV_LINKS.packages.map((it) => (
                <Link key={it.name} href={it.href} className={linkClass(it.href)}>
                  {it.name}
                </Link>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* 게시판 */}
          <AccordionItem value="boards">
            <AccordionTrigger value="boards" className="text-base font-semibold py-3">
              <span className="inline-flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" /> 게시판
              </span>
            </AccordionTrigger>
            <AccordionContent value="boards" className="space-y-1">
              {NAV_LINKS.boards.map((it) => (
                <Link key={it.name} href={it.href} className={linkClass(it.href)}>
                  {it.name}
                </Link>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </aside>
  );
}
