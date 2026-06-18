import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { TableToolbar } from "@/components/dashboard/table-toolbar";
import { Pagination } from "@/components/dashboard/pagination";
import { NewPatientDialog } from "@/components/dashboard/patients/new-patient-dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getAuthContext();
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("patients")
    .select("*", { count: "exact" })
    .eq("clinic_id", ctx!.clinic.id);

  if (sp.search) {
    query = query.or(`name.ilike.%${sp.search}%,phone.ilike.%${sp.search}%`);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <>
      <PageHeader title="Patients" description="Your clinic's patient records.">
        <NewPatientDialog />
      </PageHeader>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <TableToolbar searchPlaceholder="Search by name or phone…" />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>Last appointment</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No patients found.
                  </TableCell>
                </TableRow>
              ) : (
                (data ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.phone}</TableCell>
                    <TableCell>{p.email ?? "—"}</TableCell>
                    <TableCell>{p.total_calls}</TableCell>
                    <TableCell>
                      {p.last_appointment ? formatDate(p.last_appointment) : "—"}
                    </TableCell>
                    <TableCell>{formatDate(p.created_at)}</TableCell>
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
