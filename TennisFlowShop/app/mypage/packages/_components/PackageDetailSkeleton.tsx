import MypageDetailCard from "@/app/mypage/_components/MypageDetailCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function PackageDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid gap-4 bp-lg:grid-cols-2">
        {["결제 정보", "이용권 정보"].map((title) => (
          <MypageDetailCard key={title} title={title}>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          </MypageDetailCard>
        ))}
      </div>
      <span className="sr-only">패키지권 상세 정보를 불러오는 중입니다.</span>
    </div>
  );
}
