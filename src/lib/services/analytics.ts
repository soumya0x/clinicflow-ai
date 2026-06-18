import { format, subDays, startOfDay } from "date-fns";
import type { DBClient } from "@/lib/services/patients";
import type { DashboardKpis, TimeSeriesPoint } from "@/types";
import { percent } from "@/lib/utils";

function todayISODate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Headline KPIs for the dashboard. */
export async function getDashboardKpis(
  db: DBClient,
  clinicId: string
): Promise<DashboardKpis> {
  const today = todayISODate();
  const startToday = startOfDay(new Date()).toISOString();

  const [
    totalCallsRes,
    totalApptRes,
    callsTodayRes,
    apptTodayRes,
    durationRes,
    bookedCallsRes,
  ] = await Promise.all([
    db.from("calls").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
    db.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
    db.from("calls").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("created_at", startToday),
    db.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("appointment_date", today),
    db.from("calls").select("duration").eq("clinic_id", clinicId),
    db.from("calls").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("outcome", "appointment_booked"),
  ]);

  const totalCalls = totalCallsRes.count ?? 0;
  const durations = (durationRes.data ?? []).map((c) => c.duration ?? 0);
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  return {
    totalCalls,
    totalAppointments: totalApptRes.count ?? 0,
    callsToday: callsTodayRes.count ?? 0,
    appointmentsToday: apptTodayRes.count ?? 0,
    conversionRate: percent(bookedCallsRes.count ?? 0, totalCalls),
    averageCallDuration: avgDuration,
  };
}

/** Daily calls + appointments for the last `days` days. */
export async function getTimeSeries(
  db: DBClient,
  clinicId: string,
  days = 30
): Promise<TimeSeriesPoint[]> {
  const since = startOfDay(subDays(new Date(), days - 1));
  const sinceISO = since.toISOString();
  const sinceDate = format(since, "yyyy-MM-dd");

  const [callsRes, apptRes] = await Promise.all([
    db.from("calls").select("created_at").eq("clinic_id", clinicId).gte("created_at", sinceISO),
    db.from("appointments").select("appointment_date").eq("clinic_id", clinicId).gte("appointment_date", sinceDate),
  ]);

  const buckets = new Map<string, TimeSeriesPoint>();
  for (let i = 0; i < days; i++) {
    const d = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
    buckets.set(d, { date: d, calls: 0, appointments: 0 });
  }

  for (const c of callsRes.data ?? []) {
    const d = format(new Date(c.created_at), "yyyy-MM-dd");
    const b = buckets.get(d);
    if (b) b.calls += 1;
  }
  for (const a of apptRes.data ?? []) {
    const b = buckets.get(a.appointment_date);
    if (b) b.appointments += 1;
  }

  return Array.from(buckets.values());
}
