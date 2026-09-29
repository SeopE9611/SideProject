"use client";

import Link from "next/link";
import { Copy, ExternalLink, Link2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { Button } from "@/components/ui/button";
import { shortenId } from "@/lib/shorten";
import { showSuccessToast } from "@/lib/toast";
import { badgeBase, badgeSizeSm, badgeToneVariant } from "@/lib/badge-style";
import {
  opsKindBadgeTone,
  opsKindLabel,
  type OpsBadgeTone,
  type OpsKind,
} from "@/lib/admin-ops-taxonomy";
import { mypageDetailLayout } from "@/app/mypage/_components/mypage-detail-style";

function opsBadgeVariant(tone: OpsBadgeTone) {
  return badgeToneVariant(tone);
}

/**
 * “연결 문서” 공용 카드 (관리자 상세 화면용)
 *
 * 목표:
 * - 주문 ↔ 신청서 ↔ 대여가 서로 연결되는 구조에서,
 *   운영자가 “지금 보고 있는 문서가 무엇과 연결돼 있는지”를 같은 규칙/같은 UI로 즉시 파악.
 *
 * 주의:
 * - 이 컴포넌트는 “표시 전용”이다. (연결 판정/정산 로직/가드 로직을 여기로 끌어오지 않는다)
 * - 다음 단계에서 각 상세 화면에서 이미 확보한 id/href만 넘겨서 사용한다.
 */

export type LinkedDocKind = OpsKind;

export type LinkedDocItem = {
  kind: LinkedDocKind;
  id: string;
  href: string;
  /**
   * (옵션) 행에 추가로 보여줄 짧은 요약
   * 예: “교체서비스 신청서”, “대여 주문서”, “연결된 주문” 등
   */
  subtitle?: string;
};

type Props = {
  /**
   * 카드 제목 (기본: “연결된 문서”)
   * - 상세 화면마다 문맥에 맞게 바꿀 수 있게 열어둠
   */
  title?: string;
  /**
   * 연결 문서 목록
   * - order / rental / stringing_application
   * - id/href는 상위(상세 화면)에서 확정된 값만 전달
   */
  docs: LinkedDocItem[];
  /**
   * (옵션) 카드 상단 설명
   */
  description?: string;
  className?: string;
  variant?: "admin" | "transaction";
};

const KIND_PRIORITY: Record<LinkedDocKind, number> = {
  order: 0,
  rental: 1,
  stringing_application: 2,
  package_purchase: 3,
};

function getDocLabel(kind: LinkedDocKind) {
  switch (kind) {
    case "order":
      return { idLabel: "주문번호", ctaLabel: "주문 상세 보기" };
    case "rental":
      return { idLabel: "대여번호", ctaLabel: "대여 상세 보기" };
    case "stringing_application":
      return { idLabel: "신청번호", ctaLabel: "신청서 상세 보기" };
    case "package_purchase":
      return { idLabel: "패키지 주문번호", ctaLabel: "패키지 상세 보기" };
    default:
      return { idLabel: "문서번호", ctaLabel: "상세 보기" };
  }
}

function sortDocs(docs: LinkedDocItem[]) {
  // 운영 관점에서 “정산/기준 문서”를 먼저 보게: 주문 → 대여 → 신청서
  return [...docs].sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    showSuccessToast("ID가 복사되었습니다.");
  } catch {
    // clipboard 권한/환경 이슈 방어: 조용히 실패(추가 토스트는 과도할 수 있음)
  }
}

export default function LinkedDocsCard({
  title = "연결된 문서",
  docs,
  description,
  className,
  variant = "admin",
}: Props) {
  const list = sortDocs((docs ?? []).filter((d) => d?.id && d?.href));
  const isTransaction = variant === "transaction";

  return (
    <Card
      className={cn(
        isTransaction
          ? cn("overflow-hidden rounded-2xl border", mypageDetailLayout.transactionCard)
          : cn(adminSurface.detailCard, "overflow-hidden"),
        className,
      )}
    >
      <CardHeader
        className={cn(
          isTransaction
            ? cn("p-4 bp-sm:p-5", mypageDetailLayout.transactionCardHeader)
            : adminSurface.detailHeader,
        )}
      >
        <CardTitle
          className={cn(
            "flex items-center gap-2",
            isTransaction
              ? "text-ui-card-title font-medium text-foreground"
              : adminTypography.sectionTitle,
          )}
        >
          <Link2 className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription className={adminTypography.metaMuted}>
          {description ??
            (list.length > 0 ? `연결 문서 ${list.length}개` : "연결된 문서가 없습니다.")}
        </CardDescription>
      </CardHeader>

      <CardContent className={isTransaction ? "p-4 bp-sm:p-5" : adminSurface.detailContent}>
        {list.length === 0 ? (
          <div className={cn("rounded-lg border bg-muted/30 p-4", adminTypography.body)}>
            현재 문서는 단독 건으로 보입니다. (주문/대여/신청서 연결 없음)
          </div>
        ) : (
          <div className={isTransaction ? undefined : "space-y-2"}>
            {list.map((d) => {
              const kindLabel = opsKindLabel(d.kind);
              const badgeVariant = opsBadgeVariant(opsKindBadgeTone(d.kind));
              const short = shortenId(String(d.id));
              const { idLabel, ctaLabel } = getDocLabel(d.kind);

              return (
                <div
                  key={`${d.kind}:${d.id}`}
                  className={cn(
                    isTransaction
                      ? "flex flex-col gap-3 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between"
                      : "flex flex-row items-center justify-between gap-2",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant} className={`${badgeBase} ${badgeSizeSm}`}>
                        {kindLabel}
                      </Badge>
                      <p className={adminTypography.metaMuted}>
                        {idLabel} : ({short})
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      isTransaction
                        ? "grid grid-cols-1 gap-2 bp-sm:flex bp-sm:shrink-0"
                        : "flex shrink-0 items-center gap-2",
                    )}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(String(d.id))}
                      className={cn("gap-1", isTransaction && "min-h-11 w-full bp-sm:w-auto")}
                      aria-label="ID 복사"
                    >
                      <Copy className="h-4 w-4" />
                      복사
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className={isTransaction ? "min-h-11 w-full bp-sm:w-auto" : undefined}
                    >
                      <Link href={d.href} aria-label="상세 보기">
                        <ExternalLink className="h-4 w-4" />
                        {ctaLabel}
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
