import Image from "next/image";
import Link from "next/link";
import { SiteNavigation } from "@/components/layout/site-navigation";
import { siteConfig } from "@/config/site";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import styles from "./public-header.module.css";

export async function SiteHeader() {
  const contact = await getPublicContactInformation();
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link aria-label={siteConfig.name + " 홈"} className={styles.logo} href="/">
          <Image src="/brand/logo-header.svg" width={1400} height={360} alt="" />
        </Link>
        <div className={styles.actions}>
          <SiteNavigation phone={contact.phone} />
          <Link className={styles.contact} href="/support/contact">
            문의·방문 <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
