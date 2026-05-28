import Link from "next/link";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all",      label: "All" },
  { value: "today",    label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past",     label: "Past" },
] as const;

export type FilterValue = (typeof FILTERS)[number]["value"];

export function FixtureFilters({
  current,
  counts,
}: {
  current: FilterValue;
  counts?: Partial<Record<FilterValue, number>>;
}) {
  return (
    <div className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-1 sm:w-auto">
      {FILTERS.map(({ value, label }) => (
        <Link
          key={value}
          href={value === "all" ? "/fixtures" : `/fixtures?filter=${value}`}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors",
            current === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          )}
        >
          {label}
          {counts?.[value] !== undefined && (
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-xs leading-none",
              current === value
                ? "bg-white/18 text-primary-foreground"
                : "bg-white/[0.06] text-muted-foreground"
            )}>
              {counts[value]}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
