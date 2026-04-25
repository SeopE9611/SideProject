import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

export const metadata: Metadata = {
  title: "홈",
};

export default function Page() {
  return <HomePageClient />;
}
