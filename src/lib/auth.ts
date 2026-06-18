import { createClient } from "@/lib/supabase/server";
import type { AppUser, Clinic } from "@/types/database";

export interface AuthContext {
  userId: string;
  email: string | null;
  profile: AppUser;
  clinic: Clinic;
}

/**
 * Resolve the authenticated user's profile + clinic.
 * Returns null when there is no valid session or profile.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", profile.clinic_id)
    .single();
  if (!clinic) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    clinic,
  };
}

/** Throw-style guard for API routes. */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new UnauthorizedError();
  return ctx;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
