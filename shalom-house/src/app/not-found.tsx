import { NotFoundContent } from "@/components/layout/not-found-content";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SkipLink />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex flex-1 items-center">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </div>
  );
}
