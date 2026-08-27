import Link from "next/link";

const preparedItems = [
  "관리자 로그인과 세션",
  "뉴스 목록·상세 관리",
  "뉴스 초안 작성·수정",
  "검토 요청·승인·반려",
  "게시·게시 중단·보관",
] as const;

const nextItems = [
  "수정 이력과 감사 기록",
  "역할·게시자 정책",
  "삭제·복구",
  "이미지·첨부파일",
] as const;

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-title font-bold">관리자 대시보드</h1>
        <p className="mt-3 text-body text-muted-foreground">
          샬롬의 집 공식 홈페이지 콘텐츠 관리 상태를 확인합니다.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="text-heading font-bold">현재 준비된 기반</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-body">
            {preparedItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="text-heading font-bold">다음 관리 작업</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-body">
            {nextItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/news" className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          뉴스 관리 열기
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          공개 홈페이지 보기
        </Link>
      </div>
    </div>
  );
}
