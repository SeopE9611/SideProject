"use client";

import { Check, Copy } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { adminTypography } from "@/components/admin/admin-typography";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type AdminReferenceItem = {
  label: string;
  value?: string | null;
  href?: string;
  copyValue?: string;
};

type AdminReferencePopoverProps = {
  trigger: ReactNode;
  title: string;
  items: AdminReferenceItem[];
  align?: "start" | "center" | "end";
  contentClassName?: string;
};

/** 짧은 ID·연락처·연결 문서 참조값을 클릭으로 확인하고 복사하는 공통 패턴입니다. */
export default function AdminReferencePopover({
  trigger,
  title,
  items,
  align = "start",
  contentClassName,
}: AdminReferencePopoverProps) {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const visibleItems = items.filter((item) => Boolean(item.value));

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(
        () => setCopiedLabel((current) => (current === label ? null : current)),
        1600,
      );
    } catch {
      setCopiedLabel(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className={cn("w-96 space-y-3", contentClassName)}>
        <p className={adminTypography.panelTitle}>{title}</p>
        <dl className="divide-y divide-border rounded-lg border border-border">
          {visibleItems.map((item) => {
            const copyValue = item.copyValue;
            return (
              <div
                key={item.label}
                className="grid grid-cols-[88px_minmax(0,1fr)_36px] items-center gap-2 px-3 py-2.5"
              >
                <dt className={adminTypography.tableSecondary}>{item.label}</dt>
                <dd className="min-w-0">
                  {item.href ? (
                    <a
                      href={item.href}
                      className="block truncate text-ui-label font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <span className="block break-all text-ui-label font-medium text-foreground">
                      {item.value}
                    </span>
                  )}
                </dd>
                {copyValue ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`${item.label} 복사`}
                    onClick={() => void copy(item.label, copyValue)}
                  >
                    {copiedLabel === item.label ? (
                      <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </Button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
