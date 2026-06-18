import {
  PhoneCall,
  CalendarCheck,
  TrendingUp,
  Clock,
} from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDashboardKpis, getTimeSeries } from "@/lib/services/analytics";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { AnalyticsView } from "@/components/dashboard/analytics/analytics-view";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const ctx = await getAuthContext();
  const supabase = await createClient();
  const clinicId = ctx!.clinic.id;

  const [kpis, series] = await Promise.all([
    getDashboardKpis(supabase, clinicId),
    getTimeSeries(supabase, clinicId, 90),
  ]);

  return (
    <>
      <PageHeader title="Analytics" description="Call volume, bookings, and conversion over time." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Calls" value={kpis.totalCalls} icon={PhoneCall} />
        <StatCard label="Total Appointments" value={kpis.totalAppointments} icon={CalendarCheck} accent="emerald" />
        <StatCard label="Conversion Rate" value={`${kpis.conversionRate}%`} icon={TrendingUp} accent="amber" />
        <StatCard label="Avg Call Duration" value={formatDuration(kpis.averageCallDuration)} icon={Clock} />
      </div>

      <AnalyticsView series={series} />
    </>
  );
}
