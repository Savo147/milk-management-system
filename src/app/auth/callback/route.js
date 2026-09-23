import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Google sends the browser back to.
 *
 * The session is created here, not on the login page: Google returns a
 * one-time code, and exchangeCodeForSession is what turns it into cookies. A
 * Route Handler can write cookies, which a Server Component cannot, so this
 * has to be a route rather than a page.
 *
 * The same checks the password login makes are repeated here. Signing in is
 * only half of it — a blocked account must not get through just because it
 * came in by a different door.
 */

function back(request, error) {
  const url = new URL("/login", request.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // Google reports a refusal on the query string, not as a failed request.
  if (searchParams.get("error")) {
    console.error(
      "[auth] google returned an error:",
      searchParams.get("error_description") ?? searchParams.get("error"),
    );
    return back(request, "google");
  }

  const code = searchParams.get("code");
  if (!code) return back(request, "google");

  const supabase = await createClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.user) {
    console.error("[auth] code exchange failed:", error);
    return back(request, "google");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, status, profile_photo")
    .eq("id", data.user.id)
    .maybeSingle();

  // The handle_new_user trigger creates this row, so a missing one means
  // something is wrong with the database rather than with the person.
  if (!profile) {
    await supabase.auth.signOut();
    return back(request, "nosetup");
  }

  if (profile.status !== "active") {
    await supabase.auth.signOut();
    return back(request, "inactive");
  }

  // The trigger copies the name across but not the picture. Filled in once,
  // and never overwritten — somebody who has set their own photo should keep
  // it the next time they sign in with Google.
  const picture =
    data.user.user_metadata?.avatar_url ?? data.user.user_metadata?.picture;

  if (!profile.profile_photo && picture) {
    await supabase
      .from("users")
      .update({ profile_photo: picture })
      .eq("id", data.user.id);
  }

  return NextResponse.redirect(
    new URL(profile.role === "admin" ? "/admin" : "/customer", request.url),
  );
}
