import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

// GET /api/google/connect — admin starts the Google Calendar OAuth flow.
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL));
  if (ctx.profile.role !== "admin") {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=admin_required", process.env.NEXT_PUBLIC_APP_URL)
    );
  }
  // Pass the clinic id via state so the callback knows which tenant to update.
  const url = getGoogleAuthUrl(ctx.clinic.id);
  return NextResponse.redirect(url);
}
