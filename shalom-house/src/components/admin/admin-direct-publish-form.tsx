"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

type AdminDirectPublishFormProps = {
  id: string;
  endpoint: string;
  expectedUpdatedAt: string;
  contentLabel: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJsonResponse(response: Response): Promise<unknown | null> {
  if (response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return null;
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export function AdminDirectPublishForm(props: AdminDirectPublishFormProps) {
  const router = useRouter();
  const checkboxId = useId();
  const descriptionId = `${checkboxId}-description`;
  const errorId = `${checkboxId}-error`;
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed || busy) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(props.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          expectedUpdatedAt: props.expectedUpdatedAt,
          publishConfirmed: true,
        }),
      });
      const body = await readJsonResponse(response);
      if (
        response.status === 200 &&
        isRecord(body) &&
        body.ok === true &&
        typeof body.redirectTo === "string" &&
        body.redirectTo.startsWith("/admin/")
      ) {
        router.push(body.redirectTo);
        router.refresh();
        return;
      }
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const code = isRecord(body) && typeof body.error === "string" ? body.error : null;
      if (code === "edit_conflict") setError("다른 관리자가 콘텐츠를 변경했습니다. 새로고침 후 다시 확인해 주세요.");
      else if (code === "not_direct_publishable")
        setError("현재 상태에서는 바로 게시할 수 없습니다. 페이지를 새로고침해 상태를 확인해 주세요.");
      else setError("바로 게시하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } catch {
      setError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-busy={busy} className="mt-5 max-w-3xl space-y-5">
      <p id={descriptionId} className="text-small text-muted-foreground">
        검토·승인 단계를 생략하고 현재 내용을 즉시 홈페이지에 공개합니다.
        <br />
        제목, 본문과 개인정보 포함 여부를 확인한 뒤 진행해 주세요.
      </p>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="rounded-control border border-border-strong bg-background p-4 text-danger"
        >
          {error}
        </p>
      ) : null}
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
          aria-invalid={error ? true : undefined}
          className="mt-1 size-5 shrink-0 accent-primary"
        />
        <label htmlFor={checkboxId} className="font-semibold">
          현재 내용과 공개 가능 여부를 확인했으며 바로 게시하는 것에 동의합니다.
        </label>
      </div>
      <button
        type="submit"
        disabled={!confirmed || busy}
        className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "바로 게시 중…" : `${props.contentLabel} 바로 게시`}
      </button>
    </form>
  );
}
