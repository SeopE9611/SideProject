import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminFilterPanel } from "@/components/admin/admin-filter-panel";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import {
  getAdminDonationCounts,
  isCanonicalMonth,
  listAdminDonations,
} from "@/features/donations/donation.admin-repository";
import {
  donationMethods,
  donationStatuses,
  donationMethodLabels,
  donationPurposeLabels,
  donationReceiptStatusLabels,
  donationStatusLabels,
  type DonationMethod,
  type DonationStatus,
} from "@/features/donations/donation.types";

const canonicalId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{24}$/.test(value);

const donationListGridClass =
  "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.95fr)_minmax(0,0.85fr)_minmax(0,0.55fr)]";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; method?: string; month?: string; donorId?: string; page?: string }>;
}) {
  const auth = await authorizeCurrentAdmin("donations.manage");
  if (!auth.ok) redirect("/admin?forbidden=1");
  const query = await searchParams;
  const status = donationStatuses.includes(query.status as DonationStatus)
    ? (query.status as DonationStatus)
    : undefined;
  const method = donationMethods.includes(query.method as DonationMethod)
    ? (query.method as DonationMethod)
    : undefined;
  const month = isCanonicalMonth(query.month) ? query.month : undefined;
  const donorId = canonicalId(query.donorId) ? query.donorId : undefined;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const pageSize = 20;
  const [data, counts] = await Promise.all([
    listAdminDonations({ status, method, month, donorId, page, pageSize }),
    getAdminDonationCounts(),
  ]);
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
  const hasFilters = Boolean(status || method || month || donorId);
  const filterFormKey = [status ?? "", method ?? "", month ?? "", donorId ?? ""].join("|");
  const href = (next: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    if (month) params.set("month", month);
    if (donorId) params.set("donorId", donorId);
    params.set("page", String(next));
    return `/admin/donations?${params}`;
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="후원금 관리대장"
        description="후원금 기록과 처리 상태를 확인하고 관리합니다."
        actions={
          <>
            <Link className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/admin/donations/new">후원금 등록</Link>
            <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/admin/donors">후원자 관리</Link>
          </>
        }
      />

      <section aria-labelledby="donation-summary-heading" className="rounded-card border border-border bg-surface p-5">
        <h2 id="donation-summary-heading" className="text-heading font-bold">후원금 현황</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["확정 후원금 합계", `${new Intl.NumberFormat("ko-KR").format(counts.confirmedAmountWon)}원`],
            ["작성 중 수", counts.draft],
            ["확정 수", counts.confirmed],
            ["무효 수", counts.voided],
          ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-small font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 text-heading font-bold">{value}</dd></div>)}
        </dl>
      </section>

      <AdminFilterPanel headingId="donation-filter-heading" title="후원금 필터" totalItems={data.total} page={page} totalPages={totalPages}>
        <form key={filterFormKey} method="get" action="/admin/donations" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 font-semibold">기록 상태<select name="status" defaultValue={status ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"><option value="">전체 상태</option>{donationStatuses.map((item) => <option key={item} value={item}>{donationStatusLabels[item]}</option>)}</select></label>
          <label className="grid gap-2 font-semibold">후원 방식<select name="method" defaultValue={method ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"><option value="">전체 방식</option>{donationMethods.map((item) => <option key={item} value={item}>{donationMethodLabels[item]}</option>)}</select></label>
          <label className="grid gap-2 font-semibold">후원 월<input name="month" type="month" defaultValue={month ?? ""} className="min-h-11 rounded-control border border-border-strong bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" /></label>
          {donorId ? <input type="hidden" name="donorId" value={donorId} /> : null}
          <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-3">
            <button type="submit" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 적용</button>
            <Link href="/admin/donations" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 초기화</Link>
          </div>
        </form>
      </AdminFilterPanel>

      <section aria-labelledby="donation-list-heading">
        <h2 id="donation-list-heading" className="sr-only">후원금 목록</h2>
        {data.items.length ? <>
          <div className={`hidden gap-4 border-y border-border bg-surface-subtle px-4 py-3 text-small font-bold xl:grid ${donationListGridClass}`}><span>참조번호</span><span>후원자</span><span>후원 일자</span><span>금액</span><span>방식</span><span>목적</span><span>영수증 상태</span><span>기록 상태</span><span>상세</span></div>
          <ul className="divide-y divide-border border-b border-border">{data.items.map((item) => <li key={item.id} className={`grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-2 xl:items-center xl:gap-4 ${donationListGridClass}`}>
            <p className="break-words"><strong className="text-small font-semibold xl:sr-only">참조번호 </strong>{item.reference}</p>
            <p className="break-words"><strong className="text-small font-semibold xl:sr-only">후원자 </strong>{item.donorName}</p>
            <p><strong className="text-small font-semibold xl:sr-only">후원 일자 </strong><time dateTime={item.donatedOn}>{item.donatedOn}</time></p>
            <p><strong className="text-small font-semibold xl:sr-only">금액 </strong>{new Intl.NumberFormat("ko-KR").format(item.amountWon)}원</p>
            <p><strong className="text-small font-semibold xl:sr-only">방식 </strong>{donationMethodLabels[item.method]}</p>
            <p><strong className="text-small font-semibold xl:sr-only">목적 </strong>{donationPurposeLabels[item.purpose]}</p>
            <p><strong className="text-small font-semibold xl:sr-only">영수증 상태 </strong>{donationReceiptStatusLabels[item.receiptStatus]}</p>
            <p><strong className="text-small font-semibold xl:sr-only">기록 상태 </strong>{donationStatusLabels[item.status]}</p>
            <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/donations/${item.id}`}>보기</Link>
          </li>)}</ul>
        </> : <div className="rounded-card border border-border bg-surface p-6"><h3 className="text-heading font-bold">{hasFilters ? "선택한 조건에 맞는 후원금 기록이 없습니다." : "등록된 후원금 기록이 없습니다."}</h3>{hasFilters ? <Link href="/admin/donations" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 초기화</Link> : null}</div>}
      </section>

      <AdminListPagination label="후원금 목록 페이지 이동" page={page} totalPages={totalPages} previousHref={href(page - 1)} nextHref={href(page + 1)} />
    </div>
  );
}
