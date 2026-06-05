import type { Metadata } from "next";
import { getHomePreviewData } from "@/lib/home/home-preview";
import HomePageClient from "./HomePageClient";

export const metadata: Metadata = {
  title: "홈 | 도깨비테니스",
};

export default async function Page() {
  const initialHomeData = await getHomePreviewData();

  return <HomePageClient initialHomeData={initialHomeData} />;
}
