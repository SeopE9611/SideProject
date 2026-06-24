import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "ui-micro",
            "ui-caption",
            "ui-label",
            "ui-body-sm",
            "ui-body",
            "ui-body-lg",
            "ui-card-title",
            "ui-card-title-lg",
            "ui-section-title",
            "ui-section-title-lg",
            "ui-page-title",
            "ui-page-title-lg",
            "ui-price",
            "ui-price-lg",
            "ui-input",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
