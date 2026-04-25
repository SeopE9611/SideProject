import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Q&A 작성",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
