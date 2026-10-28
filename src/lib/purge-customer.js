/**
 * Taking a customer off the books for good — the person, their milk, their
 * money, their complaints.
 *
 * Written out table by table rather than leaning on the database's own
 * cascade rules, because those are not all the same. Some columns are set to
 * null when their parent goes instead of following it out, which would leave
 * an entry with no customer on it: a litre of milk nobody took, sitting in
 * next month's totals. The order below is children first, so no foreign key
 * ever stands in the way.
 *
 * Takes the service-role client as an argument rather than making its own.
 * Its one caller — deleting a login in Settings → Users — has already
 * checked that the caller is the dairy. Nothing in here checks that, so
 * nothing in here should be reachable without it.
 *
 * It is a file of its own rather than forty lines in the middle of that
 * action, and it stays one if a second way to remove a customer is ever
 * added: the order below is the kind of thing that gets copied with one
 * table missing.
 *
 * The login itself is not touched here. The caller deals with that.
 */
export async function purgeCustomer(db, customerId) {
  // Replies hang off the complaints, not off the customer, so they have to
  // be found through them.
  const { data: reports } = await db
    .from("reports")
    .select("id")
    .eq("customer_id", customerId);

  if (reports?.length) {
    await db
      .from("report_replies")
      .delete()
      .in(
        "report_id",
        reports.map((r) => r.id),
      );
  }

  for (const table of [
    "reports",
    "chat_messages",
    "channel_members",
    "customer_leaves",
    "payments",
    "milk_entries",
    "milk_rates",
  ]) {
    const { error } = await db.from(table).delete().eq("customer_id", customerId); // prettier-ignore

    // A table that has not been created yet is not a failure —
    // channel_members arrives with migration 0004 and customer_leaves with
    // 0019, and a dairy that has run neither still has customers to remove.
    if (error && error.code !== "42P01") {
      return { error: `Could not clear ${table}: ${error.message}` };
    }
  }

  const { error } = await db.from("customers").delete().eq("id", customerId);
  if (error) return { error: `Could not delete: ${error.message}` };

  return { ok: true };
}
