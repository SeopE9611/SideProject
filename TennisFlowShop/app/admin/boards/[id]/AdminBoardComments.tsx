"use client";

import useSWR from "swr";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

type Props = { postId: string };
type CommentItem = { id: string; parentId: string | null; nickname: string; content: string; status: string };
type CommentsResponse = { ok: boolean; items: CommentItem[] };

export default function AdminBoardComments({ postId }: Props) {
  const router = useRouter();
  const { data, mutate } = useSWR<CommentsResponse>(
    `/api/admin/community/posts/${postId}/comments?page=1&limit=100`,
    authenticatedSWRFetcher,
  );

  const comments = data?.ok ? data.items : [];

  const deleteComment = async (comment: CommentItem) => {
    const label = comment.parentId ? "답글" : "댓글";
    if (!window.confirm(`이 ${label}을 삭제하시겠습니까?`)) return;
    try {
      await adminMutator(`/api/admin/community/comments/${comment.id}`, { method: "DELETE" });
      showSuccessToast(`${label}을 삭제했습니다.`);
      await mutate();
      router.refresh();
    } catch (e: any) {
      showErrorToast(e?.message ?? `${label} 삭제에 실패했습니다.`);
    }
  };

  return (
    <Card className="shadow-xl bg-muted/30 border border-border">
      <CardHeader><CardTitle>댓글 관리</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded border border-border p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">{comment.parentId ? "답글" : "댓글"} · {comment.nickname}</div>
              <Button size="sm" variant="destructive" onClick={() => deleteComment(comment)}>
                <Trash2 className="mr-1 h-4 w-4" /> 삭제
              </Button>
            </div>
            <p className="text-sm">{comment.content}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-muted-foreground">댓글이 없습니다.</p>}
      </CardContent>
    </Card>
  );
}
