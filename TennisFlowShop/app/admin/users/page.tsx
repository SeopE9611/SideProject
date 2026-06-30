import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원 관리",
};

// app/admin/users/page.tsx
import UsersClient from "./_components/UsersClient";

export default async function AdminUsersPage() {
  return <UsersClient />;
}
