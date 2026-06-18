import type { Appointment, Clinic, MissedCall } from "@/types/database";

/**
 * Revenue is ALWAYS an ESTIMATE in ClinicFlow AI. These helpers derive
 * projected revenue from appointment counts and a per-clinic value setting.
 * Nothing here represents collected payment.
 */

/** Resolve the per-appointment value a clinic uses for estimates. */
export function appointmentValue(clinic: Pick<
  Clinic,
  | "consultation_fee"
  | "average_appointment_value"
  | "average_treatment_value"
  | "revenue_calculation_method"
>): number {
  switch (clinic.revenue_calculation_method) {
    case "consultation_fee":
      return Number(clinic.consultation_fee);
    case "average_treatment_value":
      return Number(clinic.average_treatment_value);
    case "average_appointment_value":
    default:
      return Number(clinic.average_appointment_value);
  }
}

const REVENUE_GENERATING_STATUSES = new Set([
  "scheduled",
  "confirmed",
  "completed",
]);

function isRevenueGenerating(a: Pick<Appointment, "status">): boolean {
  return REVENUE_GENERATING_STATUSES.has(a.status);
}

export interface RevenueSummary {
  /** Always present as a label so the UI never mislabels estimates. */
  label: "Estimated Revenue";
  averageAppointmentValue: number;
  appointmentsBooked: number;
  estimatedRevenueGenerated: number;
  recoveredAppointments: number;
  estimatedRevenueRecovered: number;
  missedCalls: number;
  recoveryConversionRate: number; // percentage
  bySource: Record<string, number>;
}

export function computeRevenueSummary(params: {
  clinic: Parameters<typeof appointmentValue>[0];
  appointments: Pick<Appointment, "status" | "booking_source" | "estimated_value">[];
  missedCalls: Pick<MissedCall, "callback_status" | "estimated_revenue">[];
}): RevenueSummary {
  const { clinic, appointments, missedCalls } = params;
  const avgValue = appointmentValue(clinic);

  const billable = appointments.filter(isRevenueGenerating);
  const appointmentsBooked = billable.length;

  // Prefer per-appointment estimated_value when set, else fall back to avg.
  const valueOf = (a: Pick<Appointment, "estimated_value">) =>
    Number(a.estimated_value) > 0 ? Number(a.estimated_value) : avgValue;

  const estimatedRevenueGenerated = billable.reduce((s, a) => s + valueOf(a), 0);

  const recovered = billable.filter(
    (a) => a.booking_source === "missed_call_recovery" || a.booking_source === "human_callback"
  );
  const recoveredAppointments = recovered.length;
  const estimatedRevenueRecovered = recovered.reduce((s, a) => s + valueOf(a), 0);

  const totalMissed = missedCalls.length;
  const recoveryConversionRate =
    totalMissed === 0 ? 0 : Number(((recoveredAppointments / totalMissed) * 100).toFixed(1));

  const bySource: Record<string, number> = {
    direct_call: 0,
    missed_call_recovery: 0,
    human_callback: 0,
    manual: 0,
  };
  for (const a of billable) {
    const key =
      a.booking_source === "ai_voice" ? "direct_call" : a.booking_source;
    bySource[key] = (bySource[key] ?? 0) + valueOf(a);
  }

  return {
    label: "Estimated Revenue",
    averageAppointmentValue: avgValue,
    appointmentsBooked,
    estimatedRevenueGenerated,
    recoveredAppointments,
    estimatedRevenueRecovered,
    missedCalls: totalMissed,
    recoveryConversionRate,
    bySource,
  };
}
