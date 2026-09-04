import Link from "next/link";

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
    <div className="space-y-10">
      {forbidden ? (
        <div role="alert" className="border-l-4 border-danger bg-danger-soft px-5 py-4 font-semibold text-danger">
          현재 계정에는 요청한 작업 권한이 없습니다. 아래에서 사용 가능한 관리 메뉴를 선택해 주세요.
        </div>
      ) : null}

      <header className="border-b border-border pb-7">
        <p className="text-small font-bold text-accent">관리자 대시보드</p>
        <h1 className="mt-2">홈페이지 운영 업무</h1>
        <p className="mt-4 max-w-3xl text-body text-muted-foreground">
          작성할 콘텐츠를 선택하거나, 검토와 공개가 필요한 항목의 상태를 확인하세요.
        </p>
      </header>

      <section aria-labelledby="content-tasks-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-small font-bold text-accent">콘텐츠</p>
            <h2 id="content-tasks-heading" className="mt-1 text-heading font-extrabold">
              홈페이지 콘텐츠 관리
            </h2>
          </div>
          <Link className="institution-link text-small" href="/" target="_blank" rel="noreferrer">
            공개 홈페이지 확인 <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {contentTasks.map((task, index) => (
            <li key={task.href}>
              <Link
                href={task.href}
                className="group flex h-full min-h-48 flex-col border border-border bg-surface px-5 py-5 hover:border-accent hover:bg-accent-soft/40 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
              >
                <span className="text-xs font-extrabold tabular-nums text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-6 text-xl font-extrabold text-primary">{task.title}</span>
                <span className="mt-3 text-small leading-7 text-muted-foreground">{task.description}</span>
                <span className="mt-auto pt-5 font-bold text-primary group-hover:underline" aria-hidden="true">
                  관리 열기 →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {operationTasks.some((task) => task.available) ? (
        <section aria-labelledby="operation-tasks-heading" className="border-t border-border pt-8">
          <p className="text-small font-bold text-accent">운영</p>
          <h2 id="operation-tasks-heading" className="mt-1 text-heading font-extrabold">
            기관 운영 관리
          </h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {operationTasks
              .filter((task) => task.available)
              .map((task) => (
                <li key={task.href}>
                  <Link
                    href={task.href}
                    className="group flex min-h-28 items-start justify-between gap-5 border-l-4 border-primary bg-primary-soft px-5 py-5 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
                  >
                    <span>
                      <span className="block text-lg font-extrabold text-primary">{task.title}</span>
                      <span className="mt-2 block text-small text-muted-foreground">{task.description}</span>
                    </span>
                    <span
                      className="text-xl text-primary transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="content-flow-heading" className="border-t border-border pt-8">
        <p className="text-small font-bold text-accent">공개 절차</p>
        <h2 id="content-flow-heading" className="mt-1 text-heading font-extrabold">
          작성한 내용은 바로 공개되지 않습니다
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            ["01", "초안 작성", "내용과 공개 금지 정보를 확인해 저장합니다."],
            ["02", "검토·승인", "공개 범위와 개인정보 포함 여부를 다시 확인합니다."],
            ["03", "게시", "승인된 최종 내용을 홈페이지에 공개합니다."],
          ].map(([number, title, description]) => (
            <li key={number} className="border-t-3 border-accent bg-paper px-5 py-5">
              <span className="text-small font-extrabold tabular-nums text-accent">{number}</span>
              <h3 className="mt-3 text-lg font-extrabold">{title}</h3>
              <p className="mt-2 text-small leading-7 text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
