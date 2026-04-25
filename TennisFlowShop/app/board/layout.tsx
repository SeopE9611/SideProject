import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "게시판",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
