"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PROBLEM_STATE_VALUE } from "@/lib/constants";

function refresh() {
  revalidatePath("/admin/problems");
  revalidatePath("/admin");
  // The customer's own pages and their bell, which live under a different
  // path entirely.
  revalidatePath("/customer/report-problem");
  revalidatePath("/", "layout");
}

/**
 * Puts a note in the customer's bell about their own complaint.
 *
 * Addressed to somebody else's user_id, which RLS does not let an admin write
 * directly, so it goes through the service-role client — behind requireAdmin()
 * at every call site. A complaint from a customer with no login has nobody to
 * notify, and that is a normal case, not a failure.
 */
async function notifyCustomer(reportId, title, message) {
  const db = createAdminClient();

  const { data: report } = await db
    .from("reports")
    .select("customers(user_id)")
    .eq("id", reportId)
    .maybeSingle();

  const userId = report?.customers?.user_id;
  if (!userId) return;

  await db.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type: "problem",
    reference_id: reportId,
  });
}

/** Admin's answer on a problem thread. */
export async function replyToProblem(prevState, formData) {
  // A Server Action is a public endpoint; the page guard does not cover it.
  const admin = await requireAdmin();

  const reportId = String(formData.get("report_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!reportId) return { error: "Complaint not found." };
  if (!message) return { error: "Write a reply." };

  const supabase = await createClient();

  const { error } = await supabase.from("report_replies").insert({
    report_id: reportId,
    sender_id: admin.id,
    message,
  });

  if (error) return { error: `Reply not saved: ${error.message}` };

  await notifyCustomer(
    reportId,
    "Your complaint has a reply",
    message.slice(0, 120),
  );

  refresh();
  return { ok: true };
}

export async function setProblemStatus(prevState, formData) {
  await requireAdmin();

  const reportId = String(formData.get("report_id") ?? "");
  const state = String(formData.get("status") ?? "");

  if (!reportId) return { error: "Complaint not found." };

  // The screen offers two states; the column keeps its four enum values.
  const status = PROBLEM_STATE_VALUE[state];
  if (!status) return { error: "That status is not valid." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("reports")
    .update({
      status,
      // Only a closed problem carries a date; reopening clears it.
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", reportId);

  if (error) return { error: `Could not change the status: ${error.message}` };

  await notifyCustomer(
    reportId,
    status === "resolved"
      ? "Your complaint has been resolved"
      : "Your complaint has been reopened",
    status === "resolved"
      ? "The dairy has marked this complaint as done."
      : "The dairy is looking at this complaint again.",
  );

  refresh();
  return { ok: true };
}
