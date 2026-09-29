import Link from "next/link";

import SiteContainer from "@/components/layout/SiteContainer";
import { ResultState } from "@/components/public";
import { Button } from "@/components/ui/button";

type PaymentFailureGuide = {
  title: string;
  description: string[];
  accent?: "default" | "warning";
};

type PaymentFailureAction = {
  label: string;
  href: string;
};

type PaymentFailureResultProps = {
  guide: PaymentFailureGuide;
  code: string;
  message?: string;
  status?: "error" | "warning";
  primaryAction: PaymentFailureAction;
  secondaryAction?: PaymentFailureAction;
  warningMessage?: string;
};

export function PaymentFailureResult({
  guide,
  code,
  message,
  status,
  primaryAction,
  secondaryAction,
  warningMessage,
}: PaymentFailureResultProps) {
  const resolvedStatus = status ?? (guide.accent === "warning" ? "warning" : "error");

  return (
    <SiteContainer className="flex min-h-[60vh] items-center">
      <ResultState
        status={resolvedStatus}
        title={guide.title}
        description={
          <ul className="space-y-1">
            {guide.description.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        }
        actions={
          <>
            <Button
              asChild
              variant="highlight"
              size="lg"
              className="w-full bp-sm:w-auto"
              wrap="responsive"
            >
              <Link href={primaryAction.href}>{primaryAction.label}</Link>
            </Button>
            {secondaryAction ? (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full bp-sm:w-auto"
                wrap="responsive"
              >
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : null}
          </>
        }
      >
        <div className="space-y-3 text-ui-body-sm text-muted-foreground">
          {guide.accent === "warning" && warningMessage ? (
            <p className="rounded-control border border-warning/30 bg-warning/10 p-3 text-warning">
              {warningMessage}
            </p>
          ) : null}
          <details className="rounded-control border border-border/70 bg-muted/20 text-ui-label">
            <summary className="flex min-h-11 cursor-pointer items-center px-3 py-2 text-muted-foreground">
              오류 상세 보기
            </summary>
            <dl className="space-y-2 border-t border-border/70 px-3 py-3">
              <div className="space-y-1">
                <dt className="text-muted-foreground">오류 코드</dt>
                <dd className="break-all font-mono text-foreground">{code}</dd>
              </div>
              {message ? (
                <div className="space-y-1">
                  <dt className="text-muted-foreground">참고 메시지</dt>
                  <dd className="break-words text-foreground">{message}</dd>
                </div>
              ) : null}
            </dl>
          </details>
        </div>
      </ResultState>
    </SiteContainer>
  );
}
