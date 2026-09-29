import RacketComparePageSkeleton from "@/app/rackets/compare/_components/RacketComparePageSkeleton";
import SiteContainer from "@/components/layout/SiteContainer";

export default function RacketCompareLoading() {
  return (
    <SiteContainer variant="wide" className="py-6">
      <RacketComparePageSkeleton />
    </SiteContainer>
  );
}
