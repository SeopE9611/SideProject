import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "패키지 관리",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
