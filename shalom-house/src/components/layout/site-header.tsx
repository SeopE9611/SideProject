import Image from "next/image";
import Link from "next/link";
import { SiteNavigation } from "@/components/layout/site-navigation";
import { siteConfig } from "@/config/site";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";

export async function SiteHeader() {
  const contact = await getPublicContactInformation();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link aria-label={siteConfig.name + " 홈"} className="site-wordmark" href="/">
          <span className="site-brand">
            <Image src="/brand/logo-header.svg" width={1400} height={360} alt="" className="site-logo" />
            <small>장애인거주시설</small>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-4 xl:gap-8">
          <SiteNavigation phone={contact.phone} />
          <Link className="action-link hidden lg:inline-flex" href="/support/donation">
            후원 안내 <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
