import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "샬롬의 집",
  description: "서울 강서구 장애인거주시설 샬롬의 집 공식 홈페이지",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
