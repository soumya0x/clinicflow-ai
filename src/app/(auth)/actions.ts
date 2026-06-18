"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations";

export interface ActionState {
  error?: string;
  success?: string;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Sign up: create the auth user, then provision a brand-new clinic (tenant)
 * with this user as its ADMIN. Clinic + profile rows are written with the
 * service client because RLS depends on a users row that doesn't exist yet.
 */
export async function signUpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    clinic_name: formData.get("clinic_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const { full_name, clinic_name, email, password } = parsed.data;

  const supabase = await createClient();
  const { data: auth, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${appUrl()}/auth/callback` },
  });
  if (signUpError) return { error: signUpError.message };
  if (!auth.user) return { error: "Could not create account" };

  const service = createServiceClient();
  const { data: clinic, error: clinicError } = await service
    .from("clinics")
    .insert({
      name: clinic_name,
      phone: "",
      email,
      greeting_message: `Hi! Thanks for calling ${clinic_name}. How can I help you today?`,
    })
    .select("id")
    .single();
  if (clinicError || !clinic) {
    return { error: clinicError?.message ?? "Could not create clinic" };
  }

  const { error: profileError } = await service.from("users").insert({
    id: auth.user.id,
    clinic_id: clinic.id,
    role: "admin",
    full_name,
    email,
  });
  if (profileError) {
    // Roll back the clinic to avoid orphaned tenants.
    await service.from("clinics").delete().eq("id", clinic.id);
    return { error: profileError.message };
  }

  revalidatePath("/", "layout");
  // If email confirmation is enabled, the session won't exist yet.
  if (auth.session) redirect("/dashboard");
  return { success: "Account created. Check your email to confirm, then sign in." };
}

export async function signInAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  const redirectTo = (formData.get("redirect") as string) || "/dashboard";
  redirect(redirectTo);
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid email" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/reset-password`,
  });
  if (error) return { error: error.message };
  return { success: "If that email exists, a reset link is on its way." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
