"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { showSuccessToast } from "@/lib/toast";

const feedbackKeys = [
  "created",
  "updated",
  "saved",
  "deleted",
  "restored",
  "reviewRequested",
  "published",
  "directPublished",
  "mediaUpdated",
  "decision",
  "approved",
  "rejected",
  "archived",
  "decided",
  "reviewed",
  "unpublished",
  "transition",
  "sessionsRevoked",
] as const;

function getSuccessMessage(pathname: string, query: URLSearchParams): string | null {
  const section = pathname.split("/")[2];
  const subject = section === "programs" ? "프로그램" : section === "gallery" ? "활동사진" : section === "transparency" ? "자료" : "게시물";
  const subjectObject = subject === "자료" ? "자료를" : `${subject}을`;
  const isContentDetail = /^\/admin\/(news|programs)\/[^/]+$/.test(pathname);

  if (query.get("deleted") === "1") return "콘텐츠를 휴지통으로 이동했습니다.";
  if (query.get("restored") === "1") return "콘텐츠를 안전한 초안으로 복구했습니다.";
  if (section === "admin-users") {
    if (query.get("created") === "1") return "관리자 계정을 생성했습니다.";
    if (query.get("updated") === "1") return "관리자 계정 정보를 저장했습니다.";
    if (query.get("sessionsRevoked") === "1") return "관리자 계정의 로그인 세션을 해제했습니다.";
  }
  if (section === "inquiries" && query.get("updated") === "1") return "문의 처리 상태를 저장했습니다.";
  if (section === "donations" && query.get("saved") === "1") return "후원금 기록을 저장했습니다.";
  if (section === "donors" && query.get("saved") === "1") return "후원자 정보를 저장했습니다.";
  if (section === "site-content" && query.get("saved") === "1") return "공식 콘텐츠를 저장했습니다.";
  if (query.get("mediaUpdated") === "1") return "대표 이미지 또는 첨부파일을 저장했습니다.";
  if (query.get("created") === "1") return `새 ${subject}을 저장했습니다.`;
  if (query.get("updated") === "1") return `${subject} 내용을 수정했습니다.`;
  if (query.get("reviewRequested") === "1" || query.get("reviewed") === "1" || query.get("transition") === "review") return "검토 요청을 완료했습니다.";
  if (query.get("decision") === "approved") return "검토를 승인했습니다.";
  if (query.get("decision") === "rejected") return "검토를 반려했습니다.";
  if (query.get("approved") === "1") return "검토를 승인했습니다.";
  if (query.get("rejected") === "1") return "검토를 반려했습니다.";
  if (query.get("decided") === "1" || query.get("transition") === "decision") return "검토 결과를 저장했습니다.";
  if (query.get("directPublished") === "1") return `${subjectObject} 승인하고 공개했습니다.`;
  if (query.get("published") === "1" || query.get("transition") === "publish") return `${subjectObject} 공개했습니다.`;
  if ((isContentDetail && query.get("publication") === "unpublished") || query.get("unpublished") === "1") return "게시를 중단했습니다.";
  if ((isContentDetail && query.get("publication") === "archived") || query.get("archived") === "1") return `${subjectObject} 보관 상태로 전환했습니다.`;
  if (query.get("transition") === "publication") return "게시 상태를 변경했습니다.";
  if (query.get("transition") === "withdraw-consent") return "공개 동의 철회를 반영했습니다.";
  return null;
}

export function AdminSuccessToast() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastHandled = useRef("");

  useEffect(() => {
    const signature = `${pathname}?${searchParams.toString()}`;
    if (signature === lastHandled.current) return;

    const query = new URLSearchParams(searchParams.toString());
    const message = getSuccessMessage(pathname, query);
    if (!message) return;

    lastHandled.current = signature;
    showSuccessToast(message);
    feedbackKeys.forEach((key) => query.delete(key));
    if (/^\/admin\/(news|programs)\/[^/]+$/.test(pathname)) query.delete("publication");
    const cleanUrl = query.size > 0 ? `${pathname}?${query.toString()}` : pathname;
    window.history.replaceState(window.history.state, "", cleanUrl);
  }, [pathname, searchParams]);

  return null;
}
