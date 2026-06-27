"use client";

import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function FormSection({
  title,
  description,
  icon,
  children,
  className,
  headerClassName,
  contentClassName,
}: FormSectionProps) {
  return (
    <Card
      variant="ghost"
      className={cn(
        adminSurface.card,
        "overflow-hidden transition-shadow hover:shadow-md",
        className,
      )}
    >
      <CardHeader className={cn("border-b border-border/40 bg-muted/20 pb-4", headerClassName)}>
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div className="space-y-1">
            <CardTitle className={adminTypography.sectionTitle}>{title}</CardTitle>
            {description && (
              <CardDescription className={adminTypography.metaMuted}>{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("p-6", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

interface FormFieldGroupProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function FormFieldGroup({ children, className, columns = 2 }: FormFieldGroupProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return <div className={cn("grid gap-6", gridCols[columns], className)}>{children}</div>;
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, required, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label
        className={cn(
          adminTypography.bodyStrong,
          "leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        )}
      >
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
      {hint && !error && <p className={adminTypography.caption}>{hint}</p>}
      {error && <p className={cn(adminTypography.caption, "text-destructive")}>{error}</p>}
    </div>
  );
}
