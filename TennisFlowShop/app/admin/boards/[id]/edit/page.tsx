import { notFound } from "next/navigation";
import AdminBoardEditClient from "./AdminBoardEditClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "게시글 수정",
};

function normalizeBoardIdentifier(id: string) {
  const raw = String(id ?? "").trim();
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded || null;
  } catch {
    return raw;
  }
}

export default async function AdminBoardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const boardId = normalizeBoardIdentifier(id);

  if (!boardId) {
    notFound();
  }

  return (
    <div className="container py-8 px-6">
      <AdminBoardEditClient postId={boardId} />
    </div>
  );
}
