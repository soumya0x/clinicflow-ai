import type { DBClient } from "@/lib/services/patients";
import type { Clinic } from "@/types/database";
import { normalizePhone } from "@/lib/utils";

/**
 * Resolve a clinic (tenant) from the phone number that was called.
 * Used by sessionless trusted contexts (Vapi webhook) with the service client.
 * Falls back to a configured default clinic id for local testing.
 */
export async function resolveClinicByPhone(
  db: DBClient,
  calledNumber: string | null | undefined
): Promise<Clinic | null> {
  if (calledNumber) {
    const phone = normalizePhone(calledNumber);
    const { data } = await db
      .from("clinics")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();
    if (data) return data;
  }

  const fallbackId = process.env.DEFAULT_CLINIC_ID;
  if (fallbackId) {
    const { data } = await db
      .from("clinics")
      .select("*")
      .eq("id", fallbackId)
      .maybeSingle();
    if (data) return data;
  }

  return null;
}
