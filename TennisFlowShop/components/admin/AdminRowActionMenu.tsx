"use client";

import { Children, Fragment, isValidElement, type ReactNode } from "react";
import type * as React from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AdminRowActionMenuProps = {
  ariaLabel: string;
  children?: ReactNode;
  destructiveActions?: ReactNode;
  dropdownProps?: Omit<React.ComponentProps<typeof DropdownMenu>, "children">;
  contentProps?: Omit<React.ComponentProps<typeof DropdownMenuContent>, "children">;
};

function hasRenderableAction(node: ReactNode): boolean {
  return Children.toArray(node).some((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child) || child.type !== Fragment) return true;
    return hasRenderableAction(child.props.children);
  });
}

/** 목록의 주 액션과 겹치지 않는 부가 작업을 표시하는 공통 메뉴입니다. */
export default function AdminRowActionMenu({
  ariaLabel,
  children,
  destructiveActions,
  dropdownProps,
  contentProps,
}: AdminRowActionMenuProps) {
  const { className: contentClassName, align = "end", ...restContentProps } = contentProps ?? {};
  const hasActions = hasRenderableAction(children) || hasRenderableAction(destructiveActions);

  if (!hasActions) return null;

  return (
    <DropdownMenu {...dropdownProps}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-2"
          aria-label={ariaLabel}
        >
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        {...restContentProps}
        align={align}
        className={cn("min-w-44", contentClassName)}
      >
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
