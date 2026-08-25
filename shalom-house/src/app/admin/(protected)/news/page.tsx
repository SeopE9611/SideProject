import Link from "next/link";

export default function AdminNewsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-title font-bold">뉴스 관리</h1>
        <p className="mt-3 text-body text-muted-foreground">
          공지사항과 활동 소식의 작성·검토·공개 기능을 연결할 관리자 영역입니다.
        </p>
      </div>
      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-heading font-bold">현재 단계</h2>
        <p className="mt-4 text-body">
          이번 단계에서는 관리자 인증과 공통 화면만 준비되었습니다.<br />
          게시물 목록과 작성·수정 기능은 다음 작업에서 연결합니다.
        </p>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="text-heading font-bold">게시 상태</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-body">
            <li>작성 중</li><li>검토 중</li><li>게시</li><li>보관</li>
          </ul>
        </section>
        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="text-heading font-bold">승인 상태</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-body">
            <li>승인 대기</li><li>승인 완료</li><li>공개 거부</li>
          </ul>
        </section>
      </div>
      <Link href="/news" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
        공개 뉴스 페이지 보기
      </Link>
    </div>
  );
}
