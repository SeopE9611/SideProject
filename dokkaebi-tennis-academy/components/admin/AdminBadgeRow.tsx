import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { badgeBase, badgeSizeSm } from '@/lib/badge-style';

/**
 * 테이블에서 “뱃지 과다 노출”로 난잡해지는 문제를 막기 위한 공용 렌더러.
 * - 핵심 뱃지만 inline 노출하고, 나머지는 +N으로 접어서(hover title) 관리자 인지부하를 줄인다.
 * - 비즈니스 로직(상태/flow 계산)은 각 페이지가 그대로 유지하고, “표시”만 이 컴포넌트가 담당한다.
 */
export type BadgeItem = {
  label: string; // 뱃지에 표시할 텍스트
  className?: string; // 색상/톤 클래스
  title?: string; // hover 시 의미를 보충(접힌 뱃지 목록에도 같이 사용)
};

type Props = {
  items: BadgeItem[]; // 렌더링할 뱃지 목록
  maxVisible?: number; // 테이블에서 기본으로 보여줄 뱃지 개수
  className?: string; // wrapper 추가 클래스
};

export function AdminBadgeRow({ items, maxVisible = 3, className }: Props) {
  // 안전장치: 목록이 비어있으면 렌더링하지 않음(테이블 깨짐 방지)
  if (!items || items.length === 0) return null;

  // 앞쪽 maxVisible개는 그대로 노출
  const visible = items.slice(0, maxVisible);
  // 나머지는 +N으로 접어서 노출(난잡도 감소)
  const hidden = items.slice(maxVisible);

  // 접힌 뱃지들을 title에 요약해두면, Tooltip 없이도 hover로 의미 확인 가능(구조 단순/안정)
  const hiddenTitle = hidden.map((b) => (b.title ? `${b.label} — ${b.title}` : b.label)).join('\n');

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visible.map((b, idx) => (
        <Badge
          key={`${b.label}-${idx}`}
          title={b.title} // 각 뱃지의 의미를 hover로 보충
          className={cn(badgeBase, badgeSizeSm, 'whitespace-nowrap', b.className)}
        >
          {b.label}
        </Badge>
      ))}

      {hidden.length > 0 && (
        <Badge
          // +N에 마우스를 올리면, 접힌 뱃지들의 목록을 확인 가능
          title={hiddenTitle}
          className={cn(
            badgeBase,
            badgeSizeSm,
            'whitespace-nowrap',
            // overflow 표시는 중립 톤(너무 튀지 않게)
            'bg-accent text-foreground dark:bg-background/40 dark:text-foreground',
          )}
        >
          +{hidden.length}
        </Badge>
      )}
    </div>
  );
}
