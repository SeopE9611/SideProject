import Link from "next/link";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";

type PublicAdminEditLinkProps = { href: string; label?: string };
export async function PublicAdminEditLink({ href, label = "이 페이지 수정" }: PublicAdminEditLinkProps) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) return null;
  return (
    <div className="mx-auto max-w-site px-page pt-6 sm:px-page-wide">
      <Link
        href={href}
        className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        {label}
      </Link>
    </div>
  );
}
