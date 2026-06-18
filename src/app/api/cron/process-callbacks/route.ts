import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processCallback } from "@/lib/services/missed-calls";
import type { Clinic, MissedCall } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Missed-call recovery worker. Triggered by Vercel Cron (e.g. every minute).
 * Uses the SERVICE ROLE client (no user session). Protected by CRON_SECRET.
 *
 * Finds missed calls whose next_attempt_at is due and are still pending/in
 * progress, then processes one callback attempt for each.
 */
async function handle(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const nowISO = new Date().toISOString();

  const { data: due, error } = await db
    .from("missed_calls")
    .select("*")
    .lte("next_attempt_at", nowISO)
    .in("callback_status", ["pending", "in_progress"])
    .order("next_attempt_at", { ascending: true })
    .limit(25);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const missedCalls = (due ?? []) as MissedCall[];
  if (missedCalls.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Cache clinics to avoid refetching for each missed call.
  const clinicCache = new Map<string, Clinic>();
  const results: { id: string; status: string }[] = [];

  for (const mc of missedCalls) {
    let clinic = clinicCache.get(mc.clinic_id);
    if (!clinic) {
      const { data } = await db.from("clinics").select("*").eq("id", mc.clinic_id).single();
      if (!data) continue;
      clinic = data as Clinic;
      clinicCache.set(mc.clinic_id, clinic);
    }
    try {
      const r = await processCallback(db, clinic, mc);
      results.push({ id: mc.id, status: r.status });
    } catch (err) {
      console.error("[cron] callback failed for", mc.id, err);
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

export const GET = handle;
export const POST = handle;
