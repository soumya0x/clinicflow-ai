import { requireAuth } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { getDashboardKpis, getTimeSeries } from "@/lib/services/analytics";

export const dynamic = "force-dynamic";

// GET /api/analytics?days=30
export const GET = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const days = Math.min(
    365,
    Math.max(7, Number(new URL(req.url).searchParams.get("days") ?? 30) || 30)
  );

  const [kpis, series] = await Promise.all([
    getDashboardKpis(supabase, ctx.clinic.id),
    getTimeSeries(supabase, ctx.clinic.id, days),
  ]);

  return ok({ kpis, series });
});
