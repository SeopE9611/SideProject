import { FullPageSpinner } from "@/components/system/PageLoading";

export default function Loading() {
   return <FullPageSpinner label="유저 목록 불러오는 중..." minHeightClassName="min-h-[60svh]" />;
}
