import { createClient } from "@/lib/supabase/server";

/**
 * The bell's contents for one user: the latest few, and how many are unread.
 *
 * Only problem notifications. The table can hold other types, but the bell is
 * for what a customer says — a stock or billing note is not something to
 * interrupt anyone about.
 *
 * RLS already limits a user to their own rows, but the id is passed explicitly
 * so the query says what it means rather than relying on the policy alone.
 */
export async function getNotifications(userId, limit = 15) {
  const supabase = await createClient();

  const [list, count] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, message, type, reference_id, is_read, created_at")
      .eq("user_id", userId)
      .eq("type", "problem")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "problem")
      .eq("is_read", false),
  ]);

  return {
    notifications: list.data ?? [],
    unread: count.count ?? 0,
  };
}
