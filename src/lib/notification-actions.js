"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

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
