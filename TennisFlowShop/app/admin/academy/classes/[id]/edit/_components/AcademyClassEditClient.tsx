"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adminFetcher } from "@/lib/admin/adminFetcher";
import type { AcademyClass } from "@/lib/types/academy";

import AcademyClassFormClient from "../../../new/_components/AcademyClassFormClient";

type DetailResponse = {
  success: true;
  item: AcademyClass;
};

export default function AcademyClassEditClient({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR<DetailResponse>(
    `/api/admin/academy/classes/${id}`,
    adminFetcher,
  );

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-sm text-muted-foreground">
          클래스 정보를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  if (error || !data?.item) {
    return (
      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/academy/classes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Link>
        </Button>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
          클래스 정보를 불러오지 못했습니다.
        </div>
      </div>
    );
  }

  return <AcademyClassFormClient mode="edit" initialItem={data.item} />;
}
