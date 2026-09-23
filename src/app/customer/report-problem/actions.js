"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerAccount } from "@/lib/auth";
import { ISSUE_TYPE } from "@/lib/constants";

function refresh() {
  revalidatePath("/customer/report-problem");
  revalidatePath("/customer");
  revalidatePath("/admin/problems");
  revalidatePath("/", "layout");
}

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Tells every admin that something has come in.
 *
 * A customer cannot write a notification addressed to somebody else — RLS
 * limits them to their own rows, and rightly so — hence the service-role
 * client. It is safe here only because the caller has already been checked,
 * and because nothing in the row comes from the form unedited.
 */
async function notifyAdmins(title, message, referenceId) {
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
      type: "problem",
      reference_id: referenceId,
    })),
  );
}

/** A new complaint, optionally pinned to the day it is about. */
export async function raiseProblem(prevState, formData) {
  // A Server Action is a public endpoint; the page guard does not cover it.
  const { customer } = await requireCustomerAccount();

  if (!customer) {
    return { error: "Tamaru account hju dairy sathe jodayu nathi." };
  }

  const issueType = String(formData.get("issue_type") ?? "");
  const date = String(formData.get("date") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const receivedRaw = String(formData.get("received_quantity") ?? "");

  if (!ISSUE_TYPE[issueType]) return { error: "Kai bhul thai e pasand karo." };
  if (!message) return { error: "Su thayu e lakho." };
  if (date && !isDate(date)) return { error: "Tarikh barabar nathi." };

  const supabase = await createClient();

  // The day's own entry is the honest source for "what you were meant to get"
  // — the customer's daily quantity can have changed since.
  let entry = null;
  if (date) {
    const { data } = await supabase
      .from("milk_entries")
      .select("id, expected_quantity, actual_quantity")
      .eq("customer_id", customer.id)
      .eq("date", date)
      .maybeSingle();
    entry = data ?? null;
  }

  const received =
    receivedRaw === "" ? (entry?.actual_quantity ?? null) : Number(receivedRaw);

  if (received !== null && (!Number.isFinite(received) || received < 0)) {
    return { error: "Ketlu malyu e barabar nakho." };
  }

  const { data: made, error } = await supabase
    .from("reports")
    .insert({
      customer_id: customer.id,
      milk_entry_id: entry?.id ?? null,
      issue_type: issueType,
      expected_quantity: entry?.expected_quantity ?? customer.daily_quantity,
      received_quantity: received,
      message,
    })
    .select("id")
    .maybeSingle();

  if (error) return { error: `Fariyad na nondhai: ${error.message}` };

  await notifyAdmins(
    "Navi fariyad",
    `${customer.name}: ${ISSUE_TYPE[issueType]}`,
    made?.id ?? null,
  );

  refresh();
  return { ok: true };
}

/** The customer's own message on a thread they opened. */
export async function replyOnProblem(prevState, formData) {
  const { user, customer } = await requireCustomerAccount();

  if (!customer) {
    return { error: "Tamaru account hju dairy sathe jodayu nathi." };
  }

  const reportId = String(formData.get("report_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!reportId) return { error: "Fariyad mali nahi." };
  if (!message) return { error: "Message lakho." };

  const supabase = await createClient();

  // Checked rather than assumed: the id arrives from the browser, and RLS
  // would let this row be read only if it were theirs — but the reply insert
  // does not re-check which report it is attached to.
  const { data: own } = await supabase
    .from("reports")
    .select("id")
    .eq("id", reportId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!own) return { error: "Fariyad mali nahi." };

  const { error } = await supabase.from("report_replies").insert({
    report_id: reportId,
    sender_id: user.id,
    message,
  });

  if (error) return { error: `Message na mokalai shakyo: ${error.message}` };

  await notifyAdmins(
    "Fariyad par navo message",
    `${customer.name} e jawab aapyo chhe`,
    reportId,
  );

  refresh();
  return { ok: true };
}
