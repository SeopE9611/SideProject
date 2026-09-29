import { AdminSemanticBadge } from "@/components/admin/AdminSemanticBadge";
import type { PortfolioDemoDataKind } from "@/types/portfolio-demo";

const CONTENT = {
  seed: { label: "샘플 데이터", title: "포트폴리오 데모에 미리 준비된 운영 예시", variant: "neutral" as const },
  current_interaction: { label: "내 체험 데이터", title: "현재 고객 데모에서 생성한 임시 데이터", variant: "info" as const },
  interaction: { label: "체험 데이터", title: "데모 체험 과정에서 생성된 임시 데이터", variant: "outline" as const },
};

export function PortfolioDemoDataBadge({ kind }: { kind?: PortfolioDemoDataKind | null }) {
  if (!kind) return null;
  const content = CONTENT[kind];
  return <AdminSemanticBadge variant={content.variant} title={content.title} aria-label={content.title}>{content.label}</AdminSemanticBadge>;
}
