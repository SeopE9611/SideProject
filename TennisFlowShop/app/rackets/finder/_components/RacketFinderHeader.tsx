type RacketFinderHeaderProps = {
  title?: string;
  description?: string;
};

export default function RacketFinderHeader({
  title = "라켓 찾기",
  description = "가격과 사용 상태, 헤드 크기·무게·밸런스 등 실제 스펙을 조합해 원하는 중고 라켓을 찾아보세요.",
}: RacketFinderHeaderProps) {
  return (
    <section className="min-w-0 space-y-2">
      <p className="text-ui-label font-semibold uppercase tracking-wider text-primary">
        RACKET FINDER
      </p>
      <h1 className="break-keep text-ui-page-title font-semibold tracking-normal text-foreground">
        {title}
      </h1>
      <p className="max-w-3xl break-keep text-ui-body-sm leading-relaxed text-muted-foreground bp-sm:text-ui-body">
        {description}
      </p>
    </section>
  );
}
