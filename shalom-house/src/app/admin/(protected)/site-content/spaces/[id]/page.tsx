import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminDetailHeader } from "@/components/admin/admin-detail-header";
import { AdminStatusSummary } from "@/components/admin/admin-status-summary";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getAdminFacilitySpace } from "@/features/facility-spaces/facility-space.admin-repository";
import { getFacilitySpacePublicationStatusLabel } from "@/features/facility-spaces/facility-space.types";
import { formatAdminDate } from "@/lib/format-admin-date";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const { id } = await params;
  const d = await getAdminFacilitySpace(id);
  if (!d) notFound();
  const rows = [
    { label: "공간 설명", value: d.description },
    { label: "생성일", value: <time dateTime={d.createdAt}>{formatAdminDate(d.createdAt)}</time> },
    {
      label: "게시일",
      value: d.publishedAt ? <time dateTime={d.publishedAt}>{formatAdminDate(d.publishedAt)}</time> : "없음",
    },
    {
      label: "보관일",
      value: d.archivedAt ? <time dateTime={d.archivedAt}>{formatAdminDate(d.archivedAt)}</time> : "없음",
    },
  ];
  return (
    <div className="space-y-8">
      <AdminDetailHeader
        backHref="/admin/site-content/spaces"
        backLabel="생활공간 관리"
        eyebrow="생활공간 · 상세"
        title={d.title}
        actions={
          <Link className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/site-content/spaces/${id}/edit`}>
            편집
          </Link>
        }
      />
      {(await searchParams).saved === "1" ? <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">저장했습니다.</p> : null}
      <AdminStatusSummary
        items={[
          { label: "공개 상태", value: getFacilitySpacePublicationStatusLabel(d.publicationStatus) },
          { label: "표시 순서", value: String(d.displayOrder) },
          { label: "최근 수정", value: <time dateTime={d.updatedAt}>{formatAdminDate(d.updatedAt)}</time> },
        ]}
      />
      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-heading font-bold">공간 정보</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <dt className="font-bold text-muted-foreground">{label}</dt>
            <dd className="whitespace-pre-wrap break-words">{value}</dd>
          </div>
        ))}
        </dl>
      </section>
      <section className="rounded-card border border-border bg-surface p-5" aria-labelledby="facility-space-media-title">
        <h2 id="facility-space-media-title" className="text-heading font-bold">공간 사진</h2>
        {d.media ? (
          <div className="mt-4 grid gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- 인증된 no-store 프록시의 즉시 접근 차단 의미를 유지합니다. */}
            <img src={`/api/admin/site-content/spaces/${id}/media`} alt={d.media.altText} width={d.media.width} height={d.media.height} className="aspect-[3/2] w-full max-w-3xl rounded-card object-cover" />
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="min-w-0"><dt className="font-bold text-muted-foreground">대체 텍스트</dt><dd className="break-words">{d.media.altText}</dd></div>
              <div className="min-w-0"><dt className="font-bold text-muted-foreground">원본 파일명</dt><dd className="break-all">{d.media.originalFileName}</dd></div>
              <div><dt className="font-bold text-muted-foreground">크기</dt><dd>{d.media.width}×{d.media.height}</dd></div>
            </dl>
          </div>
        ) : <p className="mt-4 text-muted-foreground">등록된 공간 사진이 없습니다.</p>}
      </section>
      <AdminAuditHistory items={d.auditHistory} />
    </div>
  );
}
