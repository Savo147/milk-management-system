import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Writing somebody else's notification.
 *
 * Every one of these goes through the service-role client, and it has to: a
 * notification is addressed to a *different* person, and row-level security
 * quite rightly stops anyone writing a row that is not theirs. That makes
 * this file one of the few places where the policies are stepped over, so
 * nothing in here is reachable without the caller having been checked first —
 * every function below is called from an action that has already run
 * `requireAdmin()` or `requireCustomer()`.
 *
 * Nothing here throws. A notification is a courtesy on top of something that
 * has already been saved; if it fails, the rate change still happened, and
 * taking the page down to say the bell did not ring would be the worse
 * outcome. It is logged instead.
 */

/** Everyone who runs the dairy. */
export async function notifyAdmins({ title, message, type, referenceId }) {
  try {
    const db = createAdminClient();

    const { data: admins } = await db
      .from("users")
      .select("id")
      .eq("role", "admin")
      .eq("status", "active");

    if (!admins?.length) return;

    await db.from("notifications").insert(
      admins.map((a) => ({
        user_id: a.id,
        title,
        message,
        type,
        reference_id: referenceId ?? null,
      })),
    );
  } catch (err) {
    console.warn("[notify] admins:", err?.message);
  }
}

/**
 * One customer, found by their row in the dairy's books.
 *
 * A customer without a login has nobody to notify — they exist on the round
 * but have never signed in — so this quietly does nothing rather than
 * treating it as a failure.
 */
export async function notifyCustomer({
  customerId,
  title,
  message,
  type,
  referenceId,
}) {
  try {
    const db = createAdminClient();

    const { data: customer } = await db
      .from("customers")
      .select("user_id")
      .eq("id", customerId)
      .maybeSingle();

    const userId = customer?.user_id;
    if (!userId) return;

    await db.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      reference_id: referenceId ?? null,
    });
  } catch (err) {
    console.warn("[notify] customer:", err?.message);
  }
}
