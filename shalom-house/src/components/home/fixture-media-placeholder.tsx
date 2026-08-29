type FixtureMediaPlaceholderProps = {
  label: string;
  description: string;
  compact?: boolean;
};

export function FixtureMediaPlaceholder({
  label,
  description,
  compact = false,
}: FixtureMediaPlaceholderProps) {
  return (
    <div
      className={`aspect-[3/2] border border-border bg-surface-subtle ${
        compact ? "p-4" : "p-6 sm:p-8"
      }`}
    >
      <div className="flex h-full flex-col">
        <p className="text-safe-wrap text-small font-bold text-primary">{label}</p>
        <div className="my-auto border-t border-border pt-4">
          <p
            className={`text-safe-wrap text-muted-foreground ${
              compact ? "text-small" : "text-body"
            }`}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
