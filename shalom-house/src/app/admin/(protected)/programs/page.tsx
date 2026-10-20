import styles from "@/components/admin/admin-content-list.module.css";
import { ADMIN_TITLE_SEARCH_MAX_LENGTH, normalizeAdminTitleSearch } from "@/lib/admin-title-search";
import { SemanticStatusBadge, type SemanticStatusTone } from "@/components/ui/semantic-status-badge";
import type { ProgramPublicationStatus, ProgramApprovalStatus } from "@/features/programs/program.types";
import { EmptyState } from "@/components/ui/empty-state";
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

const publicationTone = {
  draft: "neutral",
  review: "warning",
  published: "success",
  archived: "neutral",
} satisfies Record<ProgramPublicationStatus, SemanticStatusTone>;

const approvalTone = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
} satisfies Record<ProgramApprovalStatus, SemanticStatusTone>;

const date = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});
type Params = {
  q?: string | string[];
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
function href(page: number, f: AdminProgramListFilters, search: string) {
  const q = new URLSearchParams();
  if (search) q.set("q", search);
  if (f.publicationStatus) q.set("publicationStatus", f.publicationStatus);
  if (f.approvalStatus) q.set("approvalStatus", f.approvalStatus);
  if (page > 1) q.set("page", String(page));
  return q.size ? `/admin/programs?${q}` : "/admin/programs";
}
export default async function AdminProgramsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await getCurrentAdmin();
  const canCreate = Boolean(admin && hasAdminPermission(admin, "content.create"));
  const q = await searchParams;
  const search = normalizeAdminTitleSearch(q.q);
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
    q: search,
  });
  const hasFilters = Boolean(search || publicationStatus || approvalStatus);
  const filterFormKey = [search, publicationStatus ?? "", approvalStatus ?? ""].join("|");
  const returnTo = href(result.page, filters, search);
  return (
    <div className="admin-list-layout text-safe-wrap">
      <AdminPageHeader
        title="프로그램 관리"
        description="프로그램의 작성, 검토, 승인과 공개 상태를 관리합니다."
        actions={canCreate ? <Link href="/admin/programs/new" className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground">프로그램 작성</Link> : undefined}
      />
      <AdminFilterPanel headingId="program-filter" title="프로그램 필터" totalItems={result.totalItems} page={result.page} totalPages={result.totalPages}>
        <form key={filterFormKey} className="mt-4 grid gap-3 sm:grid-cols-2" method="get" action="/admin/programs">
          <label className="grid min-w-0 gap-2 font-semibold sm:col-span-2">
            제목 검색
            <input
              type="search"
              name="q"
              defaultValue={search}
              maxLength={ADMIN_TITLE_SEARCH_MAX_LENGTH}
              className="min-h-11 min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
          </label>
          <label className="grid gap-2 font-semibold">게시 상태<select name="publicationStatus" defaultValue={publicationStatus ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 font-normal"><option value="">전체</option><option value="draft">작성 중</option><option value="review">검토 중</option><option value="published">게시</option><option value="archived">보관</option></select></label>
          <label className="grid gap-2 font-semibold">승인 상태<select name="approvalStatus" defaultValue={approvalStatus ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 font-normal"><option value="">전체</option><option value="pending">승인 대기</option><option value="approved">승인 완료</option><option value="rejected">반려</option></select></label>
          <div className="flex flex-wrap gap-3 sm:col-span-2"><button type="submit" className="min-h-11 rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">검색·필터 적용</button><Link href="/admin/programs" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary">필터 초기화</Link></div>
        </form>
      </AdminFilterPanel>
      <section className={styles.list} aria-labelledby="program-list">
        <h2 id="program-list" className="sr-only">
          프로그램 목록
        </h2>
        {result.items.length ? (
          <>
            <div
              className={`${styles.header} ${styles.programs}`}
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
                <li key={item.id} className={`${styles.row} ${styles.programs}`}>
                  <div className={styles.primary}>
                    <Link
                      href={`/admin/programs/${item.id}?${new URLSearchParams({ returnTo })}`}
                      className="text-[1.125rem] leading-[1.45] font-bold underline-offset-4 hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="text-small text-muted-foreground">{item.category}</p>
                  </div>
                  <p>
                    <strong className={styles.label}>운영 상태 </strong>
                    {item.operationStatusLabel ?? "미입력"}
                  </p>
                  <p>
                    <strong className={styles.label}>정렬 순서 </strong>
                    {item.sortOrder}
                  </p>
                  <p>
                    <strong className={styles.label}>게시 상태 </strong>
                    <SemanticStatusBadge tone={publicationTone[item.publicationStatus]}>{getProgramPublicationStatusLabel(item.publicationStatus)}</SemanticStatusBadge>
                  </p>
                  <p>
                    <strong className={styles.label}>승인 상태 </strong>
                    <SemanticStatusBadge tone={approvalTone[item.approvalStatus]}>{getProgramApprovalStatusLabel(item.approvalStatus)}</SemanticStatusBadge>
                  </p>
                  <p>
                    <strong className={styles.label}>최근 수정 </strong>
                    <time dateTime={item.updatedAt}>{date.formatToParts(new Date(item.updatedAt)).filter(({ type }) => ["year", "month", "day"].includes(type)).map(({ value }) => value).join(".")}</time>
                  </p>
                  <p>
                    <strong className={styles.label}>공개 여부 </strong>
                    <SemanticStatusBadge tone={item.isPubliclyVisible ? "success" : "neutral"}>{item.isPubliclyVisible ? "공개 중" : "비공개"}</SemanticStatusBadge>
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            title={hasFilters ? "선택한 조건에 맞는 프로그램이 없습니다." : "등록된 프로그램이 없습니다."}
            actions={
              hasFilters ? (
                <Link
                  href="/admin/programs"
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
                >
                  필터 초기화
                </Link>
              ) : null
            }
          />
        )}
      </section>
      <AdminListPagination label="프로그램 목록 페이지 이동" page={result.page} totalPages={result.totalPages} previousHref={href(result.page - 1, filters, search)} nextHref={href(result.page + 1, filters, search)} />
    </div>
  );
}
