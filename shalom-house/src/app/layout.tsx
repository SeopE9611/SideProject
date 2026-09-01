import { createRootMetadata } from "@/features/seo/metadata";

import "./globals.css";

export const metadata = createRootMetadata();

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
