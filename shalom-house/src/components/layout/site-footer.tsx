import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-subtle">
      <div className="mx-auto w-full max-w-site px-page py-8 text-small text-muted-foreground sm:px-page-wide">
        <p className="font-semibold text-foreground">{siteConfig.name}</p>
        <address className="mt-2 not-italic">
          <p>{siteConfig.address}</p>
          <p>
            전화{" "}
            <a
              className="text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              href={`tel:${siteConfig.phone}`}
            >
              {siteConfig.phone}
            </a>
          </p>
        </address>
      </div>
    </footer>
  );
}
