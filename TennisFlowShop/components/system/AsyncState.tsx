import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Inbox, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";

type AsyncStateVariant = "card" | "inline" | "page-center" | "grid-item";
type AsyncStateTone = "user" | "admin";
type AsyncStateKind = "error" | "empty";

type Props = {
  kind: AsyncStateKind;
  variant?: AsyncStateVariant;
  tone?: AsyncStateTone;
  resourceName?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
};

const VARIANT_CLASS: Record<AsyncStateVariant, string> = {
  card: "rounded-xl border px-4 py-5 sm:px-5 sm:py-6",
  inline: "rounded-md border px-3 py-2",
  "page-center": "mx-auto flex min-h-[220px] w-full max-w-xl items-center justify-center rounded-xl border px-5 py-10",
  "grid-item": "flex h-full min-h-[220px] w-full items-center justify-center rounded-xl border px-4 py-8",
};

export default function AsyncState({
  kind,
  variant = "card",
  tone = "user",
  resourceName = "데이터",
  title,
  description,
  actionLabel = "다시 시도",
  onAction,
  icon,
  className,
}: Props) {
  const isError = kind === "error";
  const resolvedTitle =
    title ??
    (isError
      ? tone === "admin"
        ? `${resourceName}을 불러오지 못했습니다`
        : `${resourceName}을 불러오지 못했어요`
      : `${resourceName}이 없습니다`);

  const resolvedDescription =
    description ??
    (isError
      ? tone === "admin"
        ? "잠시 후 다시 시도해 주세요."
        : "네트워크/서버 상태를 확인한 뒤 다시 시도해 주세요."
      : "아직 표시할 내용이 없습니다.");

  const resolvedIcon =
    icon ?? (isError ? <AlertTriangle className="h-4 w-4" /> : <Inbox className="h-4 w-4" />);

  return (
    <div
      className={cn(
        "text-center",
        VARIANT_CLASS[variant],
        isError
          ? "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/15"
          : "border-dashed border-border bg-muted/20 text-foreground",
        className,
      )}
      role={isError ? "alert" : "status"}
    >
      <div className="mx-auto flex max-w-lg flex-col items-center gap-2">
        <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full", isError ? "bg-destructive/15" : "bg-muted")}>{resolvedIcon}</div>
        <p className={cn("font-semibold", variant === "inline" ? "text-sm" : "text-sm sm:text-base")}>{resolvedTitle}</p>
        <p className={cn("text-muted-foreground", variant === "inline" ? "text-xs" : "text-xs sm:text-sm")}>{resolvedDescription}</p>
        {isError && onAction && (
          <Button type="button" onClick={onAction} size="sm" variant="outline" className="mt-1">
            <RefreshCcw className="mr-1 h-3.5 w-3.5" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
