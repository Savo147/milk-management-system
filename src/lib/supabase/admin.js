import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { fetchWithRetry } from "./fetch";

/**
 * Service-role client. Bypasses RLS and the column grants, so it is the only
 * way to change a user's role or status — migration 0002 deliberately took
 * those columns away from `authenticated` so nobody could promote themselves.
 *
 * Server-only, and only ever behind a requireAdmin() check. Never import this
 * into a "use client" file: the key would ship to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetchWithRetry },
    },
  );
}
