import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { targetVerified: boolean; formStarted: boolean; isSubmitting: boolean; isLoading: boolean };

export default function ReviewWriteProgress({ targetVerified, formStarted, isSubmitting, isLoading }: Props) {
  const current = isLoading || !targetVerified ? 1 : 2;
  const steps = [
    { id: 1, label: "경험 확인", complete: targetVerified, active: current === 1, pending: isLoading },
    { id: 2, label: "후기 작성", complete: false, active: current === 2, pending: isSubmitting },
    { id: 3, label: "등록 완료", complete: false, active: false, pending: false },
  ];
  return (
    <ol className="grid grid-cols-3 gap-2 rounded-panel border border-border bg-card p-3 shadow-soft" aria-label="후기 작성 진행 단계">
      {steps.map((step) => {
        const statusLabel = step.complete ? "완료" : step.pending ? "처리 중" : step.id === 2 && step.active ? formStarted ? "작성 중" : "작성 준비" : step.active ? "현재 단계" : "예정";
        return (
        <li key={step.id} aria-current={step.active ? "step" : undefined} className={cn("rounded-control border px-3 py-2 text-ui-label", step.active ? "border-foreground bg-background text-foreground" : "border-border bg-muted/30 text-muted-foreground", step.complete && "border-success/45 bg-success/10 text-success")}>
          <span className="flex items-center gap-1.5 font-semibold">
            {step.pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : step.complete ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
            {step.id}. {step.label}
          </span>
          <span className="mt-0.5 block text-ui-micro">{statusLabel}</span>
        </li>
      );
      })}
    </ol>
  );
}
