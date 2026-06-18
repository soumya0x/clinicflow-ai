import { format, parseISO, startOfWeek, startOfMonth } from "date-fns";
import type { TimeSeriesPoint } from "@/types";

export type Granularity = "day" | "week" | "month";

export interface AggregatePoint {
  label: string;
  calls: number;
  appointments: number;
  conversion: number;
}

/** Bucket a daily time series into day/week/month points with conversion %. */
export function aggregateSeries(
  series: TimeSeriesPoint[],
  granularity: Granularity
): AggregatePoint[] {
  if (granularity === "day") {
    return series.map((p) => ({
      label: format(parseISO(p.date), "d MMM"),
      calls: p.calls,
      appointments: p.appointments,
      conversion: p.calls ? Math.round((p.appointments / p.calls) * 100) : 0,
    }));
  }

  const buckets = new Map<string, { label: string; calls: number; appointments: number }>();
  for (const p of series) {
    const d = parseISO(p.date);
    const bucketDate =
      granularity === "week" ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d);
    const key = format(bucketDate, "yyyy-MM-dd");
    const label =
      granularity === "week"
        ? `${format(bucketDate, "d MMM")}`
        : format(bucketDate, "MMM yyyy");
    const existing = buckets.get(key) ?? { label, calls: 0, appointments: 0 };
    existing.calls += p.calls;
    existing.appointments += p.appointments;
    buckets.set(key, existing);
  }

  return Array.from(buckets.values()).map((b) => ({
    ...b,
    conversion: b.calls ? Math.round((b.appointments / b.calls) * 100) : 0,
  }));
}
