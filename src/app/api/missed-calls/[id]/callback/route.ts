import { requireAuth, UnauthorizedError } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { processCallback } from "@/lib/services/missed-calls";

export const dynamic = "force-dynamic";

// POST /api/missed-calls/:id/callback — manually trigger a callback attempt.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth();
    const supabase = await createClient();
    const { id } = await params;

    const { data: missed } = await supabase
      .from("missed_calls")
      .select("*")
      .eq("id", id)
      .eq("clinic_id", ctx.clinic.id)
      .single();

    if (!missed) return fail("Missed call not found", 404);
    if (missed.callback_status === "recovered") {
      return fail("This call is already recovered", 409);
    }

    const result = await processCallback(supabase, ctx.clinic, missed);
    return ok(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) return fail("Unauthorized", 401);
    console.error("[callback] error", err);
    return fail(err instanceof Error ? err.message : "Internal error", 500);
  }
}
