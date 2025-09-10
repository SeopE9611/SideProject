'use client';

import { Badge } from '@/components/ui/badge';
import { applicationStatusColors, badgeBase, badgeSizeSm } from '@/lib/badge-style';
import { cn } from '@/lib/utils';

interface Props {
  status: string;
}

export default function ApplicationStatusBadge({ status }: Props) {
  const colorClass = applicationStatusColors[status as keyof typeof applicationStatusColors] ?? applicationStatusColors.default;

  return <Badge className={cn(badgeBase, badgeSizeSm, colorClass)}>{status}</Badge>;
}
