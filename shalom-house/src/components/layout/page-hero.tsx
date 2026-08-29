import Link from "next/link";

type PageHeroAction = {
  label: string;
  href: string;
  external?: boolean;
};

type PageHeroItem = {
  label: string;
  value: string;
};

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  asideTitle: string;
  items: readonly PageHeroItem[];
  primaryAction?: PageHeroAction;
  secondaryAction?: PageHeroAction;
};

function HeroAction({
  action,
  primary = false,
}: {
  action: PageHeroAction;
  primary?: boolean;
}) {
  const className = primary
    ? "text-safe-wrap inline-flex min-h-12 items-center justify-center bg-primary px-6 py-3 text-base font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
    : "text-safe-wrap inline-flex min-h-12 items-center gap-2 px-1 py-3 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

  const content = (
    <>
      {action.label}
      {primary ? null : <span aria-hidden="true">→</span>}
    </>
  );

  if (
    action.external ||
    action.href.startsWith("tel:") ||
    action.href.startsWith("#")
  ) {
    return (
      <a
        className={className}
        href={action.href}
        rel={action.external ? "noreferrer" : undefined}
        target={action.external ? "_blank" : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link className={className} href={action.href}>
      {content}
    </Link>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  asideTitle,
  items,
  primaryAction,
  secondaryAction,
}: PageHeroProps) {
  return (
    <section className="overflow-hidden border-b border-border bg-home-cream">
      <div className="animate-page-enter mx-auto grid w-full max-w-site px-page py-14 sm:px-page-wide sm:py-20 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:items-stretch lg:gap-14 lg:py-24">
        <div className="flex flex-col justify-between border-t-4 border-primary pt-7 sm:pt-9">
          <div>
            <p className="text-small font-bold tracking-[0.08em] text-accent">
              {eyebrow}
            </p>
            <h1 className="text-safe-wrap mt-5 max-w-4xl text-balance text-[clamp(2.75rem,5.2vw,4.8rem)] font-bold leading-[1.08] tracking-[-0.045em] text-foreground">
              {title}
            </h1>
            <p className="text-safe-wrap mt-7 max-w-3xl text-pretty text-body text-muted-foreground sm:text-xl sm:leading-9">
              {description}
            </p>
          </div>

          {primaryAction || secondaryAction ? (
            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
              {primaryAction ? (
                <HeroAction action={primaryAction} primary />
              ) : null}
              {secondaryAction ? <HeroAction action={secondaryAction} /> : null}
            </div>
          ) : null}
        </div>

        <aside className="mt-12 bg-home-ink px-7 py-8 text-hero-on-dark sm:px-9 sm:py-10 lg:mt-0">
          <p className="text-small font-bold tracking-[0.08em] text-sun-soft">
            {asideTitle}
          </p>
          <dl className="mt-8 border-t border-hero-on-dark/25">
            {items.map((item) => (
              <div
                key={`${item.label}-${item.value}`}
                className="grid gap-2 border-b border-hero-on-dark/25 py-6 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5"
              >
                <dt className="text-small font-bold text-sun-soft">
                  {item.label}
                </dt>
                <dd className="text-safe-wrap text-pretty text-body font-semibold text-hero-on-dark">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}
