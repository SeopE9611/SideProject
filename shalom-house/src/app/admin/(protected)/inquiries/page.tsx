import Link from "next/link";
import { redirect } from "next/navigation";
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
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
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
  const href = (next: number) =>
    `/admin/inquiries?${new URLSearchParams({ ...(status ? { status } : {}), ...(kind ? { kind } : {}), page: String(next) })}`;
  return (
    <div>
      <h1 className="text-title font-bold">문의 관리</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        <p>
          전체 문의 수 <b>{counts.total}</b>
        </p>
        <p>
          접수 대기 수 <b>{counts.received}</b>
        </p>
        <p>
          확인 중 수 <b>{counts.in_review}</b>
        </p>
        <p>
          연락 완료 수 <b>{counts.contacted}</b>
        </p>
        <p>
          처리 완료 수 <b>{counts.completed}</b>
        </p>
      </div>
      <form className="mt-6 flex flex-wrap gap-3">
        <label>
          문의 종류{" "}
          <select name="kind" defaultValue={kind ?? ""}>
            <option value="">전체</option>
            {inquiryKinds.map((k) => (
              <option key={k} value={k}>
                {inquiryKindLabels[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          처리 상태{" "}
          <select name="status" defaultValue={status ?? ""}>
            <option value="">전체</option>
            {inquiryStatuses.map((s) => (
              <option key={s} value={s}>
                {inquiryStatusLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <button className="min-h-11 rounded-control border px-4">필터 적용</button>
      </form>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th>접수번호</th>
              <th>문의 종류</th>
              <th>이름</th>
              <th>연락 가능 수단</th>
              <th>처리 상태</th>
              <th>접수 시각</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-t">
                <td>{item.reference}</td>
                <td>{inquiryKindLabels[item.kind]}</td>
                <td>{item.name}</td>
                <td>{item.contactChannels}</td>
                <td>{inquiryStatusLabels[item.status]}</td>
                <td>{new Date(item.createdAt).toLocaleString("ko-KR")}</td>
                <td>
                  <Link className="text-primary underline" href={`/admin/inquiries/${item.id}`}>
                    보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.items.length && <p className="py-8">조건에 맞는 문의가 없습니다.</p>}
      </div>
      <nav className="mt-6 flex gap-4">
        {page > 1 && <Link href={href(page - 1)}>이전</Link>}
        {page * 20 < data.total && <Link href={href(page + 1)}>다음</Link>}
      </nav>
    </div>
  );
}
