"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AdminRowActionMenuProps = {
  ariaLabel: string;
  children?: ReactNode;
  destructiveActions?: ReactNode;
};

/** 목록의 주 액션과 겹치지 않는 부가 작업을 표시하는 공통 메뉴입니다. */
export default function AdminRowActionMenu({
  ariaLabel,
  children,
  destructiveActions,
}: AdminRowActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 border border-border/70 bg-background hover:border-border hover:bg-muted/40 focus-visible:ring-2"
          aria-label={ariaLabel}
        >
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>작업</DropdownMenuLabel>
        {children}
        {destructiveActions ? (
          <>
            <DropdownMenuSeparator />
            {destructiveActions}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
