import Link from "next/link";

import { siteConfig } from "@/config/site";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export async function SiteFooter() {
  const contact = await getPublicContactInformation();
  return (
    <footer className="border-t border-foreground bg-foreground text-on-dark">
      <div className="mx-auto w-full max-w-site px-page py-12 sm:px-page-wide sm:py-14">
        <div className="grid gap-8 border-b border-white/20 pb-8 md:grid-cols-[1.1fr_0.8fr_0.9fr] md:gap-10">
          <section aria-labelledby="footer-about-heading">
            <h2 id="footer-about-heading">
              <Link
                className="text-safe-wrap inline-flex min-h-11 items-center text-title font-bold text-white underline decoration-white/60 underline-offset-4 transition-colors hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                href="/"
              >
                {siteConfig.name}
              </Link>
            </h2>
            <p className="text-safe-wrap mt-4 max-w-md text-body text-white/75">
              지체 및 지적 장애인이 함께 생활하는 장애인거주시설입니다.
            </p>
          </section>

          <nav aria-label="푸터 이용 안내">
            <h2 className="text-base font-bold text-white">이용 안내</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-6">
              {siteConfig.footerNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    className="text-safe-wrap inline-flex min-h-11 items-center text-base font-semibold text-white/75 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {contact.showInstagram && contact.instagramUrl ? (
                <li>
                  <a
                    className="text-safe-wrap inline-flex min-h-11 items-center text-base font-semibold text-white/75 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    href={contact.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    인스타그램
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>

          <section aria-labelledby="footer-contact-heading">
            <h2 id="footer-contact-heading" className="text-base font-bold text-white">
              연락처
            </h2>
            <address className="mt-4 space-y-2 text-base not-italic text-white/75">
              <p>
                <span className="block font-bold text-white">주소</span>
                <Link
                  className="text-safe-wrap mt-1 inline-flex min-h-10 items-center underline decoration-white/50 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  href="/about/directions"
                >
                  {contact.address}
                </Link>
              </p>
              <p>
                <span className="block font-bold text-white">대표 전화</span>
                <a
                  className="text-safe-wrap mt-1 inline-flex min-h-10 items-center underline decoration-white/50 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  href={createTelephoneHref(contact.phone)}
                >
                  {contact.phone}
                </a>
              </p>
            </address>
          </section>
        </div>

        <div className="flex flex-col gap-2 pt-5 text-small text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>공식 홈페이지에 공개 승인된 정보만 안내합니다.</p>
          <p className="text-safe-wrap">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
