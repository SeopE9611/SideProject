import type { ElementType, ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { adminSurface, adminTypography } from "./admin-typography";

type AdminPageSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ElementType;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AdminSectionHeader({
  title,
  description,
  icon: Icon,
  actions,
}: Omit<AdminPageSectionProps, "children" | "className" | "contentClassName">) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          <CardTitle className={adminTypography.sectionTitle}>{title}</CardTitle>
          {description ? (
            <CardDescription className={cn("mt-1", adminTypography.metaMuted)}>
              {description}
            </CardDescription>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export default function AdminPageSection({
  title,
  description,
  icon,
  actions,
  children,
  className,
  contentClassName,
}: AdminPageSectionProps) {
  return (
    <Card className={cn(adminSurface.detailCard, "overflow-hidden", className)}>
      <CardHeader className={adminSurface.detailHeader}>
        <AdminSectionHeader title={title} description={description} icon={icon} actions={actions} />
      </CardHeader>
      <CardContent className={cn(adminSurface.detailContent, contentClassName)}>{children}</CardContent>
    </Card>
  );
}
