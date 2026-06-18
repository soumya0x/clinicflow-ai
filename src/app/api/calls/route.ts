import { requireAuth } from "@/lib/auth";
import { created, getPagination, ok, withErrorHandling } from "@/lib/api";
import { createCallSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/calls?outcome=&search=&page=&pageSize=
export const GET = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const url = new URL(req.url);
  const { page, pageSize, from, to } = getPagination(url);

  let query = supabase
    .from("calls")
    .select("*, patient:patients(id, name)", { count: "exact" })
    .eq("clinic_id", ctx.clinic.id);

  const outcome = url.searchParams.get("outcome");
  if (outcome) query = query.eq("outcome", outcome);

  const search = url.searchParams.get("search");
  if (search) query = query.ilike("caller_phone", `%${search}%`);

  query = query.order("created_at", { ascending: false }).range(from, to);

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

// POST /api/calls  (manual log; the Vapi webhook also writes calls)
export const POST = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const input = createCallSchema.parse(await req.json());

  const { data, error } = await supabase
    .from("calls")
    .insert({
      clinic_id: ctx.clinic.id,
      caller_phone: normalizePhone(input.caller_phone),
      transcript: input.transcript ?? null,
      duration: input.duration,
      outcome: input.outcome ?? null,
      vapi_call_id: input.vapi_call_id ?? null,
      recording_url: input.recording_url ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;

  return created(data);
});
