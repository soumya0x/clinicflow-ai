import {
  PhoneCall,
  CalendarCheck,
  CalendarDays,
  TrendingUp,
  Clock,
  PhoneIncoming,
} from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDashboardKpis, getTimeSeries } from "@/lib/services/analytics";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { AppointmentStatusBadge } from "@/components/dashboard/status-badge";
import { CallsAppointmentsChart } from "@/components/charts/calls-appointments-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDuration } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/database";

type UpcomingRow = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  patient: { name: string | null; phone: string | null } | null;
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  const supabase = await createClient();
  const clinicId = ctx!.clinic.id;

  const [kpis, series, upcoming] = await Promise.all([
    getDashboardKpis(supabase, clinicId),
    getTimeSeries(supabase, clinicId, 14),
    supabase
      .from("appointments")
      .select("*, patient:patients(name, phone)")
      .eq("clinic_id", clinicId)
      .order("appointment_date", { ascending: false })
      .limit(6),
  ]);

  return (
    <>
      <PageHeader
        title={`Welcome back`}
        description="Here's what your AI receptionist has been up to."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Calls" value={kpis.totalCalls} icon={PhoneCall} />
        <StatCard label="Total Appointments" value={kpis.totalAppointments} icon={CalendarCheck} accent="emerald" />
        <StatCard label="Calls Today" value={kpis.callsToday} icon={PhoneIncoming} />
        <StatCard label="Appointments Today" value={kpis.appointmentsToday} icon={CalendarDays} accent="emerald" />
        <StatCard label="Conversion Rate" value={`${kpis.conversionRate}%`} icon={TrendingUp} accent="amber" hint="Calls that booked an appointment" />
        <StatCard label="Avg Call Duration" value={formatDuration(kpis.averageCallDuration)} icon={Clock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calls & appointments (last 14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <CallsAppointmentsChart data={series} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(upcoming.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No appointments yet.
                  </TableCell>
                </TableRow>
              ) : (
                ((upcoming.data ?? []) as unknown as UpcomingRow[]).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.patient?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell>{formatDate(a.appointment_date)}</TableCell>
                    <TableCell>{String(a.appointment_time).slice(0, 5)}</TableCell>
                    <TableCell>
                      <AppointmentStatusBadge status={a.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}