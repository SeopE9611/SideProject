import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminContentRestoreForm } from "@/components/admin/admin-content-restore-form";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { listAdminTrash, normalizeAdminTrashPage } from "@/features/admin-trash/admin-trash.repository";
import { adminTrashDomains, type AdminTrashDomain } from "@/features/admin-trash/admin-trash.types";
import { formatAdminDate } from "@/lib/format-admin-date";
export const dynamic = "force-dynamic";
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
    <div className="space-y-8">
      <AdminPageHeader
        title="휴지통"
        description="삭제된 콘텐츠를 확인하고 필요한 항목을 안전한 초안 상태로 복구합니다."
      />

      <AdminFormGuidance title="복구 전 확인" description="복구된 콘텐츠는 이전 공개 상태로 바로 돌아가지 않습니다.">
        <p>복구하면 게시 상태와 승인 상태가 초기화되며 초안부터 다시 검토해야 합니다.</p>
      </AdminFormGuidance>

      {query.deleted === "1" ? <p role="status" className="rounded-control border border-border bg-surface px-4 py-3 font-semibold">콘텐츠를 휴지통으로 이동했습니다.</p> : null}
      {query.restored === "1" ? <p role="status" className="rounded-control border border-border bg-surface px-4 py-3 font-semibold">콘텐츠를 안전한 초안으로 복구했습니다.</p> : null}

      <section aria-labelledby="trash-domain-filter-heading">
        <h2 id="trash-domain-filter-heading" className="text-heading font-bold">콘텐츠 종류</h2>
        <nav className="mt-4 flex flex-wrap gap-3" aria-label="콘텐츠 종류 필터">
          <Link
            href="/admin/trash"
            aria-current={domain === undefined ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-control border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
              domain === undefined ? "border-primary bg-surface-subtle font-semibold text-primary" : "border-border-strong bg-background"
            }`}
          >
            전체
          </Link>
          {[
            ["news", "뉴스"],
            ["programs", "프로그램"],
            ["gallery", "활동사진"],
            ["transparency", "자료공개"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={buildAdminTrashHref(1, value as AdminTrashDomain)}
              aria-current={domain === value ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-control border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                domain === value ? "border-primary bg-surface-subtle font-semibold text-primary" : "border-border-strong bg-background"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </section>

      <section aria-labelledby="trash-list-heading">
        <h2 id="trash-list-heading" className="sr-only">휴지통 목록</h2>
        {result.items.length ? (
          <ul className="space-y-4">
            {result.items.map((item) => (
              <li key={`${item.domain}-${item.id}`} className="grid min-w-0 gap-6 rounded-card border border-border bg-surface p-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
                <div className="min-w-0">
                  <p className="text-small font-semibold text-primary">{item.domainLabel}</p>
                  <h3 className="mt-1 text-safe-wrap break-words text-heading font-bold">{item.title}</h3>
                  <dl className="mt-4 grid gap-3 text-small sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="font-semibold text-muted-foreground">slug</dt>
                      <dd className="mt-1 break-all">{item.slug}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted-foreground">삭제 시각</dt>
                      <dd className="mt-1"><time dateTime={item.deletedAt}>{formatAdminDate(item.deletedAt)}</time></dd>
                    </div>
                  </dl>
                </div>
                <AdminContentRestoreForm
                  id={item.id}
                  endpoint={`/api/admin/${item.domain}/${item.id}/restore`}
                  expectedUpdatedAt={item.updatedAt}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card border border-border bg-surface p-6">
            <h3 className="text-heading font-bold">{domain ? "선택한 종류의 삭제된 콘텐츠가 없습니다." : "휴지통에 콘텐츠가 없습니다."}</h3>
            {domain ? <Link href="/admin/trash" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">전체 보기</Link> : null}
          </div>
        )}
      </section>

      {page > 1 || result.hasNext ? (
        <nav className="flex flex-wrap gap-3" aria-label="휴지통 목록 페이지 이동">
          {page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={buildAdminTrashHref(page - 1, domain)}>이전</Link> : null}
          {result.hasNext ? <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={buildAdminTrashHref(page + 1, domain)}>다음</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
