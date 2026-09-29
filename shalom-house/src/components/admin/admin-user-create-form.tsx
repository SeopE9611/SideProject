"use client";
import { useState } from "react";
import { adminRoleLabels } from "@/features/admin-auth/admin-auth.types";

const responseMessage = "현재 서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const networkMessage = "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function errors(value: unknown) {
  if (!isObject(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export function AdminUserCreateForm() {
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState("");
  const resetConfirmation = () => setConfirmed(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFieldErrors({});
    setFormMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: {
            email: form.get("email"),
            displayName: form.get("displayName"),
            role: form.get("role"),
            password: form.get("password"),
            passwordConfirmation: form.get("passwordConfirmation"),
          },
          createConfirmed: confirmed,
        }),
      });
      const text = await response.text();
      let body: unknown;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        setFormMessage(responseMessage);
        return;
      }
      if (!isObject(body)) {
        setFormMessage(responseMessage);
        return;
      }
      if (!response.ok) {
        const serverErrors = errors(body.fieldErrors);
        setFieldErrors(serverErrors);
        setFormMessage(
          serverErrors.form ??
            (body.error === "email_conflict"
              ? "이미 사용 중인 이메일입니다."
              : "계정을 생성할 수 없습니다. 잠시 후 다시 시도해 주세요."),
        );
        return;
      }
      if (
        typeof body.redirectTo !== "string" ||
        !/^\/admin\/admin-users\/[0-9a-f]{24}\?created=1$/.test(body.redirectTo)
      ) {
        setFormMessage(responseMessage);
        return;
      }
      location.assign(body.redirectTo);
    } catch {
      setFormMessage(networkMessage);
    } finally {
      setBusy(false);
    }
  }
  const error = (name: string) => fieldErrors[name];
  const aria = (name: string) =>
    error(name) ? { "aria-invalid": true as const, "aria-describedby": `create-${name}-error` } : {};
  const errorElement = (name: string) =>
    error(name) && (
      <p id={`create-${name}-error`} role="alert" className="text-small font-semibold text-danger">
        {error(name)}
      </p>
    );
  return (
    <form onSubmit={submit} aria-busy={busy} className="max-w-4xl space-y-6">
      <Field
        id="create-email"
        name="email"
        label="이메일"
        type="email"
        onChange={resetConfirmation}
        aria={aria("email")}
        error={errorElement("email")}
      />
      <Field
        id="create-display-name"
        name="displayName"
        label="표시 이름"
        onChange={resetConfirmation}
        aria={aria("displayName")}
        error={errorElement("displayName")}
      />
      <div className="grid gap-2 border-b border-border pb-6">
        <label className="font-semibold" htmlFor="create-role">
          역할
        </label>
        <select
          id="create-role"
          name="role"
          onChange={resetConfirmation}
          {...aria("role")}
          className="min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {Object.entries(adminRoleLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errorElement("role")}
      </div>
      <Field
        id="create-password"
        name="password"
        label="초기 비밀번호"
        type="password"
        onChange={resetConfirmation}
        aria={aria("password")}
        error={errorElement("password")}
      />
      <Field
        id="create-password-confirmation"
        name="passwordConfirmation"
        label="초기 비밀번호 확인"
        type="password"
        onChange={resetConfirmation}
        aria={aria("passwordConfirmation")}
        error={errorElement("passwordConfirmation")}
      />
      <div className="border-l-4 border-warning bg-warning-soft p-4">
        <label className="flex gap-3 font-semibold" htmlFor="create-confirmed">
          <input
            id="create-confirmed"
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            {...aria("createConfirmed")}
            className="size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          계정 정보와 역할을 확인했으며 초기 비밀번호를 안전하게 전달하겠습니다.
        </label>
        {errorElement("createConfirmed")}
      </div>
      {formMessage && (
        <p id="create-form-error" role="alert" className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger">
          {formMessage}
        </p>
      )}
      <p aria-live="polite">{busy ? "처리 중입니다." : ""}</p>
      <button
        type="submit"
        disabled={busy}
        className="min-h-12 rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        계정 생성
      </button>
    </form>
  );
}
function Field(props: {
  id: string;
  name: string;
  label: string;
  type?: string;
  onChange(): void;
  aria: Record<string, unknown>;
  error: React.ReactNode;
}) {
  const type = props.type ?? "text";
  return (
    <div className="grid gap-2 border-b border-border pb-6">
      <label className="font-semibold" htmlFor={props.id}>
        {props.label}
      </label>
      <input
        id={props.id}
        name={props.name}
        type={type}
        required
        minLength={type === "password" ? 12 : undefined}
        maxLength={type === "password" ? 128 : props.name === "email" ? 254 : 50}
        autoComplete={type === "password" ? "new-password" : undefined}
        onChange={props.onChange}
        {...props.aria}
        className="min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      />
      {props.error}
    </div>
  );
}
