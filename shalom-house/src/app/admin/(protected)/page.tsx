import { AdminDashboard } from "@/components/admin/admin-dashboard";

import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";

type TaskLink = {
  href: string;
  title: string;
  description: string;
  available: boolean;
};

const contentTasks: readonly Omit<TaskLink, "available">[] = [
  { href: "/admin/news", title: "소식", description: "공지와 활동 소식의 작성·검토·공개 상태를 관리합니다." },
  { href: "/admin/programs", title: "프로그램", description: "프로그램 안내의 내용과 공개 순서를 관리합니다." },
  { href: "/admin/gallery", title: "활동사진", description: "사진의 공개 동의와 게시 상태를 함께 확인합니다." },
  { href: "/admin/transparency", title: "자료공개", description: "공개 문서와 개인정보 검토 상태를 관리합니다." },
];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ forbidden?: string | string[] }>;
}) {
  const forbidden = (await searchParams).forbidden === "1";
  const admin = await getCurrentAdmin();
  const canManageSiteContent = Boolean(admin && hasAdminPermission(admin, "site_content.manage"));
  const canManageInquiries = Boolean(admin && hasAdminPermission(admin, "inquiries.manage"));
  const canManageDonations = Boolean(admin && hasAdminPermission(admin, "donations.manage"));
  const canManageAdminUsers = Boolean(admin && hasAdminPermission(admin, "admin_users.manage"));
  const operationTasks: readonly TaskLink[] = [
    {
      href: "/admin/site-content",
      title: "시설 공식 정보",
      description: "시설 소개, 연락처, 직원과 생활공간 정보를 관리합니다.",
      available: canManageSiteContent,
    },
    {
      href: "/admin/inquiries",
      title: "문의",
      description: "방문·자원봉사·후원 문의의 처리 상태를 확인합니다.",
      available: canManageInquiries,
    },
    {
      href: "/admin/donations",
      title: "후원",
      description: "후원자 명부와 후원금 관리대장을 확인합니다.",
      available: canManageDonations,
    },
    {
      href: "/admin/admin-users",
      title: "관리자 계정",
      description: "관리자 역할, 계정 상태와 로그인 세션을 관리합니다.",
      available: canManageAdminUsers,
    },
  ];

  return (
    <AdminDashboard
      forbidden={forbidden}
      contentTasks={contentTasks}
      operationTasks={operationTasks.filter((task) => task.available)}
      canCreate={Boolean(admin && hasAdminPermission(admin, "content.create"))}
    />
  );
}
