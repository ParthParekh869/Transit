import type { BadgeStyle } from "@/lib/transit/types";

interface Props {
  label: string;
  style?: BadgeStyle;
  className?: string;
  size?: "sm" | "md";
}

/** Colored route pill. Colors come from the API's badgeStyle. */
export function RouteBadge({ label, style, className = "", size = "md" }: Props) {
  const bg = style?.backgroundColor ?? "#1e293b";
  const fg = style?.color ?? "#ffffff";
  const border = style?.borderColor ?? "rgba(255,255,255,0.18)";
  const sizing =
    size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold tracking-tight tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ${sizing} ${className}`}
      style={{
        backgroundColor: bg,
        color: fg,
        borderColor: border,
        borderWidth: 1,
      }}
    >
      {label}
    </span>
  );
}
