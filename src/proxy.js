import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth session on every request and writes the rotated
 * cookies back onto the response. Without this, Server Components see an
 * expired token and log the user out mid-session.
 *
 * In Next.js 16 this file is `proxy.js` — the old `middleware.js` convention is
 * deprecated.
 */
export async function proxy(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not remove: this call is what actually refreshes the token — getClaims
  // reads the session first, and reading an expired one is what triggers the
  // refresh whose rotated cookies are written onto the response above.
  //
  // getClaims rather than getUser: this runs on every request in the app, and
  // getUser is a round trip to Supabase — ~200ms measured, against ~1ms to
  // verify the signature here against a cached public key.
  //
  // Wrapped because getClaims throws on a malformed token rather than
  // returning an error. Every route is guarded on the server anyway, so the
  // right thing here is to pass the request on and let the page turn them
  // away — not to fail the request.
  try {
    await supabase.auth.getClaims();
  } catch {
    // A junk cookie. Nothing to refresh.
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
