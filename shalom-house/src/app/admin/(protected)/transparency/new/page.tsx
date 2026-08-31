import { redirect } from "next/navigation";

import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import Link from "next/link";
import { AdminTransparencyDraftForm } from "@/components/admin/admin-transparency-draft-form";
export default async function NewTransparencyPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "content.create")) redirect("/admin?forbidden=1");
  return <div className="min-w-0 space-y-8"><header><Link href="/admin/transparency" className="underline">← 자료공개 관리로 돌아가기</Link><h1 className="mt-4 text-title font-bold">자료공개 초안 작성</h1><p>PDF는 private bucket에 저장되며 즉시 공개되지 않습니다.</p></header><aside className="rounded-card border p-5"><h2 className="font-bold">업로드 전 확인</h2><p className="mt-2">업로드 전에 주민등록번호, 연락처, 계좌정보, 서명, 개인 건강·복지 정보와 공개가 제한된 내부 정보가 포함되지 않았는지 확인해 주세요.</p></aside><AdminTransparencyDraftForm mode="create" /></div>;
}
