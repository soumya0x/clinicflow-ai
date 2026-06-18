import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { TableToolbar } from "@/components/dashboard/table-toolbar";
import { Pagination } from "@/components/dashboard/pagination";
import { CallOutcomeBadge } from "@/components/dashboard/status-badge";
import { TranscriptDialog } from "@/components/dashboard/calls/transcript-dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; outcome?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getAuthContext();
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("calls")
    .select("*", { count: "exact" })
    .eq("clinic_id", ctx!.clinic.id);

  if (sp.outcome) query = query.eq("outcome", sp.outcome);
  if (sp.search) query = query.ilike("caller_phone", `%${sp.search}%`);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <>
      <PageHeader title="Call Logs" description="Every call answered by your AI receptionist." />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <TableToolbar
            searchPlaceholder="Search by caller number…"
            filters={[
              {
                param: "outcome",
                placeholder: "All outcomes",
                options: [
                  { label: "Appointment Booked", value: "appointment_booked" },
                  { label: "Information Requested", value: "information_requested" },
                  { label: "Human Transfer", value: "human_transfer" },
                  { label: "Missed Call", value: "missed_call" },
                  { label: "Callback Completed", value: "callback_completed" },
                ],
              },
            ]}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caller</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="w-20">Transcript</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No calls logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                (data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.caller_phone}</TableCell>
                    <TableCell>{formatDateTime(c.created_at)}</TableCell>
                    <TableCell>{formatDuration(c.duration)}</TableCell>
                    <TableCell>
                      <CallOutcomeBadge outcome={c.outcome} />
                    </TableCell>
                    <TableCell>
                      <TranscriptDialog
                        caller={c.caller_phone}
                        transcript={c.transcript}
                        recordingUrl={c.recording_url}
                      />
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
