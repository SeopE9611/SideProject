import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminWorkbench } from "@/components/admin/admin-workbench";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDetailHeader } from "@/components/admin/admin-detail-header";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { AdminFilterPanel } from "@/components/admin/admin-filter-panel";
import { AdminStatusSummary } from "@/components/admin/admin-status-summary";
import { AdminWorkflowPanel } from "@/components/admin/admin-workflow-panel";
import { HomeJournal } from "@/components/home/home-journal";
import { ContentDetailHeader } from "@/components/layout/content-detail-header";
import {
  defaultFacilityOverviewContent as facilityOverviewFixture,
  defaultContactInformationContent as contactInformationFixture,
} from "@/features/site-content/site-content.defaults";
import samplePhoto from "@/content/fixtures/assets/home-still-life.png";
import sampleLandscape from "@/content/fixtures/assets/landscape.webp";
import samplePortrait from "@/content/fixtures/assets/portrait.webp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "디자인 검토용 테스트 화면",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};
const records = [
  { id: "test1", title: "테스트1입니다", status: "작성 중", value: "draft", date: "2026.09.28" },
  { id: "test2", title: "테스트2입니다", status: "검토 중", value: "review", date: "2026.09.27" },
  { id: "test3", title: "테스트3입니다", status: "게시", value: "published", date: "2026.09.26" },
];
const modules: Record<string, string> = {
  news: "소식",
  programs: "프로그램",
  gallery: "활동사진",
  transparency: "자료공개",
  "site-content": "시설 공식 정보",
  inquiries: "문의",
  donations: "후원금",
  donors: "후원자",
  "admin-users": "관리자 계정",
  trash: "휴지통",
};
const contentTasks = ["news", "programs", "gallery", "transparency"].map((key) => ({
  href: `/admin/${key}`,
  title: modules[key],
  description: `${modules[key]} 목록과 작성한 내용을 확인합니다.`,
}));
const operationTasks = ["site-content", "inquiries", "donations", "admin-users"].map((key) => ({
  href: `/admin/${key}`,
  title: modules[key],
  description: `${modules[key]} 관리 화면을 엽니다.`,
}));
const permissions = {
  canRestore: true,
  canManageSiteContent: true,
  canManageInquiries: true,
  canManageDonations: true,
  canManageAdminUsers: true,
};

export default async function DesignPreview({
  params,
  searchParams,
}: {
  params: Promise<{ screen?: string[] }>;
  searchParams: Promise<{ status?: string }>;
}) {
  // Separate presentation-only route. No auth service, repository, storage or mutation API is used.
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") notFound();
  const screen = (await params).screen ?? [];
  const query = await searchParams;
  const reviewBar = (
    <aside className="design-review-bar">
      <span>디자인 검토용 테스트 화면 · 실제 기관 자료 아님 · 저장 기능 없음</span>
      <div className="flex gap-5">
        <Link href="/design-preview">공개 홈</Link>
        <Link href="/design-preview/admin">관리자</Link>
        <Link href="/">실제 프리뷰</Link>
      </div>
    </aside>
  );
  if (screen[0] === "admin") {
    const module = screen[1];
    if ((module && !modules[module]) || screen.length > 4 || (screen[3] && screen[3] !== "edit")) notFound();
    const record = records.find((row) => row.id === screen[2]);
    if (screen[2] && screen[2] !== "new" && !record) notFound();
    const base = `/design-preview/admin/${module}`;
    const isEditor = screen[2] === "new" || screen[3] === "edit";
    return (
      <>
        {reviewBar}
        <AdminWorkbench operator="홍길동 · 테스트 담당자" permissions={permissions} preview>
          {!module ? (
            <AdminDashboard contentTasks={contentTasks} operationTasks={operationTasks} canCreate preview />
          ) : isEditor ? (
            <div className="admin-editor-layout">
              <AdminFormPageHeader
                backHref={record ? `${base}/${record.id}` : base}
                backLabel="목록·상세로 돌아가기"
                eyebrow={`${modules[module]} · 테스트`}
                title={`${modules[module]} ${record ? "수정" : "작성"}`}
                description="화면 구성 확인용입니다. 입력 내용은 저장되지 않습니다."
              />
              <section>
                <fieldset className="space-y-6">
                  <legend className="text-xl font-bold">내용 작성</legend>
                  <label className="grid gap-2">
                    제목
                    <input
                      className="rounded-control border border-border-strong p-3"
                      defaultValue={record?.title ?? "테스트1입니다"}
                    />
                  </label>
                  <label className="grid gap-2">
                    분류
                    <select className="rounded-control border border-border-strong p-3">
                      <option>테스트 분류</option>
                    </select>
                  </label>
                  <label className="grid gap-2">
                    요약
                    <input className="rounded-control border border-border-strong p-3" defaultValue="테스트입니다." />
                  </label>
                  <label className="grid gap-2">
                    본문
                    <textarea
                      rows={8}
                      className="rounded-control border border-border-strong p-3"
                      defaultValue={"테스트1입니다.\n테스트2입니다."}
                    />
                  </label>
                  <div className="flex gap-4 items-center">
                    <button
                      type="button"
                      disabled
                      className="rounded-control bg-primary px-6 py-3 text-white opacity-50"
                    >
                      저장 불가 · 테스트 화면
                    </button>
                    <Link href={base} className="institution-link">
                      목록으로
                    </Link>
                  </div>
                </fieldset>
              </section>
            </div>
          ) : record ? (
            <div className="admin-detail-layout">
              <AdminDetailHeader
                backHref={base}
                backLabel={`${modules[module]} 목록`}
                eyebrow={`${modules[module]} · 테스트`}
                title={record.title}
                actions={
                  <Link className="action-link" href={`${base}/${record.id}/edit`}>
                    수정 화면 보기 ↗
                  </Link>
                }
              />
              <AdminStatusSummary
                items={[
                  { label: "게시 상태", value: record.status },
                  { label: "승인 상태", value: record.value === "published" ? "승인 완료" : "승인 대기" },
                  { label: "최근 수정", value: record.date },
                  { label: "작성자", value: "홍길동" },
                ]}
              />
              <section>
                <h2 className="text-xl font-bold">내용</h2>
                <p className="my-6 text-muted-foreground">테스트입니다.</p>
                <p className="leading-8">
                  테스트1입니다.
                  <br />
                  테스트2입니다.
                  <br />
                  테스트3입니다.
                </p>
              </section>
              <section>
                <h2 className="text-xl font-bold">사진·첨부</h2>
                <p className="mt-4 text-muted-foreground">등록된 파일이 없습니다.</p>
              </section>
              <AdminWorkflowPanel title="검토·게시" description={<p>상태와 버튼 배치를 확인하는 테스트 화면입니다.</p>}>
                <button type="button" disabled className="mt-4 border border-border-strong p-3 opacity-50">
                  테스트 화면에서는 게시할 수 없습니다.
                </button>
              </AdminWorkflowPanel>
            </div>
          ) : (
            <div className="admin-list-layout">
              <AdminPageHeader
                title={`${modules[module]} 관리`}
                description="테스트 데이터로 목록과 상세 화면을 확인합니다."
                actions={
                  <Link className="action-link" href={`${base}/new`}>
                    새로 작성 +
                  </Link>
                }
              />
              <AdminFilterPanel
                headingId="demo-filter"
                title="보기 조건"
                totalItems={records.filter((row) => !query.status || row.value === query.status).length}
                page={1}
                totalPages={1}
              >
                <form method="get" action={base} className="mt-4 grid gap-4">
                  <label className="grid gap-2">
                    상태
                    <select
                      name="status"
                      defaultValue={query.status ?? ""}
                      className="min-h-11 border border-border-strong p-2"
                    >
                      <option value="">전체</option>
                      <option value="draft">작성 중</option>
                      <option value="review">검토 중</option>
                      <option value="published">게시</option>
                    </select>
                  </label>
                  <div className="flex gap-3">
                    <button className="bg-primary text-white p-3" type="submit">
                      적용
                    </button>
                    <Link className="institution-link" href={base}>
                      초기화
                    </Link>
                  </div>
                </form>
              </AdminFilterPanel>
              <section>
                <h2 className="text-lg font-bold mb-4">{modules[module]} 목록</h2>
                <div className="overflow-x-auto">
                  <table className="demo-data-table">
                    <thead>
                      <tr>
                        <th>제목</th>
                        <th>상태</th>
                        <th>최근 수정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records
                        .filter((row) => !query.status || row.value === query.status)
                        .map((row) => (
                          <tr key={row.id}>
                            <td>
                              <Link className="institution-link" href={`${base}/${row.id}`}>
                                {row.title}
                              </Link>
                            </td>
                            <td>{row.status}</td>
                            <td>{row.date}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </AdminWorkbench>
      </>
    );
  }
  const publicHeader = (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/design-preview" className="site-wordmark">
          샬롬의 집
        </Link>
        <nav className="flex flex-wrap gap-6" aria-label="검토 메뉴">
          <Link href="/about">시설소개</Link>
          <Link href="/life">생활·프로그램</Link>
          <Link href="/news">소식</Link>
          <Link href="/support">함께하기</Link>
        </nav>
      </div>
    </header>
  );
  if (screen.length) {
    if (
      !["news", "programs", "gallery"].includes(screen[0]) ||
      screen.length !== 2 ||
      !records.some((row) => row.id === screen[1])
    )
      notFound();
    const item = records.find((row) => row.id === screen[1])!;
    return (
      <>
        {reviewBar}
        {publicHeader}
        <main>
          <article className="reading-layout">
            <ContentDetailHeader
              title={item.title}
              summary="테스트입니다."
              category="테스트 자료"
              backHref="/design-preview"
              backLabel="테스트 홈으로"
              metadata={[{ label: "게시일", value: item.date, dateTime: item.date.replaceAll(".", "-") }]}
              isDemo
            />
            <div>
              <Image
                src={samplePhoto}
                alt="AI 생성 테스트 이미지. 실제 기관 사진이 아닙니다."
                className="w-full h-auto"
              />
              <p className="py-8 leading-8">
                테스트1입니다.
                <br />
                테스트2입니다.
              </p>
            </div>
          </article>
        </main>
      </>
    );
  }
  return (
    <>
      {reviewBar}
      {publicHeader}
      <main>
        <HomeJournal
          preview
          overview={facilityOverviewFixture}
          contact={contactInformationFixture}
          heroImages={[samplePhoto, sampleLandscape, samplePortrait].map((asset, index) => ({
            src: asset.src,
            alt: index === 0 ? "AI 생성 테스트 이미지. 실제 기관 사진이 아닙니다." : "화면 검증용 테스트 이미지",
            width: asset.width,
            height: asset.height,
            caption: `테스트 사진 ${index + 1} · 실제 기관 사진 아님`,
            href: `/design-preview/gallery/test${index + 1}`,
          }))}
          notices={records.map((row) => ({
            ...row,
            slug: row.id,
            publishedAt: row.date.replaceAll(".", "-"),
            isDemo: true,
          }))}
          activities={[]}
          galleryItems={[samplePhoto, sampleLandscape, samplePortrait].map((asset, index) => ({
            slug: `test${index + 1}`,
            title: `테스트${index + 1}입니다`,
            category: "테스트",
            altText: index === 0 ? "AI 생성 테스트 이미지. 실제 기관 사진이 아닙니다." : "화면 검증용 테스트 이미지",
            activityDate: "2026-09-28",
            mediaSrc: asset.src,
          }))}
          programs={records.map((row) => ({
            slug: row.id,
            title: row.title,
            category: "테스트",
            summary: "테스트입니다.",
          }))}
          documents={[]}
        />
      </main>
    </>
  );
}
