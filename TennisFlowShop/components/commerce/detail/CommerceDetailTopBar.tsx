"use client";
import type { ReactNode } from "react";
import { Fragment } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SiteContainer from "@/components/layout/SiteContainer";
import { Button } from "@/components/ui/button";

type CommerceBreadcrumbItem = { label: string; href?: string };
type CommerceDetailTopBarProps = {
  breadcrumbs: CommerceBreadcrumbItem[];
  currentLabel: string;
  onBack: () => void;
  adminAction?: ReactNode;
};

export function CommerceDetailTopBar({
  breadcrumbs,
  currentLabel,
  onBack,
  adminAction,
}: CommerceDetailTopBarProps) {
  return (
    <div className="relative border-b border-border/60 bg-card/70 py-4 text-foreground sm:py-5">
      <SiteContainer variant="wide">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <nav
            className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-ui-body-sm sm:gap-2.5 sm:text-ui-body"
            aria-label="상세 경로"
          >
            {breadcrumbs.map((item) =>
              item.href ? (
                <Fragment key={item.label}>
                  <Link
                    href={item.href}
                    className="shrink-0 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                  <span className="shrink-0 text-muted-foreground/50">/</span>
                </Fragment>
              ) : null,
            )}
            <span
              className="min-w-0 flex-1 truncate font-medium text-foreground"
              aria-current="page"
            >
              {currentLabel}
            </span>
          </nav>
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-9 whitespace-nowrap rounded-xl px-2.5 text-ui-body-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground sm:px-3"
              onClick={onBack}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              뒤로
            </Button>
            {adminAction}
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
