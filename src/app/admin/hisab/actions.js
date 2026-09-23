"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

function refresh() {
  revalidatePath("/admin/hisab");
  revalidatePath("/admin");
}

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Sets how much a customer has paid for one span of days.
 *
 * The amount is the span's running total, not an addition — the dialog shows
 * that span's bill and the box is pre-filled with it, so typing what is on
 * screen has to mean "this much has come in", never "add this much again".
 *
 * Payments are dated rows, so the span's payments are replaced with a single
 * row for the new figure. That keeps the number the screen shows and the
 * number in the database the same thing.
 */
export async function recordPayment(prevState, formData) {
  // A Server Action is a public endpoint; the page guard does not cover it.
  const admin = await requireAdmin();

  const customerId = String(formData.get("customer_id") ?? "");
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const paidOn = String(formData.get("paid_on") ?? "");
  const amount = Number(formData.get("amount"));

  if (!customerId) return { error: "Customer not found." };
  if (!isDate(from) || !isDate(to) || !isDate(paidOn)) {
    return { error: "That date is not valid." };
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "The amount must be 0 or more." };
  }

  const supabase = await createClient();

  const { error: delErr } = await supabase
    .from("payments")
    .delete()
    .eq("customer_id", customerId)
    .gte("paid_on", from)
    .lte("paid_on", to);

  if (delErr) return { error: `Could not save: ${delErr.message}` };

  if (amount > 0) {
    // Dated inside the span, so re-opening the same span reads it back.
    const on = paidOn >= from && paidOn <= to ? paidOn : to;

    const { error } = await supabase.from("payments").insert({
      customer_id: customerId,
      amount,
      paid_on: on,
      created_by: admin.id,
    });

    if (error) return { error: `Could not save: ${error.message}` };
  }

  refresh();
  return { ok: true };
}
