type ApplicationSummary = { id: string; status: string; cancelRequestStatus?: string | null };
export type OrderStringingDisplay = {
  kind: "none" | "pending" | "active" | "canceled" | "error";
  applicationId: string | null;
  status: string | null;
  label: string;
  description: string;
};

// 표시 전용이다. 활성 신청서 선택이나 진행 단계 변경 정책에는 사용하지 않는다.
export function resolveOrderStringingDisplay(input: {
  applications: readonly ApplicationSummary[];
  activeApplicationId?: string | null;
  storedApplicationId?: string | null;
}): OrderStringingDisplay {
  const validId = (id: string) => /^[a-f\d]{24}$/i.test(id);
  const active = input.activeApplicationId
    ? input.applications.find((app) => app.id === input.activeApplicationId)
    : null;
  const app = active ?? input.applications[0] ?? null;
  const error = (id: string | null, status: string | null): OrderStringingDisplay => ({ kind: "error", applicationId: id && validId(id) ? id : null, status, label: "연결 정보 확인 필요", description: "저장된 연결 정보와 신청서 상태를 확인해주세요. 신청서가 없는 상태로 판단하지 않습니다." });
  if (!app) return input.storedApplicationId || input.activeApplicationId
    ? error(input.storedApplicationId ?? input.activeApplicationId ?? null, null)
    : { kind: "none", applicationId: null, status: null, label: "신청서 생성 이력 없음", description: "이 주문과 연결된 교체서비스 신청서가 없습니다." };
  if (!validId(app.id) || !app.status) return error(app.id, app.status || null);
  if (input.activeApplicationId && !active) return error(input.activeApplicationId, null);
  if (!active && input.storedApplicationId && !input.applications.some((item) => item.id === input.storedApplicationId)) return error(input.storedApplicationId, null);
  if (app.status === "취소") return { kind: "canceled", applicationId: app.id, status: app.status, label: "연결 신청서 취소됨", description: "기존 교체서비스 신청서가 취소되었습니다. 연결 문서에서 취소 상태와 작업 이력을 확인할 수 있습니다." };
  if (["approved", "승인"].includes(String(app.cancelRequestStatus ?? "").toLowerCase())) return error(app.id, app.status);
  if (["draft", "검토 중", "접수완료"].includes(app.status)) return { kind: "pending", applicationId: app.id, status: app.status, label: app.status === "draft" ? "작성 중 · 접수 대기" : app.status === "접수완료" ? "신청서 접수완료" : "신청서 접수 대기", description: app.status === "draft" ? "작성 중인 신청서가 있습니다. 아직 접수가 완료되지 않았습니다." : "연결 신청서가 존재합니다. 신청 내용과 접수 상태를 확인해주세요." };
  return { kind: "active", applicationId: app.id, status: app.status, label: `교체 작업 ${app.status}`, description: "주문에 연결된 교체 작업의 진행 상태와 접수 정보를 확인합니다." };
}
