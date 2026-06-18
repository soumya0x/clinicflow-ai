import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { TableToolbar } from "@/components/dashboard/table-toolbar";
import { Pagination } from "@/components/dashboard/pagination";
import { AppointmentStatusBadge } from "@/components/dashboard/status-badge";
import { NewAppointmentDialog } from "@/components/dashboard/appointments/new-appointment-dialog";
import { AppointmentActions } from "@/components/dashboard/appointments/appointment-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import type { AppointmentStatus, BookingSource } from "@/types/database";

type AppointmentRow = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  booking_source: BookingSource;
  estimated_value: number;
  status: AppointmentStatus;
  patient: { name: string | null; phone: string | null } | null;
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getAuthContext();
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("appointments")
    .select("*, patient:patients(name, phone)", { count: "exact" })
    .eq("clinic_id", ctx!.clinic.id);

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.date) query = query.eq("appointment_date", sp.date);

  const { data, count } = await query
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <>
      <PageHeader title="Appointments" description="Manage and track all bookings.">
        <NewAppointmentDialog />
      </PageHeader>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <TableToolbar
            searchPlaceholder="Search appointments…"
            filters={[
              {
                param: "status",
                placeholder: "All statuses",
                options: [
                  { label: "Scheduled", value: "scheduled" },
                  { label: "Confirmed", value: "confirmed" },
                  { label: "Completed", value: "completed" },
                  { label: "Cancelled", value: "cancelled" },
                  { label: "No Show", value: "no_show" },
                ],
              },
            ]}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Est. value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                ((data ?? []) as unknown as AppointmentRow[]).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <div>{a.patient?.name ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{a.patient?.phone}</div>
                    </TableCell>
                    <TableCell>{formatDate(a.appointment_date)}</TableCell>
                    <TableCell>{String(a.appointment_time).slice(0, 5)}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{a.reason ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{titleCase(a.booking_source)}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(a.estimated_value))}</TableCell>
                    <TableCell>
                      <AppointmentStatusBadge status={a.status} />
                    </TableCell>
                    <TableCell>
                      <AppointmentActions id={a.id} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} total={count ?? 0} />
        </CardContent>
      </Card>
    </>
  );
}
