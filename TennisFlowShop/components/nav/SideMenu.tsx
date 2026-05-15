"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV_FLAGS, NAV_LINKS } from "./nav.config";

export default function SideMenu() {
  const pathname = usePathname();
  const search = useSearchParams();

  const isActiveHref = (href: string) => {
    const url = new URL(href, "http://dummy.local");

    // 라켓 브랜드 필터 활성화
    if (url.pathname === "/rackets" && url.searchParams.has("brand")) {
      return pathname === "/rackets" && search?.get("brand") === url.searchParams.get("brand");
    }

    // 스트링 브랜드 필터 활성화
    if (url.pathname === "/products" && url.searchParams.has("brand")) {
      return pathname === "/products" && search?.get("brand") === url.searchParams.get("brand");
    }

    // 일반 경로 활성화
    return pathname === url.pathname;
  };

  const linkClass = (href: string) => {
    const isActive = isActiveHref(href);
    return cn(
      "group relative z-0 block rounded-lg px-3 py-2.5 text-[15px] leading-5 font-medium transition-[background-color,color,border-color,box-shadow,opacity] duration-200",
      "hover:bg-primary/10 dark:hover:bg-primary/20",
      "hover:shadow-sm hover:z-10",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      isActive ? "bg-primary/10 text-foreground border border-primary/20 shadow-sm dark:bg-primary/20" : "text-foreground/75 hover:text-foreground",
    );
  };

  const brandLinkClass = (href: string) => {
    const isActive = isActiveHref(href);
    return cn(
      "group relative z-0 block rounded-md px-3 py-2 text-[14px] font-medium transition-[background-color,color,border-color,box-shadow,opacity] duration-200",
      "hover:bg-muted",
      "hover:shadow-sm hover:z-10",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      isActive ? "bg-muted text-foreground font-semibold shadow-sm" : "text-foreground/75 hover:text-foreground",
    );
  };

  const subMenuContentClass = "ml-2 border-l border-border/70 pb-2 pl-3 pt-1 space-y-0.5";

  const nestedGroupClass = "mt-1.5 pl-1.5";

  const nestedTriggerClass = "px-3 py-2 text-sm leading-5 font-semibold text-foreground/70 hover:text-foreground rounded-lg hover:bg-muted";

  const topLevelLinkClass = (href: string) => {
    const isActive = isActiveHref(href);
    return cn(
      "group relative z-0 block rounded-lg px-3 py-3 text-[17px] leading-6 font-bold transition-[background-color,color,border-color,box-shadow,opacity] duration-200",
      "hover:bg-primary/10 dark:hover:bg-primary/20",
      "hover:shadow-sm hover:z-10",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      isActive ? "bg-primary/10 text-foreground border border-primary/20 shadow-sm dark:bg-primary/20" : "text-foreground hover:text-foreground",
    );
  };

  return (
    <aside
      className="hidden bp-lg:block fixed left-0 z-30 h-[calc(100vh-var(--header-h,4rem))] w-72 bp-lg:w-72 xl:w-80 border-r border-border bg-background backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-hidden"
      style={{ top: "var(--header-h, 4rem)" }}
      aria-label="사이드 내비게이션"
    >
      <div className="h-full overflow-y-auto scrollbar-hide px-5 py-4 space-y-1.5">

        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-primary">무엇을 하러 오셨나요?</p>
          <div className="mt-3 grid gap-2">
            {[
              ["스트링 교체 신청하기", "/services/apply"],
              ["새 스트링 고르고 장착 신청", "/products?from=apply"],
              ["라켓 구매/대여 + 장착", "/rackets?from=apply"],
              ["아카데미 신청", "/academy"],
              ["주문/신청 상태 확인", "/mypage"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="group flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted">
                <span>{label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
        <Accordion type="multiple" defaultValue={["strings", "rackets", "support", "boards"]}>
          {/* 스트링 */}
          <AccordionItem value="strings" className="border-none">
            <AccordionTrigger value="strings" className="py-3 px-3 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 hover:no-underline transition-[background-color,color,border-color,box-shadow,opacity] group">
              <span className="inline-flex items-center gap-2.5 text-[17px] leading-6 font-bold">
                {/* <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
                  <Grid2X2 className="h-4 w-4" />
                </div> */}
                <span className="text-foreground">스트링</span>
              </span>
            </AccordionTrigger>
            <AccordionContent value="strings" className={subMenuContentClass}>
              <Link href={NAV_LINKS.strings.root} className={linkClass(NAV_LINKS.strings.root)}>
                <span className="flex items-center justify-between">
                  전체 보기
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-[background-color,color,border-color,box-shadow,opacity] duration-200" />
                </span>
              </Link>

              {/* 접어두는 하위 그룹(브랜드) */}
              <div className={nestedGroupClass}>
                <Accordion type="single" className="space-y-1">
                  {NAV_FLAGS.SHOW_BRAND_MENU && NAV_LINKS.strings.brands?.length ? (
                    <AccordionItem value="strings-brand" className="border-none">
                      <AccordionTrigger value="strings-brand" className={nestedTriggerClass}>
                        브랜드
                      </AccordionTrigger>
                      <AccordionContent value="strings-brand" className="pb-0 pt-1">
                        <div className="grid grid-cols-2 gap-1">
                          {NAV_LINKS.strings.brands.map((b) => {
                            const isLongBrandName = b.name.length >= 6;

                            return (
                              <Link key={b.href} href={b.href} className={cn(brandLinkClass(b.href), "px-2.5 py-2 text-[14px]", isLongBrandName && "col-span-2 whitespace-nowrap")}>
                                <span className="flex items-center justify-between">
                                  {b.name}
                                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-[background-color,color,border-color,box-shadow,opacity] duration-200" />
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ) : null}
                </Accordion>
              </div>

              <div className={nestedGroupClass}>
                <Accordion type="single" className="space-y-1">
                  <AccordionItem value="strings-service" className="border-none">
                    <AccordionTrigger value="strings-service" className={nestedTriggerClass}>
                      장착 서비스 안내
                    </AccordionTrigger>
                    <AccordionContent value="strings-service" className="pb-0 pt-1">
                      <div className="space-y-0.5">
                        {NAV_LINKS.services.map((it) => (
                          <Link key={it.name} href={it.href} className={brandLinkClass(it.href)}>
                            <span className="flex items-center justify-between">
                              {it.name}
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-[background-color,color,border-color,box-shadow,opacity] duration-200" />
                            </span>
                          </Link>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <Link href="/services/packages" className={linkClass("/services/packages")}>
                <span className="flex items-center justify-between">
                  스트링 교체 할인 패키지
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-[background-color,color,border-color,box-shadow,opacity] duration-200" />
                </span>
              </Link>
            </AccordionContent>
          </AccordionItem>

          <Link href={NAV_LINKS.academy.href} className={topLevelLinkClass(NAV_LINKS.academy.href)}>
            <span className="flex items-center justify-between">
              {NAV_LINKS.academy.name}
              <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-[background-color,color,border-color,box-shadow,opacity] duration-200" />
            </span>
          </Link>

          {/* 중고 라켓 */}
          <AccordionItem value="rackets" className="border-none">
            <AccordionTrigger value="rackets" className="py-3 px-3 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 hover:no-underline transition-[background-color,color,border-color,box-shadow,opacity] group">
              <span className="inline-flex items-center gap-2.5 text-[17px] leading-6 font-bold">
                {/* <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
                  <MdSportsTennis className="h-4 w-4" />
                </div> */}
                <span className="text-foreground">도깨비 인증 중고 라켓</span>
              </span>
            </AccordionTrigger>
            <AccordionContent value="rackets" className={subMenuContentClass}>
              <Link href={NAV_LINKS.rackets.root} className={linkClass(NAV_LINKS.rackets.root)}>
                <span className="flex items-center justify-between">
                  전체 보기
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-[background-color,color,border-color,box-shadow,opacity] duration-200" />
                </span>
              </Link>

              {/* 브랜드 서브메뉴 */}
              {NAV_FLAGS.SHOW_BRAND_MENU && NAV_LINKS.rackets.brands?.length ? (
                <div className={nestedGroupClass}>
                  <Accordion type="single" className="space-y-1">
                    <AccordionItem value="rackets-brand" className="border-none">
                      <AccordionTrigger value="rackets-brand" className={nestedTriggerClass}>
                        브랜드
                      </AccordionTrigger>
                      <AccordionContent value="rackets-brand" className="pb-0 pt-1">
                        <div className="grid grid-cols-2 gap-1">
                          {NAV_LINKS.rackets.brands.map((b) => {
                            const isLongBrandName = b.name.length >= 6;

                            return (
                              <Link key={b.href} href={b.href} className={cn(brandLinkClass(b.href), "px-2.5 py-2 text-[14px]", isLongBrandName && "col-span-2 whitespace-nowrap")}>
                                <span className="flex items-center justify-between">
                                  {b.name}
                                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-[background-color,color,border-color,box-shadow,opacity] duration-200" />
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>

          {/* 게시판 */}
          <AccordionItem value="boards" className="border-none">
            <AccordionTrigger value="boards" className="py-3 px-3 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 hover:no-underline transition-[background-color,color,border-color,box-shadow,opacity] group">
              <span className="inline-flex items-center gap-2.5 text-[17px] leading-6 font-bold">
                {/* <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
                  <MessageSquareText className="h-4 w-4" />
                </div> */}
                <span className="text-foreground">커뮤니티</span>
              </span>
            </AccordionTrigger>
            <AccordionContent value="boards" className={subMenuContentClass}>
              {NAV_LINKS.boards.map((it) => (
                <Link key={it.name} href={it.href} className={linkClass(it.href)}>
                  <span className="flex items-center justify-between">
                    {it.name}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-[background-color,color,border-color,box-shadow,opacity] duration-200" />
                  </span>
                </Link>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* 고객센터 */}
          <AccordionItem value="support" className="border-none">
            <AccordionTrigger value="support" className="py-3 px-3 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 hover:no-underline transition-[background-color,color,border-color,box-shadow,opacity] group">
              <span className="inline-flex items-center gap-2.5 text-[17px] leading-6 font-bold">
                {/* <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
                  <MessageSquare className="h-4 w-4" />
                </div> */}
                <span className="text-foreground">고객센터</span>
              </span>
            </AccordionTrigger>
            <AccordionContent value="support" className={subMenuContentClass}>
              {NAV_LINKS.support?.map((it) => (
                <Link key={it.name} href={it.href} className={linkClass(it.href)}>
                  <span className="flex items-center justify-between">
                    {it.name}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-[background-color,color,border-color,box-shadow,opacity] duration-200" />
                  </span>
                </Link>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </aside>
  );
}
