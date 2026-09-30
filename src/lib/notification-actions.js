"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Postgres reports a row that row-level security hid as no row at all, so a
 * blocked delete looks exactly like one that had nothing to delete. The row
 * was on screen a moment ago, so if this fires it is a DELETE policy on the
 * notifications table that is missing, not the row.
 */
const NOT_ALLOWED = "Could not delete this — the database would not allow it.";

/**
 * Marks the signed-in user's unread notifications as read.
 *
 * Scoped to the caller's own id rather than trusting an id from the form —
 * a Server Action is a public endpoint, so anything it is handed is untrusted.
 */
export async function markNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    // Matches what the bell shows; other types are not its business to clear.
    .eq("type", "problem")
    .eq("is_read", false);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Throws one notification away.
 *
 * Scoped to the caller's own id as well as the notification's. A Server
 * Action is a public endpoint, so the id it is handed is untrusted, and
 * `delete` without that second condition would be a way to clear anybody's
 * bell. `select` is on the end so a row blocked by row-level security comes
 * back as nothing deleted rather than as a silent success.
 */
export async function deleteNotification(id) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", String(id ?? ""))
    .eq("user_id", user.id)
    .select("id");

  if (error) return { error: error.message };
  if (!data?.length) return { error: NOT_ALLOWED };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Empties one of the two tabs — read or unread — for this user only.
 *
 * Nothing is lost that matters: a notification is a pointer at a complaint,
 * and the complaint itself lives in `reports`, untouched by this.
 */
export async function deleteNotifications(tab) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("type", "problem")
    .eq("is_read", tab === "read")
    .select("id");

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, deleted: data?.length ?? 0 };
}

/**
 * Marks one notification read — the one that was just opened.
 *
 * Scoped to the caller's own id as well as the notification's, so an id from
 * the browser cannot clear somebody else's bell. A Server Action is a public
 * endpoint; the id it is handed is untrusted.
 */
export async function markNotificationRead(id) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", String(id ?? ""))
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
