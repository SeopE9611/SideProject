import Image from "next/image";
import Link from "next/link";

type HomeLifeStory = {
  slug: string;
  title: string;
  category: string;
  altText: string;
  dateLabel: string;
  activityDate: string;
};

export function HomeLifeStories({ items }: { items: readonly HomeLifeStory[] }) {
  const [featured, ...supporting] = items.slice(0, 3);
  if (!featured) return null;

  return (
    <div className={`grid gap-7 ${supporting.length ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(17rem,0.8fr)]" : "max-w-5xl"}`}>
      <article className="min-w-0">
        <Link
          className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          href={`/life/gallery/${featured.slug}`}
        >
          <figure>
            <div className="relative aspect-[4/3] overflow-hidden bg-primary-soft sm:aspect-[16/10]">
              <Image alt={featured.altText} className="object-cover" fill sizes="(max-width: 1023px) 100vw, 68vw" src={`/api/gallery/${featured.slug}/media`} unoptimized />
            </div>
            <figcaption className="pt-5">
              <p className="flex flex-wrap gap-x-3 text-small font-semibold text-accent">
                <span>{featured.category}</span>
                <time className="text-muted-foreground" dateTime={featured.activityDate}>{featured.dateLabel}</time>
              </p>
              <h3 className="text-safe-wrap mt-2 text-[1.65rem] font-extrabold leading-snug tracking-[-0.025em] group-hover:text-primary group-hover:underline sm:text-[2rem]">{featured.title}</h3>
            </figcaption>
          </figure>
        </Link>
      </article>
      {supporting.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {supporting.map((item) => (
            <li key={item.slug} className="py-6 first:pt-0 lg:first:pt-6">
              <article>
                <Link className="group grid gap-4 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring sm:grid-cols-[11rem_minmax(0,1fr)] lg:grid-cols-1" href={`/life/gallery/${item.slug}`}>
                  <div className="relative aspect-[16/10] overflow-hidden bg-primary-soft">
                    <Image alt={item.altText} className="object-cover" fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 11rem, 28vw" src={`/api/gallery/${item.slug}/media`} unoptimized />
                  </div>
                  <div>
                    <p className="flex flex-wrap gap-x-3 text-xs font-semibold text-accent"><span>{item.category}</span><time className="text-muted-foreground" dateTime={item.activityDate}>{item.dateLabel}</time></p>
                    <h3 className="text-safe-wrap mt-2 text-xl font-bold leading-snug group-hover:text-primary group-hover:underline">{item.title}</h3>
                  </div>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
