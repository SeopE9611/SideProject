import { AdminFilterPanel } from "@/components/admin/admin-filter-panel";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { listAdminGalleryItems, normalizeAdminGalleryPage } from "@/features/gallery/gallery.admin-repository";
import {
  getGalleryApprovalStatusLabel,
  getGalleryConsentStatusLabel,
  getGalleryPublicationStatusLabel,
  getGallerySubjectPresenceLabel,
  isGalleryConsentStatus,
  isGalleryPublicationStatus,
  isGallerySubjectPresence,
} from "@/features/gallery/gallery.types";
import { formatAdminDate } from "@/lib/format-admin-date";
import Link from "next/link";

const gridClass = "xl:grid-cols-[2fr_0.8fr_1fr_1fr_0.8fr_0.8fr_1fr]";

export default async function AdminGalleryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await getCurrentAdmin();
  const canCreate = Boolean(admin && hasAdminPermission(admin, "content.create"));
  const q = await searchParams;
  const page = normalizeAdminGalleryPage(q.page);
  const subjectPresence = isGallerySubjectPresence(q.subjectPresence) ? q.subjectPresence : undefined;
  const consentStatus = isGalleryConsentStatus(q.consentStatus) ? q.consentStatus : undefined;
  const publicationStatus = isGalleryPublicationStatus(q.publicationStatus) ? q.publicationStatus : undefined;
  const result = await listAdminGalleryItems({ page, subjectPresence, consentStatus, publicationStatus });
  const hasFilters = Boolean(subjectPresence || consentStatus || publicationStatus);

  return (
    <div className="min-w-0 space-y-8">
      <AdminPageHeader title="활동사진 관리" description="비공개 초안과 인물·홈페이지 공개 동의 상태를 관리합니다."
        actions={canCreate ? <Link href="/admin/gallery/new" className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground">새 활동사진 초안</Link> : undefined}
      />
      <AdminFilterPanel headingId="gallery-filter" title="활동사진 필터" totalItems={result.totalItems} page={result.page} totalPages={result.totalPages}>
        <form className="mt-4 grid gap-3 lg:grid-cols-3" action="/admin/gallery">
          <label className="grid gap-2 font-semibold">인물 상태<select name="subjectPresence" defaultValue={subjectPresence ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 font-normal"><option value="">전체</option><option value="none">인물 없음</option><option value="non_identifiable">개인 식별 불가</option><option value="identifiable">개인 식별 가능</option></select></label>
          <label className="grid gap-2 font-semibold">동의 상태<select name="consentStatus" defaultValue={consentStatus ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 font-normal"><option value="">전체</option><option value="not_required">별도 동의 불필요</option><option value="pending">동의 확인 중</option><option value="confirmed">공개 동의 확인</option><option value="withdrawn">공개 동의 철회</option></select></label>
          <label className="grid gap-2 font-semibold">게시 상태<select name="publicationStatus" defaultValue={publicationStatus ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 font-normal"><option value="">전체</option><option value="draft">작성 중</option><option value="review">검토 중</option><option value="published">게시</option><option value="archived">보관</option></select></label>
          <div className="flex flex-wrap gap-3 lg:col-span-3"><button className="min-h-11 rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground">필터 적용</button><Link href="/admin/gallery" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary">필터 초기화</Link></div>
        </form>
      </AdminFilterPanel>
      <section aria-labelledby="gallery-list"><h2 id="gallery-list" className="sr-only">활동사진 목록</h2>
        {result.items.length ? <><div className={`hidden gap-3 border-y border-border bg-surface-subtle px-4 py-3 text-small font-bold xl:grid ${gridClass}`}><span>활동사진</span><span>활동일</span><span>인물 상태</span><span>동의 상태</span><span>게시 상태</span><span>승인 상태</span><span>최근 수정</span></div>
          <ul className="divide-y divide-border border-b border-border">{result.items.map((item) => <li key={item.id} className={`grid min-w-0 gap-3 px-4 py-4 md:grid-cols-2 xl:grid ${gridClass}`}><div className="min-w-0 md:col-span-2 xl:col-span-1"><Link className="break-words text-heading font-bold underline-offset-4 hover:underline" href={`/admin/gallery/${item.id}`}>{item.title}</Link><p className="mt-1 text-small text-muted-foreground">{item.category}</p></div><p><strong className="text-small font-semibold xl:sr-only">활동일 </strong>{item.activityDate}</p><p><strong className="text-small font-semibold xl:sr-only">인물 상태 </strong>{getGallerySubjectPresenceLabel(item.subjectPresence)}</p><p><strong className="text-small font-semibold xl:sr-only">동의 상태 </strong>{getGalleryConsentStatusLabel(item.consentStatus)}</p><p><strong className="text-small font-semibold xl:sr-only">게시 상태 </strong>{getGalleryPublicationStatusLabel(item.publicationStatus)}</p><p><strong className="text-small font-semibold xl:sr-only">승인 상태 </strong>{getGalleryApprovalStatusLabel(item.approvalStatus)}</p><p><strong className="text-small font-semibold xl:sr-only">최근 수정 </strong><time dateTime={item.updatedAt}>{formatAdminDate(item.updatedAt)}</time></p></li>)}</ul></> :
          <div className="rounded-card border border-border bg-surface p-6"><h3 className="text-heading font-bold">{hasFilters ? "선택한 조건에 맞는 활동사진이 없습니다." : "등록된 활동사진이 없습니다."}</h3>{hasFilters ? <Link href="/admin/gallery" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">필터 초기화</Link> : null}</div>}
      </section>
      <AdminListPagination label="활동사진 목록 페이지" page={result.page} totalPages={result.totalPages} previousHref={`?page=${result.page - 1}`} nextHref={`?page=${result.page + 1}`} />
    </div>
  );
}
