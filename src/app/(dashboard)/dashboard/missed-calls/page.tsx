import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { TableToolbar } from "@/components/dashboard/table-toolbar";
import { Pagination } from "@/components/dashboard/pagination";
import {
  CallbackResultBadge,
  CallbackStatusBadge,
} from "@/components/dashboard/status-badge";
import { MissedCallActions } from "@/components/dashboard/missed-calls/missed-call-actions";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PhoneMissed, CheckCircle2, Clock, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function MissedCallsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getAuthContext();
  const supabase = await createClient();
  const clinicId = ctx!.clinic.id;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("missed_calls")
    .select("*", { count: "exact" })
    .eq("clinic_id", clinicId);

  if (sp.filter === "recovered") query = query.eq("callback_status", "recovered");
  else if (sp.filter === "failed") query = query.eq("callback_status", "failed");
  else if (sp.filter === "pending")
    query = query.in("callback_status", ["pending", "in_progress"]);

  const { data, count } = await query
    .order("missed_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  // Summary counts (separate lightweight queries).
  const [pendingC, recoveredC, failedC] = await Promise.all([
    supabase.from("missed_calls").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).in("callback_status", ["pending", "in_progress"]),
    supabase.from("missed_calls").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("callback_status", "recovered"),
    supabase.from("missed_calls").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("callback_status", "failed"),
  ]);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Missed Calls"
        description="Automatic callback recovery for every missed call."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending recovery" value={pendingC.count ?? 0} icon={Clock} accent="amber" />
        <StatCard label="Recovered" value={recoveredC.count ?? 0} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Failed" value={failedC.count ?? 0} icon={XCircle} accent="rose" />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <TableToolbar
            searchPlaceholder="Filter missed calls…"
            filters={[
              {
                param: "filter",
                placeholder: "All",
                options: [
                  { label: "Recovered", value: "recovered" },
                  { label: "Pending", value: "pending" },
                  { label: "Failed", value: "failed" },
                ],
              },
            ]}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caller Number</TableHead>
                <TableHead>Missed Time</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Callback Status</TableHead>
                <TableHead>Final Outcome</TableHead>
                <TableHead>Est. Revenue</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <PhoneMissed className="mx-auto mb-2 h-6 w-6 opacity-50" />
                    No missed calls. Your AI is catching them all.
                  </TableCell>
                </TableRow>
              ) : (
                (data ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.caller_phone}</TableCell>
                    <TableCell>{formatDateTime(m.missed_at)}</TableCell>
                    <TableCell>{m.callback_attempts}</TableCell>
                    <TableCell>
                      <CallbackStatusBadge status={m.callback_status} />
                    </TableCell>
                    <TableCell>
                      <CallbackResultBadge result={m.final_outcome} />
                    </TableCell>
                    <TableCell>{formatCurrency(Number(m.estimated_revenue))}</TableCell>
                    <TableCell>
                      <MissedCallActions id={m.id} status={m.callback_status} />
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
