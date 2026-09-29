"use client";

import Link from "next/link";
import { useId, useState } from "react";

type HomeProgramDisclosureProps = {
  category: string;
  title: string;
  summary: string;
  href: string;
};

export function HomeProgramDisclosure({ category, title, summary, href }: HomeProgramDisclosureProps) {
  const contentId = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="program-disclosure" data-open={isOpen || undefined}>
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{category}</span>
        <h4 className="text-safe-wrap">{title}</h4>
        <span className="disclosure-mark" aria-hidden="true" />
      </button>
      <div id={contentId} className="program-disclosure-content" aria-hidden={!isOpen}>
        <div>
          <div className="program-disclosure-content-inner">
            <p className="text-safe-wrap">{summary}</p>
            <Link href={href} className="institution-link" tabIndex={isOpen ? undefined : -1}>
              프로그램 자세히 보기 ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
