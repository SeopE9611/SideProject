import ForceChangePasswordClient from "@/app/account/password/change/_components/ForceChangePasswordClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "비밀번호 변경",
};

export default function Page() {
  return <ForceChangePasswordClient />;
}
