"use client";

import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AdminRowDetailsSheetProps = {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
};

/**
 * 목록 행의 진단·참조·처리 UI를 행 높이에 누적하지 않고 오른쪽 작업 패널에서 공개합니다.
 */
export default function AdminRowDetailsSheet({
  trigger,
  title,
  description,
  children,
  footer,
  contentClassName,
}: AdminRowDetailsSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        className={cn(
          "flex w-[min(680px,92vw)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl",
          contentClassName,
        )}
      >
        <SheetHeader className="shrink-0 border-b border-border px-6 py-5 pr-16">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <SheetFooter className="shrink-0 border-t border-border bg-muted/20 px-6 py-4">
            {footer}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
