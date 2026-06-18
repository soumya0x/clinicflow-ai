import { requireAuth } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { getRevenueData } from "@/lib/services/revenue";

export const dynamic = "force-dynamic";

// GET /api/revenue?months=6
// NOTE: all figures are ESTIMATES (summary.label === "Estimated Revenue").
export const GET = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const months = Math.min(
    24,
    Math.max(1, Number(new URL(req.url).searchParams.get("months") ?? 6) || 6)
  );

  const data = await getRevenueData(supabase, ctx.clinic, months);
  return ok(data);
});
