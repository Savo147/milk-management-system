import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

/** Full settings row. Signed-in users only. */
export async function getBusinessSettings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_settings")
    .select("*")
    .maybeSingle();

  return (
    data ?? { dairy_name: "Krishna Dairy", logo_url: null, low_stock_threshold: 20 }
  );
}

/**
 * Just the name and logo, for pages a signed-out visitor can reach.
 * Selecting only these two columns matters: anon is granted those columns and
 * no others, so `select("*")` would be refused.
 */
export async function getPublicBranding() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_settings")
    .select("dairy_name, logo_url")
    .maybeSingle();

  return data ?? { dairy_name: "Krishna Dairy", logo_url: null };
}
