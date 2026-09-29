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
          <span>
            {siteConfig.name}
            <small>장애인거주시설</small>
          </span>
        </Link>
        <div className="flex items-center gap-4 xl:gap-8">
          <SiteNavigation phone={contact.phone} />
          <Link className="action-link hidden lg:inline-flex" href="/support/donation">
            후원 안내 <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
