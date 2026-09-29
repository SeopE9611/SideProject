import { redirect } from "next/navigation";

export default async function PackageDetailAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const searchParams = new URLSearchParams();
  if (id) searchParams.set("package", id);

  redirect(`/services/packages${searchParams.toString() ? `?${searchParams.toString()}` : ""}`);
}
