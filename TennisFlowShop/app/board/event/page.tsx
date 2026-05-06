import { getBoardList } from "@/lib/boards.queries";
import type { Metadata } from "next";
import NoticeListClient from "../notice/_components/NoticeListClient";

export const metadata: Metadata = {
  title: "고객센터 이벤트",
  description: "할인, 프로모션, 행사 소식을 확인하세요.",
  alternates: { canonical: "/board/event" },
  openGraph: {
    title: "고객센터 이벤트",
    description: "할인, 프로모션, 행사 소식을 확인하세요.",
    url: "/board/event",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "고객센터 이벤트",
    description: "할인, 프로모션, 행사 소식을 확인하세요.",
  },
};

export const revalidate = 30;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

async function fetchEvents(opts: { page: number; limit: number; q: string; field: "all" | "title" | "content" | "title_content" }) {
  const { page, limit, q, field } = opts;

  try {
    const { items, total } = await getBoardList({
      type: "notice",
      page,
      limit,
      q,
      field,
      category: "이벤트",
    });

    return {
      items,
      total,
      initialLoadError: false,
      initialErrorMessage: null,
    };
  } catch (error) {
    console.error("Failed to load events from DB", error);
    return {
      items: null,
      total: null,
      initialLoadError: true,
      initialErrorMessage: error instanceof Error ? error.message : null,
    };
  }
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const resolvedSearchParams = await searchParams;

  const rawPage = pick(resolvedSearchParams?.page);
  const rawQ = pick(resolvedSearchParams?.q) ?? "";
  const rawField = pick(resolvedSearchParams?.field) ?? "all";

  const page = clamp(Number.parseInt(String(rawPage ?? "1"), 10) || 1, 1, 10_000);
  const limit = 20;
  const field: "all" | "title" | "content" | "title_content" = rawField === "title" || rawField === "content" || rawField === "title_content" ? rawField : "all";
  const q = rawQ;

  const { items, total, initialLoadError, initialErrorMessage } = await fetchEvents({ page, limit, q, field });

  return <NoticeListClient mode="event" initialItems={items} initialTotal={total} initialLoadError={initialLoadError} initialErrorMessage={initialErrorMessage ?? undefined} initialPage={page} initialKeyword={q} initialField={field} />;
}
