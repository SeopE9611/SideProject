import { AdminFilterPanel } from "@/components/admin/admin-filter-panel";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import Link from "next/link";
import { formatAdminDate } from "@/lib/format-admin-date";
import {
  listAdminTransparencyDocuments,
  normalizeAdminTransparencyPage,
} from "@/features/transparency/transparency.admin-repository";
import {
  isTransparencyCategory,
  isTransparencyFinalDocumentStatus,
  isTransparencyPrivacyReviewStatus,
  isTransparencyPublicationStatus,
  transparencyCategoryLabels,
  transparencyFinalDocumentStatusLabels,
  transparencyPrivacyReviewStatusLabels,
  transparencyPublicationStatusLabels,
} from "@/features/transparency/transparency.types";
function buildTransparencyPageHref(
  page: number,
  filters: {
    category?: string;
    privacyReviewStatus?: string;
    finalDocumentStatus?: string;
    publicationStatus?: string;
  },
): string {
  const query = new URLSearchParams({
    page: String(page),
  });

  if (filters.category) {
    query.set("category", filters.category);
  }

  if (filters.privacyReviewStatus) {
    query.set("privacyReviewStatus", filters.privacyReviewStatus);
  }

  if (filters.finalDocumentStatus) {
    query.set("finalDocumentStatus", filters.finalDocumentStatus);
  }

  if (filters.publicationStatus) {
    query.set("publicationStatus", filters.publicationStatus);
  }

  return `/admin/transparency?${query.toString()}`;
}
export default async function AdminTransparencyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await getCurrentAdmin();
  const canCreate = Boolean(admin && hasAdminPermission(admin, "content.create"));
  const query = await searchParams;
  const filters = {
    page: normalizeAdminTransparencyPage(query.page),
    category: isTransparencyCategory(query.category) ? query.category : undefined,
    privacyReviewStatus: isTransparencyPrivacyReviewStatus(query.privacyReviewStatus)
      ? query.privacyReviewStatus
      : undefined,
    finalDocumentStatus: isTransparencyFinalDocumentStatus(query.finalDocumentStatus)
      ? query.finalDocumentStatus
      : undefined,
    publicationStatus: isTransparencyPublicationStatus(query.publicationStatus) ? query.publicationStatus : undefined,
  };
  const result = await listAdminTransparencyDocuments(filters);
  const hasFilters = Boolean(
    filters.category || filters.privacyReviewStatus || filters.finalDocumentStatus || filters.publicationStatus,
  );
  return (
    <div className="min-w-0 space-y-8">
      <AdminPageHeader
        title="자료공개 관리"
        description="PDF 비공개 초안과 검토 상태를 관리합니다."
        actions={canCreate ? (
          <Link href="/admin/transparency/new" className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground">
            새 자료공개 초안
          </Link>
        ) : undefined}
      />
      <AdminFilterPanel headingId="transparency-filter" title="자료공개 필터" totalItems={result.totalItems} page={result.page} totalPages={result.totalPages}>
      <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="page" value="1" />
        <label>
          분류
          <select name="category" defaultValue={filters.category ?? ""} className="block min-h-11 w-full rounded-control border border-border-strong bg-background px-3">
            <option value="">전체</option>
            {Object.entries(transparencyCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          개인정보 검토
          <select
            name="privacyReviewStatus"
            defaultValue={filters.privacyReviewStatus ?? ""}
            className="block min-h-11 w-full rounded-control border border-border-strong bg-background px-3"
          >
            <option value="">전체</option>
            <option value="pending">{transparencyPrivacyReviewStatusLabels.pending}</option>
            <option value="confirmed">{transparencyPrivacyReviewStatusLabels.confirmed}</option>
          </select>
        </label>
        <label>
          최종본 상태
          <select
            name="finalDocumentStatus"
            defaultValue={filters.finalDocumentStatus ?? ""}
            className="block min-h-11 w-full rounded-control border border-border-strong bg-background px-3"
          >
            <option value="">전체</option>
            <option value="draft">{transparencyFinalDocumentStatusLabels.draft}</option>
            <option value="final">{transparencyFinalDocumentStatusLabels.final}</option>
          </select>
        </label>
        <label>
          게시 상태
          <select
            name="publicationStatus"
            defaultValue={filters.publicationStatus ?? ""}
            className="block min-h-11 w-full rounded-control border border-border-strong bg-background px-3"
          >
            <option value="">전체</option>
            <option value="draft">{transparencyPublicationStatusLabels.draft}</option>
            <option value="review">{transparencyPublicationStatusLabels.review}</option>
            <option value="published">{transparencyPublicationStatusLabels.published}</option>
            <option value="archived">{transparencyPublicationStatusLabels.archived}</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-3 lg:col-span-4"><button className="min-h-11 rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground">필터 적용</button><Link href="/admin/transparency" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary">필터 초기화</Link></div>
      </form>
      </AdminFilterPanel>
      <section aria-labelledby="transparency-list">
        <h2 id="transparency-list" className="sr-only">자료공개 목록</h2>
        {result.items.length ? (
          <>
            <div className={`hidden gap-3 border-y border-border bg-surface-subtle px-4 py-3 text-small font-bold xl:grid ${"xl:grid-cols-[2fr_1.2fr_1fr_0.8fr_0.8fr_1fr]"}`}>
              <span>자료</span><span>기준 기간 / 문서일</span><span>개인정보 검토</span><span>최종본</span><span>게시 상태</span><span>최근 수정</span>
            </div>
            <ul className="divide-y divide-border border-b border-border">
              {result.items.map((item) => (
                <li key={item.id} className={`grid min-w-0 gap-3 px-4 py-4 md:grid-cols-2 xl:grid ${"xl:grid-cols-[2fr_1.2fr_1fr_0.8fr_0.8fr_1fr]"}`}>
                  <div className="min-w-0 md:col-span-2 xl:col-span-1"><Link href={`/admin/transparency/${item.id}`} className="text-safe-wrap text-heading font-bold underline-offset-4 hover:underline">{item.title}</Link><p className="mt-1 text-small text-muted-foreground">{transparencyCategoryLabels[item.category]}</p></div>
                  <p><strong className="text-small font-semibold xl:sr-only">기준 기간 / 문서일 </strong>{item.periodLabel} / {item.documentDate}</p>
                  <p><strong className="text-small font-semibold xl:sr-only">개인정보 검토 </strong>{transparencyPrivacyReviewStatusLabels[item.privacyReviewStatus]}</p>
                  <p><strong className="text-small font-semibold xl:sr-only">최종본 </strong>{transparencyFinalDocumentStatusLabels[item.finalDocumentStatus]}</p>
                  <p><strong className="text-small font-semibold xl:sr-only">게시 상태 </strong>{transparencyPublicationStatusLabels[item.publicationStatus]}</p>
                  <p><strong className="text-small font-semibold xl:sr-only">최근 수정 </strong><time dateTime={item.updatedAt}>{formatAdminDate(item.updatedAt)}</time></p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-card border border-border bg-surface p-6"><h3 className="text-heading font-bold">{hasFilters ? "선택한 조건에 맞는 자료공개 문서가 없습니다." : "등록된 자료공개 문서가 없습니다."}</h3>{hasFilters ? <Link href="/admin/transparency" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">필터 초기화</Link> : null}</div>
        )}
      </section>
      <AdminListPagination
        label="자료공개 목록 페이지"
        page={result.page}
        totalPages={result.totalPages}
        previousHref={buildTransparencyPageHref(result.page - 1, filters)}
        nextHref={buildTransparencyPageHref(result.page + 1, filters)}
      />
    </div>
  );
}
