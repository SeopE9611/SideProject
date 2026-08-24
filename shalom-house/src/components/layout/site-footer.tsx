import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-8 text-sm leading-6 text-gray-700">
        <p className="font-semibold text-gray-950">{siteConfig.name}</p>
        <address className="mt-2 not-italic">
          <p>{siteConfig.address}</p>
          <p>
            전화{" "}
            <a
              className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
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
