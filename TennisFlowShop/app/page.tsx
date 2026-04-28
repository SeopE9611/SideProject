import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

export const metadata: Metadata = {
  title: "홈 | 도깨비테니스",
};

export default function Page() {
  return <HomePageClient />;
}
