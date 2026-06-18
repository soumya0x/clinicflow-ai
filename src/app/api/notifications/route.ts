import { requireAuth } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/notifications?unread=true
export const GET = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const unread = new URL(req.url).searchParams.get("unread") === "true";

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("clinic_id", ctx.clinic.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (unread) query = query.eq("read", false);

  const { data, error } = await query;
  if (error) throw error;
  return ok(data ?? []);
});

// PATCH /api/notifications — mark read. Body: { id } or { all: true }
export const PATCH = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const body = await req.json();

  let query = supabase
    .from("notifications")
    .update({ read: true })
    .eq("clinic_id", ctx.clinic.id);
  if (!body.all && body.id) query = query.eq("id", body.id);

  const { error } = await query;
  if (error) throw error;
  return ok({ updated: true });
});
