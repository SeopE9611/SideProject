'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { SIDEBAR_SECTIONS, ADMIN_MOBILE_QUICK_ITEMS } from '@/components/admin/sidebar-navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { isAdminNavActive } from '@/lib/admin-nav';

export default function AdminMobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="md:hidden" aria-label="관리자 모바일 메뉴 열기">
          <Menu className="h-4 w-4" />
          메뉴
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-0">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">관리자 메뉴</SheetTitle>
        </SheetHeader>

        <nav className="space-y-5 px-4 py-4" aria-label="관리자 모바일 네비게이션">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">빠른 이동</h2>
            <ul className="grid grid-cols-2 gap-2">
              {ADMIN_MOBILE_QUICK_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isAdminNavActive(pathname ?? '', item.href);

                return (
                  <li key={`quick-${item.href}`}>
                    <SheetClose asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex h-full items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                          active ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20' : 'border-border text-foreground hover:bg-background',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SheetClose>
                  </li>
                );
              })}
            </ul>
          </section>

          {SIDEBAR_SECTIONS.map((section) => (
            <section key={section.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.label}</h2>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isAdminNavActive(pathname ?? '', item.href);

                  return (
                    <li key={item.href}>
                      <SheetClose asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                            active ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-foreground',
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.title}</span>
                        </Link>
                      </SheetClose>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
