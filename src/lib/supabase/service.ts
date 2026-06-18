import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. BYPASSES RLS — server-only.
 *
 * Use ONLY in trusted, sessionless contexts:
 *   - the Vapi webhook (no user session during a phone call)
 *   - the missed-call recovery cron worker
 *
 * These paths must resolve clinic_id from the inbound phone number,
 * never from untrusted request input.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
