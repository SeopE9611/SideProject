import { redirect } from "next/navigation";

export default function MypageRentalsAliasPage() {
  redirect("/mypage?tab=orders&scope=rental");
}
