import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, getBusinessSettings } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import SettingsTabs from "./SettingsTabs";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireAdmin();
  const settings = await getBusinessSettings();
  const supabase = await createClient();

  const [staff, rates] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, mobile, role, status, created_at")
      .order("created_at"),
    supabase
      .from("milk_rates")
      .select(
        "id, customer_id, rate_per_liter, effective_from, effective_to, customers(name)",
      )
      .order("effective_from", { ascending: false })
      .limit(100),
  ]);

  // A missing table or a blocked read should not take the whole page down —
  // the other tabs are still worth showing.
  const error = staff.error;

  // What deleting a login would take with it, so the confirmation can say so
  // rather than leave the admin to find out afterwards.
  const ids = (staff.data ?? []).map((m) => m.id);
  const [linked, replies] = ids.length
    ? await Promise.all([
        supabase.from("customers").select("name, user_id").in("user_id", ids),
        supabase
          .from("report_replies")
          .select("sender_id")
          .in("sender_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const linkedTo = Object.fromEntries(
    (linked.data ?? []).map((c) => [c.user_id, c.name]),
  );
  const replyCount = {};
  for (const r of replies.data ?? []) {
    replyCount[r.sender_id] = (replyCount[r.sender_id] ?? 0) + 1;
  }

  const staffRows = (staff.data ?? []).map((m) => ({
    ...m,
    linked_customer: linkedTo[m.id] ?? null,
    reply_count: replyCount[m.id] ?? 0,
  }));

  const rateRows = (rates.data ?? [])
    .map((r) => ({ ...r, customer_name: r.customers?.name ?? "—" }))
    .sort(
      (a, b) =>
        a.customer_name.localeCompare(b.customer_name) ||
        b.effective_from.localeCompare(a.effective_from),
    );

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Dairy, your details, users and rates"
      />

      {error ? (
        <Alert severity="error">Could not load settings: {error.message}</Alert>
      ) : (
        <SettingsTabs
          settings={settings}
          user={user}
          staff={staffRows}
          rates={rateRows}
        />
      )}
    </>
  );
}
