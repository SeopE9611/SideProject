import Link from "next/link";

const dailyNotes = [
  {
    label: "생활",
    value: "식사하고 쉬며 서로의 안부를 나누는 일상",
  },
  {
    label: "활동",
    value: "집 밖의 사람과 장소를 만나는 지역사회 경험",
  },
  {
    label: "공개",
    value: "담당자 확인과 동의를 거친 정확한 정보",
  },
] as const;

export function HomeHero() {
  return (
    <section className="overflow-hidden border-b border-border bg-home-cream">
      <div className="animate-page-enter mx-auto grid w-full max-w-site px-page py-14 sm:px-page-wide sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(23rem,0.85fr)] lg:gap-14 lg:py-24">
        <div className="flex flex-col justify-between border-t-4 border-primary pt-7 sm:pt-9">
          <div>
            <p className="text-small font-bold tracking-[0.08em] text-accent">
              장애인거주시설 샬롬의 집
            </p>
            <h1 className="text-safe-wrap mt-5 max-w-4xl text-balance text-[clamp(3rem,6vw,5.5rem)] font-bold leading-[1.03] tracking-[-0.055em] text-foreground">
              삶이 머무는 곳,
              <br />
              관계가 이어지는 집
            </h1>
            <p className="text-safe-wrap mt-7 max-w-2xl text-pretty text-body text-muted-foreground sm:text-xl sm:leading-9">
              샬롬의 집은 서로의 속도와 선택을 존중하며 식사하고 쉬고
              이야기하는 생활 공간입니다. 시설 정보와 일상, 참여 방법을 쉽고
              정확하게 전합니다.
            </p>
          </div>

          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Link
              className="text-safe-wrap inline-flex min-h-12 items-center justify-center bg-primary px-6 py-3 text-base font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              href="/about"
            >
              샬롬의 집 소개
            </Link>
            <Link
              className="text-safe-wrap inline-flex min-h-12 items-center gap-2 px-1 py-3 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/life"
            >
              생활이야기 보기
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <aside className="relative mt-12 overflow-hidden bg-home-ink px-7 py-9 text-hero-on-dark sm:px-10 sm:py-11 lg:mt-0">
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-16 size-48 rounded-full border-[2.5rem] border-hero-on-dark/5"
          />
          <p className="relative text-small font-bold tracking-[0.08em] text-sun-soft">
            SHALOM HOUSE
          </p>
          <blockquote className="text-safe-wrap relative mt-10 max-w-lg text-balance text-[clamp(2rem,3.5vw,3.3rem)] font-bold leading-[1.18] tracking-[-0.04em]">
            “평범한 하루가 가장 소중한 이야기입니다.”
          </blockquote>
          <dl className="relative mt-12 border-t border-hero-on-dark/25">
            {dailyNotes.map((note) => (
              <div
                key={note.label}
                className="grid gap-2 border-b border-hero-on-dark/25 py-5 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-5"
              >
                <dt className="text-small font-bold text-sun-soft">
                  {note.label}
                </dt>
                <dd className="text-safe-wrap text-pretty text-small text-hero-muted">
                  {note.value}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}
