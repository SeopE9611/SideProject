'use client';

import { TableRow, TableCell } from '@/components/ui/table';

export default function ProductsTableSkeleton({ rows = 10 }: { rows?: number }) {
  // 셀 8개(스트링명, 브랜드, 게이지, 재질, 가격, 재고, 상태, 관리)
  const COLS = 8;
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="animate-pulse">
          {Array.from({ length: COLS }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 w-[70%] rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
