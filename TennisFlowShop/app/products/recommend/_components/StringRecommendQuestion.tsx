import type { RecommendQuestion } from "@/app/products/recommend/_types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StringRecommendQuestionProps = {
  question: RecommendQuestion;
  value: string | null;
  onChange: (value: string) => void;
  index: number;
};

export default function StringRecommendQuestion({ question, value, onChange, index }: StringRecommendQuestionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="space-y-2">
        <Badge variant="outline" className="w-fit">질문 {index + 1}</Badge>
        <h2 className="text-lg font-semibold text-foreground">{question.title}</h2>
        {question.description ? <p className="text-sm text-muted-foreground">{question.description}</p> : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {question.options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40",
              )}
            >
              <p className="font-medium text-foreground">{option.label}</p>
              {option.description ? <p className="mt-1 text-sm text-muted-foreground">{option.description}</p> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
