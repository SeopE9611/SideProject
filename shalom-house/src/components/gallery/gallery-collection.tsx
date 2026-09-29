"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type GalleryCollectionItem = {
  slug: string;
  title: string;
  category: string;
  description: string;
  altText: string;
  activityDate: string;
  dateLabel: string;
  width: number;
  height: number;
};

function GridIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
      <rect x="2" y="2" width="6" height="6" rx="1" />
      <rect x="12" y="2" width="6" height="6" rx="1" />
      <rect x="2" y="12" width="6" height="6" rx="1" />
      <rect x="12" y="12" width="6" height="6" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
      <rect x="2" y="3" width="4" height="4" rx="1" />
      <rect x="8" y="4" width="10" height="2" rx="1" />
      <rect x="2" y="9" width="4" height="4" rx="1" />
      <rect x="8" y="10" width="10" height="2" rx="1" />
      <rect x="2" y="15" width="4" height="3" rx="1" />
      <rect x="8" y="16" width="10" height="2" rx="1" />
    </svg>
  );
}

export function GalleryCollection({ items }: { items: readonly GalleryCollectionItem[] }) {
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <>
      <div className="gallery-list-toolbar border-b border-border pb-3">
        <h2 id="gallery-list-heading" className="text-heading font-bold">
          활동 기록 <span className="text-base font-medium text-muted-foreground">{items.length}건</span>
        </h2>
        <div className="gallery-list-actions">
          <Link className="institution-link text-small" href="/news/activities">
            활동소식 보기
          </Link>
          <div className="gallery-view-control" aria-label="활동사진 표시 방식">
            <button type="button" aria-label="그리드 보기" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
              <GridIcon />
            </button>
            <button type="button" aria-label="리스트 보기" aria-pressed={view === "list"} onClick={() => setView("list")}>
              <ListIcon />
            </button>
          </div>
        </div>
      </div>
      <ul className="gallery-collection" data-view={view}>
        {items.map((item, index) => {
          const href = `/life/gallery/${item.slug}`;
          return (
            <li key={item.slug} className="gallery-item min-w-0">
              <Link className="photo-link gallery-media-link block" href={href} aria-label={item.title + " 사진 보기"}>
                <Image
                  src={`/api/gallery/${item.slug}/media`}
                  alt={item.altText}
                  width={item.width}
                  height={item.height}
                  loading={index < 3 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  className="aspect-[4/3] w-full bg-surface-subtle object-cover"
                  unoptimized
                />
              </Link>
              <div className="gallery-item-content">
                <p className="text-safe-wrap text-small text-muted-foreground">
                  {item.category} · <time dateTime={item.activityDate}>{item.dateLabel}</time>
                </p>
                <h3>
                  <Link className="gallery-title-link text-safe-wrap" href={href}>
                    {item.title}
                  </Link>
                </h3>
                <p className="text-safe-wrap gallery-description text-small leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
