"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getPublicBranding } from "@/lib/auth";
import { getMyCustomerId } from "@/lib/chat";
import { ISSUE_TYPE, PROBLEM_STATE, problemState } from "@/lib/constants";
import { setProblemStatus } from "@/app/admin/problems/actions";

const MAX_LENGTH = 2000;

/** How long a link to an attachment stays good for. */
const SIGNED_URL_TTL = 60 * 60;

/**
 * Which thread this caller is allowed to touch.
 *
 * A Server Action is a public endpoint, so the id that arrives from the
 * browser is untrusted. For a direct message an admin may name any customer,
 * while a customer is pinned to their own thread whatever they send. For a
 * channel the id is passed through and the database's policies decide — they
 * are the ones that know who is in a private channel.
 */
async function resolveTarget(user, supabase, kind, id) {
  if (kind === "channel") {
    return typeof id === "string" && id ? id : null;
  }

  if (user.role === "admin") {
    return typeof id === "string" && id ? id : null;
  }

  return await getMyCustomerId(supabase, user.id);
}

/**
 * Short-lived links for whatever files these messages carry.
 *
 * Signed with the service key on purpose. The bucket grants nobody a read
 * policy, so a file has no reachable URL of its own; the rows handed in here
 * have already come back through RLS, which means the caller was allowed to
 * see the message — and therefore its attachment. Putting a read policy on
 * the bucket instead would open every file to anyone who guessed a path.
 */
async function signAttachments(rows) {
  const paths = rows.map((m) => m.attachment_path).filter(Boolean);
  if (paths.length === 0) return new Map();

  try {
    const storage = createAdminClient().storage.from("chat-files");
    const { data } = await storage.createSignedUrls(paths, SIGNED_URL_TTL);

    return new Map(
      (data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]),
    );
  } catch (err) {
    // A thread whose files will not sign still reads fine without them.
    console.warn("[chat] could not sign attachments:", err?.message);
    return new Map();
  }
}

/**
 * A customer's complaints, and the answers to them, as thread items.
 *
 * The Problems page and the chat were two places holding one conversation:
 * someone says the milk did not come, and half the exchange is over there.
 * These are folded into the direct thread so the whole story reads in one
 * column. They stay read-only — a complaint's status is still the Problems
 * page's business — and they are marked so the bubble can say what they are.
 */
async function complaintItems(supabase, customerId, user) {
  const { data: reports } = await supabase
    .from("reports")
    .select("id, issue_type, message, status, created_at")
    .eq("customer_id", customerId)
    .order("created_at");

  if (!reports?.length) return [];

  const { data: replies } = await supabase
    .from("report_replies")
    .select(
      "id, report_id, message, created_at, users(name, role, profile_photo)",
    )
    .in(
      "report_id",
      reports.map((r) => r.id),
    )
    .order("created_at");

  const isAdmin = user.role === "admin";

  const items = reports.map((r) => ({
    // Prefixed: a report's id and a message's id are both uuids and could
    // otherwise collide as React keys.
    id: `report:${r.id}`,
    message: r.message,
    created_at: r.created_at,
    // A complaint is always written by the customer.
    mine: !isAdmin,
    sender_name: null,
    showSender: false,
    attachment: null,
    complaint: {
      reportId: r.id,
      issue: ISSUE_TYPE[r.issue_type] ?? r.issue_type,
      state: PROBLEM_STATE[problemState(r.status)],
      done: problemState(r.status) === "done",
    },
  }));

  for (const rep of replies ?? []) {
    const fromAdmin = rep.users?.role === "admin";

    items.push({
      id: `reply:${rep.id}`,
      message: rep.message,
      created_at: rep.created_at,
      mine: fromAdmin === isAdmin,
      sender_name: rep.users?.name ?? "—",
      photo: rep.users?.profile_photo ?? null,
      showSender: false,
      attachment: null,
    });
  }

  return items;
}

/** Every message in one direct thread or channel, oldest first. */
export async function loadMessages(kind, id, withComplaints = false) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const supabase = await createClient();
  const target = await resolveTarget(user, supabase, kind, id);
  if (!target) return { messages: [] };

  const isChannel = kind === "channel";

  const { data, error } = await supabase
    .from(isChannel ? "channel_messages" : "chat_messages")
    .select(
      "id, message, from_admin, sender_id, created_at, users(name, profile_photo), attachment_path, attachment_name, attachment_type, attachment_size",
    )
    .eq(isChannel ? "channel_id" : "customer_id", target)
    .order("created_at");

  if (error) return { error: error.message };

  const rows = data ?? [];

  // In a channel the dairy posts as the dairy, not as whoever was holding
  // the phone. Two reasons, and the second is the one that shows:
  //
  //   A customer reading a notice wants it to come from Krishna Dairy, not
  //   from a staff member's first name — they have no idea who that is.
  //
  //   And they cannot read that staff row anyway. RLS keeps the users table
  //   to its owners, so the joined name came back null and the circle beside
  //   every notice drew "—".
  const [links, branding] = await Promise.all([
    signAttachments(rows),
    isChannel ? getPublicBranding() : Promise.resolve(null),
  ]);

  const messages = rows.map((m) => ({
    id: m.id,
    message: m.message,
    attachment: m.attachment_path
      ? {
          url: links.get(m.attachment_path) ?? null,
          name: m.attachment_name,
          type: m.attachment_type,
          size: m.attachment_size,
        }
      : null,
    from_admin: m.from_admin,
    created_at: m.created_at,
    sender_name:
      isChannel && m.from_admin
        ? branding.dairy_name
        : (m.users?.name ?? "—"),
    photo:
      isChannel && m.from_admin
        ? branding.logo_url
        : (m.users?.profile_photo ?? null),
    // Whether this bubble is the reader's own, so the client does not have
    // to know the caller's role to lay the thread out. In a channel other
    // people's messages need a name on them; in a direct thread there are
    // only ever two sides, so they do not.
    mine: isChannel
      ? m.sender_id === user.id
      : m.from_admin === (user.role === "admin"),
    showSender: isChannel,
  }));

  // Complaints are a separate conversation, and the sidebar toggle is what
  // says which one is being read: off is the ordinary back-and-forth, on is
  // what was complained about. A channel has no complaints behind it either
  // way.
  if (isChannel || !withComplaints) return { messages };

  const complaints = await complaintItems(supabase, target, user);
  if (complaints.length === 0) return { messages };

  return {
    messages: [...messages, ...complaints].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    ),
  };
}

/**
 * Posts a message into a direct thread or a channel.
 *
 * `attachment` describes a file the browser has already put in Storage; the
 * text may be empty when there is one, which is how a bill gets sent with
 * nothing typed alongside it.
 */
export async function sendMessage(kind, id, message, attachment = null) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const text = String(message ?? "").trim();
  if (!text && !attachment) return { error: "Write something first." };
  if (text.length > MAX_LENGTH) return { error: "That message is too long." };

  const supabase = await createClient();
  const target = await resolveTarget(user, supabase, kind, id);
  if (!target) return { error: "No conversation to send this to." };

  const isAdmin = user.role === "admin";

  const row = {
    sender_id: user.id,
    from_admin: isAdmin,
    message: text,
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_type: attachment?.type ?? null,
    attachment_size: attachment?.size ?? null,
  };

  const { error } =
    kind === "channel"
      ? await supabase
          .from("channel_messages")
          .insert({ ...row, channel_id: target })
      : await supabase
          .from("chat_messages")
          .insert({ ...row, customer_id: target });

  if (error) {
    // The policy is the thing that enforces an announcement channel, so a
    // refused insert is the normal way a customer finds out.
    if (error.code === "42501") {
      return { error: "Only the dairy can post in this channel." };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Clears the badge for whichever conversation was just opened. */
export async function markRead(kind, id) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const supabase = await createClient();
  const target = await resolveTarget(user, supabase, kind, id);
  if (!target) return { ok: true };

  const { error } =
    kind === "channel"
      ? // One high-water mark per reader, rather than a flag per message: the
        // same notice is read by one customer and not by the next.
        await supabase.from("channel_reads").upsert(
          {
            channel_id: target,
            user_id: user.id,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: "channel_id,user_id" },
        )
      : await supabase
          .from("chat_messages")
          .update({ is_read: true })
          .eq("customer_id", target)
          // Only what the other side wrote; your own was never unread.
          .eq("from_admin", user.role !== "admin")
          .eq("is_read", false);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Creates a channel. The dairy only — a customer has no business opening one,
 * and RLS would refuse the insert anyway.
 *
 * A public channel stores no membership at all: "everyone" includes the
 * customer who signs up next week, and a list written today would not.
 */
export async function createChannel({
  name,
  description,
  isPrivate,
  announcementOnly,
  memberIds,
}) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Only the dairy can do that." };

  const title = String(name ?? "").trim();
  if (!title) return { error: "Give the channel a name." };
  if (title.length > 60) return { error: "That name is too long." };

  const supabase = await createClient();

  const { data: channel, error } = await supabase
    .from("channels")
    .insert({
      name: title,
      description: String(description ?? "").trim() || null,
      is_private: Boolean(isPrivate),
      announcement_only: Boolean(announcementOnly),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (isPrivate && memberIds?.length) {
    const { error: memberError } = await supabase
      .from("channel_members")
      .insert(
        memberIds.map((customerId) => ({
          channel_id: channel.id,
          customer_id: customerId,
        })),
      );

    // The channel exists either way; say so rather than pretending it failed.
    if (memberError) {
      return { id: channel.id, error: `Channel made, but: ${memberError.message}` }; // prettier-ignore
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, id: channel.id };
}

/**
 * Changes a channel's name, its description, and — the point of this —
 * whether only the dairy may post in it.
 *
 * Who can *see* a channel is deliberately not editable. Turning a private
 * channel public would hand everything already said in it to people who were
 * never in the room, and going the other way would strand messages behind a
 * wall the people who wrote them can no longer get past. Posting is a rule
 * about what happens next, so it can be turned round freely; visibility is a
 * promise about what has already been said.
 */
export async function updateChannel({
  id,
  name,
  description,
  announcementOnly,
}) {
  // prettier-ignore
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Only the dairy can do that." };

  const title = String(name ?? "").trim();
  if (!title) return { error: "Give the channel a name." };
  if (title.length > 60) return { error: "That name is too long." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("channels")
    .update({
      name: title,
      description: String(description ?? "").trim() || null,
      announcement_only: Boolean(announcementOnly),
    })
    .eq("id", String(id ?? ""))
    .select("id");

  if (error) return { error: error.message };
  // A row the policy hid comes back as no row at all, not as an error.
  if (!data?.length) return { error: "That channel could not be changed." };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Removes a channel and, by cascade, its messages and membership. */
export async function deleteChannel(id) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Only the dairy can do that." };

  const supabase = await createClient();
  const { error } = await supabase.from("channels").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Marks a complaint done, or reopens it, from inside the chat.
 *
 * The Problems page's own action already does the work — the status enum, the
 * resolved date, the note to the customer — so this only shapes the call. It
 * is exported here so the thread does not have to reach into that page's
 * module and build a FormData of its own.
 */
export async function setComplaintStatus(reportId, state) {
  const form = new FormData();
  form.set("report_id", String(reportId ?? ""));
  form.set("status", String(state ?? ""));

  return await setProblemStatus(null, form);
}
