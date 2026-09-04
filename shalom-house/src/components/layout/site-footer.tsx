import Link from "next/link";

import { siteConfig } from "@/config/site";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export async function SiteFooter() {
  const contact = await getPublicContactInformation();
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-site px-page py-7 sm:px-page-wide sm:py-9">
        <nav aria-label="푸터 이용 안내">
          <ul className="flex flex-wrap gap-x-6 gap-y-1 border-b border-primary-foreground/20 pb-4">
            {siteConfig.footerNavigation.map((item) => (
              <li key={item.href}>
                <Link
                  className="inline-flex min-h-11 items-center text-small hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {contact.showInstagram && contact.instagramUrl ? (
              <li>
                <a
                  className="inline-flex min-h-11 items-center gap-2 text-small hover:underline focus-visible:outline-2 focus-visible:outline-surface"
                  href={contact.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  인스타그램 <span className="text-xs">(새 창)</span>
                </a>
              </li>
            ) : null}
          </ul>
        </nav>
        <div className="grid items-start gap-3 pt-5 sm:grid-cols-[auto_1fr] sm:gap-x-10">
          <Link
            className="inline-flex min-h-11 items-center text-2xl font-bold tracking-tight hover:underline focus-visible:outline-2 focus-visible:outline-surface"
            href="/"
          >
            {siteConfig.name}
          </Link>
          <div>
            <address className="text-safe-wrap text-small leading-7 not-italic text-primary-foreground/80">
              <p>{contact.address}</p>
              <p>
                대표 전화{" "}
                <a
                  className="inline-flex min-h-11 items-center font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-surface"
                  href={createTelephoneHref(contact.phone)}
                >
                  {contact.phone}
                </a>
              </p>
            </address>
            <p className="mt-2 text-xs text-primary-foreground/65">
              © {new Date().getFullYear()} {siteConfig.name}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
