import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withDeadline } from "@/lib/deadline";

/**
 * The signed-in user's profile row, or null.
 *
 * getClaims(), not getSession(): getSession() reads the cookie without
 * checking it, so a forged one would be believed. getClaims() verifies the
 * token's signature against the project's public key.
 *
 * It is also not getUser(), which asks Supabase over the network — measured at
 * ~200ms against ~1ms here, on every single authenticated page. This project
 * signs its tokens with ES256, so the check is done locally with a cached
 * public key; were it ever switched back to a shared secret, getClaims() falls
 * back to getUser() on its own.
 *
 * What getUser() would add is catching an account deleted or banned inside the
 * token's lifetime. The profile read below already covers that: a disabled
 * account fails the status check, and a deleted one has no row left at all.
 *
 * Wrapped in React's cache(): a layout and the page inside it both guard
 * themselves, and without this that is the same row fetched twice on every
 * single navigation. The cache lasts one render and no longer, so it cannot
 * serve one request's user to another.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();

  // getClaims returns { error } for an expired or badly signed token, but
  // throws outright on a malformed one — a header claiming alg "none", say.
  // A junk cookie has to mean "not signed in", not a crashed page.
  let userId;
  try {
    const { data } = await supabase.auth.getClaims();
    userId = data?.claims?.sub;
  } catch (err) {
    console.warn("[auth] unreadable session token:", err?.message);
    return null;
  }

  if (!userId) return null;

  const CORE = "id, name, email, mobile, role, status, profile_photo";

  // theme_mode arrived with migration 0011. Asking for a column the database
  // does not have is an error, not a null — the whole row comes back empty,
  // every guard decides nobody is signed in, and the app locks everyone out
  // of a working login over a preference. So it is asked for separately, and
  // the sign-in path does not depend on the migration having been run.
  const { data: profile } = await supabase
    .from("users")
    .select(`${CORE}, theme_mode`)
    .eq("id", userId)
    .maybeSingle();

  if (profile) return profile;

  const { data: fallback } = await supabase
    .from("users")
    .select(CORE)
    .eq("id", userId)
    .maybeSingle();

  return fallback ?? null;
});

/**
 * Gate for every /admin route. Checked in the layout, on the server — a
 * redirect in proxy.js alone would not be enough, since a client could call the
 * page's data directly.
 */
export async function requireAdmin() {
  const profile = await getCurrentUser();

  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/login?error=inactive");
  if (profile.role !== "admin") redirect("/customer");

  return profile;
}

export async function requireCustomer() {
  const profile = await getCurrentUser();

  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/login?error=inactive");
  if (profile.role !== "customer") redirect("/admin");

  return profile;
}

/**
 * The signed-in customer, together with the dairy's record of them.
 *
 * A login and a customer are two different things here: `users` is who signed
 * in, `customers` is the round the dairy delivers. They are joined by
 * customers.user_id, which the admin sets when creating the login — so a
 * perfectly valid login can still have no customer attached, and every page in
 * this panel has to cope with `customer` being null rather than crash on it.
 *
 * RLS already limits the row to the caller's own, but the filter is written
 * out so the query says what it means.
 */
export async function requireCustomerAccount() {
  const user = await requireCustomer();
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id, name, mobile, address, daily_quantity, rate_per_liter, delivery_time, status",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  return { user, customer: customer ?? null };
}

/**
 * The dairy's name, logo and settings.
 *
 * Held for five minutes, because every single page asks for it and it
 * changes perhaps twice a year — it was costing a round trip to Supabase on
 * every navigation, which is most of what made moving between pages feel
 * slow. Saving on the Settings page clears it.
 *
 * Read with the service key rather than the cookie-based client. It is not
 * request state: the row is the same for everybody, signed in or not.
 */
const FALLBACK_SETTINGS = {
  dairy_name: "Krishna Dairy",
  logo_url: null,
};

/** How long a good answer is kept before asking again. */
const CACHE_MS = 300_000;

/**
 * The last answer the database actually gave, and when.
 *
 * Kept here rather than in `unstable_cache`, and the reason is the failures,
 * not the successes.
 *
 * supabase-js hands a failure back as a value rather than throwing, so the
 * obvious `data ?? defaults` would put *the defaults* into the cache — for
 * the full five minutes, for every visitor. One dropped request on a bad line
 * and the dairy's name and logo quietly revert to the stock ones and stay
 * reverted long after the connection is back. That is the "the old logo is
 * still showing" everybody ends up chasing, and it was real: four such
 * entries were found written to disk.
 *
 * Throwing instead did keep the cache clean — unstable_cache does not store a
 * result it never got — but Next logs every rejection out of a cached
 * function, so on a connection that drops in bursts the dev overlay filled up
 * with an error about a page that had rendered perfectly well.
 *
 * Holding it here answers both. Only a real answer is ever written down, a
 * dropped request falls back to the last real answer rather than to the stock
 * name, and nothing is thrown for Next to shout about. The cost is that each
 * server instance keeps its own copy and a rename can take up to five minutes
 * to reach them all — which is what the five minutes already meant.
 */
let settingsMemo = null;

/** Forgets the memo, so the next read goes to the database. */
export async function clearBrandingMemo() {
  settingsMemo = null;
}

async function loadSettings() {
  if (settingsMemo && Date.now() - settingsMemo.at < CACHE_MS) {
    return settingsMemo.value;
  }

  // The service key, only because the cookie client is off limits in here.
  // Nothing secret lives in this row — it is the shop sign.
  const db = createAdminClient();
  const { data, error } = await db
    .from("business_settings")
    .select("*")
    .maybeSingle();

  if (error) {
    // Stale is better than wrong. Only when there is nothing to be stale with
    // does this become the callers' problem.
    if (settingsMemo) return settingsMemo.value;
    throw new Error(`business_settings: ${error.message}`);
  }

  // No row is a real answer, not a failure — a database nobody has filled in
  // yet. That one is worth remembering.
  const value = data ?? FALLBACK_SETTINGS;
  settingsMemo = { value, at: Date.now() };
  return value;
}

/** Full settings row. Signed-in users only. */
export async function getBusinessSettings() {
  try {
    // Capped as well as caught. Branding is decoration, and on a dead
    // connection waiting the full retry budget for it added seconds to a page
    // that was going to show the default name anyway.
    return await withDeadline(loadSettings(), 2_000, FALLBACK_SETTINGS);
  } catch (err) {
    // Branding is decoration. A dropped connection here must not take down a
    // page that would otherwise work — it just gets the default name.
    console.warn("[auth] settings unreachable, using defaults:", err?.message);
    return FALLBACK_SETTINGS;
  }
}

/**
 * Just the name and logo, for pages a signed-out visitor can reach — the
 * login screen, the password-reset screens, and the browser tab's icon.
 *
 * This used to ask Supabase with the anon key, on the belief that anon had
 * been granted these two columns. It had not: every such request came back
 * 42501 and silently fell through to the defaults below, so those screens
 * showed the stock logo no matter what Settings said.
 *
 * It reads the same cached row the rest of the app does and picks the two
 * fields out. That row is fetched with the service key, which never leaves
 * the server; what is handed out here is the shop sign, not the settings.
 */
export async function getPublicBranding() {
  try {
    const { dairy_name, logo_url } = await loadSettings();
    return { dairy_name, logo_url: logo_url ?? null };
  } catch (err) {
    // The login screen has to render even when nothing else can: somebody
    // staring at a crash cannot tell a flaky connection from a broken app.
    console.warn("[auth] branding unreachable, using defaults:", err?.message);
    return { dairy_name: FALLBACK_SETTINGS.dairy_name, logo_url: null };
  }
}
