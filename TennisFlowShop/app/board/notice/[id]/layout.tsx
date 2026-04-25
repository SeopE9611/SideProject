import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공지사항 상세",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
