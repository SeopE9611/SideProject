'use client';

import { Badge } from '@/components/ui/badge';
import { applicationStatusColors } from '@/lib/badge-style';

interface Props {
  status: string;
}

export default function ApplicationStatusBadge({ status }: Props) {
  const colorClass = applicationStatusColors[status as keyof typeof applicationStatusColors] ?? applicationStatusColors.default;

  return <Badge className={colorClass}>{status}</Badge>;
}
