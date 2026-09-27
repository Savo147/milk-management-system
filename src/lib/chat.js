import { createClient } from "@/lib/supabase/server";
import { getChannels } from "@/lib/channels";

/** How many recent messages are scanned to build the admin's thread list. */
const RECENT_LIMIT = 200;

/** A customer talks in exactly one thread — the one on their customer row. */
export async function getMyCustomerId(supabase, userId) {
  const { data } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * What the chat button in the header needs: the threads to list and how many
 * messages are waiting.
 *
 * The admin gets one entry per customer who has ever written; a customer gets
 * at most their own. Loaded in the layout alongside the notifications, so the
 * badge is right on the first paint rather than after a client fetch.
 *
 * Never throws — the header must render even if the table is missing because
 * migration 0003 has not been run yet.
 */
export async function getChat(user) {
  const isAdmin = user.role === "admin";

  try {
    const supabase = await createClient();

    const [dms, channels] = await Promise.all([
      isAdmin ? adminChat(supabase) : customerChat(supabase, user),
      getChannels(supabase, user),
    ]);

    return { ...dms, channels };
  } catch (err) {
    console.warn("[chat] could not load threads:", err?.message);
    return { isAdmin, customerId: null, threads: [], channels: [] };
  }
}

async function customerChat(supabase, user) {
  const customerId = await getMyCustomerId(supabase, user.id);
  if (!customerId) return { isAdmin: false, customerId: null, threads: [] };

  const [last, unread] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("message, from_admin, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("from_admin", true)
      .eq("is_read", false),
  ]);

  const tail = last.data?.[0] ?? null;

  return {
    isAdmin: false,
    customerId,
    threads: [
      {
        kind: "dm",
        id: customerId,
        customerId,
        // Left for the header to fill in from the dairy settings, so a
        // renamed dairy is not still called by its old name in here.
        name: null,
        last: tail?.message ?? null,
        lastAt: tail?.created_at ?? null,
        // Whether the reader wrote it, so the preview can say "You: …".
        lastMine: tail ? !tail.from_admin : false,
        unread: unread.count ?? 0,
      },
    ],
  };
}

async function adminChat(supabase) {
  // Two queries rather than one per customer: the recent slice gives every
  // thread its last line, and the unread slice is small enough to count in JS.
  const [recent, waiting] = await Promise.all([
    supabase
      .from("chat_messages")
      .select(
        "customer_id, message, from_admin, created_at, customers(name, users(profile_photo))",
      )
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from("chat_messages")
      .select("customer_id")
      .eq("from_admin", false)
      .eq("is_read", false),
  ]);

  const unreadBy = new Map();
  for (const m of waiting.data ?? []) {
    unreadBy.set(m.customer_id, (unreadBy.get(m.customer_id) ?? 0) + 1);
  }

  // Already newest first, so the first row seen for a customer is their last.
  const threads = new Map();
  for (const m of recent.data ?? []) {
    if (threads.has(m.customer_id)) continue;
    threads.set(m.customer_id, {
      kind: "dm",
      id: m.customer_id,
      customerId: m.customer_id,
      name: m.customers?.name ?? "—",
      photo: m.customers?.users?.profile_photo ?? null,
      last: m.message,
      lastAt: m.created_at,
      lastMine: m.from_admin,
      unread: unreadBy.get(m.customer_id) ?? 0,
    });
  }

  return { isAdmin: true, customerId: null, threads: [...threads.values()] };
}
