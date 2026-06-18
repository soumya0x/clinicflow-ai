"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RevenueSummary } from "@/lib/revenue";
import type { MonthlyRevenuePoint } from "@/lib/services/revenue";

export function DownloadReportButton({
  clinicName,
  summary,
  monthly,
}: {
  clinicName: string;
  summary: RevenueSummary;
  monthly: MonthlyRevenuePoint[];
}) {
  function download() {
    const lines: string[] = [];
    lines.push(`ClinicFlow AI — Estimated Revenue Report`);
    lines.push(`Clinic,${escape(clinicName)}`);
    lines.push(`Generated,${new Date().toISOString()}`);
    lines.push("");
    lines.push("NOTE,All figures are ESTIMATED REVENUE (projections; not collected payments)");
    lines.push("");
    lines.push("Metric,Value");
    lines.push(`Estimated Revenue Generated,${summary.estimatedRevenueGenerated}`);
    lines.push(`Estimated Revenue Recovered,${summary.estimatedRevenueRecovered}`);
    lines.push(`Appointments Booked,${summary.appointmentsBooked}`);
    lines.push(`Recovered Appointments,${summary.recoveredAppointments}`);
    lines.push(`Missed Calls,${summary.missedCalls}`);
    lines.push(`Recovery Conversion Rate (%),${summary.recoveryConversionRate}`);
    lines.push(`Average Appointment Value,${summary.averageAppointmentValue}`);
    lines.push("");
    lines.push("Month,Estimated Revenue,Recovered Revenue");
    for (const m of monthly) {
      lines.push(`${m.month},${m.estimatedRevenue},${m.recoveredRevenue}`);
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinicflow-estimated-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={download}>
      <Download className="h-4 w-4" /> Download report
    </Button>
  );
}

function escape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
