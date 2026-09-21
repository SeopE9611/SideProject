import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminFilterPanel } from "@/components/admin/admin-filter-panel";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getAdminDonorCounts, listAdminDonors } from "@/features/donations/donor.admin-repository";
import {
  donorStatuses,
  donorTypes,
  donorStatusLabels,
  donorTypeLabels,
  type DonorStatus,
  type DonorType,
} from "@/features/donations/donor.types";
import { formatAdminDate } from "@/lib/format-admin-date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const donorListGridClass =
  "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.75fr)_minmax(0,1fr)_minmax(0,0.55fr)_minmax(0,0.55fr)]";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>;
}) {
  const auth = await authorizeCurrentAdmin("donations.manage");
  if (!auth.ok) redirect("/admin?forbidden=1");
  const query = await searchParams;
  const status = donorStatuses.includes(query.status as DonorStatus) ? (query.status as DonorStatus) : undefined;
  const type = donorTypes.includes(query.type as DonorType) ? (query.type as DonorType) : undefined;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const pageSize = 20;
  const [data, counts] = await Promise.all([
    listAdminDonors({ status, type, page, pageSize }),
    getAdminDonorCounts(),
  ]);
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
  const hasFilters = Boolean(type || status);
  const filterFormKey = [type ?? "", status ?? ""].join("|");
  const href = (next: number) =>
    `/admin/donors?${new URLSearchParams({ ...(type ? { type } : {}), ...(status ? { status } : {}), page: String(next) })}`;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="후원자 관리"
        description="후원자 기본 정보와 이용 상태를 확인하고 관리합니다."
        actions={<>
          <Link className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/admin/donors/new">후원자 등록</Link>
          <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/admin/donations">후원금 관리대장</Link>
        </>}
      />

      <section aria-labelledby="donor-summary-heading" className="rounded-card border border-border bg-surface p-5">
        <h2 id="donor-summary-heading" className="text-heading font-bold">후원자 현황</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {[["전체 후원자 수", counts.total], ["이용 중 수", counts.active], ["보관 수", counts.archived]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-small font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 text-heading font-bold">{value}</dd></div>)}
        </dl>
      </section>

      <AdminFilterPanel headingId="donor-filter-heading" title="후원자 필터" totalItems={data.total} page={page} totalPages={totalPages}>
        <form key={filterFormKey} method="get" action="/admin/donors" className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 font-semibold">후원자 유형<select name="type" defaultValue={type ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"><option value="">전체</option>{donorTypes.map((item) => <option key={item} value={item}>{donorTypeLabels[item]}</option>)}</select></label>
          <label className="grid gap-2 font-semibold">상태<select name="status" defaultValue={status ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"><option value="">전체</option>{donorStatuses.map((item) => <option key={item} value={item}>{donorStatusLabels[item]}</option>)}</select></label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button type="submit" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 적용</button>
            <Link href="/admin/donors" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 초기화</Link>
          </div>
        </form>
      </AdminFilterPanel>

      <section aria-labelledby="donor-list-heading">
        <h2 id="donor-list-heading" className="sr-only">후원자 목록</h2>
        {data.items.length ? <>
          <div className={`hidden gap-4 border-y border-border bg-surface-subtle px-4 py-3 text-small font-bold xl:grid ${donorListGridClass}`}><span>참조번호</span><span>표시 이름</span><span>유형</span><span>연락 가능 수단</span><span>상태</span><span>최근 수정</span><span>상세</span><span>편집</span></div>
          <ul className="divide-y divide-border border-b border-border">{data.items.map((item) => <li key={item.id} className={`grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-2 xl:items-center xl:gap-4 ${donorListGridClass}`}>
            <p className="break-words"><strong className="text-small font-semibold xl:sr-only">참조번호 </strong>{item.reference}</p>
            <p className="break-words"><strong className="text-small font-semibold xl:sr-only">표시 이름 </strong>{item.displayName}</p>
            <p><strong className="text-small font-semibold xl:sr-only">유형 </strong>{donorTypeLabels[item.type]}</p>
            <p><strong className="text-small font-semibold xl:sr-only">연락 가능 수단 </strong>{item.contactChannels}</p>
            <p><strong className="text-small font-semibold xl:sr-only">상태 </strong>{donorStatusLabels[item.status]}</p>
            <p><strong className="text-small font-semibold xl:sr-only">최근 수정 </strong><time dateTime={item.updatedAt}>{formatAdminDate(item.updatedAt)}</time></p>
            <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/donors/${item.id}`}>보기</Link>
            <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/donors/${item.id}/edit`}>편집</Link>
          </li>)}</ul>
        </> : <div className="rounded-card border border-border bg-surface p-6"><h3 className="text-heading font-bold">{hasFilters ? "선택한 조건에 맞는 후원자가 없습니다." : "등록된 후원자가 없습니다."}</h3>{hasFilters ? <Link href="/admin/donors" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 초기화</Link> : null}</div>}
      </section>

      <AdminListPagination label="후원자 목록 페이지 이동" page={page} totalPages={totalPages} previousHref={href(page - 1)} nextHref={href(page + 1)} />
    </div>
  );
}
