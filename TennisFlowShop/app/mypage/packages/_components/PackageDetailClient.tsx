"use client";

import MypageDetailCard from "@/app/mypage/_components/MypageDetailCard";
import MypageDetailHero from "@/app/mypage/_components/MypageDetailHero";
import MypageInfoField from "@/app/mypage/_components/MypageInfoField";
import PackageDetailSkeleton from "@/app/mypage/packages/_components/PackageDetailSkeleton";
import { SemanticBadge as Badge } from "@/components/badges/SemanticBadge";
import AsyncState from "@/components/system/AsyncState";
import { Button } from "@/components/ui/button";
import { badgeStyleSpec } from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { ArrowLeft, CreditCard, History, Ticket } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

type PackageDetail = {
  id: string;
  packageTitle: string;
  orderedAt: string | null;
  paymentAmount: number | null;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
  issued: boolean;
  activationStatus: string;
  activationStatusLabel: string;
  usageStatus: string;
  usageStatusLabel: string;
  canStartStringingService: boolean;
  totalCount: number | null;
  usedCount: number | null;
  remainingCount: number | null;
  expiresAt: string | null;
  usages: Array<{ applicationId: string | null; usedAt: string | null; count: number; reverted: boolean }>;
};

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

export default function PackageDetailClient({ orderId }: { orderId: string }) {
  const { data, isLoading, error, mutate } = useSWR<{ item: PackageDetail }>(
    `/api/mypage/package-orders/${encodeURIComponent(orderId)}`,
    authenticatedSWRFetcher,
    { revalidateOnFocus: false },
  );

  if (isLoading) return <PackageDetailSkeleton />;
  if (error || !data?.item)
    return (
      <AsyncState
        kind="error"
        variant="card"
        resourceName="패키지권 상세 정보"
        onAction={() => mutate()}
      />
    );

  const item = data.item;
  const available = item.canStartStringingService;
  const hasCounts =
    available &&
    item.totalCount !== null &&
    item.totalCount > 0 &&
    item.usedCount !== null &&
    item.remainingCount !== null;
  const usedPercent = hasCounts
    ? Math.max(0, Math.min(100, (item.usedCount! / item.totalCount!) * 100))
    : null;
  const badgeSpec = badgeStyleSpec(
    available ? "success" : item.usageStatus === "paused" ? "warning" : item.usageStatus === "cancelled" ? "danger" : "neutral",
  );

  return (
    <div className="space-y-4 bp-sm:space-y-5">
      <MypageDetailHero
        variant="feature"
        eyebrow="패키지권 상세"
        title={item.packageTitle}
        description="결제와 이용 상태, 사용 내역을 한곳에서 확인하세요."
        icon={<Ticket className="h-5 w-5" aria-hidden="true" />}
        status={
          <Badge variant={badgeSpec.variant} className={badgeSpec.className}>
            {item.usageStatusLabel}
          </Badge>
        }
        statusTitle={item.activationStatusLabel}
        identifier={`주문번호 ${item.id}`}
        summary={
          <>
            <MypageInfoField label="사용" value={item.usedCount === null ? null : `${item.usedCount}회`} fallback="발급 후 확인" />
            <MypageInfoField label="잔여" value={item.remainingCount === null ? null : `${item.remainingCount}회`} fallback="발급 후 확인" />
            <MypageInfoField label="총 횟수" value={item.totalCount === null ? null : `${item.totalCount}회`} fallback="확인 중" />
          </>
        }
        nextActionTitle={available ? "교체서비스를 신청할 수 있습니다" : undefined}
        nextActionDescription={available ? "신청 시 보유 횟수에서 차감됩니다." : undefined}
        nextActionSlot={
          available ? (
            <Button asChild>
              <Link href="/services#service-start">교체서비스 시작</Link>
            </Button>
          ) : undefined
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/mypage?tab=passes">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              패키지권 목록으로
            </Link>
          </Button>
        }
      />

      {usedPercent !== null ? (
        <MypageDetailCard title="이용 현황" description="사용 가능한 패키지권의 진행률입니다.">
          <div className="flex items-center justify-between text-ui-body-sm">
            <span className="text-muted-foreground">사용 진행률</span>
            <strong className="tabular-nums text-foreground">{Math.round(usedPercent)}%</strong>
          </div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="패키지권 사용 진행률"
            aria-valuemin={0}
            aria-valuemax={item.totalCount!}
            aria-valuenow={item.usedCount!}
          >
            <div className="h-full rounded-full bg-brand-highlight" style={{ width: `${usedPercent}%` }} />
          </div>
        </MypageDetailCard>
      ) : null}

      <div className="grid gap-4 bp-lg:grid-cols-2">
        <MypageDetailCard title="결제 정보" icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}>
          <div className="grid grid-cols-2 gap-4">
            <MypageInfoField label="결제 금액" value={item.paymentAmount === null ? null : `${item.paymentAmount.toLocaleString()}원`} fallback="확인 중" />
            <MypageInfoField label="결제수단" value={item.paymentMethodLabel} fallback="확인 중" />
            <MypageInfoField label="결제상태" value={item.paymentStatusLabel} />
            <MypageInfoField label="주문일" value={formatDate(item.orderedAt)} fallback="확인 중" />
          </div>
        </MypageDetailCard>
        <MypageDetailCard title="이용권 정보" icon={<Ticket className="h-4 w-4" aria-hidden="true" />}>
          <div className="grid grid-cols-2 gap-4">
            <MypageInfoField label="발급 상태" value={item.issued ? "발급 완료" : "미발급"} />
            <MypageInfoField label="활성화 상태" value={item.activationStatusLabel} />
            <MypageInfoField label="이용 상태" value={item.usageStatusLabel} />
            <MypageInfoField label="만료일" value={formatDate(item.expiresAt)} fallback={item.issued ? "만료일 없음" : "발급 후 확인"} />
          </div>
        </MypageDetailCard>
      </div>

      <MypageDetailCard title="이용 내역" icon={<History className="h-4 w-4" aria-hidden="true" />}>
        {item.usages.length ? (
          <ul className="divide-y divide-border/60">
            {item.usages.map((usage, index) => (
              <li key={`${usage.applicationId ?? "usage"}-${index}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-ui-body-sm font-ui-medium text-foreground">{usage.reverted ? "이용 횟수 복원" : `${usage.count}회 사용`}</p>
                  <p className="mt-0.5 text-ui-label text-muted-foreground">{formatDate(usage.usedAt) ?? "일시 확인 중"}</p>
                </div>
                {usage.applicationId ? <span className="truncate text-ui-label text-muted-foreground">신청 {usage.applicationId}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ui-body-sm text-muted-foreground">아직 이용 내역이 없습니다.</p>
        )}
      </MypageDetailCard>
    </div>
  );
}
