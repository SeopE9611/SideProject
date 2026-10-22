import Link from "next/link";
type Task = { href: string; title: string; description: string };
export function AdminDashboard({
  contentTasks,
  operationTasks,
  canCreate = false,
  forbidden = false,
  preview = false,
  pendingSummaries = [],
}: {
  contentTasks: readonly Task[];
  operationTasks: readonly Task[];
  canCreate?: boolean;
  forbidden?: boolean;
  preview?: boolean;
  pendingSummaries?: readonly { title: string; href: string; count: number | null }[];
}) {
  const route = (href: string) => (preview ? "/design-preview" + href : href);
  return (
    <div className="desk-dashboard">
      {forbidden ? (
        <p role="alert" className="admin-notice">
          현재 계정에는 요청한 작업 권한이 없습니다.
        </p>
      ) : null}
      <header className="desk-welcome">
        <p>업무 홈</p>
        <h1>어떤 작업을 하시겠어요?</h1>
        <p className="text-safe-wrap">작성할 콘텐츠를 고르거나 진행 중인 업무를 확인하세요.</p>
      </header>
      {preview ? (
        <section aria-labelledby="desk-pending" className="mb-8">
          <div className="desk-section-title"><h2 id="desk-pending">처리 대기 현황</h2></div>
          <p className="text-safe-wrap py-4 text-small text-muted-foreground">디자인 미리보기에서는 운영 현황을 조회하지 않습니다.</p>
        </section>
      ) : pendingSummaries.length > 0 ? (
        <section aria-labelledby="desk-pending" className="mb-8">
          <div className="desk-section-title"><h2 id="desk-pending">처리 대기 현황</h2></div>
          <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-flow-col md:auto-cols-fr">
            {pendingSummaries.map((item) => (
              <li key={item.href} className="min-w-0">
                <Link href={item.href} className="grid min-h-28 gap-2 border border-border bg-surface p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                  <span className="text-small font-semibold">{item.title}</span>
                  {item.count === null ? (
                    <span className="font-semibold text-danger">조회 실패</span>
                  ) : (
                    <span><strong className="text-heading font-bold tabular-nums">{item.count.toLocaleString("ko-KR")}</strong> 건</span>
                  )}
                  <span className="text-small text-primary">목록 확인 <span aria-hidden="true">↗</span></span>
                </Link>
                {item.count === null ? <p role="alert" className="mt-2 text-small text-danger">현황을 불러오지 못했습니다. 잠시 후 새로고침하거나 목록을 확인해 주세요.</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="desk-columns">
        <section aria-labelledby="desk-content">
          <div className="desk-section-title">
            <h2 id="desk-content">홈페이지 콘텐츠</h2>
            <span>작성 · 검토 · 게시</span>
          </div>
          <ul className="desk-task-rows">
            {contentTasks.map((task) => (
              <li key={task.href}>
                <Link href={route(task.href)}>
                  <strong>{task.title}</strong>
                  <span className="text-safe-wrap">{task.description}</span>
                  <span aria-hidden="true">↗</span>
                </Link>
                {canCreate ? (
                  <Link className="desk-create" href={route(task.href + "/new")}>
                    새로 작성 +
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
        <aside className="desk-operations">
          <h2>운영 업무</h2>
          {operationTasks.map((task) => (
            <Link key={task.href} href={route(task.href)}>
              <strong>
                {task.title} <span aria-hidden="true">↗</span>
              </strong>
              <span className="text-safe-wrap">{task.description}</span>
            </Link>
          ))}
        </aside>
      </div>
      <footer className="desk-process">
        <strong>콘텐츠 공개 순서</strong>
        <span>초안 작성</span>
        <span aria-hidden="true">→</span>
        <span>검토·승인</span>
        <span aria-hidden="true">→</span>
        <span>게시</span>
        <p>저장한 내용은 바로 공개되지 않습니다.</p>
      </footer>
    </div>
  );
}
