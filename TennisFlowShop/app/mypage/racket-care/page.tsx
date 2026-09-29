import RacketCareClient from "@/app/mypage/racket-care/_components/RacketCareClient";
import SiteContainer from "@/components/layout/SiteContainer";
import { getCurrentUser } from "@/lib/hooks/get-current-user";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "내 라켓 케어" };

export default async function RacketCarePage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/mypage/racket-care")}`);
  return (
    <SiteContainer variant="wide" className="py-6 bp-sm:py-8">
      <RacketCareClient />
    </SiteContainer>
  );
}
