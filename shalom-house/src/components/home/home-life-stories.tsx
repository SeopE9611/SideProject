"use client";

import Image from "next/image";
import Link from "next/link";
type HomeLifeStory = {
  slug: string;
  title: string;
  category: string;
  altText: string;
  dateLabel: string;
  activityDate: string;
  mediaSrc?: string;
  href?: string;
};
export function HomeLifeStories({ items }: { items: readonly HomeLifeStory[] }) {
  return (
    <ul className="life-filmstrip">
      {items.map((item) => (
        <li key={item.slug}>
          <Link
            href={item.href ?? `/life/gallery/${item.slug}`}
            onFocus={(event) => {
              if (event.currentTarget.matches(":focus-visible")) {
                event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
              }
            }}
          >
            <figure>
              <div className="life-filmstrip-photo">
                <Image
                  src={item.mediaSrc ?? `/api/gallery/${item.slug}/media`}
                  alt={item.altText}
                  fill
                  unoptimized
                  sizes="(max-width: 767px) 80vw, 38vw"
                />
              </div>
              <figcaption>
                <p>
                  {item.category} <time dateTime={item.activityDate}>{item.dateLabel}</time>
                </p>
                <h3 className="text-safe-wrap">{item.title}</h3>
              </figcaption>
            </figure>
          </Link>
        </li>
      ))}
    </ul>
  );
}
