import BoardsPageClient from "@/app/admin/boards/BoardsClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "게시판 관리",
};

export default async function BoardsPage() {
  return <BoardsPageClient />;
}
