import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the password-reset email lands.
 *
 * Supabase turns the emailed token into a one-time code and sends the browser
 * here; exchanging it signs the person in briefly, which is what lets them set
 * a new password without knowing the old one. A Route Handler can write
 * cookies, which a Server Component cannot, so this has to be a route.
 *
 * The session it creates is a real one. That is fine — somebody who can read
 * that mailbox can reset the password anyway — but it is why the code is
 * exchanged here and nowhere else.
 */

function back(request, error) {
  const url = new URL("/forgot-password", request.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // An expired or already-used link comes back as an error on the query
  // string, not as a failed request.
  if (searchParams.get("error")) {
    console.error(
      "[auth] reset link rejected:",
      searchParams.get("error_description") ?? searchParams.get("error"),
    );
    return back(request, "link");
  }

  const code = searchParams.get("code");
  if (!code) return back(request, "link");

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth] reset code exchange failed:", error);
    return back(request, "link");
  }

  return NextResponse.redirect(new URL("/reset-password", request.url));
}
