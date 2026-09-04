"use client";
import { useState } from "react";
const responseMessage = "현재 서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const messages: Record<string, string> = {
  edit_conflict: "다른 관리자가 먼저 계정 정보를 변경했습니다. 새로고침 후 다시 확인해 주세요.",
  no_active_sessions: "해제할 활성 로그인 세션이 없습니다.",
  invalid_document: "기존 관리자 계정 정보가 손상되어 세션을 해제할 수 없습니다.",
  unavailable: "현재 로그인 세션을 해제할 수 없습니다. 잠시 후 다시 시도해 주세요.",
};
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function serverErrors(value: unknown) {
  return object(value)
    ? Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      )
    : {};
}
export function AdminUserSessionForm(props: {
  userId: string;
  expectedUpdatedAt: string;
  activeSessionCount: number;
  isCurrentUser: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFieldErrors({});
    setFormMessage("");
    try {
      const response = await fetch(`/api/admin/admin-users/${props.userId}/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: props.expectedUpdatedAt, revokeConfirmed: confirmed }),
      });
      const text = await response.text();
      let body: unknown;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        setFormMessage(responseMessage);
        return;
      }
      if (!object(body)) {
        setFormMessage(responseMessage);
        return;
      }
      if (!response.ok) {
        const fields = serverErrors(body.fieldErrors);
        setFieldErrors(fields);
        setFormMessage(
          fields.form ?? (typeof body.error === "string" ? messages[body.error] : undefined) ?? messages.unavailable,
        );
        return;
      }
      const expected = props.isCurrentUser
        ? "/admin/login?sessionRevoked=1"
        : `/admin/admin-users/${props.userId}?sessionsRevoked=1`;
      if (body.redirectTo !== expected) {
        setFormMessage(responseMessage);
        return;
      }
      location.assign(expected);
    } catch {
      setFormMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  const aria = (name: string) =>
    fieldErrors[name] ? { "aria-invalid": true as const, "aria-describedby": `session-${name}-error` } : {};
  const error = (name: string) =>
    fieldErrors[name] && (
      <p id={`session-${name}-error`} role="alert">
        {fieldErrors[name]}
      </p>
    );
  return (
    <form onSubmit={submit} aria-busy={busy} className="mt-5 space-y-3">
      <p>이 계정의 모든 로그인 세션을 해제합니다.</p>
      {props.isCurrentUser && <p>현재 사용 중인 이 세션도 종료되며 로그인 화면으로 이동합니다.</p>}
      <label className="flex gap-2" htmlFor="session-confirmed">
        <input
          id="session-confirmed"
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          {...aria("revokeConfirmed")}
        />
        이 계정의 모든 로그인 세션을 해제합니다.
      </label>
      {error("revokeConfirmed")}
      {error("expectedUpdatedAt")}
      {formMessage && (
        <p id="session-form-error" role="alert">
          {formMessage}
        </p>
      )}
      <p aria-live="polite">{busy ? "처리 중입니다." : ""}</p>
      <button type="submit" disabled={busy || props.activeSessionCount === 0} className="min-h-11 border px-4">
        전체 세션 해제
      </button>
    </form>
  );
}
