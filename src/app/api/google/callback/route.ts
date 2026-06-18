import { NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/google-calendar";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// GET /api/google/callback?code=&state=<clinic_id>
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const clinicId = searchParams.get("state");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !clinicId) {
    return NextResponse.redirect(`${base}/dashboard/settings?error=google_failed`);
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${base}/dashboard/settings?error=no_refresh_token`);
    }

    // Service client: this runs in the OAuth redirect (session cookie may not
    // be present), and we trust the clinic id from `state`.
    const db = createServiceClient();
    await db
      .from("clinics")
      .update({
        google_refresh_token: tokens.refresh_token,
        google_connected: true,
      })
      .eq("id", clinicId);

    return NextResponse.redirect(`${base}/dashboard/settings?google=connected`);
  } catch (err) {
    console.error("[google] callback error", err);
    return NextResponse.redirect(`${base}/dashboard/settings?error=google_failed`);
  }
}
