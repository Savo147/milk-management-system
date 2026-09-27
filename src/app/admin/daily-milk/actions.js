"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { after } from "next/server";
import { requireAdmin } from "@/lib/auth";
/**
 * What a day's entry may be. A range, not a list: a customer on 6 L has to
 * be recordable, and the quarter-litre step is only there to keep a slipped
 * keystroke like 2.37 out of the books.
 */
const MAX_LITERS = 99;
const STEP = 0.25;

function isAllowed(n) {
  return (
    Number.isFinite(n) &&
    n >= 0 &&
    n <= MAX_LITERS &&
    Math.abs(n / STEP - Math.round(n / STEP)) < 1e-9
  );
}

/**
 * Delivery status follows from the quantities, so it is derived here rather
 * than being a separate field the admin can set. That keeps "2 L delivered"
 * from ever being saved as "missed".
 */
function deliveryStatus(actual, expected) {
  if (actual === 0) return "missed";
  if (actual < expected) return "partial";
  if (actual > expected) return "extra";
  return "delivered";
}

/**
 * Saves one customer's entry. Its own action, with its own <form> in the row —
 * relying on a shared form plus the submit button's name/value to identify the
 * row is fragile, and got every row saved at once.
 */
export async function saveOneEntry(prevState, formData) {
  const date = String(formData.get("date") ?? "");
  const customerId = String(formData.get("customer_id") ?? "");
  const raw = String(formData.get("qty") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { error: "That date is not valid." };
  if (!customerId) return { error: "Customer not found." };

  const actual = Number(raw);
  if (raw === "" || !isAllowed(actual)) {
    return {
      error: `Quantity must be 0 to ${MAX_LITERS} L, in quarter-liter steps.`,
    };
  }

  const supabase = await createClient();

  // The guard and the customer read go together. The read is the caller's
  // own — RLS applies to it either way — so starting it before the guard has
  // finished gives nothing away, and saves a round trip on every single save.
  //
  // The rate is read here, never taken from the form: it becomes the
  // permanent snapshot this delivery is billed at.
  const [, { data: customer, error: cErr }] = await Promise.all([
    requireAdmin(),
    supabase
      .from("customers")
      .select("id, daily_quantity, rate_per_liter")
      .eq("id", customerId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (cErr || !customer) return { error: "Customer not found." };

  const expected = Number(customer.daily_quantity);

  const { error } = await supabase.from("milk_entries").upsert(
    {
      customer_id: customer.id,
      date,
      expected_quantity: expected,
      actual_quantity: actual,
      rate_per_liter: customer.rate_per_liter,
      delivery_status: deliveryStatus(actual, expected),
    },
    { onConflict: "customer_id,date" },
  );

  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/admin/daily-milk");
  revalidatePath("/admin");

  // The day's stock total follows from the entries; nothing on the screen
  // that just saved is waiting for it. Running it after the response means
  // the button stops spinning two round trips sooner.
  after(async () => {
    await syncStock(supabase, date);
    revalidatePath("/admin/stock");
    revalidatePath("/admin");
  });

  return { ok: true };
}

/**
 * Keeps milk_stock.delivered_stock equal to what was actually handed out that
 * day. remaining_stock is a generated column, so it follows automatically.
 */
async function syncStock(supabase, date) {
  const { data: entries } = await supabase
    .from("milk_entries")
    .select("actual_quantity")
    .eq("date", date);

  const delivered = (entries ?? []).reduce(
    (t, e) => t + Number(e.actual_quantity ?? 0),
    0,
  );

  // One upsert rather than look-then-branch: the date is unique, so the
  // database can decide for itself whether this is the day's first entry.
  // Opening and added are left alone — on a new row they take their defaults,
  // on an existing one they keep whatever the Stock page put there.
  await supabase
    .from("milk_stock")
    .upsert({ date, delivered_stock: delivered }, { onConflict: "date" });
}
