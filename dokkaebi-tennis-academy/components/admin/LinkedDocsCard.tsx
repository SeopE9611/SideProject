'use client';

import Link from 'next/link';
import { Copy, ExternalLink, Link2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { shortenId } from '@/lib/shorten';
import { showSuccessToast } from '@/lib/toast';
import { badgeBase, badgeSizeSm } from '@/lib/badge-style';
import { opsKindBadgeTone, opsKindLabel, type OpsBadgeTone, type OpsKind } from '@/lib/admin-ops-taxonomy';

const OPS_BADGE_CLASS: Record<OpsBadgeTone, string> = {
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30',
  muted: 'bg-muted text-muted-foreground',
  info: 'bg-primary/10 text-primary border-primary/20',
};

function opsBadgeToneClass(tone: OpsBadgeTone) {
  return OPS_BADGE_CLASS[tone] ?? OPS_BADGE_CLASS.muted;
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
};

const KIND_PRIORITY: Record<LinkedDocKind, number> = {
  order: 0,
  rental: 1,
  stringing_application: 2,
};

function sortDocs(docs: LinkedDocItem[]) {
  // 운영 관점에서 “정산/기준 문서”를 먼저 보게: 주문 → 대여 → 신청서
  return [...docs].sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    showSuccessToast('ID가 복사되었습니다.');
  } catch {
    // clipboard 권한/환경 이슈 방어: 조용히 실패(추가 토스트는 과도할 수 있음)
  }
}

export default function LinkedDocsCard({ title = '연결된 문서', docs, description, className }: Props) {
  const list = sortDocs((docs ?? []).filter((d) => d?.id && d?.href));

  return (
    <Card variant="elevatedGradient" className="mb-8">
      <CardHeader variant="sectionGradient" className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description ?? (list.length > 0 ? `연결 문서 ${list.length}개` : '연결된 문서가 없습니다.')}</CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {list.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">현재 문서는 단독 건으로 보입니다. (주문/대여/신청서 연결 없음)</div>
        ) : (
          <div className="space-y-2">
            {list.map((d) => {
              const kindLabel = opsKindLabel(d.kind);
              const badgeClass = opsBadgeToneClass(opsKindBadgeTone(d.kind));
              const short = shortenId(String(d.id));

              return (
                <div key={`${d.kind}:${d.id}`} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={`${badgeBase} ${badgeSizeSm} ${badgeClass}`}>{kindLabel}</Badge>
                      <p className="text-sm text-muted-foreground">주문번호 : ({short})</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(String(d.id))} className="gap-1" aria-label="ID 복사">
                      <Copy className="h-4 w-4" />
                      복사
                    </Button>
                    <Link href={d.href} aria-label="상세 보기">
                      <Button type="button" variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                        주문 상세 보기
                      </Button>
                    </Link>
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
