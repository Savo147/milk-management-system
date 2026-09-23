"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { MILK_QUANTITIES } from "@/lib/constants";

const ALLOWED = new Set([0, ...MILK_QUANTITIES]);

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
  await requireAdmin();

  const date = String(formData.get("date") ?? "");
  const customerId = String(formData.get("customer_id") ?? "");
  const raw = String(formData.get("qty") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { error: "Date barabar nathi." };
  if (!customerId) return { error: "Customer malyo nahi." };

  const actual = Number(raw);
  if (raw === "" || !ALLOWED.has(actual)) {
    return { error: "Quantity 0 thi 5 L, 0.5 na step ma hovi joiye." };
  }

  const supabase = await createClient();

  // The rate is read here, never taken from the form — it becomes the
  // permanent snapshot this delivery is billed at.
  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .select("id, daily_quantity, rate_per_liter")
    .eq("id", customerId)
    .eq("status", "active")
    .maybeSingle();

  if (cErr || !customer) return { error: "Customer malyo nahi." };

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

  if (error) return { error: `Save na thai shakyu: ${error.message}` };

  await syncStock(supabase, date);

  revalidatePath("/admin/daily-milk");
  revalidatePath("/admin");
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

  const { data: existing } = await supabase
    .from("milk_stock")
    .select("id")
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("milk_stock")
      .update({ delivered_stock: delivered })
      .eq("id", existing.id);
  } else {
    // Opening and added stay 0 until someone fills them in on the Stock page.
    await supabase
      .from("milk_stock")
      .insert({ date, delivered_stock: delivered });
  }
}
