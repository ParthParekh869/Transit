import type { BadgeStyle } from "@/lib/transit/types";

interface Props {
  label: string;
  style?: BadgeStyle;
  className?: string;
}

/** Colored route pill — colors come from the API's badgeStyle. */
export function RouteBadge({ label, style, className = "" }: Props) {
  const bg = style?.backgroundColor ?? "#1f2937";
  const fg = style?.color ?? "#ffffff";
  const border = style?.borderColor ?? "rgba(255,255,255,0.2)";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold ${className}`}
      style={{ backgroundColor: bg, color: fg, borderColor: border, borderWidth: 1 }}
    >
      {label}
    </span>
  );
}
