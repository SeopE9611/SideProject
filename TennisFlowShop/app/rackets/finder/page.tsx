import RacketFinderClient from "@/app/rackets/finder/_components/RacketFinderClient";
import SiteContainer from "@/components/layout/SiteContainer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "라켓 찾기",
};

export const dynamic = "force-dynamic";

export default function RacketFinderPage() {
  return (
    <SiteContainer variant="wide" className="py-6">
      <RacketFinderClient />
    </SiteContainer>
  );
}
