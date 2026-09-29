import type { SVGProps } from "react";

// Lucide SVG subset: https://github.com/lucide-icons/lucide/tree/main/icons
// ISC / Feather-derived MIT terms are included in LUCIDE-LICENSE.txt.

export type LineIconName =
  | "arrow-right"
  | "building"
  | "calendar"
  | "chevron-left"
  | "chevron-right"
  | "external-link"
  | "file-text"
  | "heart-handshake"
  | "map-pin"
  | "message-circle"
  | "newspaper"
  | "phone"
  | "search"
  | "sparkles";

type LineIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  name: LineIconName;
  size?: number;
};

export function LineIcon({ name, size = 24, ...props }: LineIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {name === "arrow-right" ? (
          <>
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </>
        ) : null}
        {name === "building" ? (
          <>
            <path d="M12 10h.01M12 14h.01M12 6h.01M16 10h.01M16 14h.01M16 6h.01M8 10h.01M8 14h.01M8 6h.01" />
            <path d="M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
            <rect x="4" y="2" width="16" height="20" rx="2" />
          </>
        ) : null}
        {name === "calendar" ? (
          <>
            <path d="M8 2v3M16 2v3" />
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
          </>
        ) : null}
        {name === "chevron-left" ? <path d="m15 18-6-6 6-6" /> : null}
        {name === "chevron-right" ? <path d="m9 18 6-6-6-6" /> : null}
        {name === "external-link" ? (
          <>
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </>
        ) : null}
        {name === "file-text" ? (
          <>
            <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
            <path d="M14 2v5a1 1 0 0 0 1 1h5M10 9H8M16 13H8M16 17H8" />
          </>
        ) : null}
        {name === "heart-handshake" ? (
          <path d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762" />
        ) : null}
        {name === "map-pin" ? (
          <>
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </>
        ) : null}
        {name === "message-circle" ? (
          <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
        ) : null}
        {name === "newspaper" ? (
          <>
            <path d="M15 18h-5M18 14h-8" />
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2" />
            <rect width="8" height="4" x="10" y="6" rx="1" />
          </>
        ) : null}
        {name === "phone" ? (
          <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 1-.292 1.233 14 14 0 0 0 6.392 6.384" />
        ) : null}
        {name === "search" ? (
          <>
            <path d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
          </>
        ) : null}
        {name === "sparkles" ? (
          <>
            <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
            <path d="M20 2v4M22 4h-4" />
            <circle cx="4" cy="20" r="2" />
          </>
        ) : null}
      </g>
    </svg>
  );
}
