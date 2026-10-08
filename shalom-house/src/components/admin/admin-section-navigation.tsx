type AdminSectionNavigationItem = {
  id: string;
  label: string;
};

export function AdminSectionNavigation({ items }: { items: readonly AdminSectionNavigationItem[] }) {
  return (
    <nav aria-label="상세 페이지 목차" className="admin-section-navigation">
      <ul className="flex flex-wrap gap-2">
        {items.map(({ id, label }) => (
          <li key={id} className="min-w-0">
            <a
              href={`#${id}`}
              className="inline-flex min-h-11 items-center rounded-control border border-border px-3 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
