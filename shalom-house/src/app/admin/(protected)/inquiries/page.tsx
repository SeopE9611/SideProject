import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminFilterPanel } from "@/components/admin/admin-filter-panel";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getAdminInquiryCounts, listAdminInquiries } from "@/features/inquiries/inquiry.admin-repository";
import {
  inquiryKindLabels,
  inquiryKinds,
  inquiryStatusLabels,
  inquiryStatuses,
  type InquiryKind,
  type InquiryStatus,
} from "@/features/inquiries/inquiry.types";
import { formatAdminDate } from "@/lib/format-admin-date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inquiryListGridClass =
  "xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1.05fr)_minmax(0,0.55fr)]";

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string; page?: string }>;
}) {
  const auth = await authorizeCurrentAdmin("inquiries.manage");
  if (!auth.ok) redirect("/admin?forbidden=1");
  const query = await searchParams;
  const status = inquiryStatuses.includes(query.status as InquiryStatus) ? (query.status as InquiryStatus) : undefined;
  const kind = inquiryKinds.includes(query.kind as InquiryKind) ? (query.kind as InquiryKind) : undefined;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const [data, counts] = await Promise.all([
    listAdminInquiries({ status, kind, page, pageSize: 20 }),
    getAdminInquiryCounts(),
  ]);
  const totalPages = Math.max(1, Math.ceil(data.total / 20));
  const hasFilters = Boolean(kind || status);
  const filterFormKey = [kind ?? "", status ?? ""].join("|");
  const href = (next: number) =>
    `/admin/inquiries?${new URLSearchParams({ ...(status ? { status } : {}), ...(kind ? { kind } : {}), page: String(next) })}`;

  return (
    <div className="space-y-8">
      <AdminPageHeader title="문의 관리" description="접수된 문의의 종류와 처리 상태를 확인하고 관리합니다." />

      <section aria-labelledby="inquiry-summary-heading" className="rounded-card border border-border bg-surface p-5">
        <h2 id="inquiry-summary-heading" className="text-heading font-bold">문의 현황</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["전체 문의 수", counts.total],
            ["접수 대기 수", counts.received],
            ["확인 중 수", counts.in_review],
            ["연락 완료 수", counts.contacted],
            ["처리 완료 수", counts.completed],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-small font-semibold text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-heading font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <AdminFilterPanel headingId="inquiry-filter-heading" title="문의 필터" totalItems={data.total} page={page} totalPages={totalPages}>
        <form key={filterFormKey} method="get" action="/admin/inquiries" className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 font-semibold">
            문의 종류
            <select name="kind" defaultValue={kind ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
              <option value="">전체</option>
              {inquiryKinds.map((k) => <option key={k} value={k}>{inquiryKindLabels[k]}</option>)}
            </select>
          </label>
          <label className="grid gap-2 font-semibold">
            처리 상태
            <select name="status" defaultValue={status ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
              <option value="">전체</option>
              {inquiryStatuses.map((s) => <option key={s} value={s}>{inquiryStatusLabels[s]}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button type="submit" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 적용</button>
            <Link href="/admin/inquiries" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 초기화</Link>
          </div>
        </form>
      </AdminFilterPanel>

      <section aria-labelledby="inquiry-list-heading">
        <h2 id="inquiry-list-heading" className="sr-only">문의 목록</h2>
        {data.items.length ? (
          <>
            <div className={`hidden gap-4 border-y border-border bg-surface-subtle px-4 py-3 text-small font-bold xl:grid ${inquiryListGridClass}`}>
              <span>접수번호</span><span>문의 종류</span><span>이름</span><span>연락 가능 수단</span><span>처리 상태</span><span>접수 시각</span><span>상세</span>
            </div>
            <ul className="divide-y divide-border border-b border-border">
              {data.items.map((item) => (
                <li key={item.id} className={`grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-2 xl:items-center xl:gap-4 ${inquiryListGridClass}`}>
                  <p className="break-words"><strong className="text-small font-semibold xl:sr-only">접수번호 </strong>{item.reference}</p>
                  <p><strong className="text-small font-semibold xl:sr-only">문의 종류 </strong>{inquiryKindLabels[item.kind]}</p>
                  <p><strong className="text-small font-semibold xl:sr-only">이름 </strong>{item.name}</p>
                  <p><strong className="text-small font-semibold xl:sr-only">연락 가능 수단 </strong>{item.contactChannels}</p>
                  <p><strong className="text-small font-semibold xl:sr-only">처리 상태 </strong>{inquiryStatusLabels[item.status]}</p>
                  <p><strong className="text-small font-semibold xl:sr-only">접수 시각 </strong><time dateTime={item.createdAt}>{formatAdminDate(item.createdAt)}</time></p>
                  <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/inquiries/${item.id}`}>보기</Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-card border border-border bg-surface p-6">
            <h3 className="text-heading font-bold">{hasFilters ? "선택한 조건에 맞는 문의가 없습니다." : "접수된 문의가 없습니다."}</h3>
            {hasFilters ? <Link href="/admin/inquiries" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 초기화</Link> : null}
          </div>
        )}
      </section>

      <AdminListPagination label="문의 목록 페이지 이동" page={page} totalPages={totalPages} previousHref={href(page - 1)} nextHref={href(page + 1)} />
    </div>
  );
}
