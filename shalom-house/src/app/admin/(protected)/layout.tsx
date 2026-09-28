import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminFormFeedback } from "@/components/admin/admin-form-feedback";
import { AdminWorkbench } from "@/components/admin/admin-workbench";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { adminRoleLabels } from "@/features/admin-auth/admin-auth.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "콘텐츠 관리",
  robots: { index: false, follow: false },
};

export default async function ProtectedAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <>
      <AdminWorkbench
        operator={`${admin.displayName} · ${adminRoleLabels[admin.role]}`}
        permissions={{
          canRestore: hasAdminPermission(admin, "content.restore"),
          canManageSiteContent: hasAdminPermission(admin, "site_content.manage"),
          canManageInquiries: hasAdminPermission(admin, "inquiries.manage"),
          canManageDonations: hasAdminPermission(admin, "donations.manage"),
          canManageAdminUsers: hasAdminPermission(admin, "admin_users.manage"),
        }}
      >
        {children}
      </AdminWorkbench>
      <AdminFormFeedback />
    </>
  );
}
