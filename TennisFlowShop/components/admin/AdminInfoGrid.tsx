import type { ReactNode } from "react";

import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type AdminInfoGridProps = {
  children: ReactNode;
  className?: string;
  columns?: "two" | "three";
};

type AdminInfoItemProps = {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  className?: string;
  valueClassName?: string;
};

export function AdminInfoGrid({ children, className, columns = "three" }: AdminInfoGridProps) {
  return (
    <dl
      className={cn(
        "grid gap-3",
        columns === "two" ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function AdminInfoItem({
  label,
  value,
  description,
  icon,
  className,
  valueClassName,
}: AdminInfoItemProps) {
  return (
    <div className={cn(adminSurface.fieldPanel, className)}>
      <dt className={cn("flex items-center gap-1.5", adminTypography.metaMuted)}>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        <span>{label}</span>
      </dt>
      <dd className={cn("mt-1 break-words", adminTypography.body, "font-medium", valueClassName)}>
        {value ?? "-"}
      </dd>
      {description ? (
        <p className={cn("mt-1", adminTypography.caption)}>{description}</p>
      ) : null}
    </div>
  );
}
