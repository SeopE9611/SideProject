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
  primaryAction: PaymentFailureAction;
  secondaryAction: PaymentFailureAction;
  warningMessage: string;
};

export function PaymentFailureResult({
  guide,
  code,
  message,
  primaryAction,
  secondaryAction,
  warningMessage,
}: PaymentFailureResultProps) {
  return (
    <SiteContainer className="flex min-h-[60vh] items-center">
      <ResultState
        status="error"
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
            <Button asChild className="w-full sm:w-auto" wrap="responsive">
              <Link href={primaryAction.href}>{primaryAction.label}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto" wrap="responsive">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-ui-body-sm text-muted-foreground">
          {guide.accent === "warning" && (
            <p className="rounded-control border border-warning/30 bg-warning/10 p-3 text-warning">
              {warningMessage}
            </p>
          )}
          <dl className="space-y-2 rounded-control border border-border/70 bg-muted/20 p-3 text-ui-label">
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
        </div>
      </ResultState>
    </SiteContainer>
  );
}
