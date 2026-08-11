import type { ReactNode } from "react";

import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type AdminFormFieldProps = {
  label: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
};

export function AdminFormField({
  label,
  children,
  htmlFor,
  description,
  error,
  required,
  className,
}: AdminFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className={adminTypography.bodyStrong}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className={cn(adminTypography.caption, "text-destructive")}>{error}</p>
      ) : description ? (
        <p className={adminTypography.caption}>{description}</p>
      ) : null}
    </div>
  );
}

export function AdminFormActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/60 pt-4">
      {children}
    </div>
  );
}
