import { headers } from "next/headers";

/**
 * This app's own origin, for links that have to come back to it — the Google
 * hand-off and the password-reset email.
 *
 * Read off the request rather than hard-coded, so the same build works on
 * localhost and on whatever domain this ends up on. NEXT_PUBLIC_SITE_URL wins
 * when it is set, which is what you want behind a proxy that rewrites Host.
 */
export async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}
