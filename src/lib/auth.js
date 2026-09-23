import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchWithRetry } from "@/lib/supabase/fetch";
import { BRANDING_TAG } from "@/lib/cache-tags";

/**
 * The signed-in user's profile row, or null.
 *
 * Uses getUser(), not getSession(): getSession() reads the cookie without
 * verifying it, so it can be forged. getUser() checks with Supabase.
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, mobile, role, status, profile_photo")
    .eq("id", user.id)
    .maybeSingle();

  return profile ?? null;
}

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
 * Cached, because every single page asks for it and it changes perhaps twice
 * a year — it was costing a round trip to Supabase on every navigation, which
 * is most of what made moving between login and forgot-password feel slow.
 * Saving on the Settings page clears it through the "branding" tag.
 *
 * unstable_cache cannot see request state, so neither of these may use the
 * cookie-based client. Neither needs to: the row is the same for everybody.
 */
const FALLBACK_SETTINGS = {
  dairy_name: "Krishna Dairy",
  logo_url: null,
  low_stock_threshold: 20,
};

const CACHE = { revalidate: 300, tags: [BRANDING_TAG] };

const loadSettings = unstable_cache(
  async () => {
    // The service key, only because the cookie client is off limits in here.
    // Nothing secret lives in this row — it is the shop sign.
    const db = createAdminClient();
    const { data } = await db
      .from("business_settings")
      .select("*")
      .maybeSingle();

    return data ?? FALLBACK_SETTINGS;
  },
  ["business-settings"],
  CACHE,
);

const loadBranding = unstable_cache(
  async () => {
    // Anon, and only the two columns it is granted — this one answers for
    // visitors who are not signed in at all.
    const db = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: { persistSession: false },
        global: { fetch: fetchWithRetry },
      },
    );

    const { data } = await db
      .from("business_settings")
      .select("dairy_name, logo_url")
      .maybeSingle();

    return data ?? { dairy_name: FALLBACK_SETTINGS.dairy_name, logo_url: null };
  },
  ["public-branding"],
  CACHE,
);

/** Full settings row. Signed-in users only. */
export async function getBusinessSettings() {
  try {
    return await loadSettings();
  } catch (err) {
    // Branding is decoration. A dropped connection here must not take down a
    // page that would otherwise work — it just gets the default name.
    console.warn("[auth] settings unreachable, using defaults:", err?.message);
    return FALLBACK_SETTINGS;
  }
}

/** Just the name and logo, for pages a signed-out visitor can reach. */
export async function getPublicBranding() {
  try {
    return await loadBranding();
  } catch (err) {
    // The login screen has to render even when nothing else can: somebody
    // staring at a crash cannot tell a flaky connection from a broken app.
    console.warn("[auth] branding unreachable, using defaults:", err?.message);
    return { dairy_name: FALLBACK_SETTINGS.dairy_name, logo_url: null };
  }
}
