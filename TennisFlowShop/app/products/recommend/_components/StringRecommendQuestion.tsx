import type { RecommendQuestion } from "@/app/products/recommend/_types";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StringRecommendQuestionProps = {
  question: RecommendQuestion;
  value: string | null;
  onChange: (value: string) => void;
  index: number;
};

export default function StringRecommendQuestion({
  question,
  value,
  onChange,
  index,
}: StringRecommendQuestionProps) {
  const answered = Boolean(value);

  return (
    <section className="rounded-panel border border-border bg-card p-4 shadow-soft sm:p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2 break-keep">
          <Badge
            variant={answered ? "signal" : "secondary"}
            className="shrink-0"
          >
            {answered ? (
              <Check className="mr-1 h-3 w-3" aria-hidden="true" />
            ) : null}
            QUESTION {String(index + 1).padStart(2, "0")}
          </Badge>
          <h2 className="text-ui-card-title-lg font-semibold leading-snug text-foreground">
            {question.title}
          </h2>
          {question.description ? (
            <p className="text-ui-body-sm leading-relaxed text-muted-foreground">
              {question.description}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-ui-label text-muted-foreground">
          {answered ? "선택 완료" : "선택 전"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2">
        {question.options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "group relative min-h-24 w-full rounded-control border p-4 pr-12 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:p-5 sm:pr-12",
                selected
                  ? "border-brand-highlight bg-brand-highlight-muted text-foreground shadow-soft"
                  : "border-border bg-background text-foreground hover:-translate-y-0.5 hover:border-brand-highlight/45 hover:bg-brand-highlight-muted/50 hover:shadow-soft",
              )}
            >
              <span
                className={cn(
                  "absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border transition-colors",
                  selected
                    ? "border-brand-highlight bg-brand-highlight text-brand-highlight-foreground"
                    : "border-border bg-card text-transparent group-hover:border-brand-highlight/45",
                )}
                aria-hidden="true"
              >
                <Check className="h-4 w-4" />
              </span>
              <p className="min-w-0 break-keep break-words font-medium leading-snug text-foreground">
                {option.label}
              </p>
              {option.description ? (
                <p className="mt-1 min-w-0 break-keep break-words text-ui-body-sm leading-relaxed text-muted-foreground">
                  {option.description}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
