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
    <div className="flex gap-1 p-1 bg-muted/40 rounded-lg">
      {FILTERS.map(({ value, label }) => (
        <Link
          key={value}
          href={value === "all" ? "/fixtures" : `/fixtures?filter=${value}`}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
            current === value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
          {counts?.[value] !== undefined && (
            <span className={cn(
              "text-xs rounded-full px-1.5 py-0.5 leading-none",
              current === value
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              {counts[value]}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
