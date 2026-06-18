import { ForbiddenError, requireAuth } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/api";
import { updateClinicSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/settings — current clinic settings
export const GET = withErrorHandling(async () => {
  const ctx = await requireAuth();
  return ok(ctx.clinic);
});

// PATCH /api/settings — update clinic settings/branding (admin only)
export const PATCH = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  if (ctx.profile.role !== "admin") {
    throw new ForbiddenError("Only admins can change clinic settings");
  }

  const supabase = await createClient();
  const updates = updateClinicSchema.parse(await req.json());

  const { data, error } = await supabase
    .from("clinics")
    .update(updates)
    .eq("id", ctx.clinic.id)
    .select("*")
    .single();
  if (error) throw error;

  return ok(data);
});
