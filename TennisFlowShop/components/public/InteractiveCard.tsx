import type {
  ComponentPropsWithoutRef,
  HTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LinkCardProps = {
  href: ComponentPropsWithoutRef<typeof Link>["href"];
  children: ReactNode;
  className?: string;
} & Omit<
  ComponentPropsWithoutRef<typeof Link>,
  "href" | "children" | "className"
>;

type DivCardProps = {
  href?: undefined;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">;

export type InteractiveCardProps = LinkCardProps | DivCardProps;

const interactiveClassName =
  "block rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-6";

function isLinkCardProps(props: InteractiveCardProps): props is LinkCardProps {
  return props.href !== undefined;
}

export function InteractiveCard(props: InteractiveCardProps) {
  if (isLinkCardProps(props)) {
    const { href, className, children, ...linkProps } = props;

    return (
      <Link
        href={href}
        className={cn(interactiveClassName, className)}
        {...linkProps}
      >
        {children}
      </Link>
    );
  }

  const { className, children, href: _href, ...divProps } = props;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6",
        className,
      )}
      {...divProps}
    >
      {children}
    </div>
  );
}
