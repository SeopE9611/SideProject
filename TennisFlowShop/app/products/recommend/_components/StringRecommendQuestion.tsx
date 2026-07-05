import type { RecommendQuestion } from "@/app/products/recommend/_types";
import { Badge } from "@/components/ui/badge";
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
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5 md:p-6">
      <div className="space-y-2 break-keep">
        <Badge variant="outline" className="w-fit shrink-0">
          질문 {index + 1}
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
                "min-h-24 w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5",
                selected
                  ? "border-primary/50 bg-primary/5 text-foreground ring-1 ring-primary/20"
                  : "border-border bg-background hover:bg-muted/40",
              )}
            >
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
