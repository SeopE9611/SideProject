import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import Link from "next/link";
import { listAdminTransparencyDocuments, normalizeAdminTransparencyPage } from "@/features/transparency/transparency.admin-repository";
import { isTransparencyCategory, isTransparencyFinalDocumentStatus, isTransparencyPrivacyReviewStatus, isTransparencyPublicationStatus, transparencyCategoryLabels } from "@/features/transparency/transparency.types";
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
    query.set(
      "privacyReviewStatus",
      filters.privacyReviewStatus,
    );
  }

  if (filters.finalDocumentStatus) {
    query.set(
      "finalDocumentStatus",
      filters.finalDocumentStatus,
    );
  }

  if (filters.publicationStatus) {
    query.set(
      "publicationStatus",
      filters.publicationStatus,
    );
  }

  return `/admin/transparency?${query.toString()}`;
}
export default async function AdminTransparencyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await getCurrentAdmin();const canCreate=Boolean(admin&&hasAdminPermission(admin,"content.create"));
  const query = await searchParams;
  const filters = {
    page: normalizeAdminTransparencyPage(query.page),
    category: isTransparencyCategory(query.category) ? query.category : undefined,
    privacyReviewStatus: isTransparencyPrivacyReviewStatus(query.privacyReviewStatus) ? query.privacyReviewStatus : undefined,
    finalDocumentStatus: isTransparencyFinalDocumentStatus(query.finalDocumentStatus) ? query.finalDocumentStatus : undefined,
    publicationStatus: isTransparencyPublicationStatus(query.publicationStatus) ? query.publicationStatus : undefined,
  };
  const result = await listAdminTransparencyDocuments(filters);
  return <div className="min-w-0 space-y-8"><header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-title font-bold">자료공개 관리</h1><p>PDF 비공개 초안과 검토 상태를 관리합니다.</p></div>{canCreate?(<Link href="/admin/transparency/new" className="min-h-11 bg-primary px-4 py-3 text-primary-foreground">새 자료공개 초안</Link>):null}</header>
    <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><input type="hidden" name="page" value="1" /><label>분류<select name="category" defaultValue={filters.category ?? ""} className="block min-h-11 w-full border"><option value="">전체</option>{Object.entries(transparencyCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>개인정보 검토<select name="privacyReviewStatus" defaultValue={filters.privacyReviewStatus ?? ""} className="block min-h-11 w-full border"><option value="">전체</option><option value="pending">확인 중</option><option value="confirmed">확인 완료</option></select></label><label>최종본 상태<select name="finalDocumentStatus" defaultValue={filters.finalDocumentStatus ?? ""} className="block min-h-11 w-full border"><option value="">전체</option><option value="draft">작성본</option><option value="final">최종본</option></select></label><label>게시 상태<select name="publicationStatus" defaultValue={filters.publicationStatus ?? ""} className="block min-h-11 w-full border"><option value="">전체</option><option value="draft">작성 중</option><option value="review">검토 중</option><option value="published">게시</option><option value="archived">보관</option></select></label><button className="min-h-11 self-end border">필터 적용</button></form>
    <div className="grid gap-4">{result.items.length ? result.items.map((item) => <article key={item.id} className="min-w-0 rounded-card border p-5"><h2 className="text-safe-wrap font-bold"><Link href={`/admin/transparency/${item.id}`} className="underline">{item.title}</Link></h2><dl className="mt-3 grid gap-2 text-small sm:grid-cols-4"><div><dt className="font-semibold">분류</dt><dd>{transparencyCategoryLabels[item.category]}</dd></div><div><dt className="font-semibold">기준 기간 / 문서일</dt><dd>{item.periodLabel} / {item.documentDate}</dd></div><div><dt className="font-semibold">개인정보 / 최종본 / 게시</dt><dd>{item.privacyReviewStatus} / {item.finalDocumentStatus} / {item.publicationStatus}</dd></div><div><dt className="font-semibold">수정일</dt><dd>{item.updatedAt}</dd></div></dl></article>) : <p className="rounded-card border p-5">조건에 맞는 자료공개 초안이 없습니다.</p>}</div>
    <nav aria-label="자료공개 목록 페이지" className="flex gap-4">{result.page > 1 ? <Link href={buildTransparencyPageHref(result.page - 1, filters)}>이전</Link> : null}<span>{result.page} / {result.totalPages}</span>{result.page < result.totalPages ? <Link href={buildTransparencyPageHref(result.page + 1, filters)}>다음</Link> : null}</nav>
  </div>;
}
