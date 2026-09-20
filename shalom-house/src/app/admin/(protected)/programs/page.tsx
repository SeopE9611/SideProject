import { AdminFilterPanel } from "@/components/admin/admin-filter-panel";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import Link from "next/link";
import {
  listAdminPrograms,
  normalizeAdminProgramPage,
  type AdminProgramListFilters,
} from "@/features/programs/program.admin-repository";
import {
  getProgramApprovalStatusLabel,
  getProgramPublicationStatusLabel,
  isProgramApprovalStatus,
  isProgramPublicationStatus,
} from "@/features/programs/program.types";
const adminProgramsDesktopGridClass = "xl:grid-cols-[2fr_1fr_0.6fr_0.8fr_0.8fr_1fr_0.7fr]";
const date = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
type Params = {
  publicationStatus?: string | string[];
  approvalStatus?: string | string[];
  page?: string | string[];
  created?: string | string[];
  updated?: string | string[];
  reviewRequested?: string | string[];
  approved?: string | string[];
  rejected?: string | string[];
  published?: string | string[];
  unpublished?: string | string[];
  archived?: string | string[];
};
function href(page: number, f: AdminProgramListFilters) {
  const q = new URLSearchParams();
  if (f.publicationStatus) q.set("publicationStatus", f.publicationStatus);
  if (f.approvalStatus) q.set("approvalStatus", f.approvalStatus);
  if (page > 1) q.set("page", String(page));
  return q.size ? `/admin/programs?${q}` : "/admin/programs";
}
export default async function AdminProgramsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await getCurrentAdmin();
  const canCreate = Boolean(admin && hasAdminPermission(admin, "content.create"));
  const q = await searchParams;
  const publicationStatus =
    typeof q.publicationStatus === "string" && isProgramPublicationStatus(q.publicationStatus)
      ? q.publicationStatus
      : undefined;
  const approvalStatus =
    typeof q.approvalStatus === "string" && isProgramApprovalStatus(q.approvalStatus) ? q.approvalStatus : undefined;
  const filters = { publicationStatus, approvalStatus };
  const result = await listAdminPrograms({
    page: normalizeAdminProgramPage(typeof q.page === "string" ? q.page : undefined),
    filters,
  });
  const messages: [[keyof Params, string]] | [keyof Params, string][] = [
    ["created", "프로그램 초안을 저장했습니다."],
    ["updated", "프로그램을 수정했습니다."],
    ["reviewRequested", "검토를 요청했습니다."],
    ["approved", "검토를 승인했습니다."],
    ["rejected", "프로그램을 반려했습니다."],
    ["published", "프로그램을 게시했습니다."],
    ["unpublished", "게시를 중단했습니다."],
    ["archived", "프로그램을 보관했습니다."],
  ];
  const message = messages.find(([key]) => q[key] === "1")?.[1];
  const hasFilters = Boolean(publicationStatus || approvalStatus);
  const filterFormKey = [publicationStatus ?? "", approvalStatus ?? ""].join("|");
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="프로그램 관리"
        description="프로그램의 작성, 검토, 승인과 공개 상태를 관리합니다."
        actions={canCreate ? <Link href="/admin/programs/new" className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground">프로그램 작성</Link> : undefined}
      />
      {message ? (
        <p role="status" className="border border-border-strong bg-surface p-4 font-semibold">
          {message}
        </p>
      ) : null}
      <AdminFilterPanel headingId="program-filter" title="프로그램 필터" totalItems={result.totalItems} page={result.page} totalPages={result.totalPages}>
        <form key={filterFormKey} className="mt-4 grid gap-3 sm:grid-cols-2" action="/admin/programs">
          <label className="grid gap-2 font-semibold">게시 상태<select name="publicationStatus" defaultValue={publicationStatus ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 font-normal"><option value="">전체</option><option value="draft">작성 중</option><option value="review">검토 중</option><option value="published">게시</option><option value="archived">보관</option></select></label>
          <label className="grid gap-2 font-semibold">승인 상태<select name="approvalStatus" defaultValue={approvalStatus ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 font-normal"><option value="">전체</option><option value="pending">승인 대기</option><option value="approved">승인 완료</option><option value="rejected">반려</option></select></label>
          <div className="flex flex-wrap gap-3 sm:col-span-2"><button className="min-h-11 rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground">필터 적용</button><Link href="/admin/programs" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary">필터 초기화</Link></div>
        </form>
      </AdminFilterPanel>
      <section aria-labelledby="program-list">
        <h2 id="program-list" className="sr-only">
          프로그램 목록
        </h2>
        {result.items.length ? (
          <>
            <div
              className={`hidden gap-3 border-y border-border bg-surface-subtle px-4 py-3 text-small font-bold xl:grid ${adminProgramsDesktopGridClass}`}
            >
              <span>프로그램</span>
              <span>운영 상태</span>
              <span>정렬 순서</span>
              <span>게시 상태</span>
              <span>승인 상태</span>
              <span>최근 수정</span>
              <span>공개 여부</span>
            </div>
            <ul className="divide-y divide-border border-b border-border">
              {result.items.map((item) => (
                <li key={item.id} className={`grid gap-3 px-4 py-4 md:grid-cols-2 xl:grid ${adminProgramsDesktopGridClass}`}>
                  <div className="md:col-span-2 xl:col-span-1">
                    <Link
                      href={`/admin/programs/${item.id}`}
                      className="text-heading font-bold underline-offset-4 hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="text-small text-muted-foreground">{item.category}</p>
                  </div>
                  <p>
                    <strong className="xl:sr-only">운영 상태 </strong>
                    {item.operationStatusLabel ?? "미입력"}
                  </p>
                  <p>
                    <strong className="xl:sr-only">정렬 순서 </strong>
                    {item.sortOrder}
                  </p>
                  <p>
                    <strong className="xl:sr-only">게시 상태 </strong>
                    {getProgramPublicationStatusLabel(item.publicationStatus)}
                  </p>
                  <p>
                    <strong className="xl:sr-only">승인 상태 </strong>
                    {getProgramApprovalStatusLabel(item.approvalStatus)}
                  </p>
                  <p>
                    <strong className="xl:sr-only">최근 수정 </strong>
                    <time dateTime={item.updatedAt}>{date.format(new Date(item.updatedAt))}</time>
                  </p>
                  <p>
                    <strong className="xl:sr-only">공개 여부 </strong>
                    {item.isPubliclyVisible ? "공개 중" : "비공개"}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-card border border-border bg-surface p-6"><h3 className="text-heading font-bold">{hasFilters ? "선택한 조건에 맞는 프로그램이 없습니다." : "등록된 프로그램이 없습니다."}</h3>{hasFilters ? <Link href="/admin/programs" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">필터 초기화</Link> : null}</div>
        )}
      </section>
      <AdminListPagination label="프로그램 목록 페이지 이동" page={result.page} totalPages={result.totalPages} previousHref={href(result.page - 1, filters)} nextHref={href(result.page + 1, filters)} />
    </div>
  );
}
