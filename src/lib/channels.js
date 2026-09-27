/** How many recent channel messages are scanned to build the sidebar. */
const RECENT_LIMIT = 300;

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

    const msgs = await supabase
      .from("channel_messages")
      .select("channel_id, sender_id, message, from_admin, created_at")
      .in(
        "channel_id",
        channels.map((c) => c.id),
      )
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT);

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
