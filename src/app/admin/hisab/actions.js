"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

/** A bill is Done only when the whole amount is in. Partial stays Pending. */
function statusFor(total, received) {
  return Number(received) >= Number(total) ? "done" : "pending";
}

function refresh() {
  revalidatePath("/admin/hisab");
  revalidatePath("/admin");
}

/**
 * Builds (or rebuilds) every customer's bill for one month from that month's
 * milk_entries.
 *
 * Amounts come from each entry's own rate_per_liter snapshot, so a customer
 * whose rate changed mid-month is billed correctly for both halves.
 * Re-running is safe: received_amount is carried over, never reset.
 */
export async function generateBills(prevState, formData) {
  await requireAdmin();

  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Mahino barabar nathi." };

  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const to = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;

  const supabase = await createClient();

  const { data: entries, error: eErr } = await supabase
    .from("milk_entries")
    .select("customer_id, actual_quantity, total_amount")
    .gte("date", from)
    .lt("date", to);

  if (eErr) return { error: `Entries load na thai: ${eErr.message}` };
  if (!entries?.length) {
    return { error: "Aa mahina ni ek pan milk entry nathi." };
  }

  const totals = new Map();
  for (const e of entries) {
    const t = totals.get(e.customer_id) ?? { liters: 0, amount: 0 };
    t.liters += Number(e.actual_quantity ?? 0);
    t.amount += Number(e.total_amount ?? 0);
    totals.set(e.customer_id, t);
  }

  // Keep whatever has already been paid against an existing bill.
  const { data: existing } = await supabase
    .from("monthly_bills")
    .select("customer_id, received_amount")
    .eq("billing_month", from);

  const receivedBy = new Map(
    (existing ?? []).map((b) => [b.customer_id, Number(b.received_amount)]),
  );

  const rows = [...totals.entries()].map(([customer_id, t]) => {
    const total = Number(t.amount.toFixed(2));
    const received = receivedBy.get(customer_id) ?? 0;
    return {
      customer_id,
      billing_month: from,
      total_liters: Number(t.liters.toFixed(2)),
      total_amount: total,
      received_amount: received,
      status: statusFor(total, received),
    };
  });

  const { error } = await supabase
    .from("monthly_bills")
    .upsert(rows, { onConflict: "customer_id,billing_month" });

  if (error) return { error: `Bills save na thaya: ${error.message}` };

  refresh();
  return { ok: true, message: `${rows.length} bill taiyar thai gaya.` };
}

/** Admin records money physically received. */
export async function recordPayment(prevState, formData) {
  await requireAdmin();

  const billId = String(formData.get("bill_id") ?? "");
  const received = Number(formData.get("received_amount"));

  if (!billId) return { error: "Bill malyu nahi." };
  if (!Number.isFinite(received) || received < 0) {
    return { error: "Rakam 0 ke tethi vadhu hovi joiye." };
  }

  const supabase = await createClient();

  const { data: bill, error: bErr } = await supabase
    .from("monthly_bills")
    .select("total_amount")
    .eq("id", billId)
    .maybeSingle();

  if (bErr || !bill) return { error: "Bill malyu nahi." };

  if (received > Number(bill.total_amount)) {
    return { error: "Rakam total karta vadhare na hoy shake." };
  }

  const { error } = await supabase
    .from("monthly_bills")
    .update({
      received_amount: received,
      status: statusFor(bill.total_amount, received),
    })
    .eq("id", billId);

  if (error) return { error: `Save na thai shakyu: ${error.message}` };

  refresh();
  return { ok: true };
}

/**
 * Confirm or reject a customer's "payment done" claim.
 *
 * The customer's request never moves the bill on its own — this is the only
 * place a claim turns into money received.
 */
export async function reviewPaymentRequest(prevState, formData) {
  const admin = await requireAdmin();

  const id = String(formData.get("request_id") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!["confirmed", "rejected"].includes(decision)) {
    return { error: "Decision barabar nathi." };
  }

  const supabase = await createClient();

  const { data: req, error: rErr } = await supabase
    .from("payment_requests")
    .select("id, bill_id, requested_amount, status")
    .eq("id", id)
    .maybeSingle();

  if (rErr || !req) return { error: "Request malyu nahi." };
  if (req.status !== "pending_verification") {
    return { error: "Aa request no nirnay pehla thi thai gayo chhe." };
  }

  const { error: updErr } = await supabase
    .from("payment_requests")
    .update({
      status: decision,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updErr) return { error: `Save na thai shakyu: ${updErr.message}` };

  if (decision === "confirmed") {
    const { data: bill } = await supabase
      .from("monthly_bills")
      .select("total_amount, received_amount")
      .eq("id", req.bill_id)
      .maybeSingle();

    if (bill) {
      // Add the claimed amount, capped at the bill total.
      const received = Math.min(
        Number(bill.received_amount) + Number(req.requested_amount),
        Number(bill.total_amount),
      );

      await supabase
        .from("monthly_bills")
        .update({
          received_amount: received,
          status: statusFor(bill.total_amount, received),
        })
        .eq("id", req.bill_id);
    }
  }

  refresh();
  return { ok: true };
}
