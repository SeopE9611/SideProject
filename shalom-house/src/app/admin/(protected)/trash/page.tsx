import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminContentRestoreForm } from "@/components/admin/admin-content-restore-form";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { listAdminTrash, normalizeAdminTrashPage } from "@/features/admin-trash/admin-trash.repository";
import { adminTrashDomains, type AdminTrashDomain } from "@/features/admin-trash/admin-trash.types";
export const dynamic = "force-dynamic";
const trashDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
function formatTrashDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "시간 확인 불가";
  const parts = Object.fromEntries(trashDateFormatter.formatToParts(date).map(({ type, value: part }) => [type, part]));
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}
function buildAdminTrashHref(page: number, domain?: AdminTrashDomain): string {
  const params = new URLSearchParams();
  if (domain) params.set("domain", domain);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/trash${query ? `?${query}` : ""}`;
}
export default async function AdminTrashPage({
  searchParams,
}: {
  searchParams: Promise<{
    domain?: string;
    page?: string;
    deleted?: string;
    restored?: string;
  }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "content.restore")) redirect("/admin?forbidden=1");
  const query = await searchParams,
    page = normalizeAdminTrashPage(query.page),
    domain = adminTrashDomains.includes(query.domain as AdminTrashDomain)
      ? (query.domain as AdminTrashDomain)
      : undefined,
    result = await listAdminTrash({ domain, page });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-title font-bold">휴지통</h1>
        <p className="mt-2">복구하면 게시 상태와 승인 상태가 초기화되며 초안부터 다시 검토해야 합니다.</p>
      </header>
      {query.deleted === "1" ? <p role="status">콘텐츠를 휴지통으로 이동했습니다.</p> : null}
      {query.restored === "1" ? <p role="status">콘텐츠를 안전한 초안으로 복구했습니다.</p> : null}
      <nav className="flex gap-3" aria-label="콘텐츠 종류 필터">
        <Link href="/admin/trash">전체</Link>
        {[
          ["news", "뉴스"],
          ["programs", "프로그램"],
          ["gallery", "활동사진"],
          ["transparency", "자료공개"],
        ].map(([value, label]) => (
          <Link key={value} href={buildAdminTrashHref(1, value as AdminTrashDomain)}>
            {label}
          </Link>
        ))}
      </nav>
      <ul className="space-y-4">
        {result.items.map((item) => (
          <li key={`${item.domain}-${item.id}`} className="grid gap-3 rounded-card border p-5 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="font-semibold">{item.domainLabel}</p>
              <h2 className="text-heading font-bold">{item.title}</h2>
              <p>slug: {item.slug}</p>
              <p>
                삭제 시각: <time dateTime={item.deletedAt}>{formatTrashDate(item.deletedAt)}</time>
              </p>
            </div>
            <AdminContentRestoreForm
              id={item.id}
              endpoint={`/api/admin/${item.domain}/${item.id}/restore`}
              expectedUpdatedAt={item.updatedAt}
            />
          </li>
        ))}
      </ul>
      {!result.items.length ? <p>휴지통에 콘텐츠가 없습니다.</p> : null}
      <div className="flex gap-4">
        {page > 1 ? <Link href={buildAdminTrashHref(page - 1, domain)}>이전</Link> : null}
        {result.hasNext ? <Link href={buildAdminTrashHref(page + 1, domain)}>다음</Link> : null}
      </div>
    </div>
  );
}
