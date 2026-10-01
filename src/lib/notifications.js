import { createClient } from "@/lib/supabase/server";
import { NOTIFY_TYPES } from "@/lib/notify-types";

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
      .in("type", NOTIFY_TYPES)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("type", NOTIFY_TYPES)
      .eq("is_read", false),
  ]);

  return {
    notifications: list.data ?? [],
    unread: count.count ?? 0,
  };
}

/** How many rows one page of the full list holds. */
export const NOTIFICATIONS_PER_PAGE = 30;

/**
 * One page of the whole list, for the "View all" screen.
 *
 * The bell only ever carries the newest fifteen — enough for a glance, and
 * anything older than that had nowhere to be read. This is that somewhere.
 * `total` comes back so the page can say how far along it is and whether
 * there is another one.
 */
export async function getAllNotifications(userId, page = 1, tab = "unread") {
  const supabase = await createClient();
  const from = (page - 1) * NOTIFICATIONS_PER_PAGE;
  const wantRead = tab === "read";

  // The two counts are wanted whichever tab is showing — they are what the
  // tab labels say, and a tab that cannot tell you it is empty is no use.
  const countFor = (isRead) =>
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("type", NOTIFY_TYPES)
      .eq("is_read", isRead);

  const [list, unreadCount, readCount] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, message, type, reference_id, is_read, created_at")
      .eq("user_id", userId)
      .in("type", NOTIFY_TYPES)
      .eq("is_read", wantRead)
      .order("created_at", { ascending: false })
      .range(from, from + NOTIFICATIONS_PER_PAGE - 1),
    countFor(false),
    countFor(true),
  ]);

  const unread = unreadCount.count ?? 0;
  const read = readCount.count ?? 0;

  return {
    notifications: list.data ?? [],
    // What this tab holds, which is what the pager counts through.
    total: wantRead ? read : unread,
    unread,
    read,
    error: list.error ?? null,
  };
}
