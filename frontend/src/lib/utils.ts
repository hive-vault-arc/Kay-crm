import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const mergeClasses = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["page", "section", "label", "badge"] }],
      rounded: [{ rounded: ["control-compact", "checkbox"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return mergeClasses(clsx(inputs));
}
