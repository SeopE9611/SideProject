"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteContainer from "@/components/layout/SiteContainer";
import { SummaryCard } from "@/components/public";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";

type SafeUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};
type ToUser = { id: string; name: string; role: string } | null;

export default function MessageWriteClient({ me, toUser }: { me: SafeUser; toUser: ToUser }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  // 입력이 하나라도 있으면 "이탈 시 초기화" 대상(= dirty)
  const isDirty = useMemo(() => title.trim().length > 0 || body.trim().length > 0, [title, body]);

  // 탭 닫기/새로고침/주소 직접 변경 등 브라우저 이탈 감지
  useUnsavedChangesGuard(isDirty && !loading);

  const confirmLeaveIfDirty = (go: () => void) => {
    if (!isDirty || loading) return go();
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (!ok) return;
    go();
  };

  const canSubmit = useMemo(
    () => !!toUser?.id && title.trim().length > 0 && body.trim().length > 0,
    [toUser, title, body],
  );

  async function submit() {
    if (!toUser?.id) return showErrorToast("받는 사용자가 올바르지 않습니다.");
    if (!title.trim()) return showErrorToast("제목을 입력해주세요.");
    if (!body.trim()) return showErrorToast("내용을 입력해주세요.");

    setLoading(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: toUser.id, title, body }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) return showErrorToast(data?.error ?? "쪽지 전송에 실패했습니다.");
      showSuccessToast("쪽지를 보냈습니다.");
      router.push("/messages"); // (원하면 여기서 ?tab=send로 확장 가능)
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteContainer className="py-6 md:py-8">
      <SummaryCard
        title="쪽지 보내기"
        description="받는 사람과 내용을 확인한 뒤 쪽지를 전송하세요."
        action={
          <Button variant="outline" onClick={() => confirmLeaveIfDirty(() => router.back())}>
            뒤로
          </Button>
        }
        className="mx-auto max-w-4xl"
        contentClassName="space-y-5"
      >
        <div className="text-ui-body-sm text-muted-foreground" data-cy="message-recipient">
          받는 사람:{" "}
          <span className="font-medium text-foreground">{toUser?.name ?? "알 수 없음"}</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message-title">제목</Label>
          <Input
            id="message-title"
            className="bg-background"
            data-cy="message-title"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message-body">내용</Label>
          <Textarea
            id="message-body"
            className="min-h-[240px] bg-background leading-relaxed"
            data-cy="message-body"
            placeholder="내용"
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
          <Button
            data-cy="message-cancel"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => confirmLeaveIfDirty(() => router.push("/messages"))}
          >
            취소
          </Button>
          <Button
            data-cy="message-submit"
            className="w-full sm:w-auto"
            disabled={!canSubmit || loading}
            onClick={submit}
          >
            {loading ? "전송 중…" : "전송"}
          </Button>
        </div>

        <div className="text-ui-label text-muted-foreground">
          스팸 방지를 위해 “게시글 5개 + 댓글 5개” 조건 및 레이트리밋이 적용됩니다. (관리자는 예외)
        </div>
      </SummaryCard>
    </SiteContainer>
  );
}
