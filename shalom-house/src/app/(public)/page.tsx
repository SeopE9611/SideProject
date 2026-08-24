export default function Home() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-content flex-col items-center justify-center px-page py-section text-center sm:px-page-wide sm:py-section-wide">
      <p className="text-small font-semibold text-primary">샬롬의 집</p>
      <h1 className="mt-4 text-display font-bold text-foreground sm:text-display-lg">
        공식 홈페이지를 준비하고 있습니다
      </h1>
      <p className="mt-6 max-w-2xl text-body text-muted-foreground">
        시설 소개와 활동, 후원 및 봉사 소식을 전할 예정입니다.
      </p>
    </section>
  );
}
