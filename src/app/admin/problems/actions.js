"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PROBLEM_STATE_VALUE } from "@/lib/constants";

function refresh() {
  revalidatePath("/admin/problems");
  revalidatePath("/admin");
}

/** Admin's answer on a problem thread. */
export async function replyToProblem(prevState, formData) {
  // A Server Action is a public endpoint; the page guard does not cover it.
  const admin = await requireAdmin();

  const reportId = String(formData.get("report_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!reportId) return { error: "Problem malyu nahi." };
  if (!message) return { error: "Jawab lakho." };

  const supabase = await createClient();

  const { error } = await supabase.from("report_replies").insert({
    report_id: reportId,
    sender_id: admin.id,
    message,
  });

  if (error) return { error: `Jawab save na thayo: ${error.message}` };

  refresh();
  return { ok: true };
}

export async function setProblemStatus(prevState, formData) {
  await requireAdmin();

  const reportId = String(formData.get("report_id") ?? "");
  const state = String(formData.get("status") ?? "");

  if (!reportId) return { error: "Problem malyu nahi." };

  // The screen offers two states; the column keeps its four enum values.
  const status = PROBLEM_STATE_VALUE[state];
  if (!status) return { error: "Status barabar nathi." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("reports")
    .update({
      status,
      // Only a closed problem carries a date; reopening clears it.
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", reportId);

  if (error) return { error: `Status badlai na shakyu: ${error.message}` };

  refresh();
  return { ok: true };
}
