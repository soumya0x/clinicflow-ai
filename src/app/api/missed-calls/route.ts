import { requireAuth } from "@/lib/auth";
import { created, fail, getPagination, ok, withErrorHandling } from "@/lib/api";
import {
  createMissedCallSchema,
  updateMissedCallSchema,
} from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/missed-calls?status=&filter=recovered|pending|failed&page=&pageSize=
export const GET = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const url = new URL(req.url);
  const { page, pageSize, from, to } = getPagination(url);

  let query = supabase
    .from("missed_calls")
    .select("*, callback_logs(*)", { count: "exact" })
    .eq("clinic_id", ctx.clinic.id);

  // UI filter tabs map to callback_status.
  const filter = url.searchParams.get("filter");
  if (filter === "recovered") query = query.eq("callback_status", "recovered");
  else if (filter === "failed") query = query.eq("callback_status", "failed");
  else if (filter === "pending")
    query = query.in("callback_status", ["pending", "in_progress"]);

  const status = url.searchParams.get("status");
  if (status) query = query.eq("callback_status", status);

  query = query.order("missed_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return ok({
    items: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
});

// POST /api/missed-calls  (manual creation; webhook also creates these)
export const POST = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const input = createMissedCallSchema.parse(await req.json());

  const { data, error } = await supabase
    .from("missed_calls")
    .insert({
      clinic_id: ctx.clinic.id,
      caller_phone: normalizePhone(input.caller_phone),
      missed_at: input.missed_at ?? new Date().toISOString(),
      next_attempt_at: new Date(
        Date.now() + ctx.clinic.callback_delay_seconds * 1000
      ).toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  return created(data);
});

// PATCH /api/missed-calls
export const PATCH = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const { id, ...updates } = updateMissedCallSchema.parse(await req.json());

  const { data, error } = await supabase
    .from("missed_calls")
    .update(updates)
    .eq("id", id)
    .eq("clinic_id", ctx.clinic.id)
    .select("*")
    .single();
  if (error) throw error;
  if (!data) return fail("Missed call not found", 404);

  return ok(data);
});
