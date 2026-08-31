import Link from "next/link";

const preparedItems = [
  "관리자 로그인과 세션",
  "소식 목록·상세 관리",
  "소식 초안 작성·수정",
  "시스템 관리자의 일반 콘텐츠 바로 게시와 역할 분리형 검토 요청·승인·반려",
  "게시·게시 중단·보관",
  "프로그램 작성·검토·공개 관리",
  "활동사진 비공개 업로드와 동의 상태 관리",
  "자료공개 PDF 비공개 초안 관리",
  "콘텐츠 상세별 수정 이력과 감사 기록 조회",
  "관리자 역할별 작성·검토·게시 권한 정책",
  "콘텐츠 소프트 삭제와 안전한 초안 복구",
] as const;

const nextItems = [
  "이미지·첨부파일 공개 절차",
] as const;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ forbidden?: string | string[] }>;
}) {
  const forbidden = (await searchParams).forbidden === "1";
  return (
    <div className="space-y-8">
      {forbidden ? (
        <p role="alert" className="rounded-card border border-border-strong bg-surface p-4 font-semibold">
          현재 계정에는 해당 작업 권한이 없습니다.
        </p>
      ) : null}
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
          소식 관리 열기
        </Link>
        <Link href="/admin/programs" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          프로그램 관리 열기
        </Link>
        <Link href="/admin/gallery" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          활동사진 관리 열기
        </Link>
        <Link href="/admin/transparency" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          자료공개 관리 열기
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          공개 홈페이지 보기
        </Link>
      </div>
    </div>
  );
}
