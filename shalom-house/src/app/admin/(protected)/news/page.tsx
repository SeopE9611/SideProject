import { AdminFilterPanel } from "@/components/admin/admin-filter-panel";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import Link from "next/link";

import { listAdminNewsPosts, type AdminNewsListFilters } from "@/features/news/news.admin-repository";
import { normalizeAdminNewsPage } from "@/features/news/news.pagination";
import {
  getNewsApprovalStatusLabel,
  getNewsCategoryLabel,
  getNewsPublicationStatusLabel,
  isNewsApprovalStatus,
  isNewsCategory,
  isNewsPublicationStatus,
} from "@/features/news/news.types";

type AdminNewsSearchParams = {
  category?: string | string[];
  publication?: string | string[];
  approval?: string | string[];
  page?: string | string[];
  created?: string | string[];
};

const adminNewsDesktopGridClass =
  "xl:grid-cols-[minmax(0,2.4fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.65fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function createAdminNewsPageHref(page: number, filters: AdminNewsListFilters): string {
  const query = new URLSearchParams();
  if (filters.category) query.set("category", filters.category);
  if (filters.publicationStatus) {
    query.set("publication", filters.publicationStatus);
  }
  if (filters.approvalStatus) query.set("approval", filters.approvalStatus);
  if (page > 1) query.set("page", String(page));
  const search = query.toString();
  return search ? `/admin/news?${search}` : "/admin/news";
}

export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<AdminNewsSearchParams> }) {
  const admin = await getCurrentAdmin();
  const canCreate = Boolean(admin && hasAdminPermission(admin, "content.create"));
  const query = await searchParams;
  const wasCreated = typeof query.created === "string" && query.created === "1";
  const category = typeof query.category === "string" && isNewsCategory(query.category) ? query.category : undefined;
  const publicationStatus =
    typeof query.publication === "string" && isNewsPublicationStatus(query.publication) ? query.publication : undefined;
  const approvalStatus =
    typeof query.approval === "string" && isNewsApprovalStatus(query.approval) ? query.approval : undefined;
  const filters = { category, publicationStatus, approvalStatus };
  const requestedPage = normalizeAdminNewsPage(typeof query.page === "string" ? query.page : undefined);
  const result = await listAdminNewsPosts({ page: requestedPage, filters });
  const hasFilters = Boolean(category || publicationStatus || approvalStatus);
  const filterFormKey = [category ?? "", publicationStatus ?? "", approvalStatus ?? ""].join("|");

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="소식 관리"
        description="공지사항과 활동 소식의 게시 상태와 승인 상태를 확인합니다."
        supportingContent={<>
          새 게시물은 작성 중·승인 대기 상태로 저장됩니다.
          <br />
          저장 후 상세 화면에서 수정·검토·승인과 공개 상태를 관리할 수 있습니다.
        </>}
        actions={<>
          {canCreate ? <Link href="/admin/news/new" className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">새 게시물 작성</Link> : null}
          <Link href="/news" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">공개 뉴스 페이지 보기</Link>
        </>}
      />
      {wasCreated ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          새 게시물을 작성 중·승인 대기 상태로 저장했습니다.
        </p>
      ) : null}

      <AdminFilterPanel headingId="admin-news-filter-heading" title="뉴스 필터" totalItems={result.totalItems} page={result.page} totalPages={result.totalPages}>
        <form key={filterFormKey} method="get" action="/admin/news" className="mt-4 grid gap-3 lg:grid-cols-3">
          <label className="grid gap-2 font-semibold">
            분류
            <select
              name="category"
              defaultValue={category ?? ""}
              className="min-h-11 rounded-control border border-border-strong bg-background px-3 py-2 font-normal"
            >
              <option value="">전체 분류</option>
              <option value="notice">공지사항</option>
              <option value="activity">활동 소식</option>
            </select>
          </label>
          <label className="grid gap-2 font-semibold">
            게시 상태
            <select
              name="publication"
              defaultValue={publicationStatus ?? ""}
              className="min-h-11 rounded-control border border-border-strong bg-background px-3 py-2 font-normal"
            >
              <option value="">전체 게시 상태</option>
              <option value="draft">작성 중</option>
              <option value="review">검토 중</option>
              <option value="published">게시</option>
              <option value="archived">보관</option>
            </select>
          </label>
          <label className="grid gap-2 font-semibold">
            승인 상태
            <select
              name="approval"
              defaultValue={approvalStatus ?? ""}
              className="min-h-11 rounded-control border border-border-strong bg-background px-3 py-2 font-normal"
            >
              <option value="">전체 승인 상태</option>
              <option value="pending">승인 대기</option>
              <option value="approved">승인 완료</option>
              <option value="rejected">공개 거부</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-3 lg:col-span-3">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              필터 적용
            </button>
            <Link
              href="/admin/news"
              className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              필터 초기화
            </Link>
          </div>
        </form>
      </AdminFilterPanel>

      <section aria-labelledby="admin-news-list-heading">
        <h2 id="admin-news-list-heading" className="sr-only">
          뉴스 게시물 목록
        </h2>
        {result.items.length > 0 ? (
          <>
            <div
              className={`hidden gap-4 border-y border-border bg-surface-subtle px-4 py-3 text-small font-bold xl:grid ${adminNewsDesktopGridClass}`}
            >
              <span>소식</span>
              <span>게시 상태</span>
              <span>승인 상태</span>
              <span>공개 여부</span>
              <span>게시일</span>
              <span>최근 수정</span>
            </div>
            <ul className="divide-y divide-border border-b border-border">
              {result.items.map((item) => (
                <li key={item.id}>
                  <article
                    className={`grid min-w-0 gap-3 px-4 py-4 md:grid-cols-2 xl:items-start xl:gap-4 ${adminNewsDesktopGridClass}`}
                  >
                    <div className="min-w-0 md:col-span-2 xl:col-span-1">
                      <p className="text-small font-semibold text-primary">{getNewsCategoryLabel(item.category)}</p>
                      <h3 className="mt-1 break-words text-heading font-bold">
                        <Link
                          href={`/admin/news/${item.id}`}
                          className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                        >
                          {item.title}
                        </Link>
                      </h3>
                      <p className="mt-1 break-words text-small text-muted-foreground">{item.summary}</p>
                      <p className="mt-1 break-all text-small text-muted-foreground">slug: {item.slug}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-small font-semibold xl:hidden">게시 상태</p>
                      <p className="mt-1 break-words xl:mt-0">
                        {getNewsPublicationStatusLabel(item.publicationStatus)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-small font-semibold xl:hidden">승인 상태</p>
                      <p className="mt-1 break-words xl:mt-0">{getNewsApprovalStatusLabel(item.approvalStatus)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-small font-semibold xl:hidden">공개 여부</p>
                      <p className="mt-1 break-words font-semibold xl:mt-0">
                        {item.isPubliclyVisible ? "공개 중" : "비공개"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-small font-semibold xl:hidden">게시일</p>
                      {item.publishedAt ? (
                        <time className="mt-1 block break-words xl:mt-0" dateTime={item.publishedAt}>
                          {formatDate(item.publishedAt)}
                        </time>
                      ) : (
                        <p className="mt-1 break-words xl:mt-0">게시일 미설정</p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-small font-semibold xl:hidden">최근 수정</p>
                      <time className="mt-1 block break-words xl:mt-0" dateTime={item.updatedAt}>
                        {formatDate(item.updatedAt)}
                      </time>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-card border border-border bg-surface p-6">
            <h3 className="text-heading font-bold">
              {hasFilters ? "선택한 조건에 맞는 게시물이 없습니다." : "아직 등록된 뉴스 게시물이 없습니다."}
            </h3>
            {hasFilters ? (
              <Link
                href="/admin/news"
                className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                필터 초기화
              </Link>
            ) : (
              <p className="mt-3 text-muted-foreground">
                새 게시물 작성에서 초안을 저장하면 이 화면에서 게시 상태를 확인할 수 있습니다.
              </p>
            )}
          </div>
        )}
      </section>

      <AdminListPagination
        label="뉴스 목록 페이지 이동"
        page={result.page}
        totalPages={result.totalPages}
        previousHref={createAdminNewsPageHref(result.page - 1, filters)}
        nextHref={createAdminNewsPageHref(result.page + 1, filters)}
      />
    </div>
  );
}
