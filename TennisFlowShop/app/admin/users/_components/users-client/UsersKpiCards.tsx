import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type UsersKpiStatus = "loading" | "error" | "ready";

type UsersKpiValues = {
  total: number;
  active: number;
  suspended: number;
  deleted: number;
  admins: number;
};

interface UsersKpiCardsProps {
  status: UsersKpiStatus;
  values: UsersKpiValues;
  activeKey?: keyof UsersKpiValues | null;
  onSelect?: (key: keyof UsersKpiValues) => void;
}

const KPI_ITEMS: Array<{
  key: keyof UsersKpiValues;
  label: string;
  valueClassName: string;
}> = [
  { key: "total", label: "전체 회원", valueClassName: "text-foreground" },
  { key: "active", label: "활성 회원", valueClassName: "text-primary" },
  { key: "suspended", label: "비활성 회원", valueClassName: "text-primary" },
  { key: "deleted", label: "삭제됨(탈퇴)", valueClassName: "text-destructive" },
  { key: "admins", label: "관리자 수", valueClassName: "text-foreground" },
];

export function UsersKpiCards({ status, values, activeKey, onSelect }: UsersKpiCardsProps) {
  return (
    <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-5" aria-live="polite">
      {KPI_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect?.(item.key)}
          disabled={!onSelect || status !== "ready"}
          className={cn("rounded-xl border-0 bg-card/80 p-5 text-left shadow-lg backdrop-blur-sm transition-colors", onSelect && status === "ready" && "hover:bg-muted/60", activeKey === item.key && "ring-2 ring-primary/30")}
        >
          <p className="text-sm text-muted-foreground">{item.label}</p>

          {status === "loading" ? (
            <Skeleton className="mt-2 h-10 w-16" role="status" aria-label={`${item.label} 로딩`} />
          ) : (
            <p className={`mt-1 text-3xl font-bold ${item.valueClassName}`}>{status === "error" ? "-" : values[item.key].toLocaleString("ko-KR")}</p>
          )}
        </button>
      ))}
    </div>
  );
}

export type { UsersKpiStatus, UsersKpiValues };
