import { requireAuth } from "@/lib/auth";
import { created, getPagination, ok, withErrorHandling } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createPatientSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/patients?search=&page=&pageSize=
export const GET = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const url = new URL(req.url);
  const { page, pageSize, from, to } = getPagination(url);

  let query = supabase
    .from("patients")
    .select("*", { count: "exact" })
    .eq("clinic_id", ctx.clinic.id);

  const search = url.searchParams.get("search");
  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

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

// POST /api/patients
export const POST = withErrorHandling(async (req) => {
  const limited = enforceRateLimit(req, { prefix: "patient", limit: 30 });
  if (limited) return limited;

  const ctx = await requireAuth();
  const supabase = await createClient();
  const input = createPatientSchema.parse(await req.json());

  const { data, error } = await supabase
    .from("patients")
    .upsert(
      {
        clinic_id: ctx.clinic.id,
        name: input.name,
        phone: normalizePhone(input.phone),
        email: input.email ?? null,
        notes: input.notes ?? null,
      },
      { onConflict: "clinic_id,phone" }
    )
    .select("*")
    .single();
  if (error) throw error;

  return created(data);
});
