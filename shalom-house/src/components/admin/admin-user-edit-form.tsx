"use client";
import { useState } from "react";
import { adminRoleLabels, adminUserStatuses, type AdminRole, type AdminUserStatus } from "@/features/admin-auth/admin-auth.types";

const responseMessage = "현재 서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const messages: Record<string, string> = {
  edit_conflict: "다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요.",
  self_role_status_change: "현재 로그인한 계정의 역할과 상태는 변경할 수 없습니다.",
  last_active_admin: "마지막 활성 시스템 관리자는 역할을 변경하거나 비활성화할 수 없습니다.",
  no_change: "변경된 계정 정보가 없습니다.",
  invalid_document: "기존 관리자 계정 정보가 손상되어 수정할 수 없습니다.",
  unavailable: "현재 계정 정보를 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.",
};
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function serverErrors(value: unknown) { return object(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {}; }
export function AdminUserEditForm(props: { userId: string; email: string; displayName: string; role: AdminRole; status: AdminUserStatus; expectedUpdatedAt: string; isCurrentUser: boolean }) {
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setFieldErrors({}); setFormMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/admin-users/${props.userId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedUpdatedAt: props.expectedUpdatedAt, user: { displayName: form.get("displayName"), role: props.isCurrentUser ? props.role : form.get("role"), status: props.isCurrentUser ? props.status : form.get("status") }, updateConfirmed: confirmed }) });
      const text = await response.text();
      let body: unknown;
      try { body = text ? JSON.parse(text) : null; } catch { setFormMessage(responseMessage); return; }
      if (!object(body)) { setFormMessage(responseMessage); return; }
      if (!response.ok) {
        const fields = serverErrors(body.fieldErrors); setFieldErrors(fields);
        setFormMessage(fields.form ?? (typeof body.error === "string" ? messages[body.error] : undefined) ?? messages.unavailable);
        return;
      }
      const expectedRedirect = `/admin/admin-users/${props.userId}?updated=1`;
      if (body.redirectTo !== expectedRedirect) { setFormMessage(responseMessage); return; }
      location.assign(expectedRedirect);
    } catch { setFormMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  const aria = (name: string) => fieldErrors[name] ? { "aria-invalid": true as const, "aria-describedby": `edit-${name}-error` } : {};
  const error = (name: string) => fieldErrors[name] && <p id={`edit-${name}-error`} role="alert">{fieldErrors[name]}</p>;
  return <form onSubmit={submit} aria-busy={busy} className="mt-6 space-y-5">
    <label className="block" htmlFor="edit-email">이메일</label><input id="edit-email" readOnly value={props.email} className="mt-2 min-h-11 w-full border p-2" />
    <label className="block" htmlFor="edit-display-name">표시 이름</label><input id="edit-display-name" name="displayName" defaultValue={props.displayName} required minLength={2} maxLength={50} onChange={() => setConfirmed(false)} {...aria("displayName")} className="mt-2 min-h-11 w-full border p-2" />{error("displayName")}
    <label className="block" htmlFor="edit-role">역할</label><select id="edit-role" name="role" defaultValue={props.role} disabled={props.isCurrentUser} onChange={() => setConfirmed(false)} {...aria("role")} className="mt-2 min-h-11 w-full border p-2">{Object.entries(adminRoleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error("role")}
    <label className="block" htmlFor="edit-status">상태</label><select id="edit-status" name="status" defaultValue={props.status} disabled={props.isCurrentUser} onChange={() => setConfirmed(false)} {...aria("status")} className="mt-2 min-h-11 w-full border p-2">{adminUserStatuses.map((value) => <option key={value}>{value}</option>)}</select>{error("status")}
    {props.isCurrentUser && <p>현재 로그인한 계정은 역할과 상태를 변경할 수 없습니다.</p>}<p>역할 또는 상태를 변경하면 이 계정의 모든 로그인 세션이 해제됩니다.</p>
    <label className="flex gap-2" htmlFor="edit-confirmed"><input id="edit-confirmed" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} {...aria("updateConfirmed")} />역할과 상태 변경이 접근 권한과 로그인 세션에 즉시 영향을 주는 것을 확인했습니다.</label>{error("updateConfirmed")}{error("expectedUpdatedAt")}
    {formMessage && <p id="edit-form-error" role="alert">{formMessage}</p>}<p aria-live="polite">{busy ? "저장 중입니다." : ""}</p><button type="submit" disabled={busy || !confirmed} className="min-h-11 bg-primary px-4 text-primary-foreground">저장</button>
  </form>;
}
