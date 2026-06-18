import { format, subMonths, startOfMonth } from "date-fns";
import type { DBClient } from "@/lib/services/patients";
import type { Clinic } from "@/types/database";
import { computeRevenueSummary, appointmentValue } from "@/lib/revenue";

export interface MonthlyRevenuePoint {
  month: string; // e.g. "Jan 2026"
  estimatedRevenue: number;
  recoveredRevenue: number;
}

export async function getRevenueData(db: DBClient, clinic: Clinic, months = 6) {
  const since = startOfMonth(subMonths(new Date(), months - 1));
  const sinceDate = format(since, "yyyy-MM-dd");

  const [apptRes, missedRes] = await Promise.all([
    db
      .from("appointments")
      .select("status, booking_source, estimated_value, appointment_date")
      .eq("clinic_id", clinic.id)
      .gte("appointment_date", sinceDate),
    db
      .from("missed_calls")
      .select("callback_status, estimated_revenue")
      .eq("clinic_id", clinic.id),
  ]);

  const appointments = apptRes.data ?? [];
  const missedCalls = missedRes.data ?? [];

  const summary = computeRevenueSummary({
    clinic,
    appointments,
    missedCalls,
  });

  // Monthly time series
  const avg = appointmentValue(clinic);
  const buckets = new Map<string, MonthlyRevenuePoint>();
  for (let i = 0; i < months; i++) {
    const d = startOfMonth(subMonths(new Date(), months - 1 - i));
    const key = format(d, "yyyy-MM");
    buckets.set(key, {
      month: format(d, "MMM yyyy"),
      estimatedRevenue: 0,
      recoveredRevenue: 0,
    });
  }

  const billable = appointments.filter((a) =>
    ["scheduled", "confirmed", "completed"].includes(a.status)
  );
  for (const a of billable) {
    const key = a.appointment_date.slice(0, 7); // yyyy-MM
    const b = buckets.get(key);
    if (!b) continue;
    const value = Number(a.estimated_value) > 0 ? Number(a.estimated_value) : avg;
    b.estimatedRevenue += value;
    if (a.booking_source === "missed_call_recovery" || a.booking_source === "human_callback") {
      b.recoveredRevenue += value;
    }
  }

  return {
    summary,
    monthly: Array.from(buckets.values()),
  };
}
