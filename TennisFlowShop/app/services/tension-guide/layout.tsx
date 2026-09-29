import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "텐션 가이드",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
