import type { SupabaseClient } from "@supabase/supabase-js";
import type { Patient } from "@/types/database";
import { normalizePhone } from "@/lib/utils";

/**
 * Schema-agnostic Supabase client type. Query results are loosely typed; the
 * application enforces shapes at function boundaries (services, auth context,
 * components) using the domain types in `@/types/database`.
 */
export type DBClient = SupabaseClient;

/**
 * Find a patient by phone within a clinic, or create one. Tenant-scoped via
 * clinic_id. Works with both the RLS (server) client and the service client.
 */
export async function upsertPatientByPhone(
  db: DBClient,
  clinicId: string,
  input: { name: string; phone: string; email?: string | null }
): Promise<Patient> {
  const phone = normalizePhone(input.phone);

  const { data: existing } = await db
    .from("patients")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await db
    .from("patients")
    .insert({
      clinic_id: clinicId,
      name: input.name,
      phone,
      email: input.email ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Increment a patient's call counter (best-effort). */
export async function incrementPatientCalls(
  db: DBClient,
  patientId: string
): Promise<void> {
  const { data } = await db
    .from("patients")
    .select("total_calls")
    .eq("id", patientId)
    .single();
  if (data) {
    await db
      .from("patients")
      .update({ total_calls: (data.total_calls ?? 0) + 1 })
      .eq("id", patientId);
  }
}
