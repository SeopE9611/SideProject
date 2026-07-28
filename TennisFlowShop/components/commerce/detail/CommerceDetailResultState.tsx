import Link from "next/link";

import { PublicPageHero, ResultState } from "@/components/public";
import { Button } from "@/components/ui/button";

type CommerceDetailResultStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  stateTitle: string;
  stateDescription: string;
  listHref: string;
  listLabel: string;
  status?: "error" | "warning";
  retryHref?: string;
};

export function CommerceDetailResultState({
  eyebrow,
  title,
  description,
  stateTitle,
  stateDescription,
  listHref,
  listLabel,
  status = "warning",
  retryHref,
}: CommerceDetailResultStateProps) {
  return (
    <main className="min-h-screen bg-background pb-10">
      <PublicPageHero
        variant="feature"
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <ResultState
          status={status}
          title={stateTitle}
          description={stateDescription}
          actions={
            <>
              {retryHref ? (
                <Button asChild variant="highlight_soft" className="min-h-11 rounded-control">
                  <Link href={retryHref}>다시 시도</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" className="min-h-11 rounded-control">
                <Link href={listHref}>{listLabel}</Link>
              </Button>
            </>
          }
        />
      </div>
    </main>
  );
}
