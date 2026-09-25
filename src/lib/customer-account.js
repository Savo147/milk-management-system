import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Gives a customer who has just signed in a record in the dairy's books.
 *
 * Without this a new login lands in Settings → Users and nowhere else, and the
 * admin has to notice a banner and go and make the customer by hand. Now they
 * turn up on the Customers page the moment they sign in.
 *
 * Created **inactive**, and this matters. The database refuses a rate of zero,
 * so a brand new row has to carry some number, and a made-up rate that could
 * quietly bill somebody is worse than no row at all. Daily Milk only lists
 * active customers and saveOneEntry refuses the rest, so nothing can be
 * recorded against the placeholder. The admin fills in the mobile, the daily
 * quantity and the real rate, switches them on, and only then do they appear
 * on the round.
 *
 * The service-role client because customers.user_id is not writable by
 * `authenticated` — joining a login to a round is the dairy's business.
 *
 * Never throws: failing to create the record is worth a line in the log, not
 * a refused sign-in.
 */
export async function ensureCustomerRecord(user) {
  if (!user || user.role !== "customer") return;

  try {
    const db = createAdminClient();

    const { data: existing } = await db
      .from("customers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) return;

    const { error } = await db.from("customers").insert({
      user_id: user.id,
      name: user.name?.trim() || user.email?.split("@")[0] || "New customer",
      // Empty, not invented: a wrong number is harder to spot than a blank
      // one, and the Customers page flags the blanks.
      mobile: "",
      daily_quantity: 1,
      rate_per_liter: 1,
      status: "inactive",
    });

    if (error) {
      console.warn("[account] could not create the customer:", error.message);
    }
  } catch (err) {
    console.warn("[account] could not create the customer:", err?.message);
  }
}
