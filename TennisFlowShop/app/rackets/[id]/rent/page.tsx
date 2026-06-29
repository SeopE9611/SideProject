import { redirect } from "next/navigation";

export default async function RacketRentAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/rackets/${encodeURIComponent(id)}`);
}
