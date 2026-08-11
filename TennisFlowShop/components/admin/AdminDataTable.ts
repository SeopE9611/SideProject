import { adminSurface, adminTypography } from "@/components/admin/admin-typography";

/** 관리자 목록 테이블의 최종 밀도·정렬 규격입니다. ui/Table의 범용 기본값보다 우선합니다. */
export const adminDataTable = {
  head: `px-4 py-3 text-left align-middle whitespace-nowrap ${adminTypography.tableHeader}`,
  headCenter: `px-4 py-3 text-center align-middle whitespace-nowrap ${adminTypography.tableHeader}`,
  headRight: `px-4 py-3 text-right align-middle whitespace-nowrap ${adminTypography.tableHeader}`,
  cell: adminSurface.tableCell,
  cellCompact: "px-4 py-2.5 align-middle text-ui-body-sm",
  cellTop: "px-4 py-3 align-top text-ui-body-sm",
  cellLeft: "px-4 py-3 text-left align-middle text-ui-body-sm",
  cellCenter: "px-4 py-3 text-center align-middle text-ui-body-sm",
  cellRight: "px-4 py-3 text-right align-middle text-ui-body-sm",
  cellTopLeft: "px-4 py-3 text-left align-top text-ui-body-sm",
  numericCell: `px-4 py-3 text-right align-middle ${adminTypography.numeric}`,
  moneyCell: `px-4 py-3 text-right align-middle whitespace-nowrap ${adminTypography.money}`,
  dateCell: `px-4 py-3 text-right align-middle whitespace-nowrap ${adminTypography.date}`,
  // 기존 사용처 호환 별칭. 신규 코드는 numericCell을 사용합니다.
  cellNumber: `px-4 py-3 text-right align-middle ${adminTypography.numeric}`,
  primaryText: adminTypography.tablePrimary,
  secondaryText: adminTypography.tableSecondary,
  actionHead:
    `w-[132px] px-4 py-3 text-right align-middle whitespace-nowrap ${adminTypography.tableHeader}`,
  actionCell: "w-[132px] px-4 py-3 text-right align-middle text-ui-body-sm",
  stickyActionHead:
    `sticky right-0 z-20 w-[132px] border-l border-border bg-muted/30 px-4 py-3 text-right align-middle whitespace-nowrap ${adminTypography.tableHeader}`,
  stickyActionCell:
    "sticky right-0 z-10 w-[132px] border-l border-border bg-card px-4 py-3 text-right align-middle text-ui-body-sm group-hover:bg-muted/25 group-data-[state=selected]:bg-muted/50",
  row: adminSurface.tableRow,
  compactRow: "group border-b border-border transition-colors hover:bg-muted/25 data-[state=selected]:bg-muted/50",
} as const;
