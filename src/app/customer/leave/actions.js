"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getMyCustomerId } from "@/lib/chat";
import { todayLocal } from "@/lib/range";
import { notifyAdmins, notifyCustomer } from "@/lib/notify";
import { formatDate } from "@/lib/format";

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** A year ahead is as far as anybody is planning a festival. */
const MAX_AHEAD_DAYS = 366;

/**
 * What the dairy picks instead of a name when it is not one customer going
 * away but the dairy itself not going out — a festival, a death in the
 * family, a day the buffalo did not give. Everybody gets the day off and
 * everybody is told.
 */
const EVERYBODY = "all";

function refresh() {
  revalidatePath("/customer/leave");
  revalidatePath("/customer");
  revalidatePath("/admin/leaves");
  revalidatePath("/admin/daily-milk");
  revalidatePath("/admin");
}

/**
 * Which customer this caller may book a leave for.
 *
 * A Server Action is a public endpoint, so the id arriving from the browser
 * is untrusted. The dairy may name anybody — leaves get phoned in. A
 * customer is pinned to their own row whatever they send.
 */
async function resolveCustomer(user, supabase, wanted) {
  if (user.role === "admin") {
    return typeof wanted === "string" && wanted ? wanted : null;
  }
  return await getMyCustomerId(supabase, user.id);
}

/**
 * Books days off.
 *
 * Backdating is refused. A leave is a notice — "do not come" — and a notice
 * about last Tuesday is not a notice, it is a correction to the book, which
 * is the Daily Milk page's job. Letting it through would also quietly turn
 * days already counted as missed into days nobody missed, which is a tidy
 * way to lose a real complaint.
 */
export async function bookLeave(prevState, formData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const from = String(formData.get("from_date") ?? "");
  const to = String(formData.get("to_date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!isDate(from) || !isDate(to)) return { error: "Pick both dates." };
  if (to < from) return { error: "The last day cannot be before the first." };

  const today = todayLocal();
  if (from < today) {
    return { error: "Leave can only be booked from today onwards." };
  }

  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + MAX_AHEAD_DAYS);
  if (to > limit.toISOString().slice(0, 10)) {
    return { error: "That is more than a year ahead." };
  }

  if (reason.length > 200) return { error: "That reason is too long." };

  const supabase = await createClient();
  const wanted = formData.get("customer_id");

  // The dairy closing for the day, rather than one customer going away.
  if (user.role === "admin" && wanted === EVERYBODY) {
    return await closeTheRound({ supabase, user, from, to, reason });
  }

  const customerId = await resolveCustomer(user, supabase, wanted);
  if (!customerId) return { error: "Customer not found." };

  // Already covered? Two overlapping leaves change nothing about the days —
  // they are off either way — but they read as a mistake on the dairy's
  // list, and whoever booked the second had usually forgotten the first.
  const { data: clash } = await supabase
    .from("customer_leaves")
    .select("from_date, to_date")
    .eq("customer_id", customerId)
    .lte("from_date", to)
    .gte("to_date", from)
    .maybeSingle();

  if (clash) {
    return {
      error: `Those days are already booked (${formatDate(clash.from_date)} – ${formatDate(clash.to_date)}).`,
    };
  }

  const { error } = await supabase.from("customer_leaves").insert({
    customer_id: customerId,
    from_date: from,
    to_date: to,
    reason: reason || null,
    created_by: user.id,
  });

  if (error) return { error: `Could not save: ${error.message}` };

  const span =
    from === to
      ? formatDate(from)
      : `${formatDate(from)} – ${formatDate(to)}`;

  // Whoever did not do it is the one who needs telling.
  if (user.role === "admin") {
    await notifyCustomer({
      customerId,
      type: "leave",
      title: "Leave recorded",
      message: `No milk will be delivered on ${span}.${reason ? ` (${reason})` : ""}`,
    });
  } else {
    const { data: customer } = await supabase
      .from("customers")
      .select("name")
      .eq("id", customerId)
      .maybeSingle();

    await notifyAdmins({
      type: "leave",
      title: "Customer booked leave",
      message: `${customer?.name ?? "A customer"} wants no milk on ${span}.${reason ? ` (${reason})` : ""}`,

    });
  }

  refresh();
  return { ok: true };
}

/**
 * The dairy not going out at all: a leave for every customer on the books,
 * and a message to each of them.
 *
 * A row per customer rather than one "the dairy is shut" row, because every
 * screen in the app already asks "is this customer off today" and would
 * otherwise have to learn a second question. It also leaves each one
 * cancellable on its own, which is what happens when the dairy decides to
 * do one street after all.
 *
 * Anybody already booked off is skipped rather than refused. They are off
 * either way, and failing the whole thing because one person had already
 * booked that week would be an odd way to close for a festival.
 */
async function closeTheRound({ supabase, user, from, to, reason }) {
  const [{ data: customers }, { data: booked }] = await Promise.all([
    supabase.from("customers").select("id, name").eq("status", "active"),
    supabase
      .from("customer_leaves")
      .select("customer_id")
      .lte("from_date", to)
      .gte("to_date", from),
  ]);

  if (!customers?.length) return { error: "There are no active customers." };

  const already = new Set((booked ?? []).map((l) => l.customer_id));
  const fresh = customers.filter((c) => !already.has(c.id));

  if (fresh.length === 0) {
    return { error: "Everybody is already booked off for those days." };
  }

  const { error } = await supabase.from("customer_leaves").insert(
    fresh.map((c) => ({
      customer_id: c.id,
      from_date: from,
      to_date: to,
      reason: reason || null,
      created_by: user.id,
    })),
  );

  if (error) return { error: `Could not save: ${error.message}` };

  const span =
    from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;

  // One by one, so each customer gets it in their own bell. Told in
  // sequence rather than all at once: on this dairy's line a burst of
  // twenty requests is how a page ends up half-sent.
  for (const c of fresh) {
    await notifyCustomer({
      customerId: c.id,
      type: "leave",
      title: "No milk on these days",
      message: reason
        ? `${reason} — no delivery on ${span}.`
        : `No milk will be delivered on ${span}.`,
    });
  }

  refresh();
  return { ok: true, count: fresh.length };
}

/**
 * Cancels one.
 *
 * Deleted rather than marked off: a leave is a short-lived note about days
 * that have not happened yet, and a cancelled one has nothing left to say.
 * The database's own policy decides whose row this may be — see 0019.
 */
export async function cancelLeave(id) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  if (typeof id !== "string" || !id) return { error: "Leave not found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_leaves")
    .delete()
    .eq("id", id);

  if (error) return { error: `Could not cancel: ${error.message}` };

  refresh();
  return { ok: true };
}
