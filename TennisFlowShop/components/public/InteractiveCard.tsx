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

type InteractiveCardProps = LinkCardProps | DivCardProps;

const interactiveClassName =
  "block rounded-xl border border-border bg-card p-5 text-foreground transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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
      className={cn("rounded-xl border border-border bg-card p-5", className)}
      {...divProps}
    >
      {children}
    </div>
  );
}
