import { Button } from "@/components/ui/button";

type Props = { locked: boolean; invalidForm: boolean; isUploading: boolean; isSubmitting: boolean };

export default function ReviewWriteMobileBar({ locked, invalidForm, isUploading, isSubmitting }: Props) {
  const disabled = locked || invalidForm || isUploading;
  const message = isSubmitting ? "후기를 등록하고 있어요" : isUploading ? "사진 업로드 중" : invalidForm ? "별점과 후기 내용을 입력해 주세요" : "등록 준비 완료";
  return <div data-bottom-sticky="1" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 bp-lg:hidden"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><p className="min-w-0 text-ui-body-sm font-semibold text-foreground" aria-live="polite">{message}</p><Button type="submit" form="review-write-form" variant="highlight" disabled={disabled} aria-disabled={disabled} className="h-11 shrink-0 rounded-control px-4 font-semibold">{isSubmitting ? "등록 중" : isUploading ? "처리 중" : "후기 등록"}</Button></div></div>;
}
