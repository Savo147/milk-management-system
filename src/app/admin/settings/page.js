import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, getBusinessSettings } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import SettingsTabs from "./SettingsTabs";
import { errorText } from "@/lib/format";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }) {
  const user = await requireAdmin();
  const params = await searchParams;
  const initialTab = String(params?.tab ?? "").toLowerCase();
  const settings = await getBusinessSettings();
  const supabase = await createClient();

  const [staff, rates] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, mobile, role, status, created_at")
      .order("created_at"),
    // Only the rate in force, one row per customer. The database keeps the
    // closed ones behind this as its own record of what was charged when,
    // but this screen is answering "what does each customer pay" — and a
    // list that answers it twice over, with yesterday's number sitting under
    // today's, is a list you have to read twice to trust once.
    supabase
      .from("milk_rates")
      .select("id, customer_id, rate_per_liter, effective_from, customers(name)")
      .is("effective_to", null)
      .limit(200),
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
    .sort((a, b) => a.customer_name.localeCompare(b.customer_name));

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Dairy, your details, users and rates"
      />

      {error ? (
        <Alert severity="error">
          Could not load settings: {errorText(error)}
        </Alert>
      ) : (
        <SettingsTabs
          settings={settings}
          user={user}
          staff={staffRows}
          rates={rateRows}
          initialTab={initialTab}
        />
      )}
    </>
  );
}
