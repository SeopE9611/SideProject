import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Eye, MessageSquare, Settings, User } from "lucide-react";
import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { sanitizeHtml } from "@/lib/sanitize";
import { AdminFetchError, adminFetcher } from "@/lib/admin/adminFetcher";
import { cn } from "@/lib/utils";
import BoardDetailActions from "./BoardDetailActions";
import AdminBoardComments from "./AdminBoardComments";

export const metadata: Metadata = {
  title: "게시글 상세",
};

type BoardPostDetail = {
  id: string;
  title: string;
  content: string;
  type: string;
  category: string;
  status: "public" | "hidden";
  isPinned?: boolean;
  views: number;
  commentsCount: number;
  createdAt?: string | Date;
  authorNickname?: string;
  authorDisplayName?: string;
  authorId?: string;
};

/**
 * 관리자 상세 페이지 식별자 정책
 * - 게시물 식별자는 DB 저장 스키마(ObjectId | string)와 동일하게 문자열로 취급한다.
 * - 숫자 파싱(Number.parseInt)이나 ObjectId 정규식 강제 검증을 하지 않는다.
 * - URL 인코딩된 ID를 허용하기 위해 decodeURIComponent를 적용한다.
 */
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

function getStatusVariant(status: string): "success" | "warning" | "destructive" {
  switch (status) {
    case "public":
      return "success";
    case "hidden":
      return "warning";
    default:
      return "destructive";
  }
}

function getStatusName(status: string) {
  switch (status) {
    case "public":
      return "게시중";
    case "hidden":
      return "숨김";
    default:
      return status || "미정";
  }
}

function getBoardTypeColor(type: string) {
  switch (type) {
    case "notice":
      return "bg-primary/20 text-primary hover:bg-primary/30 dark:bg-primary/30";
    case "qna":
      return "bg-primary/10 text-primary hover:bg-primary/15 dark:hover:bg-primary/25 dark:bg-primary/20";
    case "community":
      return "bg-success/10 text-success hover:bg-success/10 dark:bg-success/15 dark:hover:bg-success/15";
    case "faq":
      return "bg-muted text-foreground hover:bg-muted";
    default:
      return "bg-card text-muted-foreground hover:bg-card";
  }
}

function getBoardTypeName(type: string) {
  switch (type) {
    case "notice":
      return "공지사항";
    case "qna":
      return "Q&A";
    case "community":
      return "커뮤니티";
    case "faq":
      return "FAQ";
    default:
      return type || "기타";
  }
}

function formatDate(dateValue?: string | Date) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function BoardPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const boardId = normalizeBoardIdentifier(id);

  if (!boardId) {
    notFound();
  }

  let data: { item?: BoardPostDetail } | null = null;
  try {
    data = await adminFetcher<{ item?: BoardPostDetail }>(
      `/api/admin/community/posts/${encodeURIComponent(boardId)}`,
      {
        cache: "no-store",
      },
    );
  } catch (error) {
    if (error instanceof AdminFetchError && error.status === 404) {
      notFound();
    }
    return (
      <AdminPageShell>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive dark:border-destructive/40 dark:bg-destructive/15">
          게시물 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </AdminPageShell>
    );
  }

  const post = (data?.item ?? null) as BoardPostDetail | null;

  if (!post) {
    notFound();
  }

  const postId = String(post.id ?? boardId);
  const postStatus = String(post.status ?? "hidden");

  /**
   * 본문 렌더링 보안 정책
   * - API 저장 시 sanitize 처리되어도 화면 단에서 한 번 더 정제한다.
   * - 렌더링은 정제된 문자열만 dangerouslySetInnerHTML에 전달한다.
   */
  const safeContent = await sanitizeHtml(String(post.content ?? ""));

  return (
    <AdminPageShell variant="wide">
      <AdminPageHeader
        title="게시물 상세 보기"
        description="게시물의 상세 정보를 확인하고 관리할 수 있습니다."
        icon={Settings}
        scope={`상태: ${getStatusName(postStatus)}`}
        helperText={`작성일: ${formatDate(post.createdAt)}`}
        actions={
          <>
            <Link
              href="/admin/boards"
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              목록으로
            </Link>
            <BoardDetailActions postId={postId} currentStatus={postStatus} />
          </>
        }
      />

      <div className="flex flex-col space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className={cn("md:col-span-2", adminSurface.card)}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getBoardTypeColor(String(post.type ?? ""))}>
                  {getBoardTypeName(String(post.type ?? ""))}
                </Badge>
                <Badge variant={getStatusVariant(postStatus)}>{getStatusName(postStatus)}</Badge>
                {!!post.category && <Badge variant="outline">{post.category}</Badge>}
                {post.isPinned && <Badge variant="secondary">상단 고정</Badge>}
              </div>
              <CardTitle className={adminTypography.sectionTitle}>
                {post.title || "(제목 없음)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-blue dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: safeContent }}
              />
            </CardContent>
          </Card>

          <Card className={adminSurface.card}>
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className={adminTypography.sectionTitle}>게시물 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className={cn("flex items-center", adminSurface.fieldPanel)}>
                <User className="mr-3 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {post.authorDisplayName || post.authorNickname || "작성자 미상"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {post.authorNickname || post.authorId || "-"}
                  </p>
                </div>
              </div>
              <div className={cn("flex items-center", adminSurface.fieldPanel)}>
                <Calendar className="mr-3 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">작성일</p>
                  <p className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</p>
                </div>
              </div>
              <div className={cn("flex items-center", adminSurface.fieldPanel)}>
                <Eye className="mr-3 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">조회수</p>
                  <p className="text-sm text-primary font-semibold">{Number(post.views ?? 0)}</p>
                </div>
              </div>
              <div className={cn("flex items-center", adminSurface.fieldPanel)}>
                <MessageSquare className="mr-3 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">댓글</p>
                  <p className="text-sm text-primary font-semibold">
                    {Number(post.commentsCount ?? 0)}개
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <AdminBoardComments postId={postId} />
      </div>
    </AdminPageShell>
  );
}
