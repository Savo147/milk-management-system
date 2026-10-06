"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { todayLocal } from "@/lib/range";

function refresh() {
  revalidatePath("/admin/hisab");
  revalidatePath("/admin");
  // The customer's own copy of the same account.
  revalidatePath("/customer/my-hisab");
  revalidatePath("/customer");
}

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Writes down money received.
 *
 * The date matters more than it looks: the next bill starts the morning
 * after it. That is the whole shape of the book — milk up to the day they
 * paid is finished business, milk after it is what they owe now — so a
 * payment dated into the future would settle milk nobody has delivered yet.
 * Today is as late as it may be.
 *
 * It no longer has to fall inside the month on the picker. The bill is read
 * from every payment on record rather than one month's worth, so pinning the
 * date to the month being viewed was only ever bending the truth to fit the
 * query.
 */
export async function recordPayment(prevState, formData) {
  // A Server Action is a public endpoint; the page guard does not cover it.
  const admin = await requireAdmin();

  const customerId = String(formData.get("customer_id") ?? "");
  const paidOn = String(formData.get("paid_on") ?? "");
  const amount = Number(formData.get("amount"));

  if (!customerId) return { error: "Customer not found." };
  if (!isDate(paidOn)) return { error: "That date is not valid." };
  if (paidOn > todayLocal()) {
    return { error: "A payment cannot be dated in the future." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount greater than 0." };
  }

  const supabase = await createClient();

  // Added to what is already there, never in its place. A customer pays a
  // bill in two or three goes, and each one is a row of its own — the sum is
  // what the account is read from.
  const { error } = await supabase.from("payments").insert({
    customer_id: customerId,
    amount,
    paid_on: paidOn,
    created_by: admin.id,
  });

  if (error) return { error: `Could not save: ${error.message}` };

  refresh();
  return { ok: true };
}
