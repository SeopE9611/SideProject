"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type TargetType = "order" | "rental" | "stringingApplication" | "user";
type NoteItem = { id: string; body: string; createdByName?: string | null; createdByEmail?: string | null; createdAt?: string | null; updatedAt?: string | null; editedAt?: string | null };
type NotesResponse = { success: true; items: NoteItem[]; page: number; limit: number; total: number; totalPages: number };

export default function AdminInternalNotesCard({ targetType, targetId, className }: { targetType: TargetType; targetId: string; className?: string }) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const key = useMemo(() => `/api/admin/notes?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}&page=1&limit=20`, [targetType, targetId]);
  const { data, error, isValidating, mutate } = useSWR<NotesResponse>(key, authenticatedSWRFetcher, { revalidateOnFocus: false, revalidateOnReconnect: false });

  const onCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const payload = { targetType, targetId, body: draft };
      await adminMutator("/api/admin/notes", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      setDraft("");
      await mutate();
      showSuccessToast("내부 메모를 등록했습니다.");
    } catch (e) { showErrorToast(getAdminErrorMessage(e)); }
    finally { setIsCreating(false); }
  };

  const onUpdate = async (id: string) => {
    if (updatingId) return;
    setUpdatingId(id);
    try {
      await adminMutator(`/api/admin/notes/${id}`, { method: "PATCH", body: JSON.stringify({ body: editingBody }), headers: { "Content-Type": "application/json" } });
      setEditingId(null);
      setEditingBody("");
      await mutate();
      showSuccessToast("내부 메모를 수정했습니다.");
    } catch (e) { showErrorToast(getAdminErrorMessage(e)); }
    finally { setUpdatingId(null); }
  };

  const onDelete = async () => {
    if (!deleteId) return;
    if (deletingId) return;
    setDeletingId(deleteId);
    try {
      await adminMutator(`/api/admin/notes/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      await mutate();
      showSuccessToast("내부 메모를 삭제했습니다.");
    } catch (e) { showErrorToast(getAdminErrorMessage(e)); }
    finally { setDeletingId(null); }
  };

  return (
    <Card className={cn("border-0 bg-muted/30 shadow-xl", className)}>
      <CardHeader>
        <CardTitle>관리자 내부 메모</CardTitle>
        <CardDescription>고객에게 노출되지 않는 운영자 전용 메모입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} placeholder="예) 고객이 전화로 배송 일정 변경을 요청함" />
          <div className="flex justify-end"><Button onClick={onCreate} disabled={!draft.trim() || isCreating}>{isCreating ? "저장 중..." : "저장"}</Button></div>
        </div>

        {error ? <p className="text-sm text-destructive">내부 메모를 불러오지 못했습니다.</p> : null}
        {!error && !data && isValidating ? <p className="text-sm text-muted-foreground">불러오는 중...</p> : null}
        {data && data.items.length === 0 ? <p className="text-sm text-muted-foreground">아직 등록된 내부 메모가 없습니다.</p> : null}
        <div className="space-y-3">
          {data?.items.map((note) => (
            <div key={note.id} className="rounded-lg border bg-background p-3">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} maxLength={2000} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingId(null); setEditingBody(""); }} disabled={updatingId === note.id}>취소</Button>
                    <Button size="sm" onClick={() => onUpdate(note.id)} disabled={!editingBody.trim() || updatingId === note.id}>{updatingId === note.id ? "저장 중..." : "저장"}</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{note.createdByName || note.createdByEmail || "관리자"} · {note.createdAt ? new Date(note.createdAt).toLocaleString("ko-KR") : "-"}</span>
                    <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => { setEditingId(note.id); setEditingBody(note.body); }} disabled={Boolean(updatingId) || Boolean(deletingId)}>수정</Button><Button variant="ghost" size="sm" onClick={() => setDeleteId(note.id)} disabled={Boolean(updatingId) || Boolean(deletingId)}>삭제</Button></div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      <AdminConfirmDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)} title="내부 메모 삭제" description="삭제한 메모는 목록에서 사라집니다. 계속할까요?" severity="danger" confirmText={deletingId ? "삭제 중..." : "삭제"} confirmDisabled={Boolean(deletingId)} onConfirm={onDelete} />
    </Card>
  );
}
