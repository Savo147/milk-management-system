/** How many recent channel messages are scanned to build the sidebar. */
const RECENT_LIMIT = 300;

/**
 * Who is in each channel, and how many that is.
 *
 * The two kinds answer differently, and that is the whole point of asking.
 * A private channel's members are rows that were written down when it was
 * made, so they are counted. A public channel has no rows at all — "everyone"
 * is not a list, it is the absence of one — so the answer is however many
 * customers are on the books today, and it goes up by itself when a new one
 * is added.
 *
 * A private channel also brings back the ids themselves, so the People
 * list can name them. A public one does not: there is no list to bring, and
 * the screen reading this already holds the customer book.
 *
 * Only worked out for the dairy. A customer cannot read the whole customer
 * book — RLS sees to that — so asking on their behalf would come back with
 * "1 customer" on a channel the whole village is in, which is worse than
 * saying nothing.
 */
async function channelMembers(supabase, channels, isAdmin) {
  const info = new Map();
  if (!isAdmin || !channels.length) return info;

  const privateIds = channels.filter((c) => c.is_private).map((c) => c.id);
  const hasPublic = channels.some((c) => !c.is_private);

  const [everyone, members] = await Promise.all([
    hasPublic
      ? supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
      : Promise.resolve({ count: 0 }),
    privateIds.length
      ? supabase
          .from("channel_members")
          .select("channel_id, customer_id")
          .in("channel_id", privateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const picked = new Map();
  for (const m of members.data ?? []) {
    if (!picked.has(m.channel_id)) picked.set(m.channel_id, []);
    picked.get(m.channel_id).push(m.customer_id);
  }

  for (const c of channels) {
    const ids = picked.get(c.id) ?? [];
    info.set(
      c.id,
      c.is_private
        ? { count: ids.length, ids }
        : { count: everyone.count ?? 0, ids: null },
    );
  }

  return info;
}

/**
 * Every channel this user is allowed to see, with its last line and how much
 * of it they have not read.
 *
 * RLS already hides private channels they are not in, so this asks for all of
 * them and lets the database do the filtering.
 *
 * Never throws — the header must still render if migration 0004 has not been
 * run yet.
 */
export async function getChannels(supabase, user) {
  try {
    // The read marks are keyed by user, not by channel, so they do not have
    // to wait for the channel list — only the messages do.
    const [{ data: channels, error }, reads] = await Promise.all([
      supabase
        .from("channels")
        .select("id, name, description, is_private, announcement_only")
        .order("name"),
      supabase
        .from("channel_reads")
        .select("channel_id, last_read_at")
        .eq("user_id", user.id),
    ]);

    if (error || !channels?.length) return [];

    const [msgs, counts] = await Promise.all([
      supabase
        .from("channel_messages")
        .select("channel_id, sender_id, message, from_admin, created_at")
        .in(
          "channel_id",
          channels.map((c) => c.id),
        )
        .order("created_at", { ascending: false })
        .limit(RECENT_LIMIT),
      channelMembers(supabase, channels, user.role === "admin"),
    ]);

    const readAt = new Map(
      (reads.data ?? []).map((r) => [r.channel_id, r.last_read_at]),
    );

    const last = new Map();
    const unread = new Map();

    // Already newest first, so the first row seen for a channel is its last.
    for (const m of msgs.data ?? []) {
      if (!last.has(m.channel_id)) last.set(m.channel_id, m);

      const seen = readAt.get(m.channel_id);
      const isMine = m.sender_id === user.id;
      const isNew = !seen || new Date(m.created_at) > new Date(seen);

      if (!isMine && isNew) {
        unread.set(m.channel_id, (unread.get(m.channel_id) ?? 0) + 1);
      }
    }

    return channels.map((c) => {
      const tail = last.get(c.id);

      return {
        kind: "channel",
        id: c.id,
        name: c.name,
        description: c.description,
        isPrivate: c.is_private,
        announcementOnly: c.announcement_only,
        // Both null for a customer, who is not shown the list at all.
        members: counts.get(c.id)?.count ?? null,
        // The ids of a private channel's members. null on a public one,
        // where "everybody" is not a list.
        memberIds: counts.get(c.id)?.ids ?? null,
        last: tail?.message ?? null,
        lastAt: tail?.created_at ?? null,
        lastMine: tail ? tail.sender_id === user.id : false,
        unread: unread.get(c.id) ?? 0,
      };
    });
  } catch (err) {
    console.warn("[channels] could not load:", err?.message);
    return [];
  }
}
