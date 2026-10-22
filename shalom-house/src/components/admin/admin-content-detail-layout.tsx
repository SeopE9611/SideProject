import type { ReactNode } from "react";
import styles from "./admin-content-detail-layout.module.css";

/** Keep the content flow independent of the status panel's height. */
export function AdminContentDetailLayout({
  header,
  summary,
  navigation,
  children,
}: {
  header: ReactNode;
  summary: ReactNode;
  navigation: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`admin-detail-layout text-safe-wrap ${styles.layout}`}>
      {header}
      <aside className={styles.sidebar} aria-label="콘텐츠 상태">
        {summary}
      </aside>
      <div className={styles.content}>
        {navigation}
        {children}
      </div>
    </div>
  );
}
