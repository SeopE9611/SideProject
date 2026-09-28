import Link from "next/link";
type Task = { href: string; title: string; description: string };
export function AdminDashboard({
  contentTasks,
  operationTasks,
  canCreate = false,
  forbidden = false,
  preview = false,
}: {
  contentTasks: readonly Task[];
  operationTasks: readonly Task[];
  canCreate?: boolean;
  forbidden?: boolean;
  preview?: boolean;
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
        <p>작성할 콘텐츠를 고르거나 진행 중인 업무를 확인하세요.</p>
      </header>
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
                  <span>{task.description}</span>
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
              <span>{task.description}</span>
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
