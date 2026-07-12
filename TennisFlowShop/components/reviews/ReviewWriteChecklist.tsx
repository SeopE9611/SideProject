import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

type Props = { targetReady: boolean; ratingReady: boolean; contentReady: boolean; photosCount: number; isUploading: boolean; className?: string };

export default function ReviewWriteChecklist({ targetReady, ratingReady, contentReady, photosCount, isUploading, className }: Props) {
  const requiredReady = targetReady && ratingReady && contentReady;
  const items = [
    { label: "후기 대상 확인", ready: targetReady, detail: targetReady ? "확인 완료" : "대상을 확인하고 있어요" },
    { label: "별점 선택", ready: ratingReady, detail: ratingReady ? "선택 완료" : "1점 이상 선택해 주세요" },
    { label: "후기 내용 5자 이상", ready: contentReady, detail: contentReady ? "입력 완료" : "경험을 5자 이상 적어주세요" },
  ];
  return (
    <Card variant="feature" className={className}>
      <CardContent className="space-y-4 p-4 bp-sm:p-5">
        <div><h2 className="text-ui-body-sm font-semibold text-foreground">등록 준비 체크리스트</h2><p className="mt-1 text-ui-label text-muted-foreground">{requiredReady && !isUploading ? "후기 등록 준비가 완료됐어요" : "별점과 후기 내용을 확인해 주세요"}</p></div>
        <ul className="space-y-2 text-ui-body-sm">
          {items.map((item) => <li key={item.label} className="flex gap-2"><CheckCircle2 className={item.ready ? "mt-0.5 h-4 w-4 shrink-0 text-success" : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"} /><span><span className="font-medium text-foreground">{item.label}</span><span className="block text-ui-label text-muted-foreground">{item.detail}</span></span></li>)}
          <li className="flex gap-2" aria-live="polite">{isUploading ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-warning" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}<span><span className="font-medium text-foreground">사진 첨부 — 선택 사항</span><span className="block text-ui-label text-muted-foreground">{isUploading ? "사진 업로드 처리 중" : photosCount > 0 ? `${photosCount}장 첨부 완료` : "사진 없이도 등록할 수 있어요"}</span></span></li>
        </ul>
      </CardContent>
    </Card>
  );
}
