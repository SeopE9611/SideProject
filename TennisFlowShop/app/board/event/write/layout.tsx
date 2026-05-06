import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이벤트 작성",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
