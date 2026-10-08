import type { ReactNode } from "react";

export function AdminStickyFormActions({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`admin-sticky-form-actions ${className}`}>{children}</div>;
}
