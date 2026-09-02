type FixtureMediaPlaceholderProps = {
  label: string;
  description: string;
  compact?: boolean;
};

export function FixtureMediaPlaceholder({ label, description, compact = false }: FixtureMediaPlaceholderProps) {
  return (
    <div className={`relative aspect-[3/2] overflow-hidden border border-border-strong bg-primary-soft ${compact ? "p-4" : "p-6 sm:p-8"}`}>
      <div aria-hidden="true" className="absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:3rem_3rem]" />
      <div className="relative flex h-full flex-col justify-between border-l-2 border-primary pl-5">
        <p className="text-safe-wrap text-small font-bold text-primary">{label}</p>
        <div className="max-w-md bg-surface/90 p-4">
          <p className={`text-safe-wrap text-foreground ${compact ? "text-small" : "text-body"}`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
