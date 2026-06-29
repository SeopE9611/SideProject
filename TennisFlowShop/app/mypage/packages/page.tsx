import { redirect } from "next/navigation";

export default function MypagePackagesAliasPage() {
  redirect("/mypage?tab=passes");
}
