import RacketCompareClient from "@/app/rackets/compare/_components/RacketCompareClient";
import SiteContainer from "@/components/layout/SiteContainer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "라켓 비교",
};

export const dynamic = "force-dynamic";

export default function RacketComparePage() {
  return (
    <SiteContainer variant="wide" className="py-6">
      <RacketCompareClient />
    </SiteContainer>
  );
}
