import { adminSurface } from "@/components/admin/admin-typography";

export const adminDataTable = {
  head: "px-4 py-3 text-left align-middle text-xs font-semibold text-foreground whitespace-nowrap",
  headCenter: "px-4 py-3 text-center align-middle text-xs font-semibold text-foreground whitespace-nowrap",
  headRight: "px-4 py-3 text-right align-middle text-xs font-semibold text-foreground whitespace-nowrap",
  cell: adminSurface.tableCell,
  cellCompact: "px-4 py-3 align-middle text-sm",
  cellTop: "px-4 py-3 align-top text-sm",
  cellLeft: "px-4 py-3 text-left align-middle text-sm",
  cellCenter: "px-4 py-3 text-center align-middle text-sm",
  cellRight: "px-4 py-3 text-right align-middle text-sm",
  cellTopLeft: "px-4 py-3 text-left align-top text-sm",
  moneyCell: "px-4 py-3 text-right align-middle text-sm tabular-nums",
  dateCell: "px-4 py-3 text-right align-middle text-sm tabular-nums",
  cellNumber: "px-4 py-3 text-right align-middle tabular-nums",
  actionHead: "w-[132px] px-4 py-3 text-right align-middle text-xs font-semibold text-foreground whitespace-nowrap",
  actionCell: "w-[132px] px-4 py-3 text-right align-middle",
  row: adminSurface.tableRow,
} as const;
